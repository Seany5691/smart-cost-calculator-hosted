-- Diagnostic queries for scraper export issue
-- Run these in your PostgreSQL database to diagnose the problem

-- 1. Check if any leads were inserted from scraper export
SELECT COUNT(*) as total_leads, 
       COUNT(DISTINCT list_name) as unique_lists
FROM leads;

-- 2. Check all list names in the leads table
SELECT DISTINCT list_name, COUNT(*) as lead_count
FROM leads
WHERE list_name IS NOT NULL
GROUP BY list_name
ORDER BY list_name;

-- 3. Check recent leads (last 20)
SELECT id, number, name, phone, town, type_of_business, list_name, status, created_at
FROM leads
ORDER BY created_at DESC
LIMIT 20;

-- 4. Check import_sessions table
SELECT id, source_type, list_name, imported_records, status, error_message, metadata, created_at
FROM import_sessions
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check if there's a specific list name from scraper
-- Replace 'YOUR_LIST_NAME' with the actual list name you used
SELECT id, number, name, phone, town, type_of_business, list_name, status
FROM leads
WHERE list_name = 'YOUR_LIST_NAME'
ORDER BY number;

-- 6. Check for any leads with NULL or empty list_name
SELECT COUNT(*) as leads_without_list
FROM leads
WHERE list_name IS NULL OR list_name = '';

-- 7. Check the exact list_name values (including whitespace)
SELECT DISTINCT 
    list_name,
    LENGTH(list_name) as name_length,
    OCTET_LENGTH(list_name) as byte_length,
    COUNT(*) as lead_count
FROM leads
WHERE list_name IS NOT NULL
GROUP BY list_name
ORDER BY created_at DESC;
