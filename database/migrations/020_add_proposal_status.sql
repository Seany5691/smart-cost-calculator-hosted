-- Migration 020: Add Proposal Status and Date
-- Adds 'proposal' status to leads and date_proposal_created column

-- Add date_proposal_created column
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS date_proposal_created DATE;

-- Drop the existing CHECK constraint on status
ALTER TABLE leads 
DROP CONSTRAINT IF EXISTS leads_status_check;

-- Add new CHECK constraint with 'proposal' status
ALTER TABLE leads 
ADD CONSTRAINT leads_status_check 
CHECK (status IN ('new', 'leads', 'working', 'proposal', 'later', 'bad', 'signed'));

-- Create index on date_proposal_created for faster queries
CREATE INDEX IF NOT EXISTS idx_leads_date_proposal_created ON leads(date_proposal_created);

-- Record migration
INSERT INTO migrations (name) VALUES ('020_add_proposal_status') ON CONFLICT (name) DO NOTHING;
