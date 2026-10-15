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

    # Write production .env on VM
    cat << 'ENVEOF' > .env
NODE_ENV=production
DATA_DIR=/opt/xarwiz/data
POSTGRES_USER=neuravolt
POSTGRES_PASSWORD=neuravolt_dev_pwd
POSTGRES_DB=neuravolt
DATABASE_URL=postgresql://neuravolt:neuravolt_dev_pwd@postgres:5432/neuravolt
REDIS_URL=redis://:harikson_redis_pwd@redis:6379
REDIS_PASSWORD=harikson_redis_pwd
JWT_SECRET=fa363ef72694cfa20cdf6fd5b236f22d171666ea8820793fa315242098c6221d
TENANT_MASTER_KEY=bb08035417602a3a24ece51deef91936ee687eb6c58ac2c6837e80f32deba55d
PAYMENT_ENCRYPTION_KEY=f29be28299aee78109431e43e66ec75933d11624a150ff1dd8087e2f003e744a
NEXTAUTH_SECRET=neuravolt_dev_jwt_secret_key_extremely_long_and_secure_value_12345!
NEXTAUTH_URL=https://xarwiz.com
NEXTAUTH_ADMIN_URL=https://admin.xarwiz.com
NEXT_PUBLIC_API_URL=https://api.xarwiz.com
ALLOWED_ORIGINS=https://xarwiz.com,https://www.xarwiz.com,https://admin.xarwiz.com,https://api.xarwiz.com,http://${VM_IP}:3001,http://${VM_IP}:3002,http://${VM_IP}:3008,http://${VM_IP}:3018,http://${VM_IP}:3028
GF_SECURITY_ADMIN_PASSWORD=Admin@1234
ENVEOF

    # Fix permissions for data volumes
    sudo mkdir -p ${REMOTE_PATH}/data/{postgres,redis,grafana,prometheus,ollama,traefik}
    sudo touch ${REMOTE_PATH}/data/traefik/acme.json
    sudo chmod 600 ${REMOTE_PATH}/data/traefik/acme.json
    sudo chown -R 999:999 ${REMOTE_PATH}/data/postgres 2>/dev/null || true
    sudo chown -R 472:472 ${REMOTE_PATH}/data/grafana 2>/dev/null || true
    sudo chown -R 65534:65534 ${REMOTE_PATH}/data/prometheus 2>/dev/null || true

    # Adjust external ports and domain API URL in docker-compose.yml
    sed -i 's/127.0.0.1://g' docker-compose.yml
    sed -i "s/cpus: '7.0'/cpus: '3.5'/g" docker-compose.yml

    # Restart & Build services
    echo "Updating containers and configuring Traefik on port 80/443..."
    sudo docker compose up -d postgres redis
    sudo docker compose build admin-api tenant-api admin-panel user-portal
    sudo docker compose up -d --force-recreate traefik admin-api tenant-api admin-panel user-portal ollama
REMOTE_SCRIPT

echo -e "${GREEN}✓ Remote build & launch finished${NC}"

# 5. Health Check Verification
echo -e "\n${YELLOW}[Step 4/4] Verifying live services & domain...${NC}"
sleep 8

API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://api.xarwiz.com/health" 2>/dev/null || echo "failed")
DOMAIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://xarwiz.com" 2>/dev/null || echo "failed")
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://admin.xarwiz.com/admin/login" 2>/dev/null || echo "failed")

IP_API=$(curl -s -o /dev/null -w "%{http_code}" "http://${VM_IP}:3008/health" || echo "failed")
IP_ADMIN=$(curl -s -o /dev/null -w "%{http_code}" "http://${VM_IP}:3018/admin/login" || echo "failed")
IP_PORTAL=$(curl -s -o /dev/null -w "%{http_code}" "http://${VM_IP}:3028/login" || echo "failed")

echo -e "Direct IP Tenant API (Port 3008):   ${GREEN}HTTP ${IP_API}${NC}"
echo -e "Direct IP Admin Panel (Port 3018):  ${GREEN}HTTP ${IP_ADMIN}${NC}"
echo -e "Direct IP User Portal (Port 3028):  ${GREEN}HTTP ${IP_PORTAL}${NC}"
echo -e "Domain User Portal (xarwiz.com):    ${GREEN}HTTP ${DOMAIN_STATUS}${NC}"
echo -e "Domain Admin (admin.xarwiz.com):    ${GREEN}HTTP ${ADMIN_STATUS}${NC}"
echo -e "Domain API (api.xarwiz.com):        ${GREEN}HTTP ${API_STATUS}${NC}"

echo -e "\n${GREEN}======================================================================${NC}"
echo -e "${GREEN}🎉 DOMAIN DEPLOYMENT TO XARWIZ.COM COMPLETED SUCCESSFULLY!${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e "Main Website: https://xarwiz.com"
echo -e "Admin Panel:  https://admin.xarwiz.com/admin/login"
echo -e "Tenant API:   https://api.xarwiz.com/health"
echo -e "Direct IP:    http://${VM_IP}:3018/admin/login"

