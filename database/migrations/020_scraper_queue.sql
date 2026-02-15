-- Migration 020: Scraper Queue System
-- Adds queueing system to prevent concurrent scraping sessions

-- Scraper Queue Table
CREATE TABLE IF NOT EXISTS scraper_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES scraping_sessions(id) ON DELETE CASCADE,
  config JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'cancelled')),
  queue_position INTEGER NOT NULL,
  estimated_wait_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Indexes for efficient queue operations
CREATE INDEX IF NOT EXISTS idx_scraper_queue_status ON scraper_queue(status);
CREATE INDEX IF NOT EXISTS idx_scraper_queue_user_id ON scraper_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_scraper_queue_position ON scraper_queue(queue_position);
CREATE INDEX IF NOT EXISTS idx_scraper_queue_created_at ON scraper_queue(created_at);

-- Function to get next queue position
CREATE OR REPLACE FUNCTION get_next_queue_position()
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(queue_position) + 1 FROM scraper_queue WHERE status IN ('queued', 'processing')),
    1
  );
END;
$$ LANGUAGE plpgsql;

-- Function to reorder queue after removal
CREATE OR REPLACE FUNCTION reorder_queue_positions()
RETURNS TRIGGER AS $$
BEGIN
  -- When a queue item is removed or completed, reorder remaining items
  IF (OLD.status IN ('queued', 'processing') AND NEW.status IN ('completed', 'cancelled')) OR TG_OP = 'DELETE' THEN
    UPDATE scraper_queue
    SET queue_position = queue_position - 1
    WHERE status = 'queued' 
    AND queue_position > OLD.queue_position;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to reorder queue on status change
CREATE TRIGGER trigger_reorder_queue
AFTER UPDATE OF status ON scraper_queue
FOR EACH ROW
EXECUTE FUNCTION reorder_queue_positions();

-- Add state column to scraping_sessions if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scraping_sessions' 
    AND column_name = 'state'
  ) THEN
    ALTER TABLE scraping_sessions ADD COLUMN state JSONB;
  END IF;
END $$;

COMMENT ON TABLE scraper_queue IS 'Queue system for managing concurrent scraping sessions';
COMMENT ON COLUMN scraper_queue.queue_position IS 'Position in queue (1 = next to process)';
COMMENT ON COLUMN scraper_queue.estimated_wait_minutes IS 'Estimated wait time in minutes based on average session duration';
