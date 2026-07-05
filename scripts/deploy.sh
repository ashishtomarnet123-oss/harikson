#!/bin/bash
# ==============================================================================
# Harikson AI Platform - One-VM Automated Deployment Script
# Target OS: Ubuntu 22.04 LTS (Ace Cloud VM)
# ==============================================================================

set -e

# ANSI colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0;69m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}🚀 Starting Harikson One-VM Platform Deployer...${NC}"
echo -e "${BLUE}======================================================================${NC}"

# ==========================================
# 1. SYSTEM CHECKS
# ==========================================
echo -e "\n${BLUE}[Step 1/8] Running system specifications checks...${NC}"

# Check OS version
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "OS: $NAME ($VERSION)"
    if [ "$ID" != "ubuntu" ]; then
        echo -e "${YELLOW}⚠️ Warning: This deployment is optimized for Ubuntu. Detected: $NAME${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Warning: Could not determine OS version.${NC}"
fi

# Check memory (RAM)
total_ram=$(free -g | awk '/^Mem:/{print $2}')
echo "RAM: ${total_ram} GB"
if [ "$total_ram" -lt 16 ]; then
    echo -e "${YELLOW}⚠️ Warning: Harikson requires at least 16GB of RAM. Spec has only ${total_ram}GB.${NC}"
else
    echo -e "${GREEN}✅ RAM specifications check passed.${NC}"
fi

# Check disk space
target_partition="/mnt/docker-data"
if [ ! -d "$target_partition" ]; then
    target_partition="/"
fi
free_disk=$(df -BG "$target_partition" | awk 'NR==2 {print $4}' | sed 's/G//')
echo "Free Disk space on $target_partition: ${free_disk} GB"
if [ "$free_disk" -lt 50 ]; then
    echo -e "${YELLOW}⚠️ Warning: Recommended free disk space is at least 50GB. Detected ${free_disk}GB.${NC}"
else
    echo -e "${GREEN}✅ Disk space check passed.${NC}"
fi


# ==========================================
# 2. DOCKER INSTALLATION
# ==========================================
echo -e "\n${BLUE}[Step 2/8] Validating Docker and Docker Compose environment...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}🐳 Docker not found. Installing Docker engine...${NC}"
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
    
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
      
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Enable docker daemon without sudo for current user
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✅ Docker + Docker Compose plugin installed successfully.${NC}"
else
    echo -e "${GREEN}✅ Docker engine is already active.${NC}"
fi

# Redirect Docker & Containerd directories to the mounted 80GB block storage partition if available
if [ -d "/mnt/docker-data" ]; then
    echo -e "${YELLOW}🐳 Redirecting Docker & Containerd storage directories to /mnt/docker-data/docker-system...${NC}"
    
    # Remove custom daemon config to avoid conflicts with symlinks
    sudo rm -f /etc/docker/daemon.json
    
    # Stop active Docker/containerd services
    sudo systemctl stop docker docker.socket containerd || true
    
    # Create target directory on the block storage disk
    sudo mkdir -p /mnt/docker-data/docker-system
    
    # Migrate /var/lib/docker
    if [ -d "/var/lib/docker" ] && [ ! -L "/var/lib/docker" ]; then
        echo "Migrating /var/lib/docker files..."
        sudo mv /var/lib/docker /mnt/docker-data/docker-system/docker
    fi
    sudo mkdir -p /mnt/docker-data/docker-system/docker
    if [ ! -L "/var/lib/docker" ]; then
        sudo rm -rf /var/lib/docker
        sudo ln -s /mnt/docker-data/docker-system/docker /var/lib/docker
    fi

    # Migrate /var/lib/containerd
    if [ -d "/var/lib/containerd" ] && [ ! -L "/var/lib/containerd" ]; then
        echo "Migrating /var/lib/containerd files..."
        sudo mv /var/lib/containerd /mnt/docker-data/docker-system/containerd
    fi
    sudo mkdir -p /mnt/docker-data/docker-system/containerd
    if [ ! -L "/var/lib/containerd" ]; then
        sudo rm -rf /var/lib/containerd
        sudo ln -s /mnt/docker-data/docker-system/containerd /var/lib/containerd
    fi
    
    # Start containerd and docker back up
    echo -e "${YELLOW}⏳ Starting Containerd and Docker services...${NC}"
    sudo systemctl start containerd
    sudo systemctl start docker
    echo -e "${GREEN}✅ Docker & Containerd directories linked to block storage successfully.${NC}"
fi


# ==========================================
# 3. DIRECTORY SETUP
# ==========================================
echo -e "\n${BLUE}[Step 3/8] Setting up target workspaces directory...${NC}"

INSTALL_DIR="/mnt/docker-data/harikson"
echo "Target directory: $INSTALL_DIR"
sudo mkdir -p $INSTALL_DIR/{backend,tenant-api,admin-panel,user-portal,model-builder,scripts,data}
sudo mkdir -p $INSTALL_DIR/data/{postgres,redis,ollama,prometheus,grafana,traefik}
sudo chown -R $USER:$USER $INSTALL_DIR

echo -e "${GREEN}✅ Target installation directory structure generated.${NC}"


# ==========================================
# 4. FILE GENERATION
# ==========================================
echo -e "\n${BLUE}[Step 4/8] Generating platform configuration files...${NC}"

# Generating random secrets
jwt_secret=$(openssl rand -hex 32)
admin_secret=$(openssl rand -hex 32)
db_password=$(openssl rand -hex 16)
grafana_password=$(openssl rand -hex 12)

# Copy and populate environment file
cp scripts/.env.template $INSTALL_DIR/.env
sed -i.bak "s/GENERATED_JWT_SECRET/$jwt_secret/g" $INSTALL_DIR/.env
sed -i.bak "s/GENERATED_ADMIN_SECRET/$admin_secret/g" $INSTALL_DIR/.env
sed -i.bak "s/GENERATED_DB_PASSWORD/$db_password/g" $INSTALL_DIR/.env
sed -i.bak "s/GENERATED_GRAFANA_PASSWORD/$grafana_password/g" $INSTALL_DIR/.env
rm -f $INSTALL_DIR/.env.bak

# Copy compose and database init files if they are not already in target directory
if [ ! -f "$INSTALL_DIR/docker-compose.yml" ] || [ "$(realpath docker-compose.yml)" != "$(realpath $INSTALL_DIR/docker-compose.yml 2>/dev/null)" ]; then
    cp docker-compose.yml $INSTALL_DIR/docker-compose.yml
fi
if [ ! -f "$INSTALL_DIR/init.sql" ] || [ "$(realpath init.sql)" != "$(realpath $INSTALL_DIR/init.sql 2>/dev/null)" ]; then
    cp init.sql $INSTALL_DIR/init.sql
fi

echo -e "${GREEN}✅ Configuration parameters and .env file populated.${NC}"


# ==========================================
# 5. MODEL DOWNLOAD & PROVISION
# ==========================================
echo -e "\n${BLUE}[Step 5/8] Downloading and configuring local LLMs...${NC}"

# Start Ollama service container first
docker compose -f $INSTALL_DIR/docker-compose.yml up -d ollama

echo "⏳ Waiting for Ollama engine to become operational..."
until docker exec harikson-ollama ollama list >/dev/null 2>&1; do
    sleep 2
done

# Pull models
echo "⬇️ Downloading base model weight layers (qwen2.5:7b)..."
docker exec harikson-ollama ollama pull qwen2.5:7b
echo "⬇️ Downloading base model weight layers (qwen2.5:14b)..."
docker exec harikson-ollama ollama pull qwen2.5:14b

# Create custom branded templates
echo "🔨 Creating Harikson custom models..."
docker exec harikson-ollama sh -c "echo 'FROM qwen2.5:7b\nSYSTEM You are Harikson-Plus, an AI assistant representing the Harikson platform.' > plus.modelfile"
docker exec harikson-ollama ollama create harikson-plus -f plus.modelfile

docker exec harikson-ollama sh -c "echo 'FROM qwen2.5:14b\nSYSTEM You are Harikson-Max, a premium software engineering AI assistant.' > max.modelfile"
docker exec harikson-ollama ollama create harikson-max -f max.modelfile

echo -e "${GREEN}✅ LLM model layers pulled and branded successfully.${NC}"


# ==========================================
# 6. DATABASE INITIALIZATION
# ==========================================
echo -e "\n${BLUE}[Step 6/8] Initializing database and default credentials...${NC}"

# Stop native services on the VM that might conflict with ports 80, 443, 5432, or 6379
echo "🔌 Disabling native host services that might block HTTP/database/cache ports..."
sudo systemctl stop nginx || true
sudo systemctl disable nginx || true
sudo systemctl stop apache2 || true
sudo systemctl disable apache2 || true
sudo systemctl stop postgresql || true
sudo systemctl disable postgresql || true
sudo systemctl stop redis-server || true
sudo systemctl disable redis-server || true

# Clean up any existing broken database files to ensure clean initdb and set UID to 999 (postgres)
echo "🧹 Ensuring clean database directory and setting ownership permissions..."
sudo rm -rf $INSTALL_DIR/data/postgres/*
sudo mkdir -p $INSTALL_DIR/data/postgres
sudo chown -R 999:999 $INSTALL_DIR/data/postgres

# Start Postgres container
docker compose -f $INSTALL_DIR/docker-compose.yml up -d postgres

echo "⏳ Waiting for PostgreSQL container to become healthy..."
until [ "$(docker inspect --format='{{.State.Health.Status}}' harikson-postgres 2>/dev/null)" = "healthy" ]; do
    sleep 2
done

# Provision default superadmin account
# Email: admin@harikson.ai, Password: superadmin_pwd_2026
echo "👤 Creating default system tenant and superadmin user..."
docker exec -i harikson-postgres psql -U neuravolt -d neuravolt <<EOF
-- Create default system tenant
INSERT INTO tenants (id, name, slug, plan, status)
VALUES ('00000000-0000-0000-0000-000000000000', 'System Admin Services', 'system', 'ENTERPRISE', 'active')
ON CONFLICT (slug) DO NOTHING;

-- Create default superadmin account
INSERT INTO users (id, tenant_id, email, password_hash, role)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'admin@harikson.ai', '\$2b\$10\$wE9vM.UvJmsuH6T626e2eOasGsz4L7ZlEwO01B.fXU0D3bXz7QoKe', 'superadmin')
ON CONFLICT (tenant_id, email) DO NOTHING;
EOF

echo -e "${GREEN}✅ Database tables and defaults generated.${NC}"


# ==========================================
# 7. SERVICE STARTUP
# ==========================================
echo -e "\n${BLUE}[Step 7/8] Starting Harikson Platform stack containers...${NC}"

docker compose -f $INSTALL_DIR/docker-compose.yml up -d

echo "⏳ Waiting for Tenant API health checks..."
until [ "$(docker inspect --format='{{.State.Health.Status}}' harikson-tenant-api 2>/dev/null)" = "healthy" ]; do
    sleep 2
done

echo -e "${GREEN}✅ All containers are up, running, and healthy.${NC}"


# ==========================================
# 8. VERIFICATION TESTS
# ==========================================
echo -e "\n${BLUE}[Step 8/8] Performing diagnostic endpoint verifications...${NC}"

# Test health checks
health_response=$(curl -s -H "x-tenant-slug: system" http://localhost:3000/health || echo "FAIL")
if echo "$health_response" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Health check validation PASSED.${NC}"
else
    echo -e "${RED}❌ Health check validation FAILED. Response: $health_response${NC}"
    exit 1
fi

# Test model catalog tags
model_response=$(curl -s -H "x-tenant-slug: system" http://localhost:3000/api/models || echo "FAIL")
if echo "$model_response" | grep -q "harikson-plus"; then
    echo -e "${GREEN}✅ /api/models list validation PASSED.${NC}"
else
    echo -e "${RED}❌ /api/models list validation FAILED. Response: $model_response${NC}"
    exit 1
fi

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}🎉 HARIKSON AI PLATFORM DEPLOYED SUCCESSFULLY!${NC}"
echo -e "Access Details:"
echo -e "  - Tenant API: http://localhost:3000/health"
echo -e "  - Admin Panel: http://localhost:3001"
echo -e "  - User Portal: http://localhost:3002"
echo -e "  - Default Admin Username: admin@harikson.ai"
echo -e "  - Default Admin Password: superadmin_pwd_2026"
echo -e "${BLUE}======================================================================${NC}"
