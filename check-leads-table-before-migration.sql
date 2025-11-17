-- Pre-Migration Check: Verify leads table structure
-- Run this BEFORE adding town and contact_person columns
-- This will show you the current state of your leads table

-- ============================================================================
-- 1. CHECK IF COLUMNS ALREADY EXIST
-- ============================================================================

SELECT 
    'Column Existence Check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'leads' AND column_name = 'town'
        ) THEN '✓ town column EXISTS'
        ELSE '✗ town column DOES NOT EXIST (will be added)'
    END as town_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'leads' AND column_name = 'contactPerson'
        ) THEN '✓ contactPerson column EXISTS'
        ELSE '✗ contactPerson column DOES NOT EXIST (will be added)'
    END as contact_person_status;

-- ============================================================================
-- 2. SHOW ALL CURRENT COLUMNS IN LEADS TABLE
-- ============================================================================

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'leads'
ORDER BY ordinal_position;

-- ============================================================================
-- 3. CHECK CURRENT INDEXES ON LEADS TABLE
-- ============================================================================

SELECT 
    indexname as index_name,
    indexdef as index_definition
FROM pg_indexes
WHERE tablename = 'leads'
ORDER BY indexname;

-- ============================================================================
-- 4. COUNT EXISTING LEADS
-- ============================================================================

SELECT 
    COUNT(*) as total_leads,
    COUNT(DISTINCT "userId") as total_users,
    COUNT(CASE WHEN status = 'new' THEN 1 END) as new_leads,
    COUNT(CASE WHEN status = 'leads' THEN 1 END) as leads_status,
    COUNT(CASE WHEN status = 'working' THEN 1 END) as working_leads,
    COUNT(CASE WHEN status = 'later' THEN 1 END) as later_leads,
    COUNT(CASE WHEN status = 'bad' THEN 1 END) as bad_leads,
    COUNT(CASE WHEN status = 'signed' THEN 1 END) as signed_leads
FROM leads;

-- ============================================================================
-- 5. SAMPLE OF CURRENT LEAD DATA (First 3 records)
-- ============================================================================

SELECT 
    id,
    name,
    phone,
    provider,
    address,
    "typeOfBusiness",
    status,
    "listName",
    "createdAt"
FROM leads
ORDER BY "createdAt" DESC
LIMIT 3;

-- ============================================================================
-- 6. CHECK TABLE SIZE AND STORAGE
-- ============================================================================

SELECT 
    pg_size_pretty(pg_total_relation_size('leads')) as total_size,
    pg_size_pretty(pg_relation_size('leads')) as table_size,
    pg_size_pretty(pg_total_relation_size('leads') - pg_relation_size('leads')) as indexes_size;

-- ============================================================================
-- 7. VERIFY RLS (Row Level Security) IS ENABLED
-- ============================================================================

SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'leads';

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 
    '✓ Pre-migration check complete!' as status,
    'Review the results above before running the migration' as next_step,
    'If town and contactPerson columns do NOT exist, you are ready to run the migration' as ready_check,
    'File: add-town-contact-person-fields.sql' as migration_file;
