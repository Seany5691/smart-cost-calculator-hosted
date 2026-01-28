# Calendar Events Fixes - Complete

## Issues Fixed

### 1. Sharee Cannot Delete Events (403 Forbidden)
**Problem**: When a sharee with `can_edit_events` permission tried to delete an event on a shared calendar, they received a 403 Forbidden error.

**Root Cause**: The DELETE endpoint permission check was incomplete - it checked for the permission but the logic wasn't properly validating the result.

**Fix Applied**: 
- Enhanced permission check in `app/api/calendar/events/[eventId]/route.ts`
- Added detailed logging to track permission checks
- Properly validates `can_edit_events` permission from `calendar_shares` table
- Now allows deletion if user is:
  - Owner of the calendar (user_id matches)
  - Creator of the event (created_by matches)
  - Has `can_edit_events` permission on the shared calendar

**File**: `hosted-smart-cost-calculator/app/api/calendar/events/[eventId]/route.ts`

### 2. Sharer's Events Appearing in Sharee's UpcomingReminders Card
**Problem**: When viewing the dashboard, the sharee's UpcomingReminders card was showing events from the sharer's calendar. These should only appear when the sharee explicitly selects the sharer's calendar from the dropdown.

**Root Cause**: The GET endpoint WHERE clause was returning ALL events the user had access to (own + shared), regardless of whether a specific calendar was selected.

**Fix Applied**:
- Modified GET endpoint in `app/api/calendar/events/route.ts`
- Changed WHERE clause logic:
  - **Without `user_id` parameter**: Only returns current user's OWN events (`ce.user_id = $1`)
  - **With `user_id` parameter**: Returns events for the specified user's calendar (for viewing shared calendars)
- This ensures:
  - Dashboard and UpcomingReminders only show user's own events
  - Shared events only appear when explicitly viewing that user's calendar via dropdown

**File**: `hosted-smart-cost-calculator/app/api/calendar/events/route.ts`

### 3. UpcomingReminders Filter Already Working
**Status**: The filter in `UpcomingReminders.tsx` was already correctly implemented:
```typescript
if (!event.is_owner) return false;
```
This filter ensures only events where the user is the owner are displayed in the UpcomingReminders card.

**File**: `hosted-smart-cost-calculator/components/leads/dashboard/UpcomingReminders.tsx` (line ~120)

## Testing Instructions

### Test 1: Sharee Delete Permission
1. Log in as Sharer
2. Share calendar with Sharee, enable "Can Edit Events"
3. Create an event on your calendar
4. Log in as Sharee
5. Select Sharer's calendar from dropdown
6. Click on the event
7. Click Delete button
8. **Expected**: Event should delete successfully (no 403 error)

### Test 2: UpcomingReminders Filtering
1. Log in as Sharer
2. Create events on your calendar
3. Share calendar with Sharee
4. Log in as Sharee
5. View Dashboard
6. Check UpcomingReminders card
7. **Expected**: Should ONLY show Sharee's own events, NOT Sharer's events
8. Select Sharer's calendar from dropdown
9. **Expected**: Now Sharer's events should be visible on the calendar

### Test 3: Calendar View Filtering
1. Log in as Sharee
2. View Reminders tab (has CallbackCalendar)
3. **Expected**: Calendar should only show Sharee's own events
4. Select Sharer's calendar from dropdown
5. **Expected**: Calendar should now show Sharer's events

## API Changes

### GET /api/calendar/events
**Before**:
```sql
WHERE (
  ce.user_id = $1
  OR ce.user_id IN (
    SELECT owner_user_id 
    FROM calendar_shares 
    WHERE shared_with_user_id = $1
  )
)
```

**After**:
```sql
WHERE 1=1
-- If user_id parameter provided:
AND ce.user_id = $2
-- If NO user_id parameter:
AND ce.user_id = $1
```

### DELETE /api/calendar/events/[eventId]
**Enhanced**: Added proper permission validation and logging for `can_edit_events` permission check.

## Deployment Status
✅ Code committed and pushed to GitHub
✅ Ready for VPS deployment

## Next Steps
1. Deploy to VPS
2. Test all three scenarios above
3. Verify console logs show proper permission checks
4. Confirm no more 403 errors on delete
5. Confirm UpcomingReminders only shows own events

## Related Files
- `hosted-smart-cost-calculator/app/api/calendar/events/route.ts` (GET endpoint)
- `hosted-smart-cost-calculator/app/api/calendar/events/[eventId]/route.ts` (DELETE endpoint)
- `hosted-smart-cost-calculator/components/leads/dashboard/UpcomingReminders.tsx` (filter already working)
- `hosted-smart-cost-calculator/components/leads/dashboard/CallbackCalendar.tsx` (uses API with user_id param)
- `hosted-smart-cost-calculator/database/migrations/010_calendar_events_system.sql` (calendar_shares table)
