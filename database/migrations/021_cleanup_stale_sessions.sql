-- Migration: Cleanup Stale Sessions
-- Description: Mark stale 'running' sessions as 'error' if they haven't been updated in 10+ minutes
-- This prevents false positives in the queue system

-- Update stale running sessions
UPDATE scraping_sessions
SET status = 'error', updated_at = NOW()
WHERE status = 'running'
AND updated_at < NOW() - INTERVAL '10 minutes';

-- Update stale processing queue items
UPDATE scraper_queue
SET status = 'cancelled', completed_at = NOW()
WHERE status = 'processing'
AND started_at < NOW() - INTERVAL '10 minutes';

-- Log the cleanup
DO $$
DECLARE
  sessions_cleaned INTEGER;
  queue_cleaned INTEGER;
BEGIN
  GET DIAGNOSTICS sessions_cleaned = ROW_COUNT;
  
  SELECT COUNT(*) INTO queue_cleaned
  FROM scraper_queue
  WHERE status = 'cancelled'
  AND completed_at > NOW() - INTERVAL '1 minute';
  
  RAISE NOTICE 'Cleaned up % stale sessions and % stale queue items', sessions_cleaned, queue_cleaned;
END $$;
