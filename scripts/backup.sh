#!/bin/bash
# Xarwiz Cloud backup utility
# Backs up the primary Postgres database and packs volumes into a tarball

set -euo pipefail

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_BACKUP_FILE="${BACKUP_DIR}/xarwiz_db_backup_${TIMESTAMP}.sql.gz"
VOLUME_BACKUP_FILE="${BACKUP_DIR}/xarwiz_volumes_backup_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "Starting Xarwiz Cloud backup cycle..."

# Check if PostgreSQL container is running
if [ "$(docker ps -q -f name=harikson-postgres)" ]; then
  echo "Backing up PostgreSQL database..."
  docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" harikson-postgres \
    pg_dump -U neuravolt neuravolt | gzip > "$DB_BACKUP_FILE"
  echo "PostgreSQL backup written to: $DB_BACKUP_FILE"
else
  echo "ERROR: harikson-postgres container is not running. Cannot backup."
  exit 1
fi

# Archive volumes
echo "Compressing data volumes..."
if [ -d "./data/postgres" ] || [ -d "./data/redis" ]; then
  tar -czf "$VOLUME_BACKUP_FILE" \
    --exclude='./data/postgres/postmaster.pid' \
    ./data/postgres ./data/redis 2>/dev/null || true
  echo "Volumes backup written to: $VOLUME_BACKUP_FILE"
else
  echo "ERROR: Data directories not found at ./data/"
  exit 1
fi

# Retention: keep last 7 daily backups
find "$BACKUP_DIR" -name "xarwiz_db_backup_*.sql.gz" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "xarwiz_volumes_backup_*.tar.gz" -mtime +7 -delete 2>/dev/null || true

echo "Backup process completed successfully."
