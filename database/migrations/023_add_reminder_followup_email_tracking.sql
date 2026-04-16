-- Migration: Add email tracking for 30-minute follow-up email (sent AFTER reminder)
-- This email encourages users to update the lead after completing the reminder

ALTER TABLE reminders 
ADD COLUMN IF NOT EXISTS email_sent_followup BOOLEAN DEFAULT false;

-- Add comment explaining the column
COMMENT ON COLUMN reminders.email_sent_followup IS 'Tracks if the follow-up email was sent 30 minutes AFTER the reminder time';
