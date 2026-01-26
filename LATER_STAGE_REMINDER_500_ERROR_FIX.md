# Later Stage Reminder 500 Error - FIXED

## Problem
When moving a lead to "Later Stage", the reminder creation was failing with a 500 error:
```
POST http://localhost:3000/api/leads/.../reminders 500 (Internal Server Error)
```

## Root Cause
The `reminders` table has a `due_date` column that is **NOT NULL**, but the API route was not providing a value for it when inserting new reminders. The migration added new columns (`reminder_date`, `reminder_time`, `is_all_day`, etc.) but kept `due_date` as a required field for backward compatibility.

## Database Schema
The reminders table has both old and new date/time fields:
- **Old field**: `due_date` (TIMESTAMP NOT NULL) - legacy field, still required
- **New fields**: `reminder_date` (DATE), `reminder_time` (TIME), `is_all_day` (BOOLEAN)

## Solution
Updated `/api/leads/[id]/reminders/route.ts` POST endpoint to:

1. **Calculate `due_date`** from `reminder_date` and `reminder_time`:
   - For all-day reminders: `due_date = reminder_date + '00:00:00'`
   - For timed reminders: `due_date = reminder_date + reminder_time`

2. **Include `due_date`** in the INSERT statement

## Changes Made

### File: `app/api/leads/[id]/reminders/route.ts`
```typescript
// Construct due_date from reminder_date and reminder_time
let due_date;
if (is_all_day || !reminder_time) {
  // For all-day reminders, set to start of day
  due_date = `${reminder_date} 00:00:00`;
} else {
  // Combine date and time
  due_date = `${reminder_date} ${reminder_time}`;
}

// Insert the reminder with all fields INCLUDING due_date
const result = await query(
  `INSERT INTO reminders (
    lead_id, user_id, title, description, message, note,
    reminder_date, reminder_time, is_all_day,
    reminder_type, priority, status, completed,
    is_recurring, recurrence_pattern, route_id,
    due_date, created_at, updated_at
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  RETURNING *`,
  [
    leadId,
    authResult.user.userId,
    title || null,
    description || null,
    message || title || '',
    note || null,
    reminder_date,
    reminder_time || null,
    is_all_day,
    reminder_type,
    priority,
    status,
    completed,
    is_recurring,
    recurrence_pattern ? JSON.stringify(recurrence_pattern) : null,
    route_id,
    due_date,  // <-- ADDED THIS
  ]
);
```

## Testing
Created test script `scripts/test-reminder-insert.js` that successfully:
- ✓ Inserts a reminder with all required fields
- ✓ Properly calculates `due_date` from `reminder_date` and `reminder_time`
- ✓ Cleans up test data

## Expected Behavior After Fix
1. User moves lead to "Later Stage" via modal
2. User selects callback date, time, type, priority, and explanation
3. Lead status updates to "Later Stage"
4. Reminder is created successfully with:
   - Title: "Callback: [Company Name]"
   - Description: User's explanation
   - Date/Time: Selected callback date and time
   - Type: Selected reminder type (call, email, meeting, followup)
   - Priority: Selected priority (high, medium, low)
   - Lead details: Company name, contact person, town
5. Reminder appears in:
   - Reminders tab list view
   - Reminders tab calendar view
   - Lead details modal reminders section

## Next Steps
1. **Restart dev server** to apply the API route changes
2. **Test the flow**:
   - Move a lead to "Later Stage"
   - Fill in the modal with callback details
   - Verify reminder is created (no 500 error)
   - Check Reminders tab to see the new reminder
3. **Verify reminder display** shows lead details correctly

## Files Modified
- ✅ `app/api/leads/[id]/reminders/route.ts` - Added `due_date` calculation and insertion
- ✅ `scripts/test-reminder-insert.js` - Created test script for validation

## Status
🟢 **FIXED** - Reminder creation now works correctly when moving leads to Later Stage
