-- Fix Lead Sharing Tables - Change lead_id from INTEGER to VARCHAR to support UUIDs

-- Drop existing tables (if they exist)
DROP TABLE IF EXISTS lead_share_notifications;
DROP TABLE IF EXISTS reminder_shares;
DROP TABLE IF EXISTS lead_shares;

-- Recreate with correct data types
CREATE TABLE lead_shares (
  id SERIAL PRIMARY KEY,
  lead_id VARCHAR(255) NOT NULL,
  shared_by_user_id VARCHAR(255) NOT NULL,
  shared_with_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lead_id, shared_with_user_id)
);

CREATE TABLE reminder_shares (
  id SERIAL PRIMARY KEY,
  reminder_id VARCHAR(255) NOT NULL,
  shared_with_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(reminder_id, shared_with_user_id)
);

CREATE TABLE lead_share_notifications (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  lead_id VARCHAR(255) NOT NULL,
  shared_by_user_id VARCHAR(255) NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_lead_shares_lead ON lead_shares(lead_id);
CREATE INDEX idx_lead_shares_shared_with ON lead_shares(shared_with_user_id);
CREATE INDEX idx_lead_shares_shared_by ON lead_shares(shared_by_user_id);
CREATE INDEX idx_reminder_shares_reminder ON reminder_shares(reminder_id);
CREATE INDEX idx_reminder_shares_user ON reminder_shares(shared_with_user_id);
CREATE INDEX idx_lead_share_notifications_user ON lead_share_notifications(user_id);
CREATE INDEX idx_lead_share_notifications_lead ON lead_share_notifications(lead_id);
CREATE INDEX idx_lead_share_notifications_read ON lead_share_notifications(is_read);
