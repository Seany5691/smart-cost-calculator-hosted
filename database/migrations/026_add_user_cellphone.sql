-- Migration: 026_add_user_cellphone.sql
-- Description: Add cellphone_number column to users table for auto-filling specialist phone in proposals
-- Date: 2026-04-21

-- Add cellphone_number column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS cellphone_number VARCHAR(50);

-- Add index for potential future queries
CREATE INDEX IF NOT EXISTS idx_users_cellphone ON users(cellphone_number);

-- Add comment to column
COMMENT ON COLUMN users.cellphone_number IS 'Optional cellphone number for user, used to auto-fill specialist phone in proposals';
