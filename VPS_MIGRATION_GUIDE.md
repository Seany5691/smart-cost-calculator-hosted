# VPS Migration Guide - Scraper Robustness Enhancement

## Overview
This guide provides instructions for running database migrations on the VPS after Dockploy deployment.

**Deployment Status**: ✅ Code pushed to GitHub (commit: e4e3051)

## What Was Deployed

### Database Migrations (3 new tables)
1. **017_scraper_checkpoints.sql** - Checkpoint system for progress persistence
2. **018_scraper_retry_queue.sql** - Retry queue for failed operations
3. **019_scraper_metrics.sql** - Metrics collection for monitoring

### New Components
- **NavigationManager** - Exponential backoff and adaptive timeouts
- **BatchManager** - Batch-of-5 provider lookups with adaptive sizing
- **CaptchaDetector** - Captcha detection and response
- **RetryQueue** - Database-backed retry queue with persistence

### Updated Components
- browser-worker.ts
- business-lookup-scraper.ts
- industry-scraper.ts
- provider-lookup-service.ts
- scraping-orchestrator.ts

## Migration Instructions

### Step 1: Wait for Dockploy Deployment
Dockploy will automatically detect the push to GitHub and deploy the new code to the VPS.

**Check deployment status:**
- Log into Dockploy dashboard
- Verify the deployment completed successfully
- Check deployment logs for any errors

### Step 2: Connect to VPS Database
SSH into your VPS and connect to the PostgreSQL database:

```bash
# SSH into VPS
ssh user@your-vps-ip

# Connect to PostgreSQL
psql -U your_db_user -d your_database_name
```

### Step 3: Run Migrations

Run the migrations in order:

```sql
-- Migration 017: Scraper Checkpoints
\i /path/to/database/migrations/017_scraper_checkpoints.sql

-- Migration 018: Scraper Retry Queue
\i /path/to/database/migrations/018_scraper_retry_queue.sql

-- Migration 019: Scraper Metrics
\i /path/to/database/migrations/019_scraper_metrics.sql
```

**Alternative: Run from application directory**
```bash
# Navigate to application directory
cd /path/to/hosted-smart-cost-calculator

# Run migrations using psql
psql -U your_db_user -d your_database_name -f database/migrations/017_scraper_checkpoints.sql
psql -U your_db_user -d your_database_name -f database/migrations/018_scraper_retry_queue.sql
psql -U your_db_user -d your_database_name -f database/migrations/019_scraper_metrics.sql
```

### Step 4: Verify Migrations

Verify that all tables were created successfully:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('scraper_checkpoints', 'scraper_retry_queue', 'scraper_metrics');

-- Verify scraper_checkpoints structure
\d scraper_checkpoints

-- Verify scraper_retry_queue structure
\d scraper_retry_queue

-- Verify scraper_metrics structure
\d scraper_metrics

-- Check indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('scraper_checkpoints', 'scraper_retry_queue', 'scraper_metrics');
```

**Expected output:**
- 3 tables should be listed
- Each table should have the correct columns and types
- Indexes should be created for performance optimization

### Step 5: Verify Application Startup

After migrations are complete, restart the application and check logs:

```bash
# Restart application (method depends on your setup)
# For PM2:
pm2 restart your-app-name

# For systemd:
sudo systemctl restart your-app-name

# Check logs
pm2 logs your-app-name
# or
sudo journalctl -u your-app-name -f
```

**Look for:**
- No database connection errors
- No migration-related errors
- Application starts successfully

## Migration Details

### Table: scraper_checkpoints
**Purpose**: Store scraper progress for resume capability after failures

**Columns:**
- `id` (UUID) - Primary key
- `session_id` (UUID) - Foreign key to scraping_sessions
- `current_industry` (TEXT) - Industry being scraped
- `current_town` (TEXT) - Town being scraped
- `processed_businesses` (INTEGER) - Number of businesses processed
- `retry_queue` (JSONB) - Failed operations queued for retry
- `batch_state` (JSONB) - Current batch state
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Indexes:**
- `idx_scraper_checkpoints_session_id` - Fast lookup by session
- `idx_scraper_checkpoints_created_at` - Cleanup queries

### Table: scraper_retry_queue
**Purpose**: Store failed operations for retry with exponential backoff

**Columns:**
- `id` (UUID) - Primary key
- `session_id` (UUID) - Foreign key to scraping_sessions
- `item_type` (TEXT) - Type: 'navigation', 'lookup', or 'extraction'
- `item_data` (JSONB) - Operation-specific data
- `attempts` (INTEGER) - Number of retry attempts
- `next_retry_time` (TIMESTAMP) - When to retry next
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Indexes:**
- `idx_scraper_retry_queue_session_id` - Fast lookup by session
- `idx_scraper_retry_queue_next_retry_time` - Find items ready to retry
- `idx_scraper_retry_queue_session_retry` - Composite index
- `idx_scraper_retry_queue_item_type` - Filter by type

### Table: scraper_metrics
**Purpose**: Store performance metrics for monitoring scraper health

**Columns:**
- `id` (UUID) - Primary key
- `session_id` (UUID) - Foreign key to scraping_sessions
- `metric_type` (TEXT) - Type: 'navigation', 'extraction', 'lookup', or 'memory'
- `metric_name` (TEXT) - Specific metric name
- `metric_value` (NUMERIC) - Metric value
- `success` (BOOLEAN) - Operation success status
- `metadata` (JSONB) - Additional context
- `created_at` (TIMESTAMP) - Creation timestamp

**Indexes:**
- `idx_scraper_metrics_session` - Fast lookup by session
- `idx_scraper_metrics_type` - Filter by type
- `idx_scraper_metrics_session_type` - Composite index
- `idx_scraper_metrics_created_at` - Time-based queries
- `idx_scraper_metrics_success` - Success rate analysis

## Rollback Instructions

If you need to rollback the migrations:

```sql
-- Drop tables in reverse order
DROP TABLE IF EXISTS scraper_metrics CASCADE;
DROP TABLE IF EXISTS scraper_retry_queue CASCADE;
DROP TABLE IF EXISTS scraper_checkpoints CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_scraper_checkpoints_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_scraper_retry_queue_updated_at() CASCADE;
```

**Note**: This will delete all checkpoint, retry queue, and metrics data.

## Testing After Migration

### Test 1: Verify Checkpoint Creation
Start a scraping session and verify checkpoints are being created:

```sql
-- Check for new checkpoints
SELECT * FROM scraper_checkpoints ORDER BY created_at DESC LIMIT 5;
```

### Test 2: Verify Retry Queue
Simulate a failure and verify retry queue entries:

```sql
-- Check retry queue
SELECT * FROM scraper_retry_queue ORDER BY created_at DESC LIMIT 5;
```

### Test 3: Verify Metrics Collection
Check that metrics are being recorded:

```sql
-- Check metrics
SELECT metric_type, COUNT(*) 
FROM scraper_metrics 
GROUP BY metric_type;
```

## Troubleshooting

### Issue: Migration fails with "relation already exists"
**Solution**: Tables may already exist. Check if they exist and drop them if needed:
```sql
DROP TABLE IF EXISTS scraper_checkpoints CASCADE;
DROP TABLE IF EXISTS scraper_retry_queue CASCADE;
DROP TABLE IF EXISTS scraper_metrics CASCADE;
```

### Issue: Foreign key constraint fails
**Solution**: Verify that the `scraping_sessions` table exists:
```sql
SELECT * FROM information_schema.tables WHERE table_name = 'scraping_sessions';
```

### Issue: Permission denied
**Solution**: Ensure the database user has CREATE TABLE permissions:
```sql
GRANT CREATE ON SCHEMA public TO your_db_user;
```

## Next Steps

After successful migration:

1. ✅ Monitor application logs for any errors
2. ✅ Test scraper functionality with a small scraping session
3. ✅ Verify checkpoints are being saved
4. ✅ Verify retry queue is working
5. ✅ Verify metrics are being collected
6. ✅ Monitor database performance with new indexes

## Support

If you encounter issues:
1. Check application logs for detailed error messages
2. Verify database connection is working
3. Check that all migrations ran successfully
4. Review the migration SQL files for any syntax errors

## Spec Reference

- **Spec**: scraper-robustness-enhancement
- **Phase**: 1 - Core Resilience
- **Tasks**: 1.1-1.5 (Database Schema Setup)
- **Commit**: e4e3051
- **Date**: 2026-01-28
