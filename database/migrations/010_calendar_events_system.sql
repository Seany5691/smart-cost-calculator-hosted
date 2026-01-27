-- Migration: Calendar Events System
-- Description: Add calendar events and calendar sharing functionality
-- Date: 2026-01-27
-- Issue: #2 - Calendar Events System

-- ============================================================================
-- Calendar Events Table
-- ============================================================================
-- Stores calendar events that are separate from lead reminders
-- Events can be created by users or by sharees on behalf of the owner

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  is_all_day BOOLEAN DEFAULT false,
  event_type VARCHAR(50) DEFAULT 'event' CHECK (event_type IN ('event', 'appointment', 'meeting', 'deadline', 'reminder', 'other')),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  location VARCHAR(255),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for calendar_events
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);

-- ============================================================================
-- Calendar Shares Table
-- ============================================================================
-- Manages calendar sharing between users
-- Owner can share their calendar with other users (sharees)
-- Sharees can view and optionally add/edit events on the owner's calendar

CREATE TABLE IF NOT EXISTS calendar_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_add_events BOOLEAN DEFAULT false,
  can_edit_events BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_user_id, shared_with_user_id),
  CHECK (owner_user_id != shared_with_user_id)
);

-- Indexes for calendar_shares
CREATE INDEX IF NOT EXISTS idx_calendar_shares_owner ON calendar_shares(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_shares_shared_with ON calendar_shares(shared_with_user_id);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE calendar_events IS 'Calendar events separate from lead reminders';
COMMENT ON COLUMN calendar_events.user_id IS 'Owner of the event (whose calendar it appears on)';
COMMENT ON COLUMN calendar_events.created_by IS 'User who created the event (may be different from owner if shared)';
COMMENT ON COLUMN calendar_events.event_type IS 'Type of event: event, appointment, meeting, deadline, reminder, other';
COMMENT ON COLUMN calendar_events.priority IS 'Priority level: low, medium, high';

COMMENT ON TABLE calendar_shares IS 'Calendar sharing permissions between users';
COMMENT ON COLUMN calendar_shares.owner_user_id IS 'User who owns the calendar';
COMMENT ON COLUMN calendar_shares.shared_with_user_id IS 'User who can view the calendar';
COMMENT ON COLUMN calendar_shares.can_add_events IS 'Whether sharee can add events to owner calendar';
COMMENT ON COLUMN calendar_shares.can_edit_events IS 'Whether sharee can edit events on owner calendar';
