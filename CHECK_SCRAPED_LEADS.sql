-- Check if scraped leads were inserted
-- Run this query in your PostgreSQL database

-- Check all leads for your user
SELECT id, number, name, phone, town, type_of_business, list_name, status, created_at
FROM leads
WHERE user_id = (SELECT id FROM users WHERE username = 'YOUR_USERNAME')
ORDER BY created_at DESC
LIMIT 20;

-- Check import sessions
SELECT id, source_type, list_name, imported_records, status, error_message, metadata, created_at
FROM import_sessions
WHERE user_id = (SELECT id FROM users WHERE username = 'YOUR_USERNAME')
ORDER BY created_at DESC
LIMIT 10;

-- Check leads by list name
SELECT id, number, name, phone, town, type_of_business, list_name, status
FROM leads
WHERE list_name = 'Scraped Leads'  -- Replace with your list name
ORDER BY number;
