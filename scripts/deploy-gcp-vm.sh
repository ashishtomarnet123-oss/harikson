#!/bin/bash
# scripts/deploy-gcp-vm.sh
# Deploy Harikson / Xarwiz to GCP VM using SSH Key (~/.ssh/xarwiz) into /opt/xarwiz

set -e

VM_USER="xarwiz"
VM_HOST="34.131.69.8"
SSH_KEY="~/.ssh/xarwiz"
TARGET_DIR="/opt/xarwiz"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}==========================================${NC}"
echo -e "${YELLOW}  Deploying Xarwiz to GCP VM: ${VM_USER}@${VM_HOST}${NC}"
echo -e "${YELLOW}  Using Key: ${SSH_KEY}${NC}"
echo -e "${YELLOW}  Target Directory: ${TARGET_DIR}${NC}"
echo -e "${YELLOW}==========================================${NC}"

# Step 1: Ensure target directory exists on GCP VM with write permissions
echo -e "${YELLOW}1. Preparing target directory on GCP VM...${NC}"
ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no ${VM_USER}@${VM_HOST} "sudo mkdir -p ${TARGET_DIR} && sudo chown -R ${VM_USER}:${VM_USER} ${TARGET_DIR}"

# Step 2: Sync codebase to target VM
echo -e "${YELLOW}2. Syncing codebase via rsync...${NC}"
rsync -avz -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='data' \
    --exclude='postgres-data' \
    --exclude='redis-data' \
    ./ ${VM_USER}@${VM_HOST}:${TARGET_DIR}/

# Step 3: Build & Launch Docker containers on target VM
echo -e "${YELLOW}3. Building & Launching Docker containers on GCP VM...${NC}"
ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no ${VM_USER}@${VM_HOST} << 'REMOTE_COMMANDS'
    set -e
    cd /opt/xarwiz

    echo "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        echo "Docker not found! Installing Docker on Debian/Ubuntu..."
        sudo apt-get update
        sudo apt-get install -y docker.io docker-compose || sudo apt-get install -y docker.io docker-compose-plugin
        sudo usermod -aG docker $USER || true
    fi

    # Determine compose command
    DOCKER_COMPOSE="docker compose"
    if ! docker compose version &> /dev/null 2>&1; then
        if command -v docker-compose &> /dev/null; then
            DOCKER_COMPOSE="docker-compose"
        else
            echo "Installing docker-compose..."
            sudo apt-get update && sudo apt-get install -y docker-compose
            DOCKER_COMPOSE="docker-compose"
        fi
    fi

    echo "Using Docker Compose command: $DOCKER_COMPOSE"

    echo "Fixing persistent volume permissions..."
    DATA_DIR="${DATA_DIR:-./data}"
    sudo mkdir -p "$DATA_DIR"/{postgres,redis,grafana,prometheus,ollama,traefik}
    sudo chown -R 999:999   "$DATA_DIR/postgres"
    sudo chown -R 472:472   "$DATA_DIR/grafana"
    sudo chown -R 65534:65534 "$DATA_DIR/prometheus"

    echo "Stopping existing containers..."
    sudo $DOCKER_COMPOSE down --remove-orphans || true

    echo "Building services..."
    sudo $DOCKER_COMPOSE build user-portal admin-panel admin-api tenant-api || true

    echo "Starting services..."
    sudo $DOCKER_COMPOSE up -d

    echo "Waiting for services to initialize..."
    sleep 10

    echo "Verifying running containers:"
    sudo $DOCKER_COMPOSE ps
REMOTE_COMMANDS

echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  DEPLOYMENT TO GCP COMPLETED SUCCESSFULLY!${NC}"
echo -e "${GREEN}==========================================${NC}"
