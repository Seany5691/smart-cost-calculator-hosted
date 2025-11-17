-- Run this in Supabase SQL Editor to check current table structure
-- This will show us the exact column names, types, and constraints

-- 1. Show table structure
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'lead_reminders'
ORDER BY ordinal_position;

-- 2. Show constraints
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'lead_reminders';

-- 3. Show indexes
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'lead_reminders';

-- 4. Show RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'lead_reminders';

-- 5. Show sample data (to see actual column names in use)
SELECT * FROM lead_reminders LIMIT 1;
