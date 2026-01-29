# Migration Verification Guide: 017, 018, 019

## Overview
This document provides instructions for running and verifying the three new scraper robustness enhancement migrations:
- **017_scraper_checkpoints.sql** - Checkpoint system for progress persistence
- **018_scraper_retry_queue.sql** - Retry queue for failed operations
- **019_scraper_metrics.sql** - Metrics collection for monitoring

## Prerequisites
- PostgreSQL database accessible
- DATABASE_URL environment variable set
- Node.js installed (for migration runner)

---

## Running the Migrations

### Option 1: Using the Migration Runner Script (Recommended)

```bash
# Set DATABASE_URL if not already set
export DATABASE_URL="postgresql://user:password@host:5432/database"

# Run each migration
cd hosted-smart-cost-calculator
node run-scraper-migrations.js 017_scraper_checkpoints.sql
node run-scraper-migrations.js 018_scraper_retry_queue.sql
node run-scraper-migrations.js 019_scraper_metrics.sql
```

### Option 2: Run SQL Directly

If you prefer to run the SQL directly:

```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# Run each migration file
\i database/migrations/017_scraper_checkpoints.sql
\i database/migrations/018_scraper_retry_queue.sql
\i database/migrations/019_scraper_metrics.sql

# Exit
\q
```

---

## Verification Steps

After running the migrations, verify that everything was created correctly.

### 1. Verify Tables Were Created

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'scraper_checkpoints',
  'scraper_retry_queue',
  'scraper_metrics'
)
ORDER BY table_name;
```

**Expected Result:** 3 rows
- scraper_checkpoints
- scraper_metrics
- scraper_retry_queue

### 2. Verify Table Structures

#### scraper_checkpoints Table
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'scraper_checkpoints'
ORDER BY ordinal_position;
```

**Expected Columns:**
- id (uuid, NOT NULL, uuid_generate_v4())
- session_id (uuid, NOT NULL)
- current_industry (text, NOT NULL)
- current_town (text, NOT NULL)
- processed_businesses (integer, NOT NULL, 0)
- retry_queue (jsonb, NOT NULL, '[]')
- batch_state (jsonb, NOT NULL, '{}')
- created_at (timestamp, NOT NULL, NOW())
- updated_at (timestamp, NOT NULL, NOW())

#### scraper_retry_queue Table
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'scraper_retry_queue'
ORDER BY ordinal_position;
```

**Expected Columns:**
- id (uuid, NOT NULL, uuid_generate_v4())
- session_id (uuid, NOT NULL)
- item_type (text, NOT NULL, CHECK constraint)
- item_data (jsonb, NOT NULL)
- attempts (integer, NOT NULL, 0)
- next_retry_time (timestamp, NOT NULL)
- created_at (timestamp, NOT NULL, NOW())
- updated_at (timestamp, NOT NULL, NOW())

#### scraper_metrics Table
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'scraper_metrics'
ORDER BY ordinal_position;
```

**Expected Columns:**
- id (uuid, NOT NULL, uuid_generate_v4())
- session_id (uuid, NOT NULL)
- metric_type (text, NOT NULL, CHECK constraint)
- metric_name (text, NOT NULL)
- metric_value (numeric, NOT NULL)
- success (boolean, NOT NULL)
- metadata (jsonb, nullable)
- created_at (timestamp, NOT NULL, NOW())

### 3. Verify Indexes

```sql
-- Check indexes for scraper_checkpoints
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'scraper_checkpoints'
ORDER BY indexname;
```

**Expected Indexes:**
- scraper_checkpoints_pkey (PRIMARY KEY on id)
- scraper_checkpoints_session_id_key (UNIQUE on session_id)
- idx_scraper_checkpoints_session_id (on session_id)
- idx_scraper_checkpoints_created_at (on created_at)

```sql
-- Check indexes for scraper_retry_queue
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'scraper_retry_queue'
ORDER BY indexname;
```

**Expected Indexes:**
- scraper_retry_queue_pkey (PRIMARY KEY on id)
- idx_scraper_retry_queue_session_id (on session_id)
- idx_scraper_retry_queue_next_retry_time (on next_retry_time)
- idx_scraper_retry_queue_session_retry (on session_id, next_retry_time)
- idx_scraper_retry_queue_item_type (on item_type)

```sql
-- Check indexes for scraper_metrics
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'scraper_metrics'
ORDER BY indexname;
```

**Expected Indexes:**
- scraper_metrics_pkey (PRIMARY KEY on id)
- idx_scraper_metrics_session (on session_id)
- idx_scraper_metrics_type (on metric_type)
- idx_scraper_metrics_session_type (on session_id, metric_type)
- idx_scraper_metrics_created_at (on created_at)
- idx_scraper_metrics_success (on success)

### 4. Verify Foreign Key Constraints

```sql
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name IN ('scraper_checkpoints', 'scraper_retry_queue', 'scraper_metrics')
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, tc.constraint_name;
```

**Expected Foreign Keys:**
- scraper_checkpoints.session_id → scraping_sessions.id (ON DELETE CASCADE)
- scraper_retry_queue.session_id → scraping_sessions.id (ON DELETE CASCADE)
- scraper_metrics.session_id → scraping_sessions.id (ON DELETE CASCADE)

### 5. Verify CHECK Constraints

```sql
SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints AS tc
JOIN information_schema.check_constraints AS cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name IN ('scraper_checkpoints', 'scraper_retry_queue', 'scraper_metrics')
  AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name, tc.constraint_name;
```

**Expected CHECK Constraints:**
- scraper_retry_queue: item_type IN ('navigation', 'lookup', 'extraction')
- scraper_metrics: metric_type IN ('navigation', 'extraction', 'lookup', 'memory')

### 6. Verify Triggers

```sql
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table IN ('scraper_checkpoints', 'scraper_retry_queue', 'scraper_metrics')
ORDER BY event_object_table, trigger_name;
```

**Expected Triggers:**
- trigger_update_scraper_checkpoints_updated_at (BEFORE UPDATE on scraper_checkpoints)
- trigger_update_scraper_retry_queue_updated_at (BEFORE UPDATE on scraper_retry_queue)

**Note:** scraper_metrics does NOT have an updated_at trigger (metrics are immutable)

### 7. Verify Trigger Functions

```sql
SELECT
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name IN (
  'update_scraper_checkpoints_updated_at',
  'update_scraper_retry_queue_updated_at'
)
ORDER BY routine_name;
```

**Expected Functions:**
- update_scraper_checkpoints_updated_at (FUNCTION, sets NEW.updated_at = NOW())
- update_scraper_retry_queue_updated_at (FUNCTION, sets NEW.updated_at = NOW())

### 8. Test Trigger Functionality

```sql
-- Test scraper_checkpoints trigger
-- First, create a test session (if needed)
INSERT INTO scraping_sessions (id, user_id, status, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM users LIMIT 1),
  'active',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert a checkpoint
INSERT INTO scraper_checkpoints (
  session_id,
  current_industry,
  current_town,
  processed_businesses
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Industry',
  'Test Town',
  0
);

-- Wait a moment, then update
SELECT pg_sleep(1);

UPDATE scraper_checkpoints
SET processed_businesses = 10
WHERE session_id = '00000000-0000-0000-0000-000000000001';

-- Verify updated_at changed
SELECT
  created_at,
  updated_at,
  (updated_at > created_at) AS trigger_worked
FROM scraper_checkpoints
WHERE session_id = '00000000-0000-0000-0000-000000000001';

-- Clean up test data
DELETE FROM scraper_checkpoints WHERE session_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM scraping_sessions WHERE id = '00000000-0000-0000-0000-000000000001';
```

**Expected Result:** trigger_worked should be TRUE

---

## Verification Checklist

Use this checklist to confirm all migrations were successful:

- [ ] All 3 tables created (scraper_checkpoints, scraper_retry_queue, scraper_metrics)
- [ ] scraper_checkpoints has 9 columns with correct types
- [ ] scraper_retry_queue has 8 columns with correct types
- [ ] scraper_metrics has 8 columns with correct types
- [ ] scraper_checkpoints has 4 indexes (including PK and UNIQUE)
- [ ] scraper_retry_queue has 5 indexes (including PK)
- [ ] scraper_metrics has 6 indexes (including PK)
- [ ] All 3 tables have foreign keys to scraping_sessions with CASCADE DELETE
- [ ] scraper_retry_queue has CHECK constraint on item_type
- [ ] scraper_metrics has CHECK constraint on metric_type
- [ ] scraper_checkpoints has updated_at trigger
- [ ] scraper_retry_queue has updated_at trigger
- [ ] scraper_metrics does NOT have updated_at trigger (intentional)
- [ ] Trigger functions work correctly (updated_at changes on UPDATE)

---

## Quick Verification Script

Run this single SQL script to verify everything at once:

```sql
-- Save this as verify_migrations.sql and run with: psql $DATABASE_URL -f verify_migrations.sql

\echo '=== Verifying Tables ==='
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('scraper_checkpoints', 'scraper_retry_queue', 'scraper_metrics')
ORDER BY table_name;

\echo ''
\echo '=== Verifying Indexes ==='
SELECT tablename, COUNT(*) as index_count
FROM pg_indexes
WHERE tablename IN ('scraper_checkpoints', 'scraper_retry_queue', 'scraper_metrics')
GROUP BY tablename
ORDER BY tablename;

\echo ''
\echo '=== Verifying Foreign Keys ==='
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
LEFT JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name IN ('scraper_checkpoints', 'scraper_retry_queue', 'scraper_metrics')
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

\echo ''
\echo '=== Verifying CHECK Constraints ==='
SELECT
  tc.table_name,
  cc.check_clause
FROM information_schema.table_constraints AS tc
JOIN information_schema.check_constraints AS cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name IN ('scraper_checkpoints', 'scraper_retry_queue', 'scraper_metrics')
  AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name;

\echo ''
\echo '=== Verifying Triggers ==='
SELECT
  event_object_table,
  trigger_name
FROM information_schema.triggers
WHERE event_object_table IN ('scraper_checkpoints', 'scraper_retry_queue', 'scraper_metrics')
ORDER BY event_object_table;

\echo ''
\echo '=== Summary ==='
\echo 'Expected:'
\echo '  - 3 tables'
\echo '  - scraper_checkpoints: 4 indexes, 1 FK, 0 CHECK, 1 trigger'
\echo '  - scraper_retry_queue: 5 indexes, 1 FK, 1 CHECK, 1 trigger'
\echo '  - scraper_metrics: 6 indexes, 1 FK, 1 CHECK, 0 triggers'
```

---

## Troubleshooting

### Error: relation "scraping_sessions" does not exist
**Solution:** The scraping_sessions table must exist before running these migrations. Run earlier migrations first.

### Error: function uuid_generate_v4() does not exist
**Solution:** Enable the uuid-ossp extension:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Error: permission denied
**Solution:** Ensure your database user has CREATE TABLE and CREATE INDEX permissions.

### Trigger not working
**Solution:** Verify the trigger function exists and is correctly defined:
```sql
\df update_scraper_checkpoints_updated_at
\df update_scraper_retry_queue_updated_at
```

---

## Next Steps

After successful verification:

1. ✅ Mark task 1.5 as complete in tasks.md
2. ✅ Proceed to Phase 1, Task 2: NavigationManager Implementation
3. ✅ Update application code to use new tables
4. ✅ Test checkpoint save/restore functionality
5. ✅ Test retry queue enqueue/dequeue operations
6. ✅ Test metrics collection

---

## Migration Details

### Migration 017: scraper_checkpoints
- **Purpose:** Save scraper progress for resume capability
- **Key Features:** 
  - One checkpoint per session (UNIQUE constraint)
  - Stores current position (industry, town)
  - Stores retry queue and batch state as JSONB
  - Auto-updates updated_at on changes
  - CASCADE DELETE when session deleted

### Migration 018: scraper_retry_queue
- **Purpose:** Queue failed operations for retry with exponential backoff
- **Key Features:**
  - Supports 3 item types: navigation, lookup, extraction
  - Tracks retry attempts and next retry time
  - Indexed for efficient time-based queries
  - Auto-updates updated_at on changes
  - CASCADE DELETE when session deleted

### Migration 019: scraper_metrics
- **Purpose:** Collect performance metrics for monitoring
- **Key Features:**
  - Supports 4 metric types: navigation, extraction, lookup, memory
  - Stores numeric values with success flag
  - Optional metadata as JSONB
  - Immutable (no updated_at trigger)
  - Indexed for efficient analysis queries
  - CASCADE DELETE when session deleted

---

## Documentation Complete ✅

This verification guide ensures all three migrations are correctly applied and functioning as designed.
