-- Migration: Add Attachments Table
-- This migration adds support for file attachments on leads

-- Attachments Table (if not exists)
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_attachments_lead_id ON attachments(lead_id);

-- Add interaction type for attachment operations
-- (interactions table already exists, just documenting the new types)
-- New interaction_type values: 'attachment_added', 'attachment_deleted'
