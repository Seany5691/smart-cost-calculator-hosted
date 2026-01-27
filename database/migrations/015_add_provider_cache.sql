-- Migration: Add Provider Lookup Cache Table
-- This table caches provider lookup results to avoid redundant API calls
-- TTL: 30 days (providers rarely change)

CREATE TABLE IF NOT EXISTS provider_lookup_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  confidence INTEGER DEFAULT 100,
  last_checked TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by phone number
CREATE INDEX IF NOT EXISTS idx_provider_cache_phone ON provider_lookup_cache(phone_number);

-- Index for cleanup queries (remove old entries)
CREATE INDEX IF NOT EXISTS idx_provider_cache_last_checked ON provider_lookup_cache(last_checked);

-- Add comment
COMMENT ON TABLE provider_lookup_cache IS 'Caches provider lookup results to avoid redundant API calls to porting.co.za';
COMMENT ON COLUMN provider_lookup_cache.phone_number IS 'Phone number in SA format (e.g., 0123456789)';
COMMENT ON COLUMN provider_lookup_cache.provider IS 'Provider name: Telkom, Vodacom, MTN, Cell C, Other, Unknown';
COMMENT ON COLUMN provider_lookup_cache.confidence IS 'Confidence level (0-100), default 100';
COMMENT ON COLUMN provider_lookup_cache.last_checked IS 'When this provider was last verified';

-- Function to clean up old cache entries (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_provider_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM provider_lookup_cache
  WHERE last_checked < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_provider_cache IS 'Removes provider cache entries older than 30 days';
