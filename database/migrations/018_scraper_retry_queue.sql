-- Migration: Add Scraper Retry Queue Table
-- Description: Add retry queue system for failed scraper operations with exponential backoff
-- Date: 2026-01-28
-- Spec: scraper-robustness-enhancement
-- Phase: 1 - Core Resilience

-- ============================================================================
-- Scraper Retry Queue Table
-- ============================================================================
-- Stores failed scraper operations for later retry attempts with exponential backoff
-- Supports navigation failures, provider lookup failures, and extraction failures

CREATE TABLE IF NOT EXISTS scraper_retry_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES scraping_sessions(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('navigation', 'lookup', 'extraction')),
  item_data JSONB NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_time TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================
-- Index for fast retry queue lookup by session
CREATE INDEX IF NOT EXISTS idx_scraper_retry_queue_session_id 
  ON scraper_retry_queue(session_id);

-- Index for finding items ready to retry (ordered by next_retry_time)
CREATE INDEX IF NOT EXISTS idx_scraper_retry_queue_next_retry_time 
  ON scraper_retry_queue(next_retry_time);

-- Composite index for efficient session + retry time queries
CREATE INDEX IF NOT EXISTS idx_scraper_retry_queue_session_retry 
  ON scraper_retry_queue(session_id, next_retry_time);

-- Index for filtering by item type
CREATE INDEX IF NOT EXISTS idx_scraper_retry_queue_item_type 
  ON scraper_retry_queue(item_type);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE scraper_retry_queue IS 
  'Stores failed scraper operations for retry with exponential backoff (max 3 attempts)';

COMMENT ON COLUMN scraper_retry_queue.id IS 
  'Unique retry queue item identifier';

COMMENT ON COLUMN scraper_retry_queue.session_id IS 
  'Reference to the scraping session (CASCADE DELETE when session is deleted)';

COMMENT ON COLUMN scraper_retry_queue.item_type IS 
  'Type of failed operation: navigation (page load), lookup (phone number), or extraction (data scraping)';

COMMENT ON COLUMN scraper_retry_queue.item_data IS 
  'JSON object containing operation-specific data needed for retry (URL, business info, etc.)';

COMMENT ON COLUMN scraper_retry_queue.attempts IS 
  'Number of retry attempts made so far (0 = first attempt failed, max 3 retries)';

COMMENT ON COLUMN scraper_retry_queue.next_retry_time IS 
  'Timestamp when this item should be retried next (exponential backoff: 1s, 2s, 4s, 8s)';

COMMENT ON COLUMN scraper_retry_queue.created_at IS 
  'Timestamp when item was first added to retry queue';

COMMENT ON COLUMN scraper_retry_queue.updated_at IS 
  'Timestamp when item was last updated (retry attempt, time adjustment)';

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================
-- Automatically update the updated_at timestamp on row updates

CREATE OR REPLACE FUNCTION update_scraper_retry_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scraper_retry_queue_updated_at
  BEFORE UPDATE ON scraper_retry_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_scraper_retry_queue_updated_at();

