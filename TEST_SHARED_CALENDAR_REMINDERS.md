# Testing Guide: Shared Calendar Reminders Feature

## Quick Test Steps

### Setup (One-time)
1. **Create two test users** (if you don't have them already):
   - User A (Sharer): The person who will share their calendar
   - User B (Sharee): The person who will view the shared calendar

2. **Add test data for User A**:
   - Create 2-3 calendar events with different dates
   - Create 2-3 reminders with different dates
   - Make sure some are today, some tomorrow, some in the future

3. **Share User A's calendar with User B**:
   - Log in as User A
   - Go to Leads Dashboard
   - Click "Share" button on the calendar
   - Select User B from the dropdown
   - Grant "Can View" or "Can Add Events" permission
   - Click "Share Calendar"

### Testing the Feature

#### Test 1: View Shared Calendar
1. **Log in as User B**
2. **Navigate to Leads Dashboard**
3. **Verify dropdown appears**:
   - ✅ You should see a calendar dropdown above the calendar
   - ✅ Dropdown should show "📅 My Calendar" (selected by default)
   - ✅ Dropdown should show "📅 User A's Calendar" as an option

#### Test 2: Select Shared Calendar
1. **Click the calendar dropdown**
2. **Select "User A's Calendar"**
3. **Verify calendar updates**:
   - ✅ Calendar grid shows User A's events (colored dots on dates)
   - ✅ Calendar grid shows User A's reminders (colored dots on dates)
   - ✅ Click on a date with items - should show User A's events and reminders

#### Test 3: Upcoming Reminders Card
1. **While viewing User A's calendar**
2. **Check the "Upcoming Reminders" card** (right side of dashboard)
3. **Verify the following**:
   - ✅ Card title shows "User A's Upcoming Reminders" (not just "Upcoming Reminders")
   - ✅ Card displays User A's upcoming events
   - ✅ Card displays User A's upcoming reminders
   - ✅ Items are sorted by date/time (earliest first)
   - ✅ Time range filters work (Today, Tomorrow, This Week, Next 7 Days)

#### Test 4: Switch Back to Own Calendar
1. **Click the calendar dropdown again**
2. **Select "📅 My Calendar"**
3. **Verify calendar updates**:
   - ✅ Calendar grid shows only User B's own events and reminders
   - ✅ "Upcoming Reminders" title reverts to just "Upcoming Reminders"
   - ✅ Card shows only User B's own events and reminders

#### Test 5: Multiple Shared Calendars
1. **Have User C also share their calendar with User B**
2. **Log in as User B**
3. **Verify dropdown shows**:
   - ✅ "📅 My Calendar"
   - ✅ "📅 User A's Calendar"
   - ✅ "📅 User C's Calendar"
4. **Switch between calendars**:
   - ✅ Each calendar shows the correct owner's events and reminders
   - ✅ Title updates to show the correct owner's name
   - ✅ No mixing of data between calendars

#### Test 6: Event Details
1. **While viewing a shared calendar**
2. **Click on a date with events**
3. **Verify event details**:
   - ✅ Event shows correct title, description, time
   - ✅ Event shows "Shared" badge if not owned by viewer
   - ✅ Event shows correct priority (High/Medium/Low)
   - ✅ Event shows location if set
   - ✅ Edit/Delete buttons appear only if viewer has permission

#### Test 7: Reminder Details
1. **While viewing a shared calendar**
2. **Click on a date with reminders**
3. **Verify reminder details**:
   - ✅ Reminder shows correct message/title
   - ✅ Reminder shows correct priority
   - ✅ Reminder shows lead information (if attached to a lead)
   - ✅ Reminder shows correct time
   - ✅ Clicking reminder navigates to the lead (if applicable)

## Expected Behavior Summary

### When viewing OWN calendar:
- Shows only your own events
- Shows only your own reminders
- Title: "Upcoming Reminders"
- Can add/edit/delete events and reminders

### When viewing SHARED calendar:
- Shows only the sharer's events
- Shows only the sharer's reminders
- Title: "[Sharer's Name]'s Upcoming Reminders"
- Can add events only if granted "Can Add Events" permission
- Can edit/delete events only if granted "Can Edit Events" permission
- Cannot edit/delete reminders (they belong to the sharer)

## Common Issues & Solutions

### Issue: Dropdown doesn't appear
**Solution**: Make sure at least one calendar has been shared with the logged-in user

### Issue: Reminders not showing for shared calendar
**Solution**: 
1. Check that the sharer actually has reminders created
2. Verify the reminders have dates in the future (past reminders may be filtered)
3. Clear browser cache and refresh

### Issue: Title doesn't update
**Solution**: 
1. Check browser console for errors
2. Verify the `onCalendarChange` callback is being called
3. Restart the development server

### Issue: Events show but reminders don't
**Solution**:
1. Check the API response in Network tab: `/api/reminders?user_id={userId}`
2. Verify the user_id parameter is being passed correctly
3. Check database to ensure reminders exist for that user

## API Endpoints to Monitor

### In Browser DevTools > Network Tab:

1. **When selecting a shared calendar**:
   - `GET /api/calendar/events?start_date=...&end_date=...&user_id={userId}`
   - `GET /api/reminders?user_id={userId}`

2. **When selecting own calendar**:
   - `GET /api/calendar/events?start_date=...&end_date=...`
   - `GET /api/reminders`

3. **Verify responses**:
   - Events response should contain events created by the selected user
   - Reminders response should contain reminders created by the selected user
   - Check `created_by` or `user_id` fields in the response

## Database Verification

If you need to verify data directly in the database:

```sql
-- Check calendar shares
SELECT * FROM calendar_shares WHERE shared_with_user_id = 'USER_B_ID';

-- Check User A's events
SELECT * FROM calendar_events WHERE created_by = 'USER_A_ID';

-- Check User A's reminders
SELECT * FROM reminders WHERE user_id = 'USER_A_ID';
```

## Success Criteria

✅ Sharee can view sharer's events in calendar
✅ Sharee can view sharer's reminders in calendar
✅ "Upcoming Reminders" title dynamically updates
✅ Sharee can switch between multiple shared calendars
✅ Sharee can switch back to own calendar
✅ No data mixing between different calendar owners
✅ All time range filters work correctly
✅ Events and reminders are properly sorted

## Deployment Checklist

Before deploying to production:
- [ ] All tests pass
- [ ] No console errors
- [ ] API responses are correct
- [ ] Database queries are optimized
- [ ] User permissions are respected
- [ ] Mobile view works correctly
- [ ] Multiple shared calendars work
- [ ] Switching between calendars is smooth
- [ ] Documentation is updated
