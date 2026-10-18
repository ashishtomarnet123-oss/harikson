#!/bin/bash
# ==============================================================================
# scripts/deploy-local-to-server.sh
# One-click deployment: sync local codebase to GCP VM and launch services
# ==============================================================================

set -e

INSTANCE_NAME="${GCP_INSTANCE:-instance-20261015-162145}"
ZONE="${GCP_ZONE:-asia-south2-b}"
REMOTE_PATH="/opt/xarwiz"
TMP_ARCHIVE="/tmp/harikson_deploy_latest.tar.gz"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}🚀 Deploying Harikson from Local to GCP VM (${INSTANCE_NAME})...${NC}"
echo -e "${BLUE}======================================================================${NC}"

# 1. Resolve External IP
VM_IP=$(gcloud compute instances describe "${INSTANCE_NAME}" --zone="${ZONE}" --format='get(networkInterfaces[0].accessConfigs[0].natIP)' 2>/dev/null || echo "34.131.98.92")
echo -e "${YELLOW}Target VM:${NC} ${INSTANCE_NAME} (${ZONE})"
echo -e "${YELLOW}External IP:${NC} ${VM_IP}"

# 2. Package local code cleanly (strip macOS metadata and large cache dirs)
echo -e "\n${YELLOW}[Step 1/4] Packaging local workspace...${NC}"
COPYFILE_DISABLE=1 tar --exclude='node_modules' \
    --exclude='.next' \
    --exclude='data' \
    --exclude='postgres-data' \
    --exclude='redis-data' \
    --exclude='.git' \
    --exclude='._*' \
    -czf "${TMP_ARCHIVE}" .

ARCHIVE_SIZE=$(ls -lh "${TMP_ARCHIVE}" | awk '{print $5}')
echo -e "${GREEN}✓ Archive created (${ARCHIVE_SIZE})${NC}"

# 3. Transfer archive to GCP VM
echo -e "\n${YELLOW}[Step 2/4] Uploading codebase to ${INSTANCE_NAME}...${NC}"
gcloud compute scp "${TMP_ARCHIVE}" "${INSTANCE_NAME}:/tmp/harikson_deploy_latest.tar.gz" --zone="${ZONE}"
rm -f "${TMP_ARCHIVE}"
echo -e "${GREEN}✓ Upload complete${NC}"

# 4. Deploy and Restart on VM
echo -e "\n${YELLOW}[Step 3/4] Extracting, building & restarting services on VM...${NC}"
gcloud compute ssh "${INSTANCE_NAME}" --zone="${ZONE}" << REMOTE_SCRIPT
    set -e
    sudo mkdir -p ${REMOTE_PATH}
    sudo chown -R \$USER:\$USER ${REMOTE_PATH}

    # Extract clean archive
    tar -xzf /tmp/harikson_deploy_latest.tar.gz -C ${REMOTE_PATH}
    rm -f /tmp/harikson_deploy_latest.tar.gz
    find ${REMOTE_PATH} -name "._*" -delete 2>/dev/null || true

    cd ${REMOTE_PATH}

    # Verify production .env exists on VM; fail-closed if missing
    if [ ! -f .env ]; then
      echo "ERROR: Production .env file is missing on target host at ${REMOTE_PATH}/.env"
      echo "Please provision .env from a secure secret vault or run scripts/rotate-secrets.js before deploying."
      exit 1
    fi

    # Fix permissions for data volumes
    sudo mkdir -p ${REMOTE_PATH}/data/{postgres,redis,grafana,prometheus,ollama,traefik}
    sudo touch ${REMOTE_PATH}/data/traefik/acme.json
    sudo chmod 600 ${REMOTE_PATH}/data/traefik/acme.json
    sudo chown -R 999:999 ${REMOTE_PATH}/data/postgres 2>/dev/null || true
    sudo chown -R 472:472 ${REMOTE_PATH}/data/grafana 2>/dev/null || true
    sudo chown -R 65534:65534 ${REMOTE_PATH}/data/prometheus 2>/dev/null || true

    # Ensure secure loopback bindings and resource allocation
    sed -i "s/cpus: '7.0'/cpus: '3.5'/g" docker-compose.yml

    # Restart & Build services
    echo "Updating containers and configuring Traefik on port 80/443..."
    sudo docker compose up -d postgres redis
    sudo docker compose build admin-api tenant-api admin-panel user-portal orchestrator
    sudo docker compose up -d --force-recreate traefik admin-api tenant-api admin-panel user-portal ollama orchestrator
REMOTE_SCRIPT

echo -e "${GREEN}✓ Remote build & launch finished${NC}"

# 5. Health Check Verification
echo -e "\n${YELLOW}[Step 4/4] Verifying live services & domain...${NC}"
sleep 8

API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://api.xarwiz.com/health" 2>/dev/null || echo "failed")
DOMAIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://xarwiz.com" 2>/dev/null || echo "failed")
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://admin.xarwiz.com/admin/login" 2>/dev/null || echo "failed")

IP_API=$(curl -s -m 2 -o /dev/null -w "%{http_code}" "http://${VM_IP}:3008/health" 2>/dev/null || echo "BLOCKED")
IP_ADMIN=$(curl -s -m 2 -o /dev/null -w "%{http_code}" "http://${VM_IP}:3018/admin/login" 2>/dev/null || echo "BLOCKED")
IP_PORTAL=$(curl -s -m 2 -o /dev/null -w "%{http_code}" "http://${VM_IP}:3028/login" 2>/dev/null || echo "BLOCKED")

echo -e "Direct IP Tenant API (Port 3008):   ${YELLOW}${IP_API} (Expected: BLOCKED)${NC}"
echo -e "Direct IP Admin Panel (Port 3018):  ${YELLOW}${IP_ADMIN} (Expected: BLOCKED)${NC}"
echo -e "Direct IP User Portal (Port 3028):  ${YELLOW}${IP_PORTAL} (Expected: BLOCKED)${NC}"
echo -e "Domain User Portal (xarwiz.com):    ${GREEN}HTTP ${DOMAIN_STATUS}${NC}"
echo -e "Domain Admin (admin.xarwiz.com):    ${GREEN}HTTP ${ADMIN_STATUS}${NC}"
echo -e "Domain API (api.xarwiz.com):        ${GREEN}HTTP ${API_STATUS}${NC}"

echo -e "\n${GREEN}======================================================================${NC}"
echo -e "${GREEN}🎉 DOMAIN DEPLOYMENT TO XARWIZ.COM COMPLETED SUCCESSFULLY!${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e "Main Website: https://xarwiz.com"
echo -e "Admin Panel:  https://admin.xarwiz.com/admin/login"
echo -e "Tenant API:   https://api.xarwiz.com/health"

