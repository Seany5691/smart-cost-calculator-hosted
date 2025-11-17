-- Enhanced Reminders System Migration
-- This migration adds advanced features to the reminders system

-- ============================================================================
-- 1. ADD NEW COLUMNS TO EXISTING lead_reminders TABLE
-- ============================================================================

-- Add time support
ALTER TABLE lead_reminders 
ADD COLUMN IF NOT EXISTS reminderTime VARCHAR(5) DEFAULT NULL; -- "HH:MM" format (24-hour)

ALTER TABLE lead_reminders 
ADD COLUMN IF NOT EXISTS isAllDay BOOLEAN DEFAULT true;

-- Add reminder type
ALTER TABLE lead_reminders 
ADD COLUMN IF NOT EXISTS reminderType VARCHAR(50) DEFAULT 'task'; 
-- Types: call, email, meeting, task, followup, quote, document

-- Add priority
ALTER TABLE lead_reminders 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';
-- Priorities: high, medium, low

-- Add recurring support
ALTER TABLE lead_reminders 
ADD COLUMN IF NOT EXISTS isRecurring BOOLEAN DEFAULT false;

ALTER TABLE lead_reminders 
ADD COLUMN IF NOT EXISTS recurrencePattern JSONB DEFAULT NULL;
-- Format: {"type": "daily|weekly|monthly", "interval": 1, "days": [1,3,5], "endDate": "2024-12-31"}

ALTER TABLE lead_reminders 
ADD COLUMN IF NOT EXISTS parentReminderId UUID DEFAULT NULL;
-- Links to parent reminder for recurring instances

-- Add route linking
ALTER TABLE lead_reminders 
ADD COLUMN IF NOT EXISTS routeId UUID DEFAULT NULL;
-- Links reminder to a route

-- Add general reminder support (not linked to lead or route)
ALTER TABLE lead_reminders 
ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT NULL;
-- For standalone reminders without a lead

ALTER TABLE lead_reminders 
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;
-- Additional details for standalone reminders

-- Make leadId nullable for general reminders
ALTER TABLE lead_reminders 
ALTER COLUMN leadId DROP NOT NULL;

-- Add constraint: must have either leadId, routeId, or title
ALTER TABLE lead_reminders 
ADD CONSTRAINT check_reminder_link 
CHECK (
  leadId IS NOT NULL OR 
  routeId IS NOT NULL OR 
  title IS NOT NULL
);

-- Add foreign key for parent reminder
ALTER TABLE lead_reminders 
ADD CONSTRAINT fk_parent_reminder 
FOREIGN KEY (parentReminderId) 
REFERENCES lead_reminders(id) 
ON DELETE CASCADE;

-- Add foreign key for route (if routes table exists)
-- ALTER TABLE lead_reminders 
-- ADD CONSTRAINT fk_route 
-- FOREIGN KEY (routeId) 
-- REFERENCES routes(id) 
-- ON DELETE CASCADE;

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_reminders_type 
ON lead_reminders(reminderType);

-- Index for filtering by priority
CREATE INDEX IF NOT EXISTS idx_reminders_priority 
ON lead_reminders(priority);

-- Index for recurring reminders
CREATE INDEX IF NOT EXISTS idx_reminders_recurring 
ON lead_reminders(isRecurring) 
WHERE isRecurring = true;

-- Index for route reminders
CREATE INDEX IF NOT EXISTS idx_reminders_route 
ON lead_reminders(routeId) 
WHERE routeId IS NOT NULL;

-- Composite index for date and time queries
CREATE INDEX IF NOT EXISTS idx_reminders_datetime 
ON lead_reminders(reminderDate, reminderTime);

-- Index for parent-child relationships
CREATE INDEX IF NOT EXISTS idx_reminders_parent 
ON lead_reminders(parentReminderId) 
WHERE parentReminderId IS NOT NULL;

-- ============================================================================
-- 3. UPDATE RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own reminders" ON lead_reminders;
DROP POLICY IF EXISTS "Users can create their own reminders" ON lead_reminders;
DROP POLICY IF EXISTS "Users can update their own reminders" ON lead_reminders;
DROP POLICY IF EXISTS "Users can delete their own reminders" ON lead_reminders;

-- Recreate policies with enhanced support
CREATE POLICY "Users can view their own reminders"
ON lead_reminders FOR SELECT
USING (auth.uid() = userId);

CREATE POLICY "Users can create their own reminders"
ON lead_reminders FOR INSERT
WITH CHECK (auth.uid() = userId);

CREATE POLICY "Users can update their own reminders"
ON lead_reminders FOR UPDATE
USING (auth.uid() = userId)
WITH CHECK (auth.uid() = userId);

CREATE POLICY "Users can delete their own reminders"
ON lead_reminders FOR DELETE
USING (auth.uid() = userId);

-- ============================================================================
-- 4. CREATE REMINDER TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS reminder_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  reminderType VARCHAR(50) NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium',
  defaultTime VARCHAR(5), -- "HH:MM"
  isAllDay BOOLEAN DEFAULT false,
  defaultNote TEXT,
  daysOffset INTEGER DEFAULT 0, -- Days from now for default date
  isRecurring BOOLEAN DEFAULT false,
  recurrencePattern JSONB,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE reminder_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates
CREATE POLICY "Users can view their own templates"
ON reminder_templates FOR SELECT
USING (auth.uid() = userId);

CREATE POLICY "Users can create their own templates"
ON reminder_templates FOR INSERT
WITH CHECK (auth.uid() = userId);

CREATE POLICY "Users can update their own templates"
ON reminder_templates FOR UPDATE
USING (auth.uid() = userId);

CREATE POLICY "Users can delete their own templates"
ON reminder_templates FOR DELETE
USING (auth.uid() = userId);

-- ============================================================================
-- 5. INSERT DEFAULT TEMPLATES
-- ============================================================================

-- Note: These will be inserted per user when they first access the system
-- Example templates (commented out - will be created via app):
/*
INSERT INTO reminder_templates (userId, name, reminderType, priority, defaultTime, isAllDay, defaultNote, daysOffset)
VALUES 
  (auth.uid(), 'Initial Contact', 'call', 'high', '09:00', false, 'Make initial contact call', 0),
  (auth.uid(), 'Follow-up Call', 'call', 'medium', '14:00', false, 'Follow up on previous conversation', 3),
  (auth.uid(), 'Send Quote', 'email', 'high', '10:00', false, 'Send pricing quote', 1),
  (auth.uid(), 'Quote Follow-up', 'followup', 'medium', '15:00', false, 'Follow up on sent quote', 7),
  (auth.uid(), 'Schedule Meeting', 'meeting', 'high', '11:00', false, 'Schedule in-person meeting', 2),
  (auth.uid(), 'Contract Review', 'document', 'high', '09:00', false, 'Review and send contract', 14),
  (auth.uid(), 'Monthly Check-in', 'call', 'low', '14:00', false, 'Monthly customer check-in', 30);
*/

-- ============================================================================
-- 6. CREATE FUNCTION TO AUTO-CREATE NEXT RECURRING REMINDER
-- ============================================================================

CREATE OR REPLACE FUNCTION create_next_recurring_reminder()
RETURNS TRIGGER AS $$
DECLARE
  next_date DATE;
  pattern JSONB;
BEGIN
  -- Only proceed if this is a recurring reminder that was just completed
  IF NEW.completed = true AND OLD.completed = false AND NEW.isRecurring = true THEN
    pattern := NEW.recurrencePattern;
    
    -- Calculate next date based on pattern
    IF pattern->>'type' = 'daily' THEN
      next_date := NEW.reminderDate + (pattern->>'interval')::INTEGER;
    ELSIF pattern->>'type' = 'weekly' THEN
      next_date := NEW.reminderDate + (7 * (pattern->>'interval')::INTEGER);
    ELSIF pattern->>'type' = 'monthly' THEN
      next_date := NEW.reminderDate + INTERVAL '1 month' * (pattern->>'interval')::INTEGER;
    END IF;
    
    -- Check if we should create next instance (not past end date)
    IF pattern->>'endDate' IS NULL OR next_date <= (pattern->>'endDate')::DATE THEN
      -- Create next instance
      INSERT INTO lead_reminders (
        leadId, userId, routeId, title, description,
        reminderDate, reminderTime, isAllDay,
        reminderType, priority, note,
        isRecurring, recurrencePattern, parentReminderId,
        completed
      ) VALUES (
        NEW.leadId, NEW.userId, NEW.routeId, NEW.title, NEW.description,
        next_date, NEW.reminderTime, NEW.isAllDay,
        NEW.reminderType, NEW.priority, NEW.note,
        true, NEW.recurrencePattern, COALESCE(NEW.parentReminderId, NEW.id),
        false
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_create_next_recurring ON lead_reminders;
CREATE TRIGGER trigger_create_next_recurring
AFTER UPDATE ON lead_reminders
FOR EACH ROW
EXECUTE FUNCTION create_next_recurring_reminder();

-- ============================================================================
-- 7. CREATE VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for today's reminders
CREATE OR REPLACE VIEW todays_reminders AS
SELECT 
  r.*,
  l.name as lead_name,
  l.phone as lead_phone,
  l.status as lead_status
FROM lead_reminders r
LEFT JOIN leads l ON r.leadId = l.id
WHERE r.reminderDate = CURRENT_DATE
  AND r.completed = false
ORDER BY 
  CASE r.priority
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 3
  END,
  r.reminderTime NULLS LAST;

-- View for overdue reminders
CREATE OR REPLACE VIEW overdue_reminders AS
SELECT 
  r.*,
  l.name as lead_name,
  l.phone as lead_phone,
  l.status as lead_status,
  CURRENT_DATE - r.reminderDate as days_overdue
FROM lead_reminders r
LEFT JOIN leads l ON r.leadId = l.id
WHERE r.reminderDate < CURRENT_DATE
  AND r.completed = false
ORDER BY r.reminderDate ASC, r.reminderTime NULLS LAST;

-- View for upcoming reminders (next 7 days)
CREATE OR REPLACE VIEW upcoming_reminders AS
SELECT 
  r.*,
  l.name as lead_name,
  l.phone as lead_phone,
  l.status as lead_status
FROM lead_reminders r
LEFT JOIN leads l ON r.leadId = l.id
WHERE r.reminderDate BETWEEN CURRENT_DATE + 1 AND CURRENT_DATE + 7
  AND r.completed = false
ORDER BY r.reminderDate ASC, r.reminderTime NULLS LAST;

-- ============================================================================
-- 8. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN lead_reminders.reminderTime IS 'Time in HH:MM format (24-hour). NULL if isAllDay is true.';
COMMENT ON COLUMN lead_reminders.isAllDay IS 'If true, reminder is for entire day without specific time.';
COMMENT ON COLUMN lead_reminders.reminderType IS 'Type: call, email, meeting, task, followup, quote, document';
COMMENT ON COLUMN lead_reminders.priority IS 'Priority level: high, medium, low';
COMMENT ON COLUMN lead_reminders.isRecurring IS 'If true, reminder repeats based on recurrencePattern.';
COMMENT ON COLUMN lead_reminders.recurrencePattern IS 'JSON pattern for recurring reminders: {type, interval, days, endDate}';
COMMENT ON COLUMN lead_reminders.parentReminderId IS 'Links to original reminder if this is a recurring instance.';
COMMENT ON COLUMN lead_reminders.routeId IS 'Links reminder to a route (for route-related reminders).';
COMMENT ON COLUMN lead_reminders.title IS 'Title for standalone reminders (when not linked to lead/route).';
COMMENT ON COLUMN lead_reminders.description IS 'Additional details for standalone reminders.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE 'Enhanced Reminders Migration Complete!';
  RAISE NOTICE 'New features added:';
  RAISE NOTICE '  ✓ Time support (reminderTime, isAllDay)';
  RAISE NOTICE '  ✓ Reminder types (call, email, meeting, etc.)';
  RAISE NOTICE '  ✓ Priority levels (high, medium, low)';
  RAISE NOTICE '  ✓ Recurring reminders (isRecurring, recurrencePattern)';
  RAISE NOTICE '  ✓ Route linking (routeId)';
  RAISE NOTICE '  ✓ Standalone reminders (title, description)';
  RAISE NOTICE '  ✓ Reminder templates table';
  RAISE NOTICE '  ✓ Auto-create next recurring reminder trigger';
  RAISE NOTICE '  ✓ Helpful views (todays_reminders, overdue_reminders, upcoming_reminders)';
END $$;
