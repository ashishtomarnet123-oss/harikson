#!/bin/bash
# Xarwiz VPS Migration Pack Export Utility
# Bundles the DB dump, configs, and all data volumes into a single archive.
# NOTE: .env and secrets are excluded — transfer them separately via secure channel.

set -euo pipefail

EXPORT_DIR="./xarwiz_migration"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="./xarwiz_pack_${TIMESTAMP}.tar.gz"

echo "Initializing Xarwiz Migration Pack Export..."
rm -rf "$EXPORT_DIR"
mkdir -p "$EXPORT_DIR/configs"
mkdir -p "$EXPORT_DIR/volumes"

# 1. Back up database
if [ "$(docker ps -q -f name=harikson-postgres)" ]; then
  echo "Dumping PostgreSQL database..."
  docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" harikson-postgres \
    pg_dump -U neuravolt neuravolt | gzip > "$EXPORT_DIR/database.sql.gz"
  echo "DB dump successful."
else
  echo "ERROR: harikson-postgres container is not running. Cannot backup database."
  exit 1
fi

# 2. Copy configs (exclude secrets — transfer those separately)
echo "Bundling configuration files..."
cp docker-compose.yml "$EXPORT_DIR/configs/" 2>/dev/null || true
cp -r traefik "$EXPORT_DIR/configs/traefik" 2>/dev/null || true
cp -r monitoring "$EXPORT_DIR/configs/monitoring" 2>/dev/null || true

# 3. Export data volumes
echo "Archiving data volumes..."
if [ -d "./data" ]; then
  tar -czf "$EXPORT_DIR/volumes/data.tar.gz" \
    --exclude='./data/postgres/postmaster.pid' \
    ./data 2>/dev/null || true
fi

# 4. Tar the migration package
echo "Packing everything into unified archive..."
tar -czf "$OUTPUT_FILE" "$EXPORT_DIR"
rm -rf "$EXPORT_DIR"

echo "--------------------------------------------------------"
echo "Xarwiz Migration Pack created successfully!"
echo "Location: $OUTPUT_FILE"
echo "IMPORTANT: Transfer .env and secrets separately via secure channel."
echo "--------------------------------------------------------"
