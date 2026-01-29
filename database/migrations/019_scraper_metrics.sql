-- Migration: Add Scraper Metrics Table
-- Description: Add metrics collection system for monitoring scraper performance and health
-- Date: 2026-01-28
-- Spec: scraper-robustness-enhancement
-- Phase: 1 - Core Resilience

-- ============================================================================
-- Scraper Metrics Table
-- ============================================================================
-- Stores performance metrics and operational data for monitoring scraper health
-- Tracks navigation times, extraction success rates, lookup performance, and memory usage
-- Metrics are immutable once recorded (no updated_at trigger needed)

CREATE TABLE IF NOT EXISTS scraper_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES scraping_sessions(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('navigation', 'extraction', 'lookup', 'memory')),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  success BOOLEAN NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================
-- Index for fast metrics lookup by session (for session-specific analysis)
CREATE INDEX IF NOT EXISTS idx_scraper_metrics_session 
  ON scraper_metrics(session_id);

-- Index for filtering metrics by type (for type-specific analysis)
CREATE INDEX IF NOT EXISTS idx_scraper_metrics_type 
  ON scraper_metrics(metric_type);

-- Composite index for efficient session + type queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_scraper_metrics_session_type 
  ON scraper_metrics(session_id, metric_type);

-- Index for time-based queries and cleanup (find metrics by date range)
CREATE INDEX IF NOT EXISTS idx_scraper_metrics_created_at 
  ON scraper_metrics(created_at);

-- Index for success rate analysis (filter by success status)
CREATE INDEX IF NOT EXISTS idx_scraper_metrics_success 
  ON scraper_metrics(success);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE scraper_metrics IS 
  'Stores performance metrics and operational data for monitoring scraper health and performance';

COMMENT ON COLUMN scraper_metrics.id IS 
  'Unique metric record identifier';

COMMENT ON COLUMN scraper_metrics.session_id IS 
  'Reference to the scraping session (CASCADE DELETE when session is deleted)';

COMMENT ON COLUMN scraper_metrics.metric_type IS 
  'Category of metric: navigation (page loads), extraction (data scraping), lookup (phone lookups), or memory (resource usage)';

COMMENT ON COLUMN scraper_metrics.metric_name IS 
  'Specific metric name within the type (e.g., "page_load_time", "url_extraction_success", "batch_lookup_duration", "memory_usage_mb")';

COMMENT ON COLUMN scraper_metrics.metric_value IS 
  'Numeric value of the metric (duration in ms, count, percentage, memory in MB, etc.)';

COMMENT ON COLUMN scraper_metrics.success IS 
  'Whether the operation was successful (true) or failed (false)';

COMMENT ON COLUMN scraper_metrics.metadata IS 
  'Optional JSON object containing additional context (error messages, retry attempts, strategy used, etc.)';

COMMENT ON COLUMN scraper_metrics.created_at IS 
  'Timestamp when metric was recorded (metrics are immutable, no updates)';

-- ============================================================================
-- Notes
-- ============================================================================
-- No updated_at trigger is needed because metrics are immutable once recorded
-- Metrics provide historical data for analysis and should never be modified
-- Use created_at for time-series analysis and performance trending
-- CASCADE DELETE ensures metrics are cleaned up when sessions are deleted
