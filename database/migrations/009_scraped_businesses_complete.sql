-- Migration: Complete Scraped Businesses Table
-- This migration ensures the scraped_businesses table has all required fields
-- and proper CASCADE delete behavior
-- Requirements: 28.2, 28.4

-- Ensure the table exists with all required columns
-- The table should already exist from initial schema, but we verify structure

-- Verify CASCADE delete on foreign key
DO $$
BEGIN
  -- Drop existing foreign key constraint if it exists
  ALTER TABLE scraped_businesses DROP CONSTRAINT IF EXISTS scraped_businesses_session_id_fkey;
  
  -- Add foreign key with CASCADE delete
  ALTER TABLE scraped_businesses ADD CONSTRAINT scraped_businesses_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES scraping_sessions(id) ON DELETE CASCADE;
END $$;

-- Ensure all required indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_scraped_session_id ON scraped_businesses(session_id);
CREATE INDEX IF NOT EXISTS idx_scraped_name ON scraped_businesses(name);
CREATE INDEX IF NOT EXISTS idx_scraped_phone ON scraped_businesses(phone);
CREATE INDEX IF NOT EXISTS idx_scraped_provider ON scraped_businesses(provider);
CREATE INDEX IF NOT EXISTS idx_scraped_town ON scraped_businesses(town);
CREATE INDEX IF NOT EXISTS idx_scraped_type ON scraped_businesses(type_of_business);
CREATE INDEX IF NOT EXISTS idx_scraped_created_at ON scraped_businesses(created_at);

-- Add comment to document the table structure
COMMENT ON TABLE scraped_businesses IS 'Stores businesses scraped from Google Maps during scraping sessions';
COMMENT ON COLUMN scraped_businesses.id IS 'Unique business identifier';
COMMENT ON COLUMN scraped_businesses.session_id IS 'Reference to scraping session (CASCADE delete)';
COMMENT ON COLUMN scraped_businesses.maps_address IS 'Google Maps URL for the business';
COMMENT ON COLUMN scraped_businesses.name IS 'Business name (required)';
COMMENT ON COLUMN scraped_businesses.phone IS 'Business phone number';
COMMENT ON COLUMN scraped_businesses.provider IS 'Telecommunications provider (Telkom, Vodacom, MTN, Cell C, Other, Unknown)';
COMMENT ON COLUMN scraped_businesses.address IS 'Physical address';
COMMENT ON COLUMN scraped_businesses.town IS 'Town/city where business is located';
COMMENT ON COLUMN scraped_businesses.type_of_business IS 'Industry/category of business';
COMMENT ON COLUMN scraped_businesses.created_at IS 'Timestamp when business was scraped';
