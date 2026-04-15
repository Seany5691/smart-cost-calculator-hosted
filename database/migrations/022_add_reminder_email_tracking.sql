-- Migration: Add email notification tracking to reminders table
-- This allows us to track which notification emails have been sent

ALTER TABLE reminders 
ADD COLUMN IF NOT EXISTS email_sent_created BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_sent_1day BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_sent_30min BOOLEAN DEFAULT false;

-- Add index for efficient querying of reminders needing notifications
CREATE INDEX IF NOT EXISTS idx_reminders_email_notifications 
ON reminders(completed, status, email_sent_created, email_sent_1day, email_sent_30min)
WHERE completed = false;

-- Add comment
COMMENT ON COLUMN reminders.email_sent_created IS 'Whether creation notification email has been sent';
COMMENT ON COLUMN reminders.email_sent_1day IS 'Whether 1-day-before notification email has been sent';
COMMENT ON COLUMN reminders.email_sent_30min IS 'Whether 30-minute-before notification email has been sent';
