-- Check the actual status of leads in the database
-- Run this in your PostgreSQL client to see what's really in the database

-- Count leads by status
SELECT status, COUNT(*) as count
FROM leads
GROUP BY status
ORDER BY status;

-- Show all leads with their status
SELECT id, name, status, town, provider, created_at
FROM leads
ORDER BY status, name;

-- Check for any leads that might have status='bad' but should be 'later'
SELECT id, name, status, date_to_call_back
FROM leads
WHERE status = 'bad' AND date_to_call_back IS NOT NULL;

-- Check for any leads that have status='later'
SELECT id, name, status, date_to_call_back
FROM leads
WHERE status = 'later';
