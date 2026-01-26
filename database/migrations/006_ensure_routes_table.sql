-- Migration: Ensure Routes Table Exists
-- Description: Create routes table if it doesn't exist (fallback for migration 001)

-- Create routes table if it doesn't exist
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  route_url TEXT NOT NULL,
  stop_count INTEGER NOT NULL,
  lead_ids UUID[] NOT NULL,
  starting_point VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_routes_user_id ON routes(user_id);
CREATE INDEX IF NOT EXISTS idx_routes_created_at ON routes(created_at DESC);

-- Add status column if it doesn't exist (from migration 005)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='routes' AND column_name='status') THEN
    ALTER TABLE routes ADD COLUMN status VARCHAR(50) DEFAULT 'active';
  END IF;
END $$;

-- Add check constraint for status
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_status_check;
ALTER TABLE routes ADD CONSTRAINT routes_status_check 
  CHECK (status IN ('active', 'completed'));

-- Create index on status
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);

-- Record migration completion
INSERT INTO migrations (name) VALUES ('006_ensure_routes_table')
ON CONFLICT (name) DO NOTHING;
