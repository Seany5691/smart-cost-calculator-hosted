-- Migration: Add critical_errors table for admin notifications
-- This table stores critical errors that require administrator attention

CREATE TABLE IF NOT EXISTS critical_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  error_details JSONB,
  context JSONB,
  metadata JSONB,
  notified_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX idx_critical_errors_acknowledged ON critical_errors(acknowledged);
CREATE INDEX idx_critical_errors_notified_at ON critical_errors(notified_at DESC);
CREATE INDEX idx_critical_errors_acknowledged_by ON critical_errors(acknowledged_by);

-- Add comment
COMMENT ON TABLE critical_errors IS 'Stores critical errors that require administrator attention and notification';
