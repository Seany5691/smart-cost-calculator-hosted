-- Migration: Add dateSigned column to leads table
-- This column stores the date when a lead was successfully signed
-- Date: 2024
-- Description: Adds dateSigned column to the leads table

-- ============================================================================
-- ADD NEW COLUMN TO LEADS TABLE
-- ============================================================================

-- Add dateSigned column (nullable DATE) - using camelCase with quotes to match schema
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS "dateSigned" DATE;

-- ============================================================================
-- CREATE INDEX FOR NEW COLUMN
-- ============================================================================

-- Create an index for better query performance when filtering by signed date
CREATE INDEX IF NOT EXISTS idx_leads_date_signed ON leads("dateSigned") WHERE "dateSigned" IS NOT NULL;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

-- Add a comment to document the column
COMMENT ON COLUMN leads."dateSigned" IS 'Date when the lead was successfully signed (converted)';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND column_name = 'dateSigned';

-- Check sample data structure
SELECT 
    id,
    name,
    status,
    "dateSigned",
    "createdAt",
    "updatedAt"
FROM leads
WHERE status = 'signed'
LIMIT 5;

-- Success message
SELECT 
    'Migration completed successfully!' as status,
    'Added column: dateSigned' as column_added,
    'Column is nullable DATE field' as column_type,
    'Index created for performance' as indexes,
    'Ready for use in application' as ready;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- Uncomment the following lines to rollback this migration:
-- DROP INDEX IF EXISTS idx_leads_date_signed;
-- ALTER TABLE leads DROP COLUMN IF EXISTS "dateSigned";
