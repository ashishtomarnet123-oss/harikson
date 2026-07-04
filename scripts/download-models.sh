#!/bin/bash
# scripts/download-models.sh
# Downloads and creates Harikson-branded models on Ollama

set -e

echo "=========================================="
echo "  HARIKSON MODEL DOWNLOADER"
echo "=========================================="

OLLAMA_HOST=${OLLAMA_HOST:-http://localhost:11434}
MAX_RETRIES=5
RETRY_DELAY=10

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function: Wait for Ollama to be ready
wait_for_ollama() {
    echo -e "${YELLOW}Waiting for Ollama to be ready...${NC}"
    for i in $(seq 1 $MAX_RETRIES); do
        if curl -s "$OLLAMA_HOST/api/tags" > /dev/null 2>&1; then
            echo -e "${GREEN}Ollama is ready!${NC}"
            return 0
        fi
        echo "Attempt $i/$MAX_RETRIES failed. Retrying in ${RETRY_DELAY}s..."
        sleep $RETRY_DELAY
    done
    echo -e "${RED}Ollama failed to start after $MAX_RETRIES attempts${NC}"
    exit 1
}

# Function: Check if model exists
model_exists() {
    local model_name=$1
    curl -s "$OLLAMA_HOST/api/tags" | grep -q "\"name\":\"$model_name\""
}

# Function: Pull base model with retry
pull_model() {
    local model=$1
    echo -e "${YELLOW}Pulling $model...${NC}"
    
    for i in $(seq 1 $MAX_RETRIES); do
        if ollama pull "$model"; then
            echo -e "${GREEN}Successfully pulled $model${NC}"
            return 0
        fi
        echo -e "${RED}Attempt $i failed. Retrying...${NC}"
        sleep $RETRY_DELAY
    done
    
    echo -e "${RED}Failed to pull $model after $MAX_RETRIES attempts${NC}"
    exit 1
}

# Function: Create branded model
create_branded_model() {
    local base_model=$1
    local branded_name=$2
    local modelfile=$3
    
    echo -e "${YELLOW}Creating $branded_name from $base_model...${NC}"
    
    # Create temporary Modelfile
    cat > /tmp/$branded_name.modelfile << EOF
FROM $base_model

SYSTEM """$(grep -A 20 "SYSTEM" "$modelfile" | head -n 1 | sed 's/SYSTEM """//')"""

PARAMETER temperature $(grep "temperature" "$modelfile" | awk '{print $2}')
PARAMETER top_p $(grep "top_p" "$modelfile" | awk '{print $2}')
PARAMETER num_ctx $(grep "num_ctx" "$modelfile" | awk '{print $2}')
EOF

    # Create model
    ollama create "$branded_name" -f /tmp/$branded_name.modelfile
    
    # Verify
    if model_exists "$branded_name"; then
        echo -e "${GREEN}✓ $branded_name created successfully${NC}"
    else
        echo -e "${RED}✗ Failed to create $branded_name${NC}"
        exit 1
    fi
    
    # Cleanup
    rm -f /tmp/$branded_name.modelfile
}

# ============================================
# MAIN EXECUTION
# ============================================

echo "Step 1: Checking Ollama..."
wait_for_ollama

echo ""
echo "Step 2: Pulling base models..."

# Pull base models (these are the actual Qwen models)
if ! model_exists "qwen2.5:7b"; then
    pull_model "qwen2.5:7b"
else
    echo -e "${GREEN}qwen2.5:7b already exists${NC}"
fi

if ! model_exists "qwen2.5:14b"; then
    pull_model "qwen2.5:14b"
else
    echo -e "${GREEN}qwen2.5:14b already exists${NC}"
fi

echo ""
echo "Step 3: Creating Harikson-branded models..."

# Create Harikson-Plus (based on Qwen 7B)
if ! model_exists "harikson-plus"; then
    create_branded_model "qwen2.5:7b" "harikson-plus" "model-builder/harikson-plus.modelfile"
else
    echo -e "${GREEN}harikson-plus already exists${NC}"
fi

# Create Harikson-Max (based on Qwen 14B)
if ! model_exists "harikson-max"; then
    create_branded_model "qwen2.5:14b" "harikson-max" "model-builder/harikson-max.modelfile"
else
    echo -e "${GREEN}harikson-max already exists${NC}"
fi

echo ""
echo "Step 4: Verifying all models..."

echo "Available models:"
curl -s "$OLLAMA_HOST/api/tags" | grep -o '"name":"[^"]*"' | cut -d'"' -f4

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  MODEL DOWNLOAD COMPLETE!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "Models ready:"
echo "  - harikson-plus (Qwen 2.5 7B, ~4.7GB)"
echo "  - harikson-max (Qwen 2.5 14B, ~9.0GB)"
echo ""
echo "Total disk used: ~13.7GB"
echo "RAM needed for both: ~13.7GB (loaded one at a time)"
