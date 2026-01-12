#!/bin/bash

# PostgreSQL Backup Script for Smart Cost Calculator
# This script creates daily backups of the database

# Configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="smartcost_user"
DB_NAME="smartcost_vps"
BACKUP_DIR="/home/user/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/smartcost_backup_$DATE.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup
echo "Starting PostgreSQL backup at $(date)"
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "✅ Backup successful: $BACKUP_FILE"
    echo "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Keep only last 7 days of backups
echo "Cleaning up old backups (keeping last 7 days)..."
find "$BACKUP_DIR" -name "smartcost_backup_*.sql" -mtime +7 -delete

# Show remaining backups
echo "Current backups:"
ls -lh "$BACKUP_DIR" | tail -10

# Optional: Compress old backups (uncomment if needed)
# find "$BACKUP_DIR" -name "smartcost_backup_*.sql" -mtime +1 -exec gzip {} \;

echo "Backup process completed at $(date)"
