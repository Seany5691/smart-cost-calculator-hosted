-- Verification Script: Check if dateSigned column exists
-- Run this BEFORE running the migration to see if the column already exists

-- ============================================================================
-- CHECK IF COLUMN EXISTS
-- ============================================================================

SELECT 
    '=== COLUMN EXISTENCE CHECK ===' as section,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'leads' AND column_name = 'dateSigned'
        ) 
        THEN '✅ dateSigned column EXISTS - Migration already applied'
        ELSE '❌ dateSigned column DOES NOT EXIST - Need to run migration'
    END as status;

-- ============================================================================
-- SHOW ALL COLUMNS IN LEADS TABLE
-- ============================================================================

SELECT 
    '=== ALL COLUMNS IN LEADS TABLE ===' as section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'leads'
ORDER BY ordinal_position;

-- ============================================================================
-- CHECK SAMPLE SIGNED LEADS
-- ============================================================================

SELECT 
    '=== SAMPLE SIGNED LEADS ===' as section,
    id,
    name,
    status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'leads' AND column_name = 'dateSigned'
        )
        THEN 'Column exists - checking value'
        ELSE 'Column does not exist yet'
    END as column_status
FROM leads
WHERE status = 'signed'
LIMIT 5;

-- ============================================================================
-- IF COLUMN EXISTS, SHOW VALUES
-- ============================================================================

-- Uncomment this query ONLY if the column exists:
-- SELECT 
--     id,
--     name,
--     status,
--     "dateSigned",
--     "updatedAt"
-- FROM leads
-- WHERE status = 'signed'
-- LIMIT 10;
