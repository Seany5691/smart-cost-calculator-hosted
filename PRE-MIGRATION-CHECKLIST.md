# Pre-Migration Checklist for Enhanced Reminders

## ✅ Before Running the Migration

### Step 1: Check Current Table Structure
Run `check-current-reminders-table.sql` in Supabase SQL Editor to verify:
- Current column names and types
- Existing constraints
- Current RLS policies
- Sample data

### Step 2: Backup Current Data (Optional but Recommended)
```sql
-- Create a backup of current reminders
CREATE TABLE lead_reminders_backup AS 
SELECT * FROM lead_reminders;

-- Verify backup
SELECT COUNT(*) FROM lead_reminders_backup;
```

### Step 3: Verify No Active Users
- Check that no users are currently creating/editing reminders
- Consider running during low-traffic time

## 🔍 What the Migration Does

### Safe Operations (No Data Loss)
✅ Adds new columns with DEFAULT values
✅ Creates new indexes
✅ Creates new table (reminder_templates)
✅ Creates new views
✅ Adds new trigger for auto-recurring

### Potentially Breaking Changes
⚠️ Makes `leadId` nullable (for standalone reminders)
⚠️ Drops and recreates RLS policies (brief moment of no access)
⚠️ Drops and recreates `upcoming_reminders` view

### What's Protected
✅ All existing reminder data preserved
✅ All existing columns unchanged
✅ Backward compatible (old reminders will work)

## 📋 Migration File Details

**File**: `enhanced-reminders-migration.sql`

**Naming Convention**: Uses camelCase with quotes (matches your existing table)
- `"leadId"` ✅
- `"userId"` ✅
- `"reminderDate"` ✅
- `"reminderTime"` ✅ (new)
- `"isAllDay"` ✅ (new)
- etc.

**New Columns Added**:
1. `"reminderTime"` VARCHAR(5) - Time in HH:MM format
2. `"isAllDay"` BOOLEAN - All-day reminder flag
3. `"reminderType"` VARCHAR(50) - Type of reminder
4. `priority` VARCHAR(20) - Priority level
5. `"isRecurring"` BOOLEAN - Recurring flag
6. `"recurrencePattern"` JSONB - Recurrence configuration
7. `"parentReminderId"` UUID - Parent reminder link
8. `"routeId"` UUID - Route link
9. `title` VARCHAR(255) - Standalone reminder title
10. `description` TEXT - Standalone reminder description

**New Table Created**:
- `reminder_templates` - Store reusable reminder templates

**New Indexes Created**:
- `idx_reminders_type` - Filter by type
- `idx_reminders_priority` - Filter by priority
- `idx_reminders_recurring` - Find recurring reminders
- `idx_reminders_route` - Find route reminders
- `idx_reminders_datetime` - Date+time queries
- `idx_reminders_parent` - Parent-child relationships

## 🚀 Running the Migration

### Step 1: Open Supabase Dashboard
1. Go to your Supabase project
2. Click "SQL Editor" in the left sidebar

### Step 2: Run the Migration
1. Click "New Query"
2. Copy the entire contents of `enhanced-reminders-migration.sql`
3. Paste into the SQL Editor
4. Click "Run" or press Ctrl+Enter

### Step 3: Verify Success
Look for these messages:
```
✓ Time support (reminderTime, isAllDay)
✓ Reminder types (call, email, meeting, etc.)
✓ Priority levels (high, medium, low)
✓ Recurring reminders (isRecurring, recurrencePattern)
✓ Route linking (routeId)
✓ Standalone reminders (title, description)
✓ Reminder templates table
✓ Auto-create next recurring reminder trigger
✓ Updated views
```

### Step 4: Verify Table Structure
The migration will automatically show the updated table structure at the end.

## ⚠️ If Something Goes Wrong

### Rollback Plan
If you created a backup:
```sql
-- Drop the modified table
DROP TABLE lead_reminders CASCADE;

-- Restore from backup
CREATE TABLE lead_reminders AS 
SELECT * FROM lead_reminders_backup;

-- Recreate original constraints and indexes
-- (Run your original lead-reminders-migration.sql)
```

### Common Issues

**Issue**: "column already exists"
**Solution**: The migration uses `IF NOT EXISTS` - this is safe, just means column was already added

**Issue**: "constraint already exists"
**Solution**: The migration uses `DO $$ ... EXCEPTION` blocks - this is safe

**Issue**: "relation does not exist"
**Solution**: Make sure you're running in the correct database/schema

## ✅ Post-Migration Verification

### Test 1: Check New Columns
```sql
SELECT 
    "reminderTime",
    "isAllDay",
    "reminderType",
    priority,
    "isRecurring"
FROM lead_reminders 
LIMIT 1;
```

### Test 2: Check Templates Table
```sql
SELECT * FROM reminder_templates LIMIT 1;
```

### Test 3: Check Views
```sql
SELECT * FROM todays_reminders LIMIT 5;
SELECT * FROM overdue_reminders LIMIT 5;
SELECT * FROM upcoming_reminders LIMIT 5;
```

### Test 4: Check Trigger
```sql
-- This should show the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_next_recurring';
```

## 📝 After Migration

1. ✅ Test creating a new reminder with time
2. ✅ Test creating a reminder with type and priority
3. ✅ Test creating a recurring reminder
4. ✅ Test completing a recurring reminder (should auto-create next)
5. ✅ Test creating a standalone reminder (no lead)
6. ✅ Verify old reminders still display correctly

## 🎉 Success Indicators

- No error messages in SQL Editor
- All new columns visible in table
- reminder_templates table exists
- Views updated successfully
- Trigger created successfully
- Existing reminders still work
- Can create new enhanced reminders

---

**Ready to proceed?** 
1. Run `check-current-reminders-table.sql` first
2. Review the output
3. Then run `enhanced-reminders-migration.sql`
4. Verify success with post-migration tests
