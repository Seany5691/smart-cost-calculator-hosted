-- Migration: Add super_admin flag to users table
-- This marks Camryn as a permanent super admin that cannot be edited or deleted

-- Add super_admin column
ALTER TABLE users ADD COLUMN IF NOT EXISTS super_admin BOOLEAN DEFAULT FALSE;

-- Mark Camryn as super admin
UPDATE users SET super_admin = TRUE WHERE username = 'Camryn';

-- Create index for super_admin lookups
CREATE INDEX IF NOT EXISTS idx_users_super_admin ON users(super_admin) WHERE super_admin = TRUE;
