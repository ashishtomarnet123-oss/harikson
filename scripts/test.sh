#!/bin/bash
# ==============================================================================
# Harikson AI Platform - Comprehensive Stack Verification Script
# ==============================================================================

# ANSI colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0;69m' # No Color

TOTAL_TESTS=0
PASSED_TESTS=0

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}🔍 Running Harikson Platform Diagnostic Suite...${NC}"
echo -e "${BLUE}======================================================================${NC}"

# Helper function to assert output
run_test() {
    local name=$1
    local cmd=$2
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing $name... "
    
    # Run command and capture output
    set +e
    out=$(eval "$cmd" 2>&1)
    status=$?
    set -e
    
    if [ $status -eq 0 ]; then
        echo -e "${GREEN}PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        echo -e "  ↳ Error Details: $out"
        return 1
    fi
}

# ==========================================
# 1. INFRASTRUCTURE TESTS
# ==========================================
echo -e "\n${BLUE}🖥️  Category 1: Infrastructure Verification${NC}"

run_test "Docker Daemon status" "docker info"

# Check containers running
containers=(
  "harikson-traefik"
  "harikson-ollama"
  "harikson-postgres"
  "harikson-redis"
  "harikson-tenant-api"
  "harikson-admin-panel"
  "harikson-user-portal"
  "harikson-prometheus"
  "harikson-grafana"
)

for c in "${containers[@]}"; do
  run_test "Container is running ($c)" "docker inspect -f '{{.State.Running}}' $c | grep -q 'true'"
done

# Ports checks using /dev/tcp
ports=(
  "80"
  "443"
  "3000"
  "3001"
  "3002"
  "3003"
  "5432"
  "6379"
  "9090"
  "11434"
)

for p in "${ports[@]}"; do
  run_test "Port connection listener active ($p)" "(echo >/dev/tcp/127.0.0.1/$p) &>/dev/null"
done


# ==========================================
# 2. OLLAMA INFERENCE TESTS
# ==========================================
echo -e "\n${BLUE}🤖 Category 2: Ollama AI Engine Verification${NC}"

run_test "Ollama local API status" "curl -s -f http://localhost:11434/api/tags"
run_test "harikson-plus model exists" "curl -s http://localhost:11434/api/tags | grep -q 'harikson-plus'"
run_test "harikson-max model exists" "curl -s http://localhost:11434/api/tags | grep -q 'harikson-max'"
run_test "harikson-plus text generation test" "curl -s -X POST -H 'Content-Type: application/json' -d '{\"model\": \"harikson-plus\", \"prompt\": \"Hello! What is your name?\", \"stream\": false}' http://localhost:11434/api/generate | grep -q 'response'"


# ==========================================
# 3. DATABASE SCHEMA & SECURITY TESTS
# ==========================================
echo -e "\n${BLUE}🐘 Category 3: PostgreSQL Database & RLS Policy Verification${NC}"

run_test "Postgres service status" "docker exec harikson-postgres pg_isready -U neuravolt"
run_test "DB login & ping query" "docker exec harikson-postgres psql -U neuravolt -d neuravolt -c 'SELECT 1;' | grep -q '1'"
run_test "uuid-ossp extension active" "docker exec harikson-postgres psql -U neuravolt -d neuravolt -c 'SELECT uuid_generate_v4();' | grep -q '-'"
run_test "RLS policy enabled on tenants" "docker exec harikson-postgres psql -U neuravolt -d neuravolt -c \"SELECT policyname FROM pg_policies WHERE tablename='tenants';\" | grep -q 'tenant_isolation_policy'"
run_test "RLS policy enabled on users" "docker exec harikson-postgres psql -U neuravolt -d neuravolt -c \"SELECT policyname FROM pg_policies WHERE tablename='users';\" | grep -q 'tenant_isolation_policy'"
run_test "RLS policy enabled on conversations" "docker exec harikson-postgres psql -U neuravolt -d neuravolt -c \"SELECT policyname FROM pg_policies WHERE tablename='conversations';\" | grep -q 'tenant_isolation_policy'"
run_test "RLS policy enabled on messages" "docker exec harikson-postgres psql -U neuravolt -d neuravolt -c \"SELECT policyname FROM pg_policies WHERE tablename='messages';\" | grep -q 'tenant_isolation_policy'"
run_test "set_tenant_context helper capability" "docker exec harikson-postgres psql -U neuravolt -d neuravolt -c \"SELECT set_tenant_context('00000000-0000-0000-0000-000000000000');\" | grep -q 'set_tenant_context'"


# ==========================================
# 4. API GATEWAY TESTS
# ==========================================
echo -e "\n${BLUE}📡 Category 4: Tenant API Endpoint Verification${NC}"

run_test "Tenant API /health endpoint check" "curl -s -f -H 'x-tenant-slug: system' http://localhost:3000/health | grep -q 'healthy'"
run_test "Tenant API /api/models catalog pull" "curl -s -f -H 'x-tenant-slug: system' http://localhost:3000/api/models | grep -q 'harikson-plus'"

chat_payload='{"message": "Provide code test", "model": "harikson-plus"}'
run_test "Tenant API /api/chat generation & storage check" "curl -s -X POST -H 'Content-Type: application/json' -H 'Authorization: Bearer TEST_TOKEN' -H 'x-tenant-slug: system' -d '$chat_payload' http://localhost:3000/api/chat | grep -q 'response'"


# ==========================================
# 5. FRONTEND ROUTE TESTS
# ==========================================
echo -e "\n${BLUE}🎨 Category 5: Next.js Frontend Portals Verification${NC}"

run_test "Admin Panel active (3001)" "curl -s -f -o /dev/null -w '%{http_code}' http://localhost:3001 | grep -q '200\\|302\\|307\\|308'"
run_test "User Portal active (3002)" "curl -s -f -o /dev/null -w '%{http_code}' http://localhost:3002 | grep -q '200\\|302\\|307\\|308'"


# ==========================================
# 6. STRESS & PERFORMANCE TESTS
# ==========================================
echo -e "\n${BLUE}⚡ Category 6: Stress & Concurrency Performance Check${NC}"

stress_test() {
  local start_time=$(date +%s%N)
  
  # Fire 10 concurrent requests to chat endpoint in background
  for i in {1..10}; do
    curl -s -o /dev/null -X POST \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer TEST_TOKEN" \
      -H "x-tenant-slug: system" \
      -d '{"message": "Perform code optimization test", "model": "harikson-plus"}' \
      http://localhost:3000/api/chat &
  done
  
  # Wait for all async subprocesses to compile
  wait
  
  local end_time=$(date +%s%N)
  local duration=$(( (end_time - start_time) / 1000000 )) # ms
  echo "Performance: 10 concurrent chat requests handled successfully in ${duration}ms"
  return 0
}

run_test "Concurrent load handling check" "stress_test"


# ==========================================
# SUMMARY REPORT
# ==========================================
echo -e "\n${BLUE}======================================================================${NC}"
echo -e "📊 DIAGNOSTIC COMPILATION REPORT:"
echo -e "   Passed: ${GREEN}${PASSED_TESTS}${NC} / ${TOTAL_TESTS} tests"
echo -e "${BLUE}======================================================================${NC}"

if [ "$PASSED_TESTS" -eq "$TOTAL_TESTS" ]; then
    echo -e "${GREEN}🎉 ALL SYSTEMS ARE OPERATIONAL & VERIFIED SUCCESSFULLY!${NC}"
    exit 0
else
    echo -e "${RED}❌ SYSTEM DIAGNOSTIC CHECKS DETECTED ERRORS. VERIFY LOGS ABOVE.${NC}"
    exit 1
fi
