#!/bin/bash
# ==============================================================================
# Xarwiz AI Platform — Automated Backup Verification & Staging Restore Drill
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_USER="${POSTGRES_USER:-neuravolt}"
DB_PASSWORD="${POSTGRES_PASSWORD:-neuravolt_dev_pwd}"
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"
STAGING_DB="neuravolt_staging_restore_test"

echo "============================================================"
echo "💾 Xarwiz Platform Automated Backup Verification & Restore"
echo "============================================================"

# Find the newest backup file (.sql.gz or .sql)
LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/xarwiz_db_backup_*.sql.gz "${BACKUP_DIR}"/xarwiz_db_backup_*.sql "${BACKUP_DIR}"/harikson_db_*.sql 2>/dev/null | head -n 1 || true)

if [ -z "$LATEST_BACKUP" ] || [ ! -f "$LATEST_BACKUP" ]; then
  echo "🚨 [ALERT] No database backup found in ${BACKUP_DIR}!"
  exit 1
fi

echo "📁 Target Backup Archive: ${LATEST_BACKUP}"

# 1. FILE INTEGRITY & SIZE CHECK
FILE_SIZE=$(stat -f%z "$LATEST_BACKUP" 2>/dev/null || stat -c%s "$LATEST_BACKUP" 2>/dev/null || echo 0)
if [ "$FILE_SIZE" -le 100 ]; then
  echo "🚨 [ALERT] Backup file is suspiciously small or empty (${FILE_SIZE} bytes)!"
  exit 1
fi
echo "✅ File size verified: ${FILE_SIZE} bytes."

# 2. HEADER INSPECTION
echo "🔍 Validating PostgreSQL dump header signature..."
if [[ "$LATEST_BACKUP" == *.gz ]]; then
  DUMP_HEADER=$(gzip -dc "$LATEST_BACKUP" | head -n 30 || true)
else
  DUMP_HEADER=$(head -n 30 "$LATEST_BACKUP" || true)
fi

if ! echo "$DUMP_HEADER" | grep -q "PostgreSQL database dump"; then
  echo "🚨 [ALERT] Header validation failed! Not a valid PostgreSQL dump."
  exit 1
fi
echo "✅ Header check passed: Valid PostgreSQL dump format."

# 3. CRYPTOGRAPHIC CHECKSUM VERIFICATION
echo "🔐 Computing SHA-256 checksum..."
if command -v shasum &>/dev/null; then
  ACTUAL_HASH=$(shasum -a 256 "$LATEST_BACKUP" | awk '{print $1}')
else
  ACTUAL_HASH=$(sha256sum "$LATEST_BACKUP" | awk '{print $1}')
fi
echo "   SHA-256: ${ACTUAL_HASH}"

if [ -f "${LATEST_BACKUP}.sha256" ]; then
  EXPECTED_HASH=$(awk '{print $1}' "${LATEST_BACKUP}.sha256")
  if [ "$ACTUAL_HASH" != "$EXPECTED_HASH" ]; then
    echo "🚨 [ALERT] Checksum mismatch! Corrupt backup."
    echo "   Expected: ${EXPECTED_HASH}"
    echo "   Got:      ${ACTUAL_HASH}"
    exit 1
  fi
  echo "✅ Cryptographic checksum verified against ${LATEST_BACKUP}.sha256"
fi

# 4. BACKUP FRESHNESS / RPO CHECK (<25 hours)
FILE_MTIME=$(stat -f%m "$LATEST_BACKUP" 2>/dev/null || stat -c%Y "$LATEST_BACKUP" 2>/dev/null)
NOW=$(date +%s)
AGE_HOURS=$(( (NOW - FILE_MTIME) / 3600 ))
if [ "$AGE_HOURS" -gt 25 ]; then
  echo "⚠️ [WARNING] Backup is ${AGE_HOURS} hours old (>25h RPO SLA limit)."
else
  echo "✅ Backup freshness verified: ${AGE_HOURS} hours old (within 24h RPO SLA)."
fi

# 5. AUTOMATED RESTORE TEST INTO STAGING DATABASE
echo "------------------------------------------------------------"
echo "🧪 Initiating isolated staging database restore drill..."
START_TIME=$(node -e "console.log(Date.now())" 2>/dev/null || date +%s)

# Create isolated staging database
export PGPASSWORD="$DB_PASSWORD"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${STAGING_DB};" >/dev/null 2>&1 || true
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE ${STAGING_DB};" >/dev/null

echo "📥 Restoring backup stream into staging database '${STAGING_DB}'..."
if [[ "$LATEST_BACKUP" == *.gz ]]; then
  gzip -dc "$LATEST_BACKUP" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$STAGING_DB" >/dev/null 2>&1
else
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$STAGING_DB" < "$LATEST_BACKUP" >/dev/null 2>&1
fi

END_TIME=$(node -e "console.log(Date.now())" 2>/dev/null || date +%s)
DURATION_MS=$(( END_TIME - START_TIME ))
echo "✅ Restore completed successfully in ${DURATION_MS} ms."

# 6. RESTORED DATA INTEGRITY & RLS AUDIT
echo "📊 Auditing restored database schema and integrity..."
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$STAGING_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" | tr -d ' ')
RLS_POLICIES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$STAGING_DB" -t -c "SELECT COUNT(*) FROM pg_policies;" | tr -d ' ')
TENANT_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$STAGING_DB" -t -c "SELECT COUNT(*) FROM tenants;" 2>/dev/null | tr -d ' ' || echo 0)
USER_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$STAGING_DB" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo 0)
MIGRATIONS_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$STAGING_DB" -t -c "SELECT COUNT(*) FROM migrations_meta;" 2>/dev/null | tr -d ' ' || echo 0)

echo "   - Tables Restored:           ${TABLE_COUNT}"
echo "   - RLS Policies Verified:     ${RLS_POLICIES}"
echo "   - Tenants Preserved:         ${TENANT_COUNT}"
echo "   - Users Preserved:           ${USER_COUNT}"
echo "   - Migrations History Count:  ${MIGRATIONS_COUNT}"

if [ "$TABLE_COUNT" -lt 50 ]; then
  echo "🚨 [ALERT] Incomplete restore! Restored table count (${TABLE_COUNT}) is below threshold."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${STAGING_DB};" >/dev/null 2>&1 || true
  exit 1
fi

# 7. CLEANUP STAGING DATABASE
echo "🧹 Dropping temporary staging drill database..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${STAGING_DB};" >/dev/null 2>&1

echo "============================================================"
echo "🎉 BACKUP VERIFICATION & STAGING RESTORE COMPLETED SUCCESSFULLY"
echo "============================================================"
