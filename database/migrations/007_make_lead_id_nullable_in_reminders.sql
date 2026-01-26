-- Migration: Make lead_id nullable in reminders table to support standalone reminders
-- This allows reminders to exist without being attached to a specific lead

ALTER TABLE reminders 
  ALTER COLUMN lead_id DROP NOT NULL;

-- Add a check constraint to ensure either lead_id or title is provided
-- (Standalone reminders must have a title)
ALTER TABLE reminders
  ADD CONSTRAINT reminders_lead_or_title_check 
  CHECK (lead_id IS NOT NULL OR title IS NOT NULL);
