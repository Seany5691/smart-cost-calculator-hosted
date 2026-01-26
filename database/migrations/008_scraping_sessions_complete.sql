-- Migration: Complete Scraping Sessions Table
-- This migration ensures the scraping_sessions table has all required fields
-- for complete parity with the old app
-- Requirements: 28.1, 28.3

-- Add state column if it doesn't exist (for session resume functionality)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scraping_sessions' AND column_name = 'state'
  ) THEN
    ALTER TABLE scraping_sessions ADD COLUMN state JSONB;
  END IF;
END $$;

-- Ensure all required columns exist with correct types
-- The table should already exist from initial schema, but we verify structure

-- Verify and update status check constraint to include all valid statuses
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE scraping_sessions DROP CONSTRAINT IF EXISTS scraping_sessions_status_check;
  
  -- Add updated constraint with all statuses
  ALTER TABLE scraping_sessions ADD CONSTRAINT scraping_sessions_status_check 
    CHECK (status IN ('running', 'paused', 'stopped', 'completed', 'error'));
END $$;

-- Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON scraping_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON scraping_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON scraping_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON scraping_sessions(updated_at);

-- Add comment to document the table structure
COMMENT ON TABLE scraping_sessions IS 'Stores scraping session metadata and state for resume functionality';
COMMENT ON COLUMN scraping_sessions.id IS 'Unique session identifier';
COMMENT ON COLUMN scraping_sessions.user_id IS 'User who created the session';
COMMENT ON COLUMN scraping_sessions.name IS 'User-provided session name';
COMMENT ON COLUMN scraping_sessions.config IS 'Session configuration (towns, industries, concurrency settings)';
COMMENT ON COLUMN scraping_sessions.status IS 'Current session status: running, paused, stopped, completed, error';
COMMENT ON COLUMN scraping_sessions.progress IS 'Progress percentage (0-100)';
COMMENT ON COLUMN scraping_sessions.state IS 'Session state for resume (currentTownIndex, completedTowns, etc.)';
COMMENT ON COLUMN scraping_sessions.summary IS 'Session summary (totalBusinesses, townsCompleted, errors, duration)';
COMMENT ON COLUMN scraping_sessions.created_at IS 'Session creation timestamp';
COMMENT ON COLUMN scraping_sessions.updated_at IS 'Last update timestamp';
