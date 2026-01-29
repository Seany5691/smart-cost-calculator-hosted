-- Migration: Add Scraper Checkpoints Table
-- Description: Add checkpoint system for scraper progress persistence and resume capability
-- Date: 2026-01-28
-- Spec: scraper-robustness-enhancement
-- Phase: 1 - Core Resilience

-- ============================================================================
-- Scraper Checkpoints Table
-- ============================================================================
-- Stores scraper progress checkpoints for resume capability after failures
-- Allows scraper to resume from last saved state without losing progress

CREATE TABLE IF NOT EXISTS scraper_checkpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES scraping_sessions(id) ON DELETE CASCADE,
  current_industry TEXT NOT NULL,
  current_town TEXT NOT NULL,
  processed_businesses INTEGER NOT NULL DEFAULT 0,
  retry_queue JSONB NOT NULL DEFAULT '[]',
  batch_state JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(session_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================
-- Index for fast checkpoint lookup by session
CREATE INDEX IF NOT EXISTS idx_scraper_checkpoints_session_id 
  ON scraper_checkpoints(session_id);

-- Index for checkpoint cleanup queries (find old checkpoints)
CREATE INDEX IF NOT EXISTS idx_scraper_checkpoints_created_at 
  ON scraper_checkpoints(created_at);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE scraper_checkpoints IS 
  'Stores scraper progress checkpoints for resume capability after failures or interruptions';

COMMENT ON COLUMN scraper_checkpoints.id IS 
  'Unique checkpoint identifier';

COMMENT ON COLUMN scraper_checkpoints.session_id IS 
  'Reference to the scraping session (one checkpoint per session)';

COMMENT ON COLUMN scraper_checkpoints.current_industry IS 
  'Industry being scraped when checkpoint was saved';

COMMENT ON COLUMN scraper_checkpoints.current_town IS 
  'Town being scraped when checkpoint was saved';

COMMENT ON COLUMN scraper_checkpoints.processed_businesses IS 
  'Number of businesses successfully processed so far';

COMMENT ON COLUMN scraper_checkpoints.retry_queue IS 
  'JSON array of failed operations queued for retry (navigation, lookup, extraction)';

COMMENT ON COLUMN scraper_checkpoints.batch_state IS 
  'JSON object containing current batch state (currentBatch, batchSize, etc.)';

COMMENT ON COLUMN scraper_checkpoints.created_at IS 
  'Timestamp when checkpoint was first created';

COMMENT ON COLUMN scraper_checkpoints.updated_at IS 
  'Timestamp when checkpoint was last updated';

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================
-- Automatically update the updated_at timestamp on row updates

CREATE OR REPLACE FUNCTION update_scraper_checkpoints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scraper_checkpoints_updated_at
  BEFORE UPDATE ON scraper_checkpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_scraper_checkpoints_updated_at();
