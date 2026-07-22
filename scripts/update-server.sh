#!/bin/bash
# ============================================================
# Live Server Update & Rate-Limit Flush Script
# ============================================================

set -e

PROJECT_DIR=$(find /root /home /opt -name "docker-compose.yml" -maxdepth 4 2>/dev/null | grep -v node_modules | head -1 | xargs dirname)

if [ -z "$PROJECT_DIR" ]; then
  PROJECT_DIR=$(pwd)
fi

echo "✅ Working in directory: $PROJECT_DIR"
cd "$PROJECT_DIR"

echo ""
echo "📥 Pulling latest commits from main branch..."
git pull origin main

echo ""
echo "🧹 Flushing Redis rate-limit keys..."
docker exec -i harikson-redis redis-cli --eval "return redis.call('del', unpack(redis.call('keys', 'ratelimit:*')))" 2>/dev/null || \
docker exec -i harikson-redis redis-cli FLUSHALL || true

echo ""
echo "🔨 Rebuilding containers with updated code..."
docker compose build tenant-api admin-api admin-panel user-portal

echo ""
echo "🚀 Restarting stack containers..."
docker compose up -d

echo ""
echo "✅ Server updated and rate limits cleared!"
