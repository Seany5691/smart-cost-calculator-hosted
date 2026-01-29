-- ============================================================================
-- Migration Verification Script: 017, 018, 019
-- ============================================================================
-- This script verifies that migrations 017, 018, and 019 were applied correctly
-- Run with: psql $DATABASE_URL -f verify_migrations_017_018_019.sql
-- ============================================================================

\echo ''
\echo '╔════════════════════════════════════════════════════════════════════════╗'
\echo '║  Migration Verification: 017, 018, 019                                ║'
\echo '║  Scraper Robustness Enhancement - Database Schema                     ║'
\echo '╚════════════════════════════════════════════════════════════════════════╝'
\echo ''

-- ============================================================================
-- 1. Verify Tables Exist
-- ============================================================================
\echo '📋 Step 1: Verifying Tables...'
\echo ''

SELECT 
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ PASS: All 3 tables exist'
    ELSE '❌ FAIL: Expected 3 tables, found ' || COUNT(*)::text
  END AS result
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('scraper_checkpoints', 'scraper_retry_queue', 'scraper_metrics');

\echo ''
\echo 'Tables found:'
SELECT '  - ' || table_name AS tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('scraper_checkpoints', 'scraper_retry_queue', 'scraper_metrics')
ORDER BY table_name;

-- ============================================================================
-- 2. Verify Column Counts
-- ============================================================================
\echo ''
\echo '📊 Step 2: Verifying Column Counts...'
\echo ''

WITH expected AS (
  SELECT 'scraper_checkpoints' AS table_name, 9 AS expected_columns
  UNION ALL
  SELECT 'scraper_retry_queue', 8
  UNION ALL
  SELECT 'scraper_metrics', 8
),
actual AS (
  SELECT 
    table_name,
    COUNT(*) AS actual_columns
  FROM information_schema.columns
  WHERE table_name IN ('scraper_checkpoints', 'scraper_retry_queue', 'scraper_metrics')
  GROUP BY table_name
)
SELECT 
  e.table_name,
  e.expected_columns,
  COALESCE(a.actual_columns, 0) AS actual_columns,
  CASE 
    WHEN e.expected_columns = COALESCE(a.actual_columns, 0) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS result
FROM expected e
LEFT JOIN actual a ON e.table_name = a.table_name
ORDER BY e.table_name;

-- ============================================================================
-- 3. Verify Indexes
-- ============================================================================
\echo ''
\echo '🔍 Step 3: Verifying Indexes...'
\echo ''

WITH expected AS (
  SELECT 'scraper_checkpoints' AS table_name, 4 AS expected_indexes
  UNION ALL
  SELECT 'scraper_retry_queue', 5
  UNION ALL
  SELECT 'scraper_metrics', 6
),
actual AS (
  SELECT 
    tablename AS table_name,
    COUNT(*) AS actual_indexes
  FROM pg_indexes
  WHERE tablename IN ('scraper_checkpoints', 'scraper_retry_queue', 'scraper_metrics')
  GROUP BY tablename
)
SELECT 
  e.table_name,
  e.expected_indexes,
  COALESCE(a.actual_indexes, 0) AS actual_indexes,
  CASE 
    WHEN e.expected_indexes = COALESCE(a.actual_indexes, 0) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS result
FROM expected e
LEFT JOIN actual a ON e.table_name = a.table_name
ORDER BY e.table_name;

\echo ''
\echo 'Index details:'
SELECT 
  '  ' || tablename || ': ' || indexname AS indexes
FROM pg_indexes
WHERE tablename IN ('scraper_checkpoints', 'scraper_retry_queue', 'scraper_metrics')
ORDER BY tablename, indexname;

-- ============================================================================
-- 4. Verify Foreign Keys
-- ============================================================================
\echo ''
\echo '🔗 Step 4: Verifying Foreign Keys...'
\echo ''

SELECT 
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ PASS: All 3 foreign keys exist'
    ELSE '❌ FAIL: Expected 3 foreign keys, found ' || COUNT(*)::text
  END AS result
FROM information_schema.table_constraints AS tc
WHERE tc.table_name IN ('scraper_checkpoints', 'scraper_retry_queue', 'scraper_metrics')
  AND tc.constraint_type = 'FOREIGN KEY';

\echo ''
\echo 'Foreign key details:'
SELECT
  '  ' || tc.table_name || '.' || kcu.column_name || ' → ' || 
  ccu.table_name || '.' || ccu.column_name || 
  ' (ON DELETE ' || rc.delete_rule || ')' AS foreign_keys
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

-- Verify CASCADE DELETE
SELECT 
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ PASS: All foreign keys have CASCADE DELETE'
    ELSE '❌ FAIL: Not all foreign keys have CASCADE DELETE'
  END AS result
FROM information_schema.table_constraints AS tc
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name IN ('scraper_checkpoints', 'scraper_retry_queue', 'scraper_metrics')
  AND tc.constraint_type = 'FOREIGN KEY'
  AND rc.delete_rule = 'CASCADE';

-- ============================================================================
-- 5. Verify CHECK Constraints
-- ============================================================================
\echo ''
\echo '✓ Step 5: Verifying CHECK Constraints...'
\echo ''

SELECT 
  CASE 
    WHEN COUNT(*) = 2 THEN '✅ PASS: Both CHECK constraints exist'
    ELSE '❌ FAIL: Expected 2 CHECK constraints, found ' || COUNT(*)::text
  END AS result
FROM information_schema.table_constraints AS tc
WHERE tc.table_name IN ('scraper_retry_queue', 'scraper_metrics')
  AND tc.constraint_type = 'CHECK';

\echo ''
\echo 'CHECK constraint details:'
SELECT
  '  ' || tc.table_name || ': ' || cc.check_clause AS check_constraints
FROM information_schema.table_constraints AS tc
JOIN information_schema.check_constraints AS cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name IN ('scraper_retry_queue', 'scraper_metrics')
  AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name;

-- ============================================================================
-- 6. Verify Triggers
-- ============================================================================
\echo ''
\echo '⚡ Step 6: Verifying Triggers...'
\echo ''

SELECT 
  CASE 
    WHEN COUNT(*) = 2 THEN '✅ PASS: Both triggers exist'
    ELSE '❌ FAIL: Expected 2 triggers, found ' || COUNT(*)::text
  END AS result
FROM information_schema.triggers
WHERE event_object_table IN ('scraper_checkpoints', 'scraper_retry_queue');

\echo ''
\echo 'Trigger details:'
SELECT
  '  ' || event_object_table || ': ' || trigger_name || 
  ' (' || action_timing || ' ' || event_manipulation || ')' AS triggers
FROM information_schema.triggers
WHERE event_object_table IN ('scraper_checkpoints', 'scraper_retry_queue', 'scraper_metrics')
ORDER BY event_object_table;

-- Verify scraper_metrics does NOT have a trigger (intentional)
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS: scraper_metrics has no trigger (correct - metrics are immutable)'
    ELSE '❌ FAIL: scraper_metrics should not have a trigger'
  END AS result
FROM information_schema.triggers
WHERE event_object_table = 'scraper_metrics';

-- ============================================================================
-- 7. Verify Trigger Functions
-- ============================================================================
\echo ''
\echo '🔧 Step 7: Verifying Trigger Functions...'
\echo ''

SELECT 
  CASE 
    WHEN COUNT(*) = 2 THEN '✅ PASS: Both trigger functions exist'
    ELSE '❌ FAIL: Expected 2 trigger functions, found ' || COUNT(*)::text
  END AS result
FROM information_schema.routines
WHERE routine_name IN (
  'update_scraper_checkpoints_updated_at',
  'update_scraper_retry_queue_updated_at'
);

\echo ''
\echo 'Trigger function details:'
SELECT
  '  ' || routine_name || ' (' || routine_type || ')' AS functions
FROM information_schema.routines
WHERE routine_name IN (
  'update_scraper_checkpoints_updated_at',
  'update_scraper_retry_queue_updated_at'
)
ORDER BY routine_name;

-- ============================================================================
-- 8. Verify UNIQUE Constraint
-- ============================================================================
\echo ''
\echo '🔒 Step 8: Verifying UNIQUE Constraints...'
\echo ''

SELECT 
  CASE 
    WHEN COUNT(*) >= 1 THEN '✅ PASS: scraper_checkpoints has UNIQUE constraint on session_id'
    ELSE '❌ FAIL: scraper_checkpoints missing UNIQUE constraint on session_id'
  END AS result
FROM information_schema.table_constraints
WHERE table_name = 'scraper_checkpoints'
  AND constraint_type = 'UNIQUE';

-- ============================================================================
-- 9. Test Data Insertion (Optional)
-- ============================================================================
\echo ''
\echo '🧪 Step 9: Testing Data Insertion...'
\echo ''

-- Create a test session if needed
DO $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM scraping_sessions LIMIT 1) THEN
    RAISE NOTICE 'No scraping_sessions found - skipping insertion test';
  ELSE
    -- Test scraper_checkpoints insertion
    BEGIN
      INSERT INTO scraper_checkpoints (
        session_id,
        current_industry,
        current_town,
        processed_businesses
      ) VALUES (
        (SELECT id FROM scraping_sessions LIMIT 1),
        'Test Industry',
        'Test Town',
        0
      );
      RAISE NOTICE '✅ PASS: scraper_checkpoints insertion successful';
      
      -- Clean up
      DELETE FROM scraper_checkpoints WHERE current_industry = 'Test Industry';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ FAIL: scraper_checkpoints insertion failed: %', SQLERRM;
    END;

    -- Test scraper_retry_queue insertion
    BEGIN
      INSERT INTO scraper_retry_queue (
        session_id,
        item_type,
        item_data,
        next_retry_time
      ) VALUES (
        (SELECT id FROM scraping_sessions LIMIT 1),
        'navigation',
        '{"url": "https://test.com"}',
        NOW() + INTERVAL '1 minute'
      );
      RAISE NOTICE '✅ PASS: scraper_retry_queue insertion successful';
      
      -- Clean up
      DELETE FROM scraper_retry_queue WHERE item_data::text LIKE '%test.com%';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ FAIL: scraper_retry_queue insertion failed: %', SQLERRM;
    END;

    -- Test scraper_metrics insertion
    BEGIN
      INSERT INTO scraper_metrics (
        session_id,
        metric_type,
        metric_name,
        metric_value,
        success
      ) VALUES (
        (SELECT id FROM scraping_sessions LIMIT 1),
        'navigation',
        'test_metric',
        100,
        true
      );
      RAISE NOTICE '✅ PASS: scraper_metrics insertion successful';
      
      -- Clean up
      DELETE FROM scraper_metrics WHERE metric_name = 'test_metric';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ FAIL: scraper_metrics insertion failed: %', SQLERRM;
    END;
  END IF;
END $;

-- ============================================================================
-- Summary
-- ============================================================================
\echo ''
\echo '╔════════════════════════════════════════════════════════════════════════╗'
\echo '║  Verification Summary                                                  ║'
\echo '╚════════════════════════════════════════════════════════════════════════╝'
\echo ''
\echo 'Expected Results:'
\echo '  ✅ 3 tables created'
\echo '  ✅ scraper_checkpoints: 9 columns, 4 indexes, 1 FK, 0 CHECK, 1 trigger'
\echo '  ✅ scraper_retry_queue: 8 columns, 5 indexes, 1 FK, 1 CHECK, 1 trigger'
\echo '  ✅ scraper_metrics: 8 columns, 6 indexes, 1 FK, 1 CHECK, 0 triggers'
\echo '  ✅ All FKs have CASCADE DELETE'
\echo '  ✅ 2 trigger functions exist'
\echo '  ✅ scraper_checkpoints has UNIQUE constraint on session_id'
\echo ''
\echo 'If all checks show ✅ PASS, migrations were successful!'
\echo ''
\echo '╔════════════════════════════════════════════════════════════════════════╗'
\echo '║  Next Steps                                                            ║'
\echo '╚════════════════════════════════════════════════════════════════════════╝'
\echo ''
\echo '1. Mark task 1.5 as complete in tasks.md'
\echo '2. Proceed to Phase 1, Task 2: NavigationManager Implementation'
\echo '3. Update application code to use new tables'
\echo ''
