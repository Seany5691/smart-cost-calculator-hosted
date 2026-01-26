-- Migration 011: Fix lead_shares table to use UUID instead of VARCHAR
-- This fixes the "operator does not exist: uuid = character varying" error
-- when joining leads table with lead_shares table

-- Drop the existing table
DROP TABLE IF EXISTS lead_shares CASCADE;

-- Recreate with UUID data types to match the leads table
CREATE TABLE lead_shares (
  id SERIAL PRIMARY KEY,
  lead_id UUID NOT NULL,
  shared_by_user_id UUID NOT NULL,
  shared_with_user_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(lead_id, shared_with_user_id)
);

-- Create index for faster lookups
CREATE INDEX idx_lead_shares_lead_id ON lead_shares(lead_id);
CREATE INDEX idx_lead_shares_shared_with ON lead_shares(shared_with_user_id);
CREATE INDEX idx_lead_shares_shared_by ON lead_shares(shared_by_user_id);

-- Also fix lead_share_notifications table
DROP TABLE IF EXISTS lead_share_notifications CASCADE;

CREATE TABLE lead_share_notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  shared_by_user_id UUID NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_lead_share_notifications_user ON lead_share_notifications(user_id);
CREATE INDEX idx_lead_share_notifications_lead ON lead_share_notifications(lead_id);

-- Also fix reminder_shares table if it exists
DROP TABLE IF EXISTS reminder_shares CASCADE;

CREATE TABLE reminder_shares (
  id SERIAL PRIMARY KEY,
  reminder_id UUID NOT NULL,
  shared_with_user_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(reminder_id, shared_with_user_id)
);

CREATE INDEX idx_reminder_shares_reminder ON reminder_shares(reminder_id);
CREATE INDEX idx_reminder_shares_user ON reminder_shares(shared_with_user_id);
