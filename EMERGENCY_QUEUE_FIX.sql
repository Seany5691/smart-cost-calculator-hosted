-- EMERGENCY FIX: Clear the stuck session and queue
-- Run this in your PostgreSQL database to immediately fix the issue

-- 1. Stop the stuck session (69256204-0694-4b86-b913-b352b7916679)
UPDATE scraping_sessions 
SET status = 'stopped', updated_at = NOW()
WHERE id = '69256204-0694-4b86-b913-b352b7916679';

-- 2. Cancel all queue items for this session
UPDATE scraper_queue 
SET status = 'cancelled', completed_at = NOW()
WHERE session_id = '69256204-0694-4b86-b913-b352b7916679';

-- 3. Clear any other stale sessions (not updated in 5+ minutes)
UPDATE scraping_sessions 
SET status = 'stopped', updated_at = NOW()
WHERE status = 'running' 
AND updated_at < NOW() - INTERVAL '5 minutes';

-- 4. Cancel all stale queue items
UPDATE scraper_queue 
SET status = 'cancelled', completed_at = NOW()
WHERE status IN ('queued', 'processing')
AND created_at < NOW() - INTERVAL '10 minutes';

-- 5. Check current status
SELECT 'RUNNING SESSIONS' as type, id, name, status, updated_at,
       EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 as minutes_since_update
FROM scraping_sessions 
WHERE status = 'running'
UNION ALL
SELECT 'QUEUE ITEMS' as type, q.id::text, s.name, q.status::text, q.created_at,
       EXTRACT(EPOCH FROM (NOW() - q.created_at)) / 60 as minutes_since_created
FROM scraper_queue q
LEFT JOIN scraping_sessions s ON q.session_id = s.id
WHERE q.status IN ('queued', 'processing')
ORDER BY type, minutes_since_update DESC;