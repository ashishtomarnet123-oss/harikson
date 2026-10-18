# XARWIZ — Safe Production Credential Rotation Runbook

**Document Version**: 1.0.0  
**Target Environment**: Production (GCP Compute Engine VM `34.131.98.92` / Domain `*.xarwiz.com`)  
**Security Classification**: CONFIDENTIAL — OPERATIONS RUNBOOK  
**Author**: Principal Security Architect & SRE Lead  

---

> [!WARNING]
> **DO NOT ROTATE SECRETS BLINDLY OR SIMULTANEOUSLY.**  
> Several production keys (`PAYMENT_ENCRYPTION_KEY`, `TENANT_MASTER_KEY`) protect encrypted data stored in PostgreSQL. Rotating these keys without a synchronized re-encryption migration will cause irreversible loss of access to stored payment tokens and tenant configurations.

---

## 1. Secrets Inventory & Dependency Matrix

| Secret Name | Consuming Services | Blast Radius / Invalidation Impact | Re-encryption Required? | Rotation Downtime Required? |
|---|---|---|:---:|:---:|
| `JWT_SECRET` | `tenant-api`, `user-portal`, `admin-api`, `admin-panel` | Invalidates active user and admin login sessions; users must re-authenticate. | No | No (brief session logout) |
| `PAYMENT_ENCRYPTION_KEY` | `tenant-api` (billing, subscriptions, payment webhook handlers) | **CRITICAL**: Inability to decrypt stored payment credentials, gateway secrets, or webhook keys. | **YES (Dual-Key Migration)** | Yes (10-minute maintenance window) |
| `TENANT_MASTER_KEY` | `tenant-api` (workspace encryption, salt derivations) | Invalidates workspace paths and per-tenant cryptographic hashes. | **YES (Dual-Key Migration)** | Yes (10-minute maintenance window) |
| `INTERNAL_API_SECRET` | `tenant-api`, `orchestrator`, `backend` | Inter-service calls (`tenant-api` <-> `orchestrator`) fail if mismatched. | No | No (synchronized restart) |
| `POSTGRES_PASSWORD` | `postgres`, `tenant-api`, `admin-api` | DB connection failure if app and DB passwords diverge. | No | Yes (5-minute restart) |
| `REDIS_PASSWORD` | `redis`, `tenant-api`, `admin-api` | Cache & queue connection failure if Redis password diverges. | No | Yes (2-minute restart) |
| `GF_SECURITY_ADMIN_PASSWORD` | `grafana` | Monitoring admin dashboard access lock. | No | No |

---

## 2. Pre-Rotation Safety & Backup Validation

Before executing any secret rotation, verify and test the rollback safety net.

### Step 2.1: Cold Database Snapshot & Restore Verification
A database dump is not proven safe until restored to an isolated test container.

```bash
# 1. Take cold SQL dump on production host
sudo docker compose exec -T postgres pg_dumpall -U neuravolt > /opt/xarwiz/backups/backup_pre_rotation_$(date +%Y%m%d_%H%M%S).sql

# 2. Verify dump integrity (check size and non-empty schema definitions)
ls -lh /opt/xarwiz/backups/backup_pre_rotation_*.sql
grep -q "CREATE TABLE" /opt/xarwiz/backups/backup_pre_rotation_*.sql && echo "Backup verified valid" || { echo "BACKUP FAILED"; exit 1; }

# 3. Create a verification test container to test restore
docker run --name pg-test-restore -e POSTGRES_PASSWORD=test_restore_pwd -d postgres:15
sleep 5
docker exec -i pg-test-restore psql -U postgres < /opt/xarwiz/backups/backup_pre_rotation_*.sql
RESTORE_STATUS=$?
docker rm -f pg-test-restore

if [ $RESTORE_STATUS -ne 0 ]; then
  echo "CRITICAL: Backup restore test failed! Aborting secret rotation."
  exit 1
fi
```

### Step 2.2: Backup Existing Environment Files
```bash
cp /opt/xarwiz/.env /opt/xarwiz/.env.backup.$(date +%Y%m%d_%H%M%S)
chmod 600 /opt/xarwiz/.env.backup.*
```

---

## 3. Step-by-Step Rotation Procedures

### Phase 1: Rotating `JWT_SECRET` (Zero Data Risk)
1. **Generate New Secret**:
   ```bash
   NEW_JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   ```
2. **Update Secrets**:
   - Update `JWT_SECRET` in `/opt/xarwiz/.env`.
   - Update GitHub Actions secret `PROD_JWT_SECRET`.
3. **Rolling Restart Application Services**:
   ```bash
   docker compose up -d --no-deps tenant-api admin-api user-portal admin-panel
   ```
4. **Verification**:
   - Make an unauthenticated request to `https://api.xarwiz.com/api/user/me` -> expects `401 Unauthorized`.
   - Send old JWT token -> expects `401 Unauthorized: Invalid or expired token`.
   - Log in freshly through `https://xarwiz.com/login` -> receives new JWT and verifies profile.

---

### Phase 2: Rotating `TENANT_MASTER_KEY` & `PAYMENT_ENCRYPTION_KEY` (Dual-Key Migration)

> [!CRITICAL]
> `TENANT_MASTER_KEY` encrypts document content at rest in `knowledge_documents` using PBKDF2 (100,000 rounds) + AES-256-GCM.  
> `PAYMENT_ENCRYPTION_KEY` encrypts gateway API secrets in `payment_providers` (`api_key_encrypted`, `api_secret_encrypted`, `webhook_secret_encrypted`) using SHA-256 + AES-256-GCM (`iv:authTag:encrypted`).  
> `WORKFLOW_CREDENTIAL_KEY` / `TENANT_MASTER_KEY` encrypts secrets in `workflow_credentials`.  
> Both old and new keys MUST be supplied during migration.

1. **Generate New Keys**:
   ```bash
   OLD_TENANT_MASTER_KEY=$(grep '^TENANT_MASTER_KEY=' /opt/xarwiz/.env | cut -d '=' -f2)
   NEW_TENANT_MASTER_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

   OLD_PAYMENT_KEY=$(grep '^PAYMENT_ENCRYPTION_KEY=' /opt/xarwiz/.env | cut -d '=' -f2)
   NEW_PAYMENT_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   ```

2. **Execute In-Transaction Re-encryption Script**:
   Run the migration utility inside `tenant-api` with both keys in environment:
   ```bash
   docker compose exec -e OLD_TENANT_KEY="${OLD_TENANT_MASTER_KEY}" \
                       -e NEW_TENANT_KEY="${NEW_TENANT_MASTER_KEY}" \
                       -e OLD_PAYMENT_KEY="${OLD_PAYMENT_KEY}" \
                       -e NEW_PAYMENT_KEY="${NEW_PAYMENT_KEY}" \
                       -T tenant-api node -e '
   import { pool } from "./dist/db/pool.js";
   import crypto from "crypto";

   async function rotateAllEncryptedData() {
     const client = await pool.connect();
     try {
       await client.query("BEGIN");
       console.log("Beginning atomic dual-key re-encryption migration...");

       // 1. Re-encrypt knowledge_documents (PBKDF2 100k rounds)
       const docRes = await client.query("SELECT id, encrypted_content, iv, auth_tag, key_id FROM knowledge_documents FOR UPDATE");
       console.log(`Processing ${docRes.rows.length} knowledge documents...`);
       for (const doc of docRes.rows) {
         if (!doc.encrypted_content) continue;
         // Decrypt with OLD_TENANT_KEY
         const oldDerived = crypto.pbkdf2Sync(process.env.OLD_TENANT_KEY, `${doc.id}:${doc.key_id || "v1"}`, 100000, 32, "sha256");
         const decipher = crypto.createDecipheriv("aes-256-gcm", oldDerived, Buffer.from(doc.iv, "hex"));
         decipher.setAuthTag(Buffer.from(doc.auth_tag, "hex"));
         let plain = decipher.update(doc.encrypted_content, "hex", "utf8");
         plain += decipher.final("utf8");

         // Re-encrypt with NEW_TENANT_KEY
         const newKeyId = "v2";
         const newDerived = crypto.pbkdf2Sync(process.env.NEW_TENANT_KEY, `${doc.id}:${newKeyId}`, 100000, 32, "sha256");
         const newIv = crypto.randomBytes(12);
         const cipher = crypto.createCipheriv("aes-256-gcm", newDerived, newIv);
         let newEncrypted = cipher.update(plain, "utf8", "hex");
         newEncrypted += cipher.final("hex");
         const newTag = cipher.getAuthTag().toString("hex");

         await client.query(
           "UPDATE knowledge_documents SET encrypted_content = $1, iv = $2, auth_tag = $3, key_id = $4 WHERE id = $5",
           [newEncrypted, newIv.toString("hex"), newTag, newKeyId, doc.id]
         );
       }

       // 2. Re-encrypt payment_providers (SHA-256 key, iv:tag:cipher format)
       const payRes = await client.query("SELECT id, api_key_encrypted, api_secret_encrypted, webhook_secret_encrypted FROM payment_providers FOR UPDATE");
       console.log(`Processing ${payRes.rows.length} payment providers...`);
       const oldPayKey = crypto.createHash("sha256").update(process.env.OLD_PAYMENT_KEY).digest();
       const newPayKey = crypto.createHash("sha256").update(process.env.NEW_PAYMENT_KEY).digest();

       const reEncryptField = (val) => {
         if (!val || val.split(":").length < 3) return val;
         const [ivHex, tagHex, cipherHex] = val.split(":");
         const dec = crypto.createDecipheriv("aes-256-gcm", oldPayKey, Buffer.from(ivHex, "hex"));
         dec.setAuthTag(Buffer.from(tagHex, "hex"));
         let decText = dec.update(cipherHex, "hex", "utf8");
         decText += dec.final("utf8");

         const nIv = crypto.randomBytes(16);
         const enc = crypto.createCipheriv("aes-256-gcm", newPayKey, nIv);
         let nEnc = enc.update(decText, "utf8", "hex");
         nEnc += enc.final("hex");
         const nTag = enc.getAuthTag();
         return `${nIv.toString("hex")}:${nTag.toString("hex")}:${nEnc}`;
       };

       for (const prov of payRes.rows) {
         const newApiKey = reEncryptField(prov.api_key_encrypted);
         const newSecret = reEncryptField(prov.api_secret_encrypted);
         const newWhSec = reEncryptField(prov.webhook_secret_encrypted);
         await client.query(
           "UPDATE payment_providers SET api_key_encrypted = $1, api_secret_encrypted = $2, webhook_secret_encrypted = $3 WHERE id = $4",
           [newApiKey, newSecret, newWhSec, prov.id]
         );
       }

       await client.query("COMMIT");
       console.log("Migration SUCCESS: All records re-encrypted and committed atomically.");
     } catch (err) {
       await client.query("ROLLBACK");
       console.error("Migration FATAL: Transaction rolled back:", err);
       process.exit(1);
     } finally {
       client.release();
     }
   }
   rotateAllEncryptedData().then(() => process.exit(0));
   '
   ```

3. **Update `/opt/xarwiz/.env`**:
   - Set `TENANT_MASTER_KEY=${NEW_TENANT_MASTER_KEY}`
   - Set `PAYMENT_ENCRYPTION_KEY=${NEW_PAYMENT_KEY}`
   - Update repository secrets in GitHub Actions.
4. **Restart Tenant API**:
   ```bash
   docker compose restart tenant-api
   ```
5. **Verify Decryption & Document Intelligence**:
   - Fetch document summary via API to verify `knowledge_documents` decrypt correctly.
   - Verify billing configuration loads without decrypt error.

---

### Phase 3: Rotating `INTERNAL_API_SECRET`
1. **Generate New Secret**:
   ```bash
   NEW_INTERNAL_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   ```
2. **Update Environment on Production**:
   - Set `INTERNAL_API_SECRET=${NEW_INTERNAL_SECRET}` in `/opt/xarwiz/.env`.
   - Update GitHub secret `INTERNAL_API_SECRET`.
3. **Synchronized Container Restart**:
   ```bash
   docker compose up -d --no-deps tenant-api orchestrator
   ```
4. **Verification**:
   - Query orchestrator `/health` -> `200 OK`.
   - Call orchestrator with old secret -> `403 Forbidden: Valid x-internal-secret required`.
   - Call orchestrator with new secret -> `200 OK`.

---

### Phase 4: Rotating Database & Redis Passwords
1. **PostgreSQL**:
   ```bash
   NEW_PG_PWD=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
   # Update password inside live postgres
   docker compose exec postgres psql -U neuravolt -d neuravolt -c "ALTER USER neuravolt WITH PASSWORD '${NEW_PG_PWD}';"
   # Update .env
   sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${NEW_PG_PWD}/" /opt/xarwiz/.env
   sed -i "s/DATABASE_URL=postgresql:\/\/neuravolt:.*@/DATABASE_URL=postgresql:\/\/neuravolt:${NEW_PG_PWD}@/" /opt/xarwiz/.env
   # Restart dependent apps
   docker compose up -d --no-deps tenant-api admin-api
   ```
2. **Redis**:
   ```bash
   NEW_REDIS_PWD=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
   docker compose exec redis redis-cli -a "${OLD_REDIS_PWD}" config set requirepass "${NEW_REDIS_PWD}"
   sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=${NEW_REDIS_PWD}/" /opt/xarwiz/.env
   sed -i "s/REDIS_URL=redis:\/\/.*@/REDIS_URL=redis:\/\/:${NEW_REDIS_PWD}@/" /opt/xarwiz/.env
   docker compose up -d --no-deps tenant-api admin-api
   ```

---

## 4. Rollback Plan

If any step fails or tests fail during verification:
1. **Stop active services**:
   ```bash
   docker compose down
   ```
2. **Restore backed-up `.env`**:
   ```bash
   cp /opt/xarwiz/.env.backup.* /opt/xarwiz/.env
   ```
3. **If database was modified, restore database backup**:
   ```bash
   docker compose up -d postgres
   sleep 5
   docker compose exec -T postgres psql -U neuravolt -d neuravolt < /opt/xarwiz/backups/backup_pre_rotation_*.sql
   ```
4. **Restart all services**:
   ```bash
   docker compose up -d
   ```
5. **Verify health endpoints**:
   - `curl -f https://api.xarwiz.com/health`
   - `curl -f https://xarwiz.com`
   - `curl -f https://admin.xarwiz.com/admin/login`
