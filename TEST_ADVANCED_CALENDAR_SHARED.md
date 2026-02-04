# Testing Guide: Advanced Calendar Shared Reminders Feature

## Quick Test Steps

### Setup (One-time)
Same as the dashboard testing - ensure you have:
- User A (Sharer) with events and reminders
- User B (Sharee) who will view the shared calendar
- Calendar shared from User A to User B

### Testing the Feature

#### Test 1: Navigate to Reminders Page
1. **Log in as User B**
2. **Navigate to Reminders page** (click "Reminders" tab in Leads section)
3. **Verify the layout**:
   - ✅ See "Calendar View" title in the card header
   - ✅ See calendar selector dropdown next to the title (if calendars are shared)
   - ✅ Dropdown shows "📅 My Calendar" (selected by default)
   - ✅ Dropdown shows "📅 User A's Calendar" as an option
   - ✅ See view mode toggle buttons (Month/Week/Day) below the title
   - ✅ Calendar is displayed in Month view by default

#### Test 2: Select Shared Calendar
1. **Click the calendar dropdown** (in the card header)
2. **Select "User A's Calendar"**
3. **Verify immediate updates**:
   - ✅ Title changes to "User A's Calendar"
   - ✅ Calendar grid updates to show User A's events and reminders
   - ✅ Dropdown remains visible and shows "User A's Calendar" selected
   - ✅ View mode toggle (Month/Week/Day) remains visible

#### Test 3: Dropdown Persists Across View Changes
This is the KEY test for the AdvancedCalendar implementation!

1. **While viewing User A's calendar in Month view**:
   - ✅ Verify calendar shows User A's events and reminders
   - ✅ Verify dropdown shows "User A's Calendar" selected

2. **Click "Week" view button**:
   - ✅ View changes to Week view
   - ✅ Dropdown is STILL VISIBLE in the header
   - ✅ Dropdown STILL shows "User A's Calendar" selected
   - ✅ Week view shows User A's events and reminders
   - ✅ Title still shows "User A's Calendar"

3. **Click "Day" view button**:
   - ✅ View changes to Day view
   - ✅ Dropdown is STILL VISIBLE in the header
   - ✅ Dropdown STILL shows "User A's Calendar" selected
   - ✅ Day view shows User A's events and reminders
   - ✅ Title still shows "User A's Calendar"

4. **Click "Month" view button**:
   - ✅ View changes back to Month view
   - ✅ Dropdown is STILL VISIBLE in the header
   - ✅ Dropdown STILL shows "User A's Calendar" selected
   - ✅ Month view shows User A's events and reminders
   - ✅ Title still shows "User A's Calendar"

#### Test 4: Switch Calendar While in Different Views
1. **Switch to Week view**
2. **Click the calendar dropdown**
3. **Select "📅 My Calendar"**
4. **Verify updates**:
   - ✅ Title changes to "Calendar View"
   - ✅ Week view now shows YOUR OWN events and reminders
   - ✅ Dropdown shows "📅 My Calendar" selected

5. **Switch to Day view**:
   - ✅ Day view shows YOUR OWN events and reminders
   - ✅ Dropdown still shows "📅 My Calendar"

6. **Click dropdown and select "User A's Calendar" again**:
   - ✅ Title changes to "User A's Calendar"
   - ✅ Day view now shows User A's events and reminders
   - ✅ Dropdown shows "User A's Calendar" selected

#### Test 5: Event Details in Different Views
1. **Select User A's calendar**
2. **In Month view**:
   - ✅ Click on a date with events
   - ✅ Verify popup shows User A's events
   - ✅ Verify events show "Shared" badge if applicable

3. **Switch to Week view**:
   - ✅ Verify User A's events appear in the week grid
   - ✅ Click on an event
   - ✅ Verify event details are correct

4. **Switch to Day view**:
   - ✅ Verify User A's events appear in the day list
   - ✅ Verify reminders appear in the day list
   - ✅ Verify all items are sorted by time

#### Test 6: Multiple Shared Calendars
1. **Have User C also share their calendar with User B**
2. **Refresh the Reminders page**
3. **Verify dropdown shows**:
   - ✅ "📅 My Calendar"
   - ✅ "📅 User A's Calendar"
   - ✅ "📅 User C's Calendar"

4. **Test switching between calendars in different views**:
   - Select User A's calendar in Month view
   - Switch to Week view → verify User A's data
   - Select User C's calendar → verify User C's data in Week view
   - Switch to Day view → verify User C's data persists
   - Select My Calendar → verify own data in Day view
   - Switch to Month view → verify own data persists

#### Test 7: Stats Cards Update
1. **Select User A's calendar**
2. **Scroll down to the stats cards** (Overdue, Today, Upcoming, etc.)
3. **Verify stats reflect User A's data**:
   - ✅ Overdue count includes User A's overdue items
   - ✅ Today count includes User A's items for today
   - ✅ Upcoming count includes User A's future items

4. **Select your own calendar**:
   - ✅ Stats update to show your own data

## Expected Behavior Summary

### Dropdown Placement
- **Location**: Card header, next to the title
- **Visibility**: Always visible, regardless of view mode
- **Persistence**: Selection persists when switching between Month/Week/Day views

### Title Behavior
- **Own Calendar**: "Calendar View"
- **Shared Calendar**: "[Owner's Name]'s Calendar"
- **Updates**: Immediately when calendar selection changes

### View Mode Behavior
- **Month View**: Grid calendar with dots indicating events/reminders
- **Week View**: Week grid with events and reminders listed
- **Day View**: Detailed list of events and reminders for selected day
- **All Views**: Show the same calendar owner's data

### Data Consistency
- Switching views does NOT reset calendar selection
- All views show the same calendar owner's data
- Events and reminders are properly filtered by calendar owner

## Common Issues & Solutions

### Issue: Dropdown disappears when switching views
**Expected**: This should NOT happen
**If it does**: 
1. Check that `hideCalendarSelector={true}` is passed to AdvancedCalendar
2. Verify dropdown is in the card header, not inside AdvancedCalendar
3. Check browser console for errors

### Issue: Calendar selection resets when switching views
**Expected**: This should NOT happen
**If it does**:
1. Verify `selectedCalendarUserId` is managed by RemindersPage, not AdvancedCalendar
2. Check that `selectedCalendarUserId` prop is passed to AdvancedCalendar
3. Verify useEffect dependencies in RemindersPage

### Issue: Wrong data shown after switching calendars
**Solution**:
1. Check Network tab for API calls: `/api/reminders?user_id={userId}`
2. Verify `fetchRemindersForCalendar` is called when calendar changes
3. Check that correct reminders are passed to AdvancedCalendar

### Issue: Title doesn't update
**Solution**:
1. Verify `selectedCalendarOwnerName` state is updated when calendar changes
2. Check that owner name is extracted from `sharedCalendars` array
3. Verify title rendering logic in RemindersPage

## Visual Verification

### Correct Layout (Reminders Page)
```
┌─────────────────────────────────────────────────────────┐
│  User A's Calendar              [📅 Dropdown ▼]         │
├─────────────────────────────────────────────────────────┤
│  [Month] [Week] [Day]  ← View Toggle                    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                  │   │
│  │         Calendar Content (Month/Week/Day)       │   │
│  │                                                  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Incorrect Layout (If dropdown is inside AdvancedCalendar)
```
┌─────────────────────────────────────────────────────────┐
│  User A's Calendar                                       │
├─────────────────────────────────────────────────────────┤
│  [📅 Dropdown ▼]  ← This would disappear on view change │
│  [Month] [Week] [Day]                                   │
│                                                          │
│  Calendar Content                                        │
└─────────────────────────────────────────────────────────┘
```

## Success Criteria

✅ Dropdown is visible in card header
✅ Dropdown persists when switching between Month/Week/Day views
✅ Calendar selection persists across view changes
✅ Title updates to show calendar owner's name
✅ All views show the same calendar owner's data
✅ Can switch between multiple shared calendars
✅ Can switch back to own calendar
✅ Stats cards update to reflect selected calendar
✅ No console errors
✅ Smooth transitions between views and calendars

## Comparison Test: Dashboard vs Reminders Page

### Test Both Implementations
1. **Dashboard (Leads tab)**:
   - Calendar selector is inside CallbackCalendar
   - Only Month view available
   - Dropdown behavior is correct (no view switching)

2. **Reminders Page**:
   - Calendar selector is outside AdvancedCalendar
   - Month, Week, and Day views available
   - Dropdown persists across view changes

3. **Verify Consistency**:
   - Both show the same shared calendars
   - Both filter events and reminders correctly
   - Both update titles appropriately
   - Both allow switching between calendars

## Performance Checks

- [ ] Calendar loads quickly when switching views
- [ ] No unnecessary API calls when switching views
- [ ] Dropdown responds immediately to selection
- [ ] View transitions are smooth
- [ ] No flickering or layout shifts

## Mobile Testing

- [ ] Dropdown is accessible on mobile
- [ ] View toggle buttons work on mobile
- [ ] Calendar is readable in all views on mobile
- [ ] Dropdown doesn't overflow on small screens
- [ ] Touch interactions work correctly

## Deployment Checklist

Before deploying to production:
- [ ] All tests pass
- [ ] Dropdown persists across view changes
- [ ] No console errors
- [ ] API responses are correct
- [ ] Multiple shared calendars work
- [ ] Mobile view works correctly
- [ ] Performance is acceptable
- [ ] Documentation is updated
