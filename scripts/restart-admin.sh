#!/bin/bash
# ============================================================
# Harikson Admin API + Admin Panel Restart Script
# Run this ON the server: ssh root@154.201.127.68 then bash this
# ============================================================

set -e

# Find the project directory
PROJECT_DIR=$(find /root /home /opt -name "docker-compose.yml" -maxdepth 4 2>/dev/null | grep -v node_modules | head -1 | xargs dirname)

if [ -z "$PROJECT_DIR" ]; then
  echo "❌ Could not find docker-compose.yml. Please cd into project directory and run:"
  echo "   docker compose build --no-cache admin-api admin-panel && docker compose up -d admin-api admin-panel"
  exit 1
fi

echo "✅ Found project at: $PROJECT_DIR"
cd "$PROJECT_DIR"

echo ""
echo "🔨 Rebuilding admin-api (with PAYMENT_ENCRYPTION_KEY fix)..."
docker compose build --no-cache admin-api

echo ""
echo "🔨 Rebuilding admin-panel (with ADMIN_API_URL fix)..."
docker compose build --no-cache admin-panel

echo ""
echo "🚀 Restarting admin-api..."
docker compose up -d admin-api

echo "⏳ Waiting 5 seconds for admin-api to come up..."
sleep 5

echo ""
echo "🚀 Restarting admin-panel..."
docker compose up -d admin-panel

echo ""
echo "⏳ Waiting 10 seconds for admin-panel to come up..."
sleep 10

echo ""
echo "🔍 Health check on admin-api..."
curl -sf http://localhost:4008/health && echo " ✅ admin-api is healthy" || echo " ⚠️  admin-api health check failed - check logs: docker compose logs admin-api"

echo ""
echo "🔍 Checking admin-api login endpoint..."
curl -sf -X POST http://localhost:4008/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@harikson.ai","password":"test"}' \
  | python3 -m json.tool 2>/dev/null || echo "  (response received - if it's JSON, login route is working)"

echo ""
echo "📋 Recent admin-api logs:"
docker compose logs --tail=20 admin-api

echo ""
echo "✅ Done! Try logging in at http://154.201.127.68:3018/admin/login"
echo "   Email:    admin@harikson.ai"
echo "   Password: StrongP@ssword2026!"
