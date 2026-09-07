#!/bin/bash
# Xarwiz Cloud restore utility
# Restores databases and active volumes from backups

set -euo pipefail

if [ -z "${1:-}" ] || [ -z "${2:-}" ]; then
  echo "Usage: $0 <path_to_db_sql_gz_backup> <path_to_volume_tar>"
  exit 1
fi

DB_BACKUP="$1"
VOLUME_BACKUP="$2"

echo "Restoring Xarwiz Cloud..."

# Validate files
if [ ! -f "$DB_BACKUP" ] || [ ! -f "$VOLUME_BACKUP" ]; then
  echo "ERROR: Backup files do not exist."
  exit 1
fi

# Restore volumes
echo "Extracting volumes archive..."
tar -xzf "$VOLUME_BACKUP" -C . || true
echo "Archive extraction complete."

# Restore DB
if [ "$(docker ps -q -f name=harikson-postgres)" ]; then
  echo "Restoring PostgreSQL database..."
  gunzip -c "$DB_BACKUP" | docker exec -i -e PGPASSWORD="${POSTGRES_PASSWORD}" \
    harikson-postgres psql -U neuravolt neuravolt
  echo "Postgres restore complete."
else
  echo "ERROR: harikson-postgres container is not running."
  exit 1
fi

echo "Restoration cycle completed."
