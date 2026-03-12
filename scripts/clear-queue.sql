-- Emergency SQL Script to Clear Stale Queue and Sessions
-- Run this directly in your PostgreSQL database if needed

-- 1. Stop all stale running sessions (not updated in 5+ minutes)
UPDATE scraping_sessions 
SET status = 'stopped', updated_at = NOW()
WHERE status = 'running' 
AND updated_at < NOW() - INTERVAL '5 minutes';

-- 2. Cancel all stale processing queue items
UPDATE scraper_queue 
SET status = 'cancelled', completed_at = NOW()
WHERE status = 'processing'
AND started_at < NOW() - INTERVAL '5 minutes';

-- 3. Cancel all queued items (optional - only if you want to clear the entire queue)
UPDATE scraper_queue 
SET status = 'cancelled', completed_at = NOW()
WHERE status = 'queued';

-- 4. View current queue status
SELECT 
  q.id,
  q.status,
  q.queue_position,
  q.created_at,
  s.name as session_name,
  u.username,
  EXTRACT(EPOCH FROM (NOW() - q.created_at)) / 60 as age_minutes
FROM scraper_queue q
LEFT JOIN scraping_sessions s ON q.session_id = s.id
LEFT JOIN users u ON q.user_id = u.id
WHERE q.status IN ('queued', 'processing')
ORDER BY q.queue_position;

-- 5. View running sessions
SELECT 
  id,
  name,
  status,
  progress,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 as minutes_since_update
FROM scraping_sessions 
WHERE status = 'running'
ORDER BY updated_at DESC;
