# Disaster Recovery (DR) & Business Continuity Plan

## Executive Summary & SLA Commitments

| Metric | Commitment | Description |
| :--- | :--- | :--- |
| **RTO** (*Recovery Time Objective*) | **1 Hour** | Maximum acceptable duration of system downtime during a catastrophic failure. |
| **RPO** (*Recovery Point Objective*) | **24 Hours** | Maximum acceptable data loss duration (daily automated backup cycle). |

---

## 1. Backup Architecture & Verification

All production databases, Redis persistent states, and AI model weights are automatically backed up and verified through multi-tier automation.

### Backup Strategy & Retention Tiers

- **Daily Backups**: Retained for **7 days** (`/backups/daily`).
- **Weekly Backups**: Retained for **4 weeks** (`/backups/weekly`).
- **Monthly Backups**: Retained for **12 months** (`/backups/monthly`).
- **Yearly Backups**: Retained for **7 years** (`/backups/yearly` for tax & enterprise compliance).

### Automated Verification Pipeline

Every backup automatically triggers the integrity test script (`harikson/scripts/verify_backup.sh`):
1. **File Size Check**: Rejects backups of 0 bytes or drops $> 50\%$ from historical average.
2. **Format Header Verification**: Ensures valid PostgreSQL SQL dump header (`-- PostgreSQL database dump`).
3. **SHA-256 Checksum Computation**: Stores checksums in `backup_verification` table.
4. **Automated Docker Restore Test**:
   - Spins up an isolated, temporary PostgreSQL container (`postgres:16-alpine`).
   - Restores database dump and verifies schema integrity.
   - Asserts table counts, critical table row counts, and active RLS security policies.
   - Automatically tears down the test container upon completion.

---

## 2. Step-by-step Disaster Recovery Procedure

### Scenario A: Full Bare-Metal / VPS Server Destruction

1. **Provision New Host Infrastructure**:
   - Launch Ubuntu 22.04 LTS instance with minimum 8GB RAM, 4 vCPU, 100GB SSD.
   - Install Docker Engine & Docker Compose.

2. **Retrieve Production Backups & Environment Keys**:
   - Download the latest verified backup from S3:
     ```bash
     aws s3 cp s3://harikson-backups/backups/latest/ /mnt/docker-data/backups/ --recursive
     ```
   - Restore `/mnt/docker-data/harikson/.env` containing `JWT_SECRET` and `TENANT_MASTER_KEY` from secure vault (KMS/HashiCorp Vault).

3. **Restore Database State**:
   - Start PostgreSQL service container:
     ```bash
     cd /mnt/docker-data/harikson
     docker compose up -d postgres redis
     ```
   - Restore database dump into clean PostgreSQL container:
     ```bash
     docker exec -i harikson-postgres psql -U neuravolt -d neuravolt < /mnt/docker-data/backups/harikson_db_latest.sql
     ```

4. **Deploy Application Stack & Initial Superadmin Password Setup**:
   - Build and launch all API & portal services:
     ```bash
     docker compose build
     docker compose up -d
     ```
   - Verify health probe:
     ```bash
     curl -si http://localhost:3008/health
     ```
   - **Initial Admin Authentication Setup**:
     Deploy script `scripts/deploy.sh` automatically generates a crypto-random bcrypt-hashed admin password and outputs a single-use setup URL valid for 1 hour:
     ```text
     https://admin.neuravolt.cloud/first-login?token=<SETUP_TOKEN>
     ```
     Open the setup URL immediately to establish a new admin password before control plane access is granted. Plaintext passwords are never logged or stored.
     All administrative users restored or provisioned have `force_password_change = true` enabled by default until completing the first-login setup flow.

---

## 3. Incident Escalation & Activation Contact Matrix

| Role | Contact Name | Escalation Protocol | Response Time |
| :--- | :--- | :--- | :--- |
| **Primary DR Lead** | Lead Infrastructure Engineer | PagerDuty / Direct Cell | $< 15$ mins |
| **Database Administrator** | Senior DBA Lead | Slack `#incident-alert` | $< 15$ mins |
| **Security Officer** | CISO / Security Ops | Security Hotline | $< 30$ mins |

---

## 4. Key Rotation & Backup Security

- **Encryption at Rest**: Document contents in `knowledge_documents` are encrypted via **AES-256-GCM** using PBKDF2 (100,000 iterations) derived keys.
- **KMS Key Separation**: Database backups contain encrypted ciphertexts; master encryption keys are stored separately in KMS / Vault and never committed into DB dumps.
- **Key Rotation Command**:
  ```bash
  curl -X POST http://localhost:3008/admin/documents/rotate-keys -H "Authorization: Bearer <ADMIN_JWT>" -d '{"newKeyId": "v2"}'
  ```
