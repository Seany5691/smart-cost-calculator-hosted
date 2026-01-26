-- Migration: Leads Complete Parity
-- Description: Update database schema for complete leads management system parity
-- Requirements: 14.1-14.24, 28.1-28.24

-- ============================================================================
-- LEADS TABLE UPDATES
-- ============================================================================

-- Drop existing leads table if needed and recreate with proper schema
-- Note: In production, use ALTER TABLE instead of DROP/CREATE

-- Update leads table to match requirements
ALTER TABLE leads 
  ALTER COLUMN id SET DEFAULT uuid_generate_v4(),
  ALTER COLUMN number DROP DEFAULT,
  ALTER COLUMN number DROP NOT NULL,
  ALTER COLUMN maps_address DROP NOT NULL;

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add date_signed if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='leads' AND column_name='date_signed') THEN
    ALTER TABLE leads ADD COLUMN date_signed DATE;
  END IF;
  
  -- Ensure all required columns exist with correct types
  -- Most columns already exist from the base schema
END $$;

-- Update status check constraint to match requirements
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
  CHECK (status IN ('new', 'leads', 'working', 'later', 'bad', 'signed'));

-- Add unique constraint for user_id + number combination
-- First, ensure all leads have a number and fix duplicates
DO $$
DECLARE
  lead_record RECORD;
  new_number INTEGER;
BEGIN
  -- Update any NULL numbers with auto-generated values
  FOR lead_record IN 
    SELECT id, user_id FROM leads WHERE number IS NULL ORDER BY created_at
  LOOP
    SELECT COALESCE(MAX(number), 0) + 1 INTO new_number
    FROM leads WHERE user_id = lead_record.user_id;
    
    UPDATE leads SET number = new_number WHERE id = lead_record.id;
  END LOOP;
  
  -- Fix any duplicate numbers within the same user
  FOR lead_record IN 
    SELECT l1.id, l1.user_id
    FROM leads l1
    WHERE EXISTS (
      SELECT 1 FROM leads l2 
      WHERE l2.user_id = l1.user_id 
      AND l2.number = l1.number 
      AND l2.id < l1.id
    )
    ORDER BY l1.created_at
  LOOP
    SELECT COALESCE(MAX(number), 0) + 1 INTO new_number
    FROM leads WHERE user_id = lead_record.user_id;
    
    UPDATE leads SET number = new_number WHERE id = lead_record.id;
  END LOOP;
END $$;

-- Now add the unique constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_user_number_unique;
ALTER TABLE leads ADD CONSTRAINT leads_user_number_unique 
  UNIQUE (user_id, number);

-- Update indexes for performance
DROP INDEX IF EXISTS idx_leads_user_status;
CREATE INDEX IF NOT EXISTS idx_leads_user_status ON leads(user_id, status);

DROP INDEX IF EXISTS idx_leads_user_list;
CREATE INDEX IF NOT EXISTS idx_leads_user_list ON leads(user_id, list_name);

DROP INDEX IF EXISTS idx_leads_callback_date;
CREATE INDEX IF NOT EXISTS idx_leads_callback_date ON leads(date_to_call_back) 
  WHERE date_to_call_back IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_background_color ON leads(background_color)
  WHERE background_color IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);


-- ============================================================================
-- NOTES TABLE (lead_notes -> notes)
-- ============================================================================

-- The notes table already exists, just ensure it has the right structure
ALTER TABLE notes 
  ALTER COLUMN id SET DEFAULT uuid_generate_v4(),
  ALTER COLUMN content SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

-- Ensure foreign keys are set correctly
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_lead_id_fkey;
ALTER TABLE notes ADD CONSTRAINT notes_lead_id_fkey 
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_user_id_fkey;
ALTER TABLE notes ADD CONSTRAINT notes_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_notes_lead_id ON notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);


-- ============================================================================
-- REMINDERS TABLE
-- ============================================================================

-- Update reminders table to match requirements
-- The existing table has more fields than needed, we'll keep them for compatibility

-- Add new columns required by the spec
DO $$ 
BEGIN
  -- Add message column if it doesn't exist (maps to title/description)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='reminders' AND column_name='message') THEN
    ALTER TABLE reminders ADD COLUMN message TEXT;
  END IF;
  
  -- Add reminder_date if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='reminders' AND column_name='reminder_date') THEN
    ALTER TABLE reminders ADD COLUMN reminder_date DATE;
  END IF;
  
  -- Add reminder_time if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='reminders' AND column_name='reminder_time') THEN
    ALTER TABLE reminders ADD COLUMN reminder_time TIME;
  END IF;
  
  -- Add status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='reminders' AND column_name='status') THEN
    ALTER TABLE reminders ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
  END IF;
END $$;

-- Add check constraint for status
ALTER TABLE reminders DROP CONSTRAINT IF EXISTS reminders_status_check;
ALTER TABLE reminders ADD CONSTRAINT reminders_status_check 
  CHECK (status IN ('pending', 'completed', 'snoozed'));

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_reminders_user_date ON reminders(user_id, reminder_date, reminder_time);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);


-- ============================================================================
-- ROUTES TABLE
-- ============================================================================

-- Update routes table to match requirements
ALTER TABLE routes 
  ALTER COLUMN id SET DEFAULT uuid_generate_v4(),
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN stop_count SET NOT NULL,
  ALTER COLUMN lead_ids SET NOT NULL;

-- Rename route_url to google_maps_url if needed
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='routes' AND column_name='route_url') THEN
    ALTER TABLE routes RENAME COLUMN route_url TO google_maps_url;
  END IF;
END $$;

-- Add status column if it doesn't exist
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

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_routes_user_id ON routes(user_id);
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);
CREATE INDEX IF NOT EXISTS idx_routes_created_at ON routes(created_at DESC);


-- ============================================================================
-- ATTACHMENTS TABLE (attachments -> lead_attachments)
-- ============================================================================

-- Rename columns to match requirements
DO $$ 
BEGIN
  -- Rename file_name to filename
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='attachments' AND column_name='file_name') THEN
    ALTER TABLE attachments RENAME COLUMN file_name TO filename;
  END IF;
  
  -- Rename file_type to mime_type
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='attachments' AND column_name='file_type') THEN
    ALTER TABLE attachments RENAME COLUMN file_type TO mime_type;
  END IF;
  
  -- Rename storage_path to file_path
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='attachments' AND column_name='storage_path') THEN
    ALTER TABLE attachments RENAME COLUMN storage_path TO file_path;
  END IF;
  
  -- Rename uploaded_by to user_id
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='attachments' AND column_name='uploaded_by') THEN
    ALTER TABLE attachments RENAME COLUMN uploaded_by TO user_id;
  END IF;
END $$;

-- Ensure required columns are NOT NULL
ALTER TABLE attachments 
  ALTER COLUMN filename SET NOT NULL,
  ALTER COLUMN file_path SET NOT NULL,
  ALTER COLUMN file_size SET NOT NULL,
  ALTER COLUMN mime_type SET NOT NULL;

-- Update foreign keys
ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_lead_id_fkey;
ALTER TABLE attachments ADD CONSTRAINT attachments_lead_id_fkey 
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_user_id_fkey;
ALTER TABLE attachments ADD CONSTRAINT attachments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_attachments_lead_id ON attachments(lead_id);
CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON attachments(user_id);


-- ============================================================================
-- IMPORT SESSIONS TABLE
-- ============================================================================

-- Create import_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS import_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('scraper', 'excel')),
  list_name TEXT NOT NULL,
  imported_records INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_import_sessions_user_id ON import_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_import_sessions_created_at ON import_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_sessions_status ON import_sessions(status);


-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to auto-generate lead numbers
CREATE OR REPLACE FUNCTION generate_lead_number(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_max_number INTEGER;
BEGIN
  -- Get the maximum lead number for this user
  SELECT COALESCE(MAX(number), 0) INTO v_max_number
  FROM leads
  WHERE user_id = p_user_id;
  
  -- Return the next number
  RETURN v_max_number + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reminders_updated_at ON reminders;
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- DATA MIGRATION PREPARATION
-- ============================================================================

-- Create a temporary table to track migration progress
CREATE TABLE IF NOT EXISTS migration_log (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  operation VARCHAR(50) NOT NULL,
  records_processed INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Insert migration tracking records
INSERT INTO migration_log (table_name, operation, status)
VALUES 
  ('leads', 'schema_update', 'completed'),
  ('notes', 'schema_update', 'completed'),
  ('reminders', 'schema_update', 'completed'),
  ('routes', 'schema_update', 'completed'),
  ('attachments', 'schema_update', 'completed'),
  ('import_sessions', 'schema_create', 'completed')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- These queries can be used to validate the migration

-- Check table structures
DO $$
DECLARE
  v_leads_count INTEGER;
  v_notes_count INTEGER;
  v_reminders_count INTEGER;
  v_routes_count INTEGER;
  v_attachments_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_leads_count FROM leads;
  SELECT COUNT(*) INTO v_notes_count FROM notes;
  SELECT COUNT(*) INTO v_reminders_count FROM reminders;
  SELECT COUNT(*) INTO v_routes_count FROM routes;
  SELECT COUNT(*) INTO v_attachments_count FROM attachments;
  
  RAISE NOTICE 'Migration validation:';
  RAISE NOTICE '  Leads: % records', v_leads_count;
  RAISE NOTICE '  Notes: % records', v_notes_count;
  RAISE NOTICE '  Reminders: % records', v_reminders_count;
  RAISE NOTICE '  Routes: % records', v_routes_count;
  RAISE NOTICE '  Attachments: % records', v_attachments_count;
END $$;

-- Record migration completion
INSERT INTO migrations (name) VALUES ('005_leads_complete_parity')
ON CONFLICT (name) DO NOTHING;
