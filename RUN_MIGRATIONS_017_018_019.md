# 🚀 Run Migrations 017, 018, 019 - Quick Guide

## What These Migrations Do

These three migrations add the database schema for the **Scraper Robustness Enhancement** feature:

- **017_scraper_checkpoints.sql** - Checkpoint system for saving scraper progress
- **018_scraper_retry_queue.sql** - Retry queue for failed operations with exponential backoff
- **019_scraper_metrics.sql** - Metrics collection for monitoring scraper performance

---

## Quick Start (Choose One Method)

### Method 1: Using Migration Runner Script ⚡ (Recommended)

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://user:password@host:5432/database"

# Run migrations
cd hosted-smart-cost-calculator
node run-scraper-migrations.js 017_scraper_checkpoints.sql
node run-scraper-migrations.js 018_scraper_retry_queue.sql
node run-scraper-migrations.js 019_scraper_metrics.sql
```

### Method 2: Direct SQL Execution 🔧

```bash
# Connect to database
psql $DATABASE_URL

# Run migrations
\i database/migrations/017_scraper_checkpoints.sql
\i database/migrations/018_scraper_retry_queue.sql
\i database/migrations/019_scraper_metrics.sql

# Verify
\i verify_migrations_017_018_019.sql

# Exit
\q
```

### Method 3: Copy-Paste SQL 📋 (For Remote Databases)

If you can't access the migration files directly:

1. Connect to your database: `psql $DATABASE_URL`
2. Copy the SQL from each migration file and paste into psql
3. Run the verification script

---

## Verification

After running migrations, verify they were successful:

```bash
# Run verification script
psql $DATABASE_URL -f verify_migrations_017_018_019.sql
```

**Expected Output:**
- ✅ All 3 tables exist
- ✅ All indexes created
- ✅ All foreign keys with CASCADE DELETE
- ✅ CHECK constraints on item_type and metric_type
- ✅ Triggers on scraper_checkpoints and scraper_retry_queue
- ✅ No trigger on scraper_metrics (intentional - metrics are immutable)

---

## What Gets Created

### Tables

#### 1. scraper_checkpoints
Saves scraper progress for resume capability after failures.

**Columns:**
- `id` - UUID primary key
- `session_id` - Reference to scraping_sessions (UNIQUE, CASCADE DELETE)
- `current_industry` - Industry being scraped
- `current_town` - Town being scraped
- `processed_businesses` - Count of businesses processed
- `retry_queue` - JSONB array of failed operations
- `batch_state` - JSONB object with batch state
- `created_at` - Timestamp
- `updated_at` - Auto-updated timestamp

**Indexes:**
- Primary key on `id`
- Unique constraint on `session_id`
- Index on `session_id`
- Index on `created_at`

**Triggers:**
- Auto-update `updated_at` on row updates

#### 2. scraper_retry_queue
Stores failed operations for retry with exponential backoff.

**Columns:**
- `id` - UUID primary key
- `session_id` - Reference to scraping_sessions (CASCADE DELETE)
- `item_type` - Type: 'navigation', 'lookup', or 'extraction'
- `item_data` - JSONB with operation data
- `attempts` - Retry attempt count
- `next_retry_time` - When to retry next
- `created_at` - Timestamp
- `updated_at` - Auto-updated timestamp

**Indexes:**
- Primary key on `id`
- Index on `session_id`
- Index on `next_retry_time`
- Composite index on `(session_id, next_retry_time)`
- Index on `item_type`

**Constraints:**
- CHECK: `item_type IN ('navigation', 'lookup', 'extraction')`

**Triggers:**
- Auto-update `updated_at` on row updates

#### 3. scraper_metrics
Collects performance metrics for monitoring.

**Columns:**
- `id` - UUID primary key
- `session_id` - Reference to scraping_sessions (CASCADE DELETE)
- `metric_type` - Type: 'navigation', 'extraction', 'lookup', or 'memory'
- `metric_name` - Specific metric name
- `metric_value` - Numeric value
- `success` - Boolean success flag
- `metadata` - Optional JSONB metadata
- `created_at` - Timestamp (immutable)

**Indexes:**
- Primary key on `id`
- Index on `session_id`
- Index on `metric_type`
- Composite index on `(session_id, metric_type)`
- Index on `created_at`
- Index on `success`

**Constraints:**
- CHECK: `metric_type IN ('navigation', 'extraction', 'lookup', 'memory')`

**Note:** No `updated_at` trigger - metrics are immutable once recorded.

---

## Troubleshooting

### Error: DATABASE_URL not set
```bash
# Set it first
export DATABASE_URL="postgresql://user:password@host:5432/database"
```

### Error: relation "scraping_sessions" does not exist
The `scraping_sessions` table must exist first. Run earlier migrations:
```bash
node run-scraper-migrations.js 008_scraping_sessions_complete.sql
```

### Error: function uuid_generate_v4() does not exist
Enable the uuid extension:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Error: permission denied
Your database user needs CREATE TABLE and CREATE INDEX permissions.

### Connection refused (ECONNREFUSED)
The database is not running or not accessible at the specified URL.

---

## For Production/Remote Databases

### Option A: SSH + psql
```bash
# SSH to server
ssh your-server

# Run migrations
psql $DATABASE_URL -f /path/to/017_scraper_checkpoints.sql
psql $DATABASE_URL -f /path/to/018_scraper_retry_queue.sql
psql $DATABASE_URL -f /path/to/019_scraper_metrics.sql

# Verify
psql $DATABASE_URL -f /path/to/verify_migrations_017_018_019.sql
```

### Option B: Docker Container
```bash
# Copy files to container
docker cp database/migrations/017_scraper_checkpoints.sql container:/tmp/
docker cp database/migrations/018_scraper_retry_queue.sql container:/tmp/
docker cp database/migrations/019_scraper_metrics.sql container:/tmp/

# Execute in container
docker exec -it container psql $DATABASE_URL -f /tmp/017_scraper_checkpoints.sql
docker exec -it container psql $DATABASE_URL -f /tmp/018_scraper_retry_queue.sql
docker exec -it container psql $DATABASE_URL -f /tmp/019_scraper_metrics.sql
```

### Option C: Database GUI (pgAdmin, DBeaver, etc.)
1. Open your database GUI
2. Connect to the database
3. Open each migration file
4. Execute the SQL
5. Run the verification queries

---

## After Migration Success

### 1. Mark Task Complete
Update `.kiro/specs/scraper-robustness-enhancement/tasks.md`:
```markdown
- [x] 1.5 Run migrations and verify schema
```

### 2. Test the Schema
```sql
-- Test checkpoint insertion
INSERT INTO scraper_checkpoints (
  session_id,
  current_industry,
  current_town,
  processed_businesses
) VALUES (
  (SELECT id FROM scraping_sessions LIMIT 1),
  'Pharmacy',
  'Johannesburg',
  0
);

-- Test retry queue insertion
INSERT INTO scraper_retry_queue (
  session_id,
  item_type,
  item_data,
  next_retry_time
) VALUES (
  (SELECT id FROM scraping_sessions LIMIT 1),
  'navigation',
  '{"url": "https://maps.google.com"}',
  NOW() + INTERVAL '5 seconds'
);

-- Test metrics insertion
INSERT INTO scraper_metrics (
  session_id,
  metric_type,
  metric_name,
  metric_value,
  success
) VALUES (
  (SELECT id FROM scraping_sessions LIMIT 1),
  'navigation',
  'page_load_time',
  1500,
  true
);

-- Verify insertions
SELECT COUNT(*) FROM scraper_checkpoints;
SELECT COUNT(*) FROM scraper_retry_queue;
SELECT COUNT(*) FROM scraper_metrics;

-- Clean up test data
DELETE FROM scraper_checkpoints WHERE current_industry = 'Pharmacy';
DELETE FROM scraper_retry_queue WHERE item_data::text LIKE '%maps.google.com%';
DELETE FROM scraper_metrics WHERE metric_name = 'page_load_time';
```

### 3. Next Steps
Proceed to Phase 1, Task 2:
- Implement NavigationManager class
- Implement retry logic with exponential backoff
- Integrate with checkpoint system

---

## Quick Reference

### Migration Files Location
```
hosted-smart-cost-calculator/database/migrations/
├── 017_scraper_checkpoints.sql
├── 018_scraper_retry_queue.sql
└── 019_scraper_metrics.sql
```

### Verification Files
```
hosted-smart-cost-calculator/
├── verify_migrations_017_018_019.sql
├── MIGRATION_017_018_019_VERIFICATION.md
└── RUN_MIGRATIONS_017_018_019.md (this file)
```

### Migration Runner
```
hosted-smart-cost-calculator/run-scraper-migrations.js
```

---

## Summary

**What:** Add 3 new tables for scraper robustness
**Why:** Enable checkpoint/resume, retry queue, and metrics collection
**How:** Run 3 SQL migration files
**Verify:** Run verification script
**Time:** ~2 minutes

**Status After Completion:**
- ✅ Database schema ready for Phase 1 implementation
- ✅ Checkpoint system ready
- ✅ Retry queue ready
- ✅ Metrics collection ready

🎉 **Ready to implement NavigationManager, BatchManager, and other robustness features!**
