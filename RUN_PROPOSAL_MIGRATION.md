# Run Proposal Status Migration

## What This Does
This migration adds support for the "Proposal" status in the leads system:
- Adds `date_proposal_created` column to the `leads` table
- Updates the status CHECK constraint to include 'proposal'
- Creates an index on `date_proposal_created` for performance

## How to Run

### Option 1: Using psql (Recommended)
```bash
psql -h your-database-host -U your-username -d your-database-name -f database/migrations/020_add_proposal_status.sql
```

### Option 2: Using the migration script
```bash
node scripts/migrate.js
```

### Option 3: Manual SQL (if you have database access)
Connect to your PostgreSQL database and run:

```sql
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
```

## Verification
After running the migration, verify it worked:

```sql
-- Check if column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads' AND column_name = 'date_proposal_created';

-- Check if constraint includes 'proposal'
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'leads_status_check';

-- Check if migration was recorded
SELECT * FROM migrations WHERE name = '020_add_proposal_status';
```

## What Happens After Migration
Once this migration is run:
1. Users can change lead status to "Proposal"
2. The ProposalModal will work correctly
3. `date_proposal_created` will be saved when creating proposals
4. The Date Info column will show "Proposal Created: [date]"
5. Generated proposals will be automatically attached to leads

## Rollback (if needed)
If you need to rollback this migration:

```sql
-- Remove the column
ALTER TABLE leads DROP COLUMN IF EXISTS date_proposal_created;

-- Restore old constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
CHECK (status IN ('new', 'leads', 'working', 'later', 'bad', 'signed'));

-- Remove migration record
DELETE FROM migrations WHERE name = '020_add_proposal_status';
```
