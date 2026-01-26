-- Migration: Add indexes for deal search performance
-- This improves search performance on customer_name and deal_name columns

-- Add index on customer_name for search functionality
CREATE INDEX IF NOT EXISTS idx_deals_customer_name ON deal_calculations(customer_name);

-- Add index on deal_name for search functionality
CREATE INDEX IF NOT EXISTS idx_deals_deal_name ON deal_calculations(deal_name);

-- Add index on username for admin user filtering
CREATE INDEX IF NOT EXISTS idx_deals_username ON deal_calculations(username);

-- Add composite index for common query patterns (user_id + created_at for sorting)
CREATE INDEX IF NOT EXISTS idx_deals_user_created ON deal_calculations(user_id, created_at DESC);
