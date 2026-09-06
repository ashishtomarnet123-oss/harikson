# 🚀 Xarwiz / Harikson AI Platform — GCP Deployment & DevOps Handover Document

**Document Version:** 1.0  
**Target Platform:** Google Cloud Platform (GCP)  
**Target Architecture:** Multi-Tenant AI Operating System (Microservices + AI Engine + Vector DB)  
**Audience:** DevOps Engineers / Site Reliability Engineers (SRE)  

---

## 📌 Executive Summary & Architecture Overview

The Xarwiz platform (built on the Harikson enterprise core) is a full-stack, multi-tenant AI SaaS platform with white-labeled AI chat, workflow automation, knowledge bases (RAG), custom prompt agents, and an admin control plane.

### Core Stack & Services

| Service Name | Technology | Container Port | External Port / Routing | Role |
| :--- | :--- | :--- | :--- | :--- |
| **Traefik** | Traefik v2.11 | `80`, `443` | `80`, `443` (or `8085`, `8443`) | Reverse Proxy, SSL/TLS (Let's Encrypt), Subdomain Router |
| **User Portal** | Next.js (Node 18+) | `3002` | `3028` / `xarwiz.com` | End-user SaaS frontend & tenant apps |
| **Admin Panel** | Next.js 14 | `3001` | `3018` / `admin.neuravolt.cloud` | Admin Control Plane UI |
| **Tenant API** | Node.js Express | `3008` | `api.neuravolt.cloud` | Control Plane Backend & Multi-tenant Gateway |
| **Admin API** | Node.js Express | `4000` | `admin-api.neuravolt.cloud` | System administration & billing API |
| **Orchestrator** | Node.js / Docker API | `5001` | Internal | Container & workspace lifecycle engine |
| **PostgreSQL** | PostgreSQL 15 + `pgvector` | `5432` | `5435` (Internal) | Main database with vector embedding support |
| **Redis** | Redis 7 Alpine | `6379` | `6375` (Internal) | Caching, session management, rate limiting |
| **Ollama** | Ollama Engine | `11434` | `11435` (Internal) | Shared Local AI LLM Inference Engine |
| **Prometheus** | Prometheus | `9090` | `9098` | Telemetry & metrics collector |
| **Grafana** | Grafana | `3003` | `3038` / `monitor.neuravolt.cloud` | Monitoring dashboards |

---

## 🛠️ Deployment Strategy Options on GCP

### Option A: GCP Compute Engine (VM Instance) — *Recommended for Initial Production*
- **Best for:** Fast deployment, cost predictability, direct Docker Compose orchestration, support for GCP GPU (NVIDIA T4 / A100 for Ollama).
- **Recommended VM Spec:**
  - **Machine Type:** `n1-standard-8` (8 vCPUs, 30 GB RAM) or `n2-standard-8`
  - **GPU (Optional for AI acceleration):** 1x NVIDIA T4 (16 GB VRAM) or NVIDIA L4
  - **Disk:** 200 GB SSD (`pd-ssd`) minimum (for Docker images, vector embeddings, and LLM model weights)
  - **OS:** Ubuntu 22.04 LTS (x86_64)

### Option B: Google Kubernetes Engine (GKE) — *For Enterprise Scaling*
- Helm charts and manifests located in `/k8s` directory.
- Stateful components (PostgreSQL with `Patroni`, `PgBouncer`) can be deployed or connected to GCP Cloud SQL for PostgreSQL.

---

## 📝 Step-by-Step GCP VM Deployment Guide (DevOps Instruction)

### Step 1: Provision GCP Compute Engine Instance

Execute via Google Cloud SDK (`gcloud`) or GCP Console:

```bash
gcloud compute instances create xarwiz-prod-vm \
    --zone=asia-south1-a \
    --machine-type=n1-standard-8 \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=200GB \
    --boot-disk-type=pd-ssd \
    --tags=http-server,https-server \
    --accelerator=type=nvidia-tesla-t4,count=1 \
    --maintenance-policy=TERMINATE
```

> **Firewall Rules Needed:** Allow TCP ports `80`, `443` (HTTP/HTTPS), `22` (SSH), and optionally `3018`, `3028` for testing.

---

### Step 2: Server Environment Initialization

Run on the GCP VM instance after SSHing:

```bash
# Update system & install prerequisites
sudo apt-get update && sudo apt-get install -y \
    curl \
    git \
    rsync \
    htop \
    ufw \
    ca-certificates \
    gnupg \
    lsb-release

# Install Docker & Docker Compose Plugin
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Grant docker permissions to ubuntu user
sudo usermod -aG docker $USER

# Install NVIDIA Container Toolkit (if using GPU for Ollama)
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

---

### Step 3: Create Production Data Directories & Directory Structure

```bash
sudo mkdir -p /mnt/docker-data/harikson
sudo mkdir -p /mnt/docker-data/postgres
sudo mkdir -p /mnt/docker-data/redis
sudo mkdir -p /mnt/docker-data/ollama
sudo mkdir -p /mnt/docker-data/prometheus
sudo mkdir -p /mnt/docker-data/grafana
sudo mkdir -p /mnt/docker-data/traefik

sudo chown -R $USER:$USER /mnt/docker-data
```

---

### Step 4: Environment Variables & Secrets Configuration

Create `/mnt/docker-data/harikson/.env` on the GCP server using `.env.production` as the master template:

```ini
# Core
NODE_ENV=production
PORT=3008
DATA_DIR=/mnt/docker-data

# Security Keys (MUST BE MINIMUM 32 CHARACTERS SECURE RANDOM STRINGS)
JWT_SECRET="GENERATE_UNIQUE_SECURE_KEY_MIN_32_CHARS"
TENANT_MASTER_KEY="GENERATE_AES256_MASTER_KEY_32_CHARS"
PAYMENT_ENCRYPTION_KEY="GENERATE_PAYMENT_ENCRYPTION_KEY_32_CHARS"
NEXTAUTH_SECRET="GENERATE_NEXTAUTH_SECRET_MIN_32_CHARS"
INTERNAL_API_SECRET="GENERATE_INTERNAL_COMMUNICATION_SECRET"

# Database & Redis
DATABASE_URL="postgresql://neuravolt:PROD_DB_PASSWORD@postgres:5432/neuravolt?schema=public"
REDIS_URL="redis://redis:6379"

# Domains & Allowed Origins
ALLOWED_ORIGINS="https://xarwiz.com,https://www.xarwiz.com,https://neuravolt.cloud,https://admin.neuravolt.cloud,https://app.neuravolt.cloud"
NEXTAUTH_URL="https://xarwiz.com"
NEXTAUTH_ADMIN_URL="https://admin.neuravolt.cloud"
NEXT_PUBLIC_API_URL="https://xarwiz.com"

# Payment Gateways (Stripe & Razorpay)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
RAZORPAY_KEY_ID="rzp_live_..."
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."

# OAuth & Mail Integrations
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="https://xarwiz.com/api/v1/user/integrations/google/callback"
RESEND_API_KEY="re_..."
```

---

### Step 5: Service Launch via Docker Compose

```bash
cd /mnt/docker-data/harikson

# Pull latest registry images or build locally
docker compose pull || docker compose build

# Run Database Migration First
docker compose run --rm tenant-api npm run migrate

# Start all services in detached mode
docker compose up -d

# Verify Container Health
docker compose ps
```

---

### Step 6: GitHub Actions CI/CD Pipeline Setup

Ensure the following GitHub Secrets are configured under **Repo Settings > Secrets and Variables > Actions**:

- `PROD_HOST`: Public IP of your GCP Compute Engine VM instance.
- `PROD_USER`: `ubuntu` (or deployment username).
- `PROD_SSH_KEY`: Private SSH Key corresponding to public key added to GCP instance metadata.
- `SLACK_WEBHOOK_URL`: (Optional) Slack notification endpoint for deployment status.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Production Google OAuth credentials.

The CI/CD pipeline defined in `.github/workflows/deploy-prod.yml` will automatically perform:
1. Build & tag Docker images to GitHub Container Registry (`ghcr.io`).
2. SCP config files to `/mnt/docker-data/harikson`.
3. Blue-Green rolling deployment (`docker compose up -d --scale tenant-api=2`).
4. Health probe verification against `/health` endpoints.
5. Automatic zero-downtime traffic switch and obsolete container cleanup.

---

## 🔒 Security & Hardening Checklist for DevOps

1. **Firewall & Ports:**
   - Expose **ONLY** ports `80` and `443` publicly to Traefik.
   - Restrict administrative ports (`9098` Prometheus, `3038` Grafana, `5435` Postgres, `6375` Redis, `11435` Ollama) to loopback `127.0.0.1` or GCP Cloud VPN / Private IP subnet.
2. **Secrets Management:**
   - Ensure root `.env` file permissions are set to `chmod 600 .env`.
   - Never commit `.env` or production secrets to Git.
3. **Database Automated Backup Script:**
   - Configure a cron job for automated daily PostgreSQL & Vector database backups using `scripts/backup.sh` to a GCP Cloud Storage (GCS) Bucket:
   ```bash
   crontab -e
   # Add daily backup at 2:00 AM UTC
   0 2 * * * /mnt/docker-data/harikson/scripts/backup.sh >> /var/log/harikson-backup.log 2>&1
   ```

---

## 📊 Verification & Health Check Endpoints

| Target | URL | Expected Response |
| :--- | :--- | :--- |
| **Tenant API Health** | `https://api.neuravolt.cloud/health` | `{"status":"healthy","checks":{...}}` |
| **Admin API Health** | `https://admin-api.neuravolt.cloud/health` | `{"status":"healthy","checks":{...}}` |
| **User Portal** | `https://xarwiz.com/` | `HTTP 200 OK` |
| **Admin Panel** | `https://admin.neuravolt.cloud/login` | `HTTP 200 OK` |
| **Traefik Dashboard** | `https://traefik.neuravolt.cloud` | Prompt for HTTP Basic Auth |

---

## 📞 DevOps Support & Escalation Contacts

- **Lead Architect / CTO:** Xarwiz Core Architecture Team
- **Repository Link:** `https://github.com/ashishtomarnet123-oss/harikson.git`
- **Deployment Script Reference:** `scripts/deploy-to-vm.sh` & `.github/workflows/deploy-prod.yml`
