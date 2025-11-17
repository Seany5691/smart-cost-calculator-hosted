-- Migration: Add Town and Contact Person fields to leads table
-- Date: 2024
-- Description: Adds town and contact_person columns to the leads table

-- ============================================================================
-- ADD NEW COLUMNS TO LEADS TABLE
-- ============================================================================

-- Add town column (nullable TEXT)
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS town TEXT;

-- Add contact_person column (nullable TEXT)
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS "contactPerson" TEXT;

-- ============================================================================
-- CREATE INDEXES FOR NEW COLUMNS (Optional but recommended for filtering)
-- ============================================================================

-- Index for town (useful for filtering leads by town)
CREATE INDEX IF NOT EXISTS idx_leads_town ON leads(town);

-- Index for combined user and town (useful for user-specific town queries)
CREATE INDEX IF NOT EXISTS idx_leads_user_town ON leads("userId", town);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN leads.town IS 'Town or city where the lead is located (e.g., Potchefstroom, Klerksdorp)';
COMMENT ON COLUMN leads."contactPerson" IS 'Name of the contact person at the lead location';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify columns were added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'leads'
AND column_name IN ('town', 'contactPerson')
ORDER BY column_name;

-- Check sample data structure
SELECT 
    id,
    name,
    town,
    "contactPerson",
    address,
    "userId"
FROM leads
LIMIT 5;

-- Success message
SELECT 
    'Migration completed successfully!' as status,
    'Added columns: town, contactPerson' as columns_added,
    'Both columns are nullable TEXT fields' as column_type,
    'Indexes created for performance' as indexes,
    'Ready for use in application' as ready;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- Uncomment the following lines to rollback this migration:
-- DROP INDEX IF EXISTS idx_leads_town;
-- DROP INDEX IF EXISTS idx_leads_user_town;
-- ALTER TABLE leads DROP COLUMN IF EXISTS town;
-- ALTER TABLE leads DROP COLUMN IF EXISTS "contactPerson";
