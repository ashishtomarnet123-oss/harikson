#!/bin/bash
# scripts/model-manager.sh
# Manages Ollama model loading for 16GB VM (only one model at a time)

set -e

OLLAMA_HOST=${OLLAMA_HOST:-http://localhost:11434}
CURRENT_MODEL_FILE="/tmp/harikson-current-model"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function: Get currently loaded model
get_current_model() {
    if [ -f "$CURRENT_MODEL_FILE" ]; then
        cat "$CURRENT_MODEL_FILE"
    else
        echo "none"
    fi
}

# Function: Check memory usage
check_memory() {
    free -h | awk '/^Mem:/ {print $3 "/" $2 " (" int($3/$2*100) "%)"}'
}

# Function: Load model (unloads previous if needed)
load_model() {
    local model=$1
    local current=$(get_current_model)
    
    echo -e "${YELLOW}Current model: $current${NC}"
    echo -e "${YELLOW}Memory before: $(check_memory)${NC}"
    
    # If same model requested, just keep alive
    if [ "$current" == "$model" ]; then
        echo -e "${GREEN}Model $model already loaded. Keeping alive.${NC}"
        # Reset keep-alive timer
        curl -s -X POST "$OLLAMA_HOST/api/generate" \
            -d "{\"model\":\"$model\",\"prompt\":\" \",\"keep_alive\":\"30m\"}" > /dev/null
        return 0
    fi
    
    # Unload previous model if any
    if [ "$current" != "none" ]; then
        echo -e "${YELLOW}Unloading previous model: $current...${NC}"
        curl -s -X POST "$OLLAMA_HOST/api/generate" \
            -d "{\"model\":\"$current\",\"prompt\":\" \",\"keep_alive\":0}" > /dev/null
        sleep 2
    fi
    
    # Load new model with warm-up
    echo -e "${YELLOW}Loading $model...${NC}"
    
    # Warm-up request (loads into memory)
    curl -s -X POST "$OLLAMA_HOST/api/generate" \
        -d "{\"model\":\"$model\",\"prompt\":\"Hello\",\"keep_alive\":\"30m\"}" > /dev/null
    
    # Save current model
    echo "$model" > "$CURRENT_MODEL_FILE"
    
    echo -e "${GREEN}✓ $model loaded successfully${NC}"
    echo -e "${GREEN}Memory after: $(check_memory)${NC}"
    
    # Verify
    if curl -s "$OLLAMA_HOST/api/tags" | grep -q "\"name\":\"$model\""; then
        echo -e "${GREEN}✓ Verified: $model is active${NC}"
    else
        echo -e "${RED}✗ Failed to load $model${NC}"
        return 1
    fi
}

# Function: Unload all models (free memory)
unload_all() {
    echo -e "${YELLOW}Unloading all models...${NC}"
    
    local current=$(get_current_model)
    if [ "$current" != "none" ]; then
        curl -s -X POST "$OLLAMA_HOST/api/generate" \
            -d "{\"model\":\"$current\",\"prompt\":\" \",\"keep_alive\":0}" > /dev/null
        echo "none" > "$CURRENT_MODEL_FILE"
        sleep 2
    fi
    
    echo -e "${GREEN}✓ All models unloaded${NC}"
    echo -e "${GREEN}Memory freed: $(check_memory)${NC}"
}

# Function: Show status
status() {
    echo "=========================================="
    echo "  HARIKSON MODEL STATUS"
    echo "=========================================="
    echo "Current model: $(get_current_model)"
    echo "Memory usage: $(check_memory)"
    echo ""
    echo "Available models:"
    curl -s "$OLLAMA_HOST/api/tags" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | sed 's/^/  - /'
    echo ""
    echo "=========================================="
}

# ============================================
# COMMAND HANDLER
# ============================================

case "$1" in
    load)
        if [ -z "$2" ]; then
            echo "Usage: $0 load <model-name>"
            echo "Example: $0 load harikson-plus"
            exit 1
        fi
        load_model "$2"
        ;;
    unload)
        unload_all
        ;;
    status)
        status
        ;;
    switch)
        if [ -z "$2" ]; then
            echo "Usage: $0 switch <model-name>"
            echo "Example: $0 switch harikson-max"
            exit 1
        fi
        load_model "$2"
        ;;
    *)
        echo "Harikson Model Manager"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  load <model>     Load a model (unloads previous)"
        echo "  unload           Unload all models (free memory)"
        echo "  status           Show current status"
        echo "  switch <model>   Switch to different model"
        echo ""
        echo "Examples:"
        echo "  $0 load harikson-plus"
        echo "  $0 switch harikson-max"
        echo "  $0 unload"
        echo "  $0 status"
        exit 1
        ;;
esac
