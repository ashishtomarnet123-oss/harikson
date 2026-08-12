#!/bin/bash
# scripts/deploy-to-vm.sh
# Deploys Harikson from GitHub to your VM

set -e

# Configuration
VM_USER="xarwiz"
VM_HOST="34.131.140.10"
# Same key pair used for the GitHub Actions PROD_SSH_KEY secret — see
# deploy-prod.yml. This script is a manual alternative to that CD pipeline
# and needs its own local copy of the private key (GitHub Secrets are only
# readable by Actions runners, not from your machine).
VM_KEY="$HOME/.ssh/harikson_deploy_key"
VM_PATH="/opt/xarwiz"
GITHUB_REPO="https://github.com/ashishtomarnet123-oss/harikson.git"
BRANCH="main"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "  HARIKSON DEPLOYMENT TO VM"
echo "=========================================="
echo "VM: $VM_HOST"
echo "Path: $VM_PATH"
echo "=========================================="

# Step 1: Push to GitHub (if local changes)
echo ""
echo -e "${YELLOW}Step 1: Pushing to GitHub...${NC}"
if [ -d ".git" ]; then
    git add -A
    git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')" || true
    git push origin $BRANCH
    echo -e "${GREEN}✓ Pushed to GitHub${NC}"
else
    echo -e "${RED}✗ Not a git repository. Initialize first:${NC}"
    echo "  git init"
    echo "  git remote add origin $GITHUB_REPO"
    echo "  git add -A"
    echo "  git commit -m 'Initial commit'"
    echo "  git push -u origin main"
    exit 1
fi

# Step 2: Sync files to VM and deploy
echo ""
echo -e "${YELLOW}Step 2: Syncing codebase to VM ($VM_HOST)...${NC}"

ssh -o ServerAliveInterval=30 -i "$VM_KEY" "$VM_USER@$VM_HOST" "sudo mkdir -p $VM_PATH && sudo chown -R $VM_USER:$VM_USER $VM_PATH"

rsync -avz -e "ssh -i $VM_KEY -o ServerAliveInterval=30" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='postgres-data' \
    --exclude='redis-data' \
    ./ "$VM_USER@$VM_HOST:$VM_PATH/"

echo -e "${GREEN}✓ Codebase synced to VM${NC}"

echo ""
echo -e "${YELLOW}Step 3: Building and Re-launching services on VM...${NC}"

ssh -o ServerAliveInterval=30 -o ServerAliveCountMax=20 -i "$VM_KEY" "$VM_USER@$VM_HOST" << 'REMOTE_SCRIPT'
    set -e

    cd /opt/xarwiz

    echo "Stopping existing containers and freeing up disk space on VM..."
    docker compose down --remove-orphans || true
    
    CONTS=$(docker ps -aq)
    if [ ! -z "$CONTS" ]; then
        echo "Removing containers: $CONTS"
        docker stop $CONTS || true
        docker rm -f $CONTS || true
    fi
    
    docker system prune -af --volumes || true
    docker builder prune -af || true
    sudo rm -rf /tmp/* || true
    
    echo "Building Harikson services..."
    docker compose build user-portal admin-panel admin-api tenant-api || true
    
    echo "Starting Harikson services..."
    docker compose up -d
REMOTE_SCRIPT

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  DEPLOYMENT SUCCESSFUL!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Visit http://$VM_HOST:3018 (Admin Panel)"
echo "  2. Create your first tenant"
echo "  3. Visit tenant subdomain to test chat"
echo ""
echo "To check logs:"
echo "  ssh -i $VM_KEY $VM_USER@$VM_HOST 'cd $VM_PATH && docker compose logs -f'"
