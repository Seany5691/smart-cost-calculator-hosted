-- Migration: Reminders Complete Parity with Old App
-- This migration adds all missing fields to achieve 100% parity with the old app's reminder system

-- Add missing columns to reminders table (only add what doesn't exist)
ALTER TABLE reminders
ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_reminder_id UUID REFERENCES reminders(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'snoozed')),
ADD COLUMN IF NOT EXISTS reminder_date DATE,
ADD COLUMN IF NOT EXISTS reminder_time TIME;

-- Update recurrence_pattern to JSONB if it's VARCHAR
ALTER TABLE reminders
ALTER COLUMN recurrence_pattern TYPE JSONB USING 
  CASE 
    WHEN recurrence_pattern IS NULL THEN NULL
    WHEN recurrence_pattern::text = '' THEN NULL
    ELSE ('{"type":"' || recurrence_pattern || '"}')::JSONB
  END;

-- Update existing reminders to have default values for new columns
UPDATE reminders
SET 
  is_all_day = true,
  message = COALESCE(title, description, ''),
  note = description,
  is_recurring = false,
  status = CASE WHEN completed = true THEN 'completed' ELSE 'pending' END,
  reminder_date = DATE(due_date),
  reminder_time = due_date::TIME
WHERE is_all_day IS NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_reminders_route ON reminders(route_id);
CREATE INDEX IF NOT EXISTS idx_reminders_parent ON reminders(parent_reminder_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_recurring ON reminders(is_recurring);

-- Update reminder_type CHECK constraint to include all types from old app
ALTER TABLE reminders DROP CONSTRAINT IF EXISTS reminders_reminder_type_check;
ALTER TABLE reminders ADD CONSTRAINT reminders_reminder_type_check 
  CHECK (reminder_type IN ('call', 'email', 'meeting', 'task', 'followup', 'quote', 'document', 'follow_up', 'other'));

-- Update priority CHECK constraint to match old app
ALTER TABLE reminders DROP CONSTRAINT IF EXISTS reminders_priority_check;
ALTER TABLE reminders ADD CONSTRAINT reminders_priority_check 
  CHECK (priority IN ('high', 'medium', 'low', 'urgent'));

-- Create reminder_templates table for template functionality
CREATE TABLE IF NOT EXISTS reminder_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('call', 'email', 'meeting', 'task', 'followup', 'quote', 'document')),
  priority VARCHAR(50) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  default_time TIME,
  is_all_day BOOLEAN DEFAULT false,
  default_note TEXT,
  days_offset INTEGER DEFAULT 0,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for reminder_templates
CREATE INDEX IF NOT EXISTS idx_reminder_templates_user ON reminder_templates(user_id);

-- Add comment to document the migration
COMMENT ON TABLE reminders IS 'Lead reminders with full parity to old app including types, priorities, recurring patterns, and route linking';
COMMENT ON TABLE reminder_templates IS 'Reusable reminder templates for quick reminder creation';
