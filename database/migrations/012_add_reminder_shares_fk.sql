-- Migration 012: Add missing foreign key constraint to reminder_shares table
-- This ensures referential integrity between reminder_shares and reminders tables

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'reminder_shares_reminder_id_fkey' 
    AND table_name = 'reminder_shares'
  ) THEN
    ALTER TABLE reminder_shares
    ADD CONSTRAINT reminder_shares_reminder_id_fkey
    FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint: reminder_shares.reminder_id -> reminders.id';
  ELSE
    RAISE NOTICE 'Foreign key constraint already exists';
  END IF;
END $$;
