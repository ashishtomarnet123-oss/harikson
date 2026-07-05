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

ssh -i $VM_KEY $VM_USER@$VM_HOST << 'REMOTE_SCRIPT'
    set -e
    
    echo "Connected to VM"
    
    # Go to project directory
    sudo mkdir -p /mnt/docker-data && sudo chown -R ubuntu:ubuntu /mnt/docker-data && cd /mnt/docker-data
    
    # Backup current (if exists)
    if [ -d "harikson-backup" ]; then
        rm -rf harikson-backup
    fi
    if [ -d "harikson" ]; then
        mv harikson harikson-backup
    fi
    
    # Clone fresh from GitHub
    echo "Cloning from GitHub..."
    git clone https://github.com/ashishtomarnet123-oss/harikson.git
    
    cd harikson
    
    # Create .env from template
    if [ ! -f ".env" ]; then
      if [ -f "scripts/.env.template" ]; then
        cp scripts/.env.template .env
      elif [ -f ".env.example" ]; then
        cp .env.example .env
      else
        touch .env
      fi
      
      # Generate secrets
      JWT_SECRET=$(openssl rand -hex 32)
      ADMIN_SECRET=$(openssl rand -hex 32)
      DB_PASSWORD=$(openssl rand -hex 16)
      GRAFANA_PASSWORD=$(openssl rand -hex 12)
      
      sed -i.bak "s/GENERATED_JWT_SECRET/$JWT_SECRET/g" .env
      sed -i.bak "s/GENERATED_ADMIN_SECRET/$admin_secret/g" .env
      sed -i.bak "s/GENERATED_DB_PASSWORD/$DB_PASSWORD/g" .env
      sed -i.bak "s/GENERATED_GRAFANA_PASSWORD/$GRAFANA_PASSWORD/g" .env
      rm -f .env.bak
      
      echo "✓ .env created with generated secrets"
    fi
    
    # Stop old containers (if any)
    echo "Stopping old containers..."
    docker compose down 2>/dev/null || true
    
    # Start infrastructure
    echo "Starting infrastructure..."
    docker compose up -d postgres redis ollama
    
    # Wait for PostgreSQL
    echo "Waiting for PostgreSQL..."
    sleep 15
    
    # Run database init (fallback check for container database names)
    echo "Initializing database..."
    docker exec harikson-postgres psql -U neuravolt -d neuravolt -f /docker-entrypoint-initdb.d/init.sql 2>/dev/null || \
    docker exec harikson-db psql -U harikson -d harikson -f /docker-entrypoint-initdb.d/init.sql 2>/dev/null || true
    
    # Download models (if not exists)
    echo "Checking models..."
    chmod +x scripts/download-models.sh
    ./scripts/download-models.sh || echo "Model download will be retried"
    
    # Build and start services
    echo "Building and starting services..."
    docker compose up -d --build tenant-api admin-panel user-portal traefik
    
    # Start monitoring
    docker compose up -d prometheus grafana
    
    # Show status
    echo ""
    echo "=========================================="
    echo "  DEPLOYMENT COMPLETE"
    echo "=========================================="
    echo "Services:"
    docker compose ps
    echo ""
    echo "Access URLs:"
    echo "  Admin Panel:  http://154.201.127.68:3001"
    echo "  User Portal:  http://154.201.127.68:3002"
    echo "  API:          http://154.201.127.68:3000"
    echo "  Traefik:      http://154.201.127.68:8080"
    echo "  Grafana:      http://154.201.127.68:3003"
    echo "=========================================="
REMOTE_SCRIPT

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  DEPLOYMENT SUCCESSFUL!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Visit http://$VM_HOST:3001 (Admin Panel)"
echo "  2. Create your first tenant"
echo "  3. Visit tenant subdomain to test chat"
echo ""
echo "To check logs:"
echo "  ssh -i $VM_KEY $VM_USER@$VM_HOST 'cd $VM_PATH/harikson && docker compose logs -f'"
