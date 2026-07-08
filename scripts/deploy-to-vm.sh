#!/bin/bash
# scripts/deploy-to-vm.sh
# Deploys Harikson from GitHub to your VM

set -e

# Configuration
VM_USER="ubuntu"
VM_HOST="154.201.127.68"
VM_KEY="~/Downloads/app.pem"
VM_PATH="/mnt/docker-data"
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

# Step 2: SSH into VM and deploy
echo ""
echo -e "${YELLOW}Step 2: Deploying to VM...${NC}"

ssh -o ServerAliveInterval=30 -o ServerAliveCountMax=20 -i $VM_KEY $VM_USER@$VM_HOST << 'REMOTE_SCRIPT'
    set -e
    
    echo "Connected to VM"
    
    sudo mkdir -p /mnt/docker-data/harikson && sudo chown -R ubuntu:ubuntu /mnt/docker-data/harikson && cd /mnt/docker-data
    
    # Stop active containers first to release active mount locks
    if [ -d "harikson" ]; then
        echo "Stopping active containers to release mount locks..."
        cd harikson && docker compose down 2>/dev/null || true
        cd ..
    fi
    
    # Backup current (if exists)
    if [ -d "harikson-backup" ]; then
        sudo rm -rf harikson-backup
    fi
    if [ -d "harikson" ]; then
        mv harikson harikson-backup
    fi
    
    # Clone fresh from GitHub
    echo "Cloning from GitHub..."
    git clone https://github.com/ashishtomarnet123-oss/harikson.git
    
    cd harikson
    
    # Run the comprehensive deploy.sh script to handle Docker installation,
    # directory setup, model download, database init, and services startup.
    echo "Running deploy.sh..."
    chmod +x scripts/*.sh
    ./scripts/deploy.sh
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
echo "  ssh -i $VM_KEY $VM_USER@$VM_HOST 'cd $VM_PATH/harikson && docker compose logs -f'"
