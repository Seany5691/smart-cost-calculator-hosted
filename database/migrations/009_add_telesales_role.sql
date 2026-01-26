-- Migration: Add Telesales Role
-- Description: Adds 'telesales' role to the users table role constraint
-- Date: 2026-01-19

-- Drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new constraint with telesales role
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'manager', 'user', 'telesales'));

-- Record migration
INSERT INTO migrations (name) 
VALUES ('009_add_telesales_role')
ON CONFLICT (name) DO NOTHING;
