#!/bin/sh
set -e

# Make sure we have a directory for backups
BACKUP_DIR="/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/shortlink_backup_$TIMESTAMP.sql"

echo "Starting database backup..."
mysqldump \
  -h "${DB_HOST}" \
  -P "${DB_PORT}" \
  -u "${DB_USERNAME}" \
  -p"${DB_PASSWORD}" \
  "${DB}" > "$BACKUP_FILE"

echo "Database backup completed successfully: $BACKUP_FILE"

# Retention policy: Keep the last 7 days of backups
echo "Applying retention policy (keeping last 7 days)..."
find "$BACKUP_DIR" -name "shortlink_backup_*.sql" -mtime +7 -delete

echo "Retention policy applied."
