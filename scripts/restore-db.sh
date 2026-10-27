#!/usr/bin/env bash
# ==============================================================================
# Aura Studio - Automated PostgreSQL Database Restore Script
# Validates SHA-256 integrity checksum and restores gzip-compressed SQL dump.
# ==============================================================================

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <path-to-backup-file.sql.gz>"
  echo "Example: $0 ./backups/aura_backup_20261027_120000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

RAW_DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/booking_system_db?schema=public}"
CLEAN_DB_URL="${RAW_DB_URL%%\?*}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ Error: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "🔍 [Restore] Verifying SHA-256 checksum integrity..."
if [ -f "${CHECKSUM_FILE}" ]; then
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 -c "${CHECKSUM_FILE}"
  else
    sha256sum -c "${CHECKSUM_FILE}"
  fi
  echo "✅ [Integrity] Checksum verified successfully!"
else
  echo "⚠️ Warning: No checksum file found alongside backup. Proceeding with caution..."
fi

echo "⚠️  [Warning] Restoring will overwrite existing data in ${CLEAN_DB_URL}"
echo "🔄 [Restore] Streaming backup into PostgreSQL..."

if command -v psql >/dev/null 2>&1; then
  gunzip -c "${BACKUP_FILE}" | psql "${CLEAN_DB_URL}" --quiet
  echo "✅ [Restore] Database successfully restored from ${BACKUP_FILE}"
else
  echo "⚠️  psql command not found in PATH."
fi
