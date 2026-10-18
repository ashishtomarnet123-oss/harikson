# XARWIZ — Production Deployment & Verification Checklist

**Gate Status**: PENDING AUTHORIZATION  
**Execution Context**: Separately authorized deployment window  
**Target Host**: `34.131.98.92` (GCP Compute Engine: `xarwiz-prod-vm`)  

---

## 1. Release Identification & Pre-Deployment Metadata

- [ ] **Target Git Branch**: `main`
- [ ] **Exact Git Commit SHA**: Record exact 40-character commit hash before deploying:
  ```bash
  git rev-parse HEAD
  ```
- [ ] **Container Image Digests**: Verify that all 5 images build and push to GHCR with tag `:${GITHUB_SHA}`:
  - `ghcr.io/ashishtomarnet123-oss/harikson-tenant-api:${GITHUB_SHA}`
  - `ghcr.io/ashishtomarnet123-oss/harikson-admin-api:${GITHUB_SHA}`
  - `ghcr.io/ashishtomarnet123-oss/harikson-admin-panel:${GITHUB_SHA}`
  - `ghcr.io/ashishtomarnet123-oss/harikson-user-portal:${GITHUB_SHA}`
  - `ghcr.io/ashishtomarnet123-oss/harikson-orchestrator:${GITHUB_SHA}`

---

## 2. CI/CD Pre-Flight Gates

- [ ] Run full test suite:
  ```bash
  cd harikson/tenant-api && npm test
  ```
  Expected: **37/37 tests pass (11 security + 26 workflow engine)**.
- [ ] Run TypeScript compilation:
  ```bash
  cd harikson/tenant-api && npm run typecheck && npm run build
  cd orchestrator && npm run build
  ```
  Expected: **Zero TypeScript errors, exit code 0**.
- [ ] Verify clean git status:
  ```bash
  git status --porcelain
  ```
  Expected: **Clean working tree, no untracked secrets**.

---

## 3. Infrastructure & GCP Firewall Verification

- [ ] **GCP Firewall Ingress Rules**: Confirm public ingress rules (`0.0.0.0/0`) are restricted:
  - Allowed: `tcp:80`, `tcp:443` (Traefik reverse proxy)
  - Allowed: `tcp:22` (Restricted to authorized administrator IPs / IAP)
  - **BLOCKED**: `tcp:3008`, `tcp:4000`, `tcp:3018`, `tcp:3028`, `tcp:5432`, `tcp:5435`, `tcp:6379`, `tcp:5001`
- [ ] Verify Docker Compose loopback bindings on production VM:
  ```bash
  # Run on production VM:
  netstat -tlpn | grep -E ':(3008|4000|3018|3028|5435)'
  ```
  Expected: All bound to `127.0.0.1`, **NONE bound to 0.0.0.0**.

---

## 4. External Boundary Probes (Direct IP vs. HTTPS Domain)

- [ ] **Public Direct IP Probes (Should be BLOCKED / Connection Refused / Timed out)**:
  ```bash
  curl -m 3 -s -o /dev/null -w "%{http_code}" http://34.131.98.92:3008/health || echo "BLOCKED (PASS)"
  curl -m 3 -s -o /dev/null -w "%{http_code}" http://34.131.98.92:4000/health || echo "BLOCKED (PASS)"
  curl -m 3 -s -o /dev/null -w "%{http_code}" http://34.131.98.92:3018/admin/login || echo "BLOCKED (PASS)"
  curl -m 3 -s -o /dev/null -w "%{http_code}" http://34.131.98.92:3028/login || echo "BLOCKED (PASS)"
  ```
  Expected: Connection refused or timeout (blocked from public internet).

- [ ] **HTTPS Domain Ingress Probes (Should be HEALTHY / HTTP 200)**:
  ```bash
  curl -s -o /dev/null -w "%{http_code}" https://api.xarwiz.com/health       # Expect 200
  curl -s -o /dev/null -w "%{http_code}" https://xarwiz.com                   # Expect 200
  curl -s -o /dev/null -w "%{http_code}" https://admin.xarwiz.com/admin/login # Expect 200
  ```

---

## 5. Security & Negative Vulnerability Probes

- [ ] **Probe 1: Unauthenticated Tool Execution**:
  ```bash
  curl -s -X POST https://api.xarwiz.com/api/tools/execute \
    -H "Content-Type: application/json" \
    -d '{"conversationId":"test","toolCalls":[]}'
  ```
  Expected: `HTTP 401 Unauthorized`.
- [ ] **Probe 2: Forged Tenant Header Bypass**:
  ```bash
  curl -s -X POST https://api.xarwiz.com/api/tools/execute \
    -H "Content-Type: application/json" \
    -H "x-tenant-id: 00000000-0000-0000-0000-000000000001" \
    -H "x-tenant-slug: default" \
    -d '{"conversationId":"test","toolCalls":[]}'
  ```
  Expected: `HTTP 401 Unauthorized` (forged header fails without valid token).
- [ ] **Probe 3: Unauthenticated Orchestrator Execution**:
  ```bash
  curl -s -X POST https://api.xarwiz.com/api/orchestrator/execute \
    -H "Content-Type: application/json" \
    -d '{"userRequest":"list files"}'
  ```
  Expected: `HTTP 401 Unauthorized`.
- [ ] **Probe 4: External Metrics Access**:
  ```bash
  curl -s https://api.xarwiz.com/api/orchestrator/metrics
  ```
  Expected: `HTTP 401 Unauthorized: Metrics access restricted`.
- [ ] **Probe 5: Webhook Execution with Null/Missing Secret**:
  ```bash
  curl -s -X POST https://api.xarwiz.com/api/workflows/fake-workflow-id/trigger
  ```
  Expected: `HTTP 401` or `HTTP 403` (rejected).

---

## 6. Positive Authenticated Workflow Tests

- [ ] User Login through `https://xarwiz.com/login`:
  - Token received in HttpOnly cookie or Bearer header.
  - User profile loaded via `GET /api/user/me`.
- [ ] Authenticated Chat Workflow:
  - Create conversation: `POST /api/chat/conversations`.
  - Send message and verify streaming AI response.
- [ ] Admin Portal Login through `https://admin.xarwiz.com/admin/login`:
  - Superadmin session verified.
  - Tenant list displayed without cross-tenant bleed.
- [ ] Legitimate Webhook Execution:
  - Trigger webhook with configured `whsec_...` header -> expects `HTTP 200 OK`.

---

## 7. Container Health & Telemetry Verification

- [ ] Run on VM:
  ```bash
  docker compose ps
  ```
  Verify all containers display status `Up (healthy)`.
- [ ] Check logs for errors:
  ```bash
  docker compose logs --tail=100 tenant-api
  docker compose logs --tail=100 orchestrator
  docker compose logs --tail=100 postgres
  docker compose logs --tail=100 redis
  ```

---

## 8. Rollback Triggers & Procedure

### Rollback Triggers:
1. Any container enters restart loop (`CrashLoopBackOff`).
2. `https://api.xarwiz.com/health` returns non-200.
3. Authenticated chat or document workflows fail.
4. Database connection exhaustion or pool errors.

### Rollback Execution:
```bash
# 1. Rollback to previous known good Git commit / image tags
git checkout 1c27a2b5cb7b24d98487332de73d4ccaf9ef4839

# 2. Pull previous image builds
docker compose pull

# 3. Restart services
docker compose down && docker compose up -d

# 4. Confirm system recovery
curl -f https://api.xarwiz.com/health
```
