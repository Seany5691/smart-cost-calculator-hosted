-- Verification Script - Run AFTER enhanced-reminders-migration.sql
-- This will confirm all new features were added successfully

-- ============================================================================
-- 1. VERIFY NEW COLUMNS EXIST
-- ============================================================================

SELECT 
    'Checking new columns...' as status;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'lead_reminders'
AND column_name IN (
    'reminderTime',
    'isAllDay',
    'reminderType',
    'priority',
    'isRecurring',
    'recurrencePattern',
    'parentReminderId',
    'routeId',
    'title',
    'description'
)
ORDER BY column_name;

-- Expected: 10 rows (all new columns)

-- ============================================================================
-- 2. VERIFY EXISTING DATA IS INTACT
-- ============================================================================

SELECT 
    'Checking existing reminders...' as status;

SELECT 
    COUNT(*) as total_reminders,
    COUNT(CASE WHEN completed = false THEN 1 END) as active_reminders,
    COUNT(CASE WHEN completed = true THEN 1 END) as completed_reminders
FROM lead_reminders;

-- Your existing reminder should still be there

-- ============================================================================
-- 3. VERIFY NEW COLUMNS HAVE DEFAULT VALUES
-- ============================================================================

SELECT 
    'Checking default values on existing reminders...' as status;

SELECT 
    id,
    note,
    "reminderTime",
    "isAllDay",
    "reminderType",
    priority,
    "isRecurring"
FROM lead_reminders
LIMIT 5;

-- Expected: 
-- reminderTime = NULL
-- isAllDay = true
-- reminderType = 'task'
-- priority = 'medium'
-- isRecurring = false

-- ============================================================================
-- 4. VERIFY REMINDER_TEMPLATES TABLE EXISTS
-- ============================================================================

SELECT 
    'Checking reminder_templates table...' as status;

SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name = 'reminder_templates';

-- Expected: 1 row

-- ============================================================================
-- 5. VERIFY NEW INDEXES EXIST
-- ============================================================================

SELECT 
    'Checking new indexes...' as status;

SELECT
    indexname,
    tablename
FROM pg_indexes
WHERE tablename = 'lead_reminders'
AND indexname IN (
    'idx_reminders_type',
    'idx_reminders_priority',
    'idx_reminders_recurring',
    'idx_reminders_route',
    'idx_reminders_datetime',
    'idx_reminders_parent'
)
ORDER BY indexname;

-- Expected: 6 rows (all new indexes)

-- ============================================================================
-- 6. VERIFY TRIGGER EXISTS
-- ============================================================================

SELECT 
    'Checking auto-recurring trigger...' as status;

SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_next_recurring';

-- Expected: 1 row

-- ============================================================================
-- 7. VERIFY VIEWS EXIST
-- ============================================================================

SELECT 
    'Checking views...' as status;

SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_type = 'VIEW'
AND table_name IN (
    'todays_reminders',
    'overdue_reminders',
    'upcoming_reminders'
)
ORDER BY table_name;

-- Expected: 3 rows

-- ============================================================================
-- 8. VERIFY RLS POLICIES
-- ============================================================================

SELECT 
    'Checking RLS policies...' as status;

SELECT
    policyname,
    cmd,
    permissive
FROM pg_policies
WHERE tablename = 'lead_reminders'
ORDER BY policyname;

-- Expected: 4 policies (SELECT, INSERT, UPDATE, DELETE)

-- ============================================================================
-- 9. TEST CREATING A NEW ENHANCED REMINDER (Optional)
-- ============================================================================

-- Uncomment to test creating a reminder with new features:
/*
INSERT INTO lead_reminders (
    "leadId",
    "userId",
    "reminderDate",
    "reminderTime",
    "isAllDay",
    "reminderType",
    priority,
    note,
    completed
) VALUES (
    '48f18cd4-a459-4c2d-a6bf-9ad9685b88ab', -- Your existing leadId
    '1c240a4a-a9f2-4ded-9303-7e781a10a06b', -- Your existing userId
    NOW() + INTERVAL '1 day',
    '14:30',
    false,
    'call',
    'high',
    'Test enhanced reminder with time and priority',
    false
);

-- Verify it was created
SELECT 
    note,
    "reminderTime",
    "isAllDay",
    "reminderType",
    priority
FROM lead_reminders
WHERE note = 'Test enhanced reminder with time and priority';

-- Clean up test (uncomment to remove test reminder)
-- DELETE FROM lead_reminders WHERE note = 'Test enhanced reminder with time and priority';
*/

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

SELECT 
    '✅ MIGRATION VERIFICATION COMPLETE!' as status,
    'If all queries above returned expected results, migration was successful!' as message;

-- Expected Results Summary:
-- ✓ 10 new columns added
-- ✓ Existing data intact
-- ✓ Default values applied
-- ✓ reminder_templates table created
-- ✓ 6 new indexes created
-- ✓ Auto-recurring trigger created
-- ✓ 3 views updated
-- ✓ 4 RLS policies active
