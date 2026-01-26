-- Lead Sharing System Migration
-- Enables users to share leads with other users and control reminder visibility

-- Lead sharing table (using VARCHAR for lead_id to support UUIDs)
CREATE TABLE IF NOT EXISTS lead_shares (
  id SERIAL PRIMARY KEY,
  lead_id VARCHAR(255) NOT NULL,
  shared_by_user_id INTEGER NOT NULL,
  shared_with_user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lead_id, shared_with_user_id)
);

-- Reminder sharing table (for selective reminder visibility)
CREATE TABLE IF NOT EXISTS reminder_shares (
  id SERIAL PRIMARY KEY,
  reminder_id VARCHAR(255) NOT NULL,
  shared_with_user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(reminder_id, shared_with_user_id)
);

-- Lead share notifications table
CREATE TABLE IF NOT EXISTS lead_share_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  lead_id VARCHAR(255) NOT NULL,
  shared_by_user_id INTEGER NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_shares_lead ON lead_shares(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_shares_shared_with ON lead_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_lead_shares_shared_by ON lead_shares(shared_by_user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_shares_reminder ON reminder_shares(reminder_id);
CREATE INDEX IF NOT EXISTS idx_reminder_shares_user ON reminder_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_lead_share_notifications_user ON lead_share_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_share_notifications_lead ON lead_share_notifications(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_share_notifications_read ON lead_share_notifications(is_read);
