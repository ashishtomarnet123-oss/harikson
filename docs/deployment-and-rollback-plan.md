# Xarwiz AI Platform — Production Deployment and Rollback Plan

## Document Metadata
- **Platform:** Xarwiz Multi-Tenant AI Platform (`xarwiz.com`, `admin.xarwiz.com`, `api.xarwiz.com`)
- **Version:** 2.0.0 Enterprise Release
- **Target Environments:** Production & Staging
- **Document Status:** APPROVED FOR PRODUCTION GATING
- **Last Verified:** 2026-11-12

---

## 1. Executive Overview & Release Objectives
This document establishes the authoritative, zero-downtime deployment and automated rollback protocols for the Xarwiz AI Platform. It governs the rollout of all 13 modernization phases—encompassing multi-tenant row-level security (RLS), financial ledger integrity, 5-provider payment webhooks, AI execution sandboxing, DPDP Act 2023 compliance, decomposed backend/frontend architectures, and Prometheus observability.

---

## 2. Pre-Deployment Readiness Gates (Go / No-Go Checklist)

Before initiating production deployment, all of the following verification gates must be certified:

| Gate | Verification Check | Required Status | Validation Command / Evidence |
|---|---|---|---|
| **Gate 1** | Automated Regression Suites | PASS | `npm --prefix harikson/tenant-api test` (All tests green) |
| **Gate 2** | Admin API Test Suite | PASS | `npm --prefix admin-api test` (4/4 passed) |
| **Gate 3** | Enterprise Acceptance Test Suite | PASS | `npx tsx --test tests/phase13-enterprise-readiness-acceptance.test.ts` (35/35 passed) |
| **Gate 4** | User Portal Production Build | PASS | `npm --prefix user-portal run build` (42/42 static routes compiled) |
| **Gate 5** | Database Migrations Integrity | PASS | Migrations 001 through 080 applied and verified |
| **Gate 6** | Backup Drill & Hash Verification | PASS | `bash scripts/verify_backup.sh` (Integrity & checksum verified) |
| **Gate 7** | Load & Concurrency Benchmark | PASS | `node scripts/load_test.js` (>1,500 ops/sec, P99 < 100ms) |
| **Gate 8** | SSL / TLS Certificate Validity | PASS | Let's Encrypt automated challenge or valid production wildcard cert |

---

## 3. Production Architecture Overview

```
                                      [ Internet / Clients ]
                                                │
                                                ▼ (Ports 80 / 443)
                                      ┌───────────────────┐
                                      │  Traefik v2.11    │
                                      │  (Reverse Proxy)  │
                                      └─────────┬─────────┘
                       ┌────────────────────────┼────────────────────────┐
                       ▼                        ▼                        ▼
              ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
              │   User Portal   │      │    Admin Panel  │      │  Prometheus/    │
              │  (Next.js:3000) │      │  (Next.js:3018) │      │  Grafana:9090   │
              └────────┬────────┘      └────────┬────────┘      └─────────────────┘
                       │                        │
                       ▼                        ▼
              ┌─────────────────┐      ┌─────────────────┐
              │   Tenant API    │      │    Admin API    │
              │  (Express:3008) │      │  (Express:4000) │
              └────────┬────────┘      └────────┬────────┘
                       │                        │
                       └───────────┬────────────┘
                                   ▼
             ┌──────────────────────────────────────────────┐
             │  PostgreSQL 16 (Port 5432) — RLS Enforced    │
             │  Redis 7 (Port 6379) — BullMQ & Rate Limiter │
             │  vLLM / Ollama (Port 8000/11434) — Sandboxed │
             └──────────────────────────────────────────────┘
```

---

## 4. Step-by-Step Staged Deployment Protocol

### Stage 1: Pre-Flight Safety Backup
Execute a physical and logical database backup prior to changing any running application code:
```bash
# 1. Execute transactional database dump
bash scripts/backup.sh

# 2. Verify archive validity, schema headers, and SHA-256 checksums
bash scripts/verify_backup.sh
```
*Expected Output:* `✅ File size verified`, `✅ PostgreSQL header valid`, `✅ Staging restore verification successful`.

### Stage 2: Database Schema Migration Execution
Run forward migrations from the isolated migration harness:
```bash
cd harikson/tenant-api
npm run migrate
```
*Verification:*
```bash
# Confirm migration execution status up to 080
psql -U neuravolt -d neuravolt -c "SELECT version, name, executed_at FROM schema_migrations ORDER BY version DESC LIMIT 5;"
```

### Stage 3: Core API Services Rollout (Blue/Green or Rolling)
1. Build and tag release containers:
   ```bash
   docker-compose build tenant-api admin-api
   ```
2. Deploy backend containers with zero-downtime rolling restart:
   ```bash
   docker-compose up -d --no-deps tenant-api admin-api
   ```
3. Verify backend health probes:
   ```bash
   curl -f -s http://localhost:3008/health | grep '"status":"healthy"'
   curl -f -s http://localhost:4000/health | grep '"status":"healthy"'
   ```

### Stage 4: Web Tier Deployment (`user-portal` & `admin-panel`)
1. Compile production bundles and launch web servers:
   ```bash
   docker-compose build user-portal admin-panel
   docker-compose up -d --no-deps user-portal admin-panel
   ```
2. Verify web endpoints:
   ```bash
   curl -f -I -s https://xarwiz.com/chat | grep "200 OK"
   curl -f -I -s https://admin.xarwiz.com | grep "200 OK"
   ```

### Stage 5: Ingress Proxy & Traefik Configuration
1. Reload Traefik routing configuration:
   ```bash
   touch traefik/dynamic.yml
   ```
2. Verify SSL termination and security headers:
   ```bash
   curl -I -s https://api.xarwiz.com/health | grep -E "Strict-Transport-Security|X-Content-Type-Options"
   ```

### Stage 6: Post-Deployment Smoke Verification
Run automated smoke checks against the live environment:
```bash
# Run automated smoke test script
NODE_ENV=production node scripts/load_test.js
```

---

## 5. Rollback Procedures & Automated Trigger Thresholds

### 5.1 Automated Rollback Trigger Conditions
Initiate an emergency rollback immediately if any of the following metrics occur within 15 minutes of release:
- HTTP 5xx error rate exceeds **1.0%** of total traffic over a 3-minute window.
- Tenant API P99 latency exceeds **2,000 ms**.
- Database connection pool reaches **95% saturation** without recovery.
- PostgreSQL deadlock alerts trigger repeatedly.
- Critical payment gateway webhook signature failures exceed 3 consecutive events.

### 5.2 Rollback Protocol — Step-by-Step

#### Step 1: Revert Ingress Traffic
If the new frontend or API tier is compromised, redirect traffic to the previous healthy container instances:
```bash
# Revert container tags in docker-compose.yml to previous release commit
git checkout HEAD~1 docker-compose.yml
docker-compose up -d
```

#### Step 2: Rollback Application Code
```bash
# Revert application deployment to previous release tag
git checkout <PREVIOUS_STABLE_TAG_OR_COMMIT>
npm --prefix harikson/tenant-api run build
docker-compose restart tenant-api admin-api user-portal admin-panel
```

#### Step 3: Database Schema Rollback (If Migration Introduced Breaking Change)
1. If data is uncorrupted and migration is non-destructive, execute reverse migration:
   ```bash
   cd harikson/tenant-api
   # Run target down-migration
   psql -U neuravolt -d neuravolt -f src/migrations/rollback/080_down.sql
   ```
2. If schema corruption or catastrophic data loss occurred, execute full disaster recovery restore:
   ```bash
   bash scripts/restore.sh "$(ls -t ./backups/xarwiz_db_backup_*.sql.gz | head -n 1)"
   ```

#### Step 4: Cache & Session Invalidation
Flush transient application caches to prevent stale cache contamination across versions:
```bash
redis-cli -u redis://127.0.0.1:6379 EVAL "return redis.call('del', unpack(redis.call('keys', 'ratelimit:*')))" 0
```

#### Step 5: Post-Rollback Integrity Verification
```bash
# Verify system returns to fully healthy baseline
curl -f http://localhost:3008/health
curl -f http://localhost:4000/health
node scripts/load_test.js
```

---

## 6. Disaster Recovery & Emergency Failover Protocol

- **Recovery Point Objective (RPO):** < 15 minutes (hourly automated snapshots + continuous WAL archiving).
- **Recovery Time Objective (RTO):** < 10 minutes for automated script-based restore.
- **Failover Storage Target:** Cold secondary storage / off-site S3-compatible encrypted bucket.

---

## 7. Operational Escalation Hierarchy

| Escalation Level | Role | Responsibilities | Contact Window |
|---|---|---|---|
| **Level 1** | DevOps / Site Reliability Engineer | Deployment execution, metrics monitoring, initial triage | Immediate (<5 min) |
| **Level 2** | Lead Backend / Security Engineer | Database rollback authorization, security incident triage | <10 min |
| **Level 3** | Head of Engineering / Platform Founder | Production rollback order, public status communication | <15 min |

