# REPORT 12: DEVOPS, INFRASTRUCTURE AND DEPLOYMENT AUDIT

---

## 1. Container & Deployment Layout (`docker-compose.yml`)

The platform is defined via `docker-compose.yml` (version 3.8) on a bridge network `harikson-network`:
1. **Traefik v2.11 (`harikson-traefik`):** Edge reverse proxy terminating TLS 1.3 with Let's Encrypt ACME automated certificate generation. Mounts `dynamic.yml` for security headers and rate limits.
2. **Ollama (`harikson-ollama`):** Local LLM inference engine. Resource limits set to 3.5 CPUs and 12GB RAM.
3. **PostgreSQL 15 (`harikson-postgres`):** Database with `pgvector`. Bound strictly to `127.0.0.1:5435:5432` to prevent public host port exposure.
4. **Redis 7 (`harikson-redis`):** In-memory cache and BullMQ job broker. Configured with LRU eviction and memory limit of 256MB.
5. **Orchestrator (`harikson-orchestrator`):** Privileged agent container runner with `/var/run/docker.sock` mount.
6. **Tenant API (`tenant-api`):** Core Express service running on port 3008.
7. **Admin API (`admin-api`):** Control plane service running on port 4000.
8. **Admin Panel (`admin-panel`):** Next.js dashboard running on port 3001.
9. **User Portal (`user-portal`):** Next.js web application running on port 3002.
10. **Prometheus & Grafana:** Observability stack running on internal ports 9090 and 3003.

---

## 2. Infrastructure Gaps & Configuration Defects

### A. Broken Prometheus Target (Scraper Fails on Admin API)
- **File:** `monitoring/prometheus.yml`, Lines 18-24
- **Configuration:**
  ```yaml
  - job_name: 'harikson-admin-api'
    metrics_path: '/admin/metrics'
    bearer_token_file: '/etc/prometheus/metrics_token'
    static_configs:
      - targets: ['admin-api:3009']
  ```
- **Defect:** `admin-api` runs on **Port 4000** in `docker-compose.yml`. Port 3009 does not exist. Prometheus metrics scrapes fail continuously with `connection refused`.
- **Missing cAdvisor:** `prometheus.yml` lists `nv-cadvisor:8080`, but no `cadvisor` container exists in `docker-compose.yml`.
- **Missing Tenant API:** `tenant-api` exposes `/api/orchestrator/metrics` and `/metrics`, but is completely absent from `prometheus.yml`.

### B. Host Port Hardening Verification
- Verified that direct public host port exposures on `0.0.0.0` (ports 3008, 4000, 3001, 3002) were removed. Containers communicate exclusively through the internal Docker bridge network (`harikson-network`) behind Traefik, preventing direct bypass of TLS and rate limiters.
