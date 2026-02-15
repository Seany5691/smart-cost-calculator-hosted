-- Check for stale running sessions
SELECT 
  id,
  name,
  status,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 as minutes_since_update
FROM scraping_sessions
WHERE status = 'running'
ORDER BY updated_at DESC;

-- Check queue items
SELECT 
  id,
  session_id,
  status,
  queue_position,
  created_at,
  started_at,
  completed_at
FROM scraper_queue
ORDER BY created_at DESC
LIMIT 10;
