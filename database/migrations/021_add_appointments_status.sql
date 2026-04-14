-- Migration 021: Add 'appointments' status to leads table
-- This adds a new status for scheduled appointments with reminders

-- Drop existing CHECK constraint
ALTER TABLE leads 
DROP CONSTRAINT IF EXISTS leads_status_check;

-- Add new CHECK constraint with 'appointments' status
ALTER TABLE leads 
ADD CONSTRAINT leads_status_check 
CHECK (status IN ('new', 'leads', 'working', 'proposal', 'appointments', 'later', 'bad', 'signed'));

-- Add index for appointments status queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_leads_appointments_status 
ON leads(status) WHERE status = 'appointments';

-- Add comment for documentation
COMMENT ON CONSTRAINT leads_status_check ON leads IS 
'Valid lead statuses: new, leads, working, proposal, appointments, later, bad, signed';
