-- Migration: Cleanup Stale Sessions
-- Description: Mark stale 'running' sessions as 'error' if they haven't been updated in 10+ minutes
-- This prevents false positives in the queue system

-- First, show what we're about to clean up
DO $$
DECLARE
  stale_sessions_count INTEGER;
  stale_queue_count INTEGER;
BEGIN
  -- Count stale running sessions
  SELECT COUNT(*) INTO stale_sessions_count
  FROM scraping_sessions
  WHERE status = 'running'
  AND updated_at < NOW() - INTERVAL '10 minutes';
  
  -- Count stale processing queue items
  SELECT COUNT(*) INTO stale_queue_count
  FROM scraper_queue
  WHERE status = 'processing'
  AND started_at < NOW() - INTERVAL '10 minutes';
  
  RAISE NOTICE 'Found % stale running sessions', stale_sessions_count;
  RAISE NOTICE 'Found % stale processing queue items', stale_queue_count;
END $$;

-- Update stale running sessions to error status
UPDATE scraping_sessions
SET status = 'error', updated_at = NOW()
WHERE status = 'running'
AND updated_at < NOW() - INTERVAL '10 minutes';

-- Update stale processing queue items to cancelled
UPDATE scraper_queue
SET status = 'cancelled', completed_at = NOW()
WHERE status = 'processing'
AND started_at < NOW() - INTERVAL '10 minutes';

-- Also cancel any queued items that are older than 2 hours (likely abandoned)
UPDATE scraper_queue
SET status = 'cancelled', completed_at = NOW()
WHERE status = 'queued'
AND created_at < NOW() - INTERVAL '2 hours';

-- Show final counts
DO $$
DECLARE
  sessions_cleaned INTEGER;
  queue_cleaned INTEGER;
  abandoned_cleaned INTEGER;
BEGIN
  -- Count what was cleaned
  SELECT COUNT(*) INTO sessions_cleaned
  FROM scraping_sessions
  WHERE status = 'error'
  AND updated_at > NOW() - INTERVAL '1 minute';
  
  SELECT COUNT(*) INTO queue_cleaned
  FROM scraper_queue
  WHERE status = 'cancelled'
  AND completed_at > NOW() - INTERVAL '1 minute'
  AND started_at IS NOT NULL;
  
  SELECT COUNT(*) INTO abandoned_cleaned
  FROM scraper_queue
  WHERE status = 'cancelled'
  AND completed_at > NOW() - INTERVAL '1 minute'
  AND started_at IS NULL;
  
  RAISE NOTICE 'Cleaned up % stale sessions', sessions_cleaned;
  RAISE NOTICE 'Cleaned up % stale processing queue items', queue_cleaned;
  RAISE NOTICE 'Cleaned up % abandoned queue items', abandoned_cleaned;
END $$;
