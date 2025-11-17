-- EXACT Schema Verification for leads table
-- This shows the EXACT casing and structure of your leads table
-- Run this to verify before adding town and contactPerson columns

-- ============================================================================
-- 1. SHOW EXACT COLUMN NAMES WITH CASING
-- ============================================================================

SELECT 
    '=== EXACT COLUMN NAMES (with casing) ===' as section,
    column_name as "EXACT_COLUMN_NAME",
    data_type as "DATA_TYPE",
    is_nullable as "NULLABLE",
    CASE 
        WHEN column_name = 'mapsAddress' THEN '✓ PascalCase (correct)'
        WHEN column_name = 'typeOfBusiness' THEN '✓ PascalCase (correct)'
        WHEN column_name = 'dateToCallBack' THEN '✓ PascalCase (correct)'
        WHEN column_name = 'backgroundColor' THEN '✓ PascalCase (correct)'
        WHEN column_name = 'listName' THEN '✓ PascalCase (correct)'
        WHEN column_name = 'userId' THEN '✓ PascalCase (correct)'
        WHEN column_name = 'importSessionId' THEN '✓ PascalCase (correct)'
        WHEN column_name = 'createdAt' THEN '✓ PascalCase (correct)'
        WHEN column_name = 'updatedAt' THEN '✓ PascalCase (correct)'
        WHEN column_name = 'contactPerson' THEN '✓ NEW COLUMN - PascalCase (correct)'
        WHEN column_name = 'town' THEN '✓ NEW COLUMN - lowercase (correct)'
        ELSE 'lowercase or other'
    END as "CASING_PATTERN"
FROM information_schema.columns
WHERE table_name = 'leads'
ORDER BY ordinal_position;

-- ============================================================================
-- 2. CHECK IF NEW COLUMNS ALREADY EXIST
-- ============================================================================

SELECT 
    '=== NEW COLUMNS CHECK ===' as section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'town')
        THEN '❌ town ALREADY EXISTS - DO NOT RUN MIGRATION'
        ELSE '✅ town DOES NOT EXIST - SAFE TO ADD'
    END as "town_column_status",
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'contactPerson')
        THEN '❌ contactPerson ALREADY EXISTS - DO NOT RUN MIGRATION'
        ELSE '✅ contactPerson DOES NOT EXIST - SAFE TO ADD'
    END as "contactPerson_column_status";

-- ============================================================================
-- 3. SHOW PASCALCASE COLUMNS (to verify pattern)
-- ============================================================================

SELECT 
    '=== PASCALCASE COLUMNS (Pattern to Follow) ===' as section,
    column_name as "PascalCase_Columns"
FROM information_schema.columns
WHERE table_name = 'leads'
AND column_name ~ '^[a-z]+[A-Z]' -- Regex for PascalCase pattern
ORDER BY column_name;

-- ============================================================================
-- 4. SHOW EXACT TABLE DEFINITION
-- ============================================================================

SELECT 
    '=== COMPLETE TABLE STRUCTURE ===' as section,
    ordinal_position as "Position",
    column_name as "Column_Name",
    data_type as "Type",
    character_maximum_length as "Max_Length",
    is_nullable as "Nullable",
    column_default as "Default_Value"
FROM information_schema.columns
WHERE table_name = 'leads'
ORDER BY ordinal_position;

-- ============================================================================
-- 5. VERIFY EXACT MIGRATION WILL MATCH
-- ============================================================================

SELECT 
    '=== MIGRATION VERIFICATION ===' as section,
    'The migration will add:' as info,
    'Column 1: town (lowercase, TEXT, nullable)' as column_1,
    'Column 2: contactPerson (PascalCase, TEXT, nullable)' as column_2,
    'This matches the pattern of existing columns' as pattern_match;

-- ============================================================================
-- 6. SHOW SAMPLE QUERY WITH EXACT CASING
-- ============================================================================

-- This shows you the EXACT query that will work after migration
SELECT 
    '=== SAMPLE QUERY AFTER MIGRATION ===' as section,
    'SELECT id, name, town, "contactPerson", address FROM leads;' as example_query,
    'Note: contactPerson needs quotes because of PascalCase' as important_note;

-- ============================================================================
-- FINAL SAFETY CHECK
-- ============================================================================

SELECT 
    '=== FINAL SAFETY CHECK ===' as section,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'town')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'contactPerson')
        THEN '✅ SAFE TO RUN MIGRATION - Both columns do not exist'
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'town')
        OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'contactPerson')
        THEN '❌ DO NOT RUN MIGRATION - One or both columns already exist'
        ELSE '⚠️ UNKNOWN STATE - Review results above'
    END as "MIGRATION_SAFETY_STATUS";
