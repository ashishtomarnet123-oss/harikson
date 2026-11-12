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

# Check if PostgreSQL container is running, or fall back to native pg_dump
if [ -n "$(which docker 2>/dev/null || true)" ] && [ "$(docker ps -q -f name=harikson-postgres 2>/dev/null || true)" ]; then
  echo "Backing up PostgreSQL database from Docker container..."
  docker exec -e PGPASSWORD="${POSTGRES_PASSWORD:-neuravolt_dev_pwd}" harikson-postgres \
    pg_dump -U "${POSTGRES_USER:-neuravolt}" "${POSTGRES_DB:-neuravolt}" | gzip > "$DB_BACKUP_FILE"
elif command -v pg_dump &>/dev/null; then
  echo "Backing up PostgreSQL database using host pg_dump CLI..."
  PGPASSWORD="${POSTGRES_PASSWORD:-neuravolt_dev_pwd}" pg_dump -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${POSTGRES_USER:-neuravolt}" "${POSTGRES_DB:-neuravolt}" | gzip > "$DB_BACKUP_FILE"
else
  echo "ERROR: Neither harikson-postgres container nor pg_dump CLI available. Cannot backup."
  exit 1
fi

echo "PostgreSQL backup written to: $DB_BACKUP_FILE"

# Compute and write SHA-256 checksum for cryptographic integrity verification
if command -v shasum &>/dev/null; then
  shasum -a 256 "$DB_BACKUP_FILE" > "${DB_BACKUP_FILE}.sha256"
elif command -v sha256sum &>/dev/null; then
  sha256sum "$DB_BACKUP_FILE" > "${DB_BACKUP_FILE}.sha256"
fi

# Archive volumes (if local bind mount data directories exist)
echo "Compressing data volumes..."
if [ -d "./data/postgres" ] || [ -d "./data/redis" ]; then
  tar -czf "$VOLUME_BACKUP_FILE" \
    --exclude='./data/postgres/postmaster.pid' \
    ./data/postgres ./data/redis 2>/dev/null || true
  echo "Volumes backup written to: $VOLUME_BACKUP_FILE"
else
  echo "NOTE: Data directories not found at ./data/ (skipping volume tarball)."
fi

# Retention: keep last 7 daily backups
find "$BACKUP_DIR" -name "xarwiz_db_backup_*.sql.gz" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "xarwiz_volumes_backup_*.tar.gz" -mtime +7 -delete 2>/dev/null || true

# Off-site cloud replication (GCS / S3)
if [ -n "${GCS_BACKUP_BUCKET:-}" ]; then
  echo "Syncing backup to Google Cloud Storage (${GCS_BACKUP_BUCKET})..."
  if command -v gcloud &>/dev/null; then
    gcloud storage cp "$DB_BACKUP_FILE" "gs://${GCS_BACKUP_BUCKET}/" 2>/dev/null || gsutil cp "$DB_BACKUP_FILE" "gs://${GCS_BACKUP_BUCKET}/" 2>/dev/null || echo "GCS sync command failed."
    gcloud storage cp "$VOLUME_BACKUP_FILE" "gs://${GCS_BACKUP_BUCKET}/" 2>/dev/null || gsutil cp "$VOLUME_BACKUP_FILE" "gs://${GCS_BACKUP_BUCKET}/" 2>/dev/null || true
    echo "GCS off-site backup sync finished."
  else
    echo "NOTE: GCS_BACKUP_BUCKET specified but gcloud/gsutil not available."
  fi
fi

if [ -n "${S3_BACKUP_BUCKET:-}" ]; then
  echo "Syncing backup to Amazon S3 (${S3_BACKUP_BUCKET})..."
  if command -v aws &>/dev/null; then
    aws s3 cp "$DB_BACKUP_FILE" "s3://${S3_BACKUP_BUCKET}/" 2>/dev/null || echo "S3 sync command failed."
    aws s3 cp "$VOLUME_BACKUP_FILE" "s3://${S3_BACKUP_BUCKET}/" 2>/dev/null || true
    echo "S3 off-site backup sync finished."
  else
    echo "NOTE: S3_BACKUP_BUCKET specified but aws-cli not available."
  fi
fi

echo "Backup process completed successfully."
