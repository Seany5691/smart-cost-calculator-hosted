# Quick Start: Shared Calendar Reminders

## What Was Implemented
Sharees can now view both **events AND reminders** from shared calendars in:
1. **Dashboard** (Leads tab)
2. **Reminders Page** (Reminders tab)

## Quick Test (5 minutes)

### Setup
1. Create two users: User A and User B
2. Log in as User A
3. Create 2-3 events and 2-3 reminders
4. Share calendar with User B (Dashboard → Calendar → Share button)

### Test Dashboard
1. Log in as User B
2. Go to Leads → Dashboard
3. Click calendar dropdown → Select "User A's Calendar"
4. ✅ Calendar shows User A's events and reminders
5. ✅ "Upcoming Reminders" title shows "User A's Upcoming Reminders"

### Test Reminders Page
1. Stay logged in as User B
2. Go to Leads → Reminders
3. Click calendar dropdown (in card header) → Select "User A's Calendar"
4. ✅ Title shows "User A's Calendar"
5. ✅ Calendar shows User A's events and reminders
6. Switch to Week view → ✅ Dropdown still visible, User A's data shown
7. Switch to Day view → ✅ Dropdown still visible, User A's data shown

## Key Features

### Dashboard
- Calendar dropdown inside calendar component
- "Upcoming Reminders" card title updates
- Month view only

### Reminders Page
- Calendar dropdown in card header (separate from view toggle)
- Dropdown persists across Month/Week/Day views
- Card title updates

## Files Changed

### Dashboard
- `app/leads/dashboard-content.tsx`
- `components/leads/dashboard/CallbackCalendar.tsx`
- `components/leads/dashboard/UpcomingReminders.tsx`

### Reminders Page
- `app/leads/reminders-page.tsx`
- `components/leads/AdvancedCalendar.tsx`

### API
- `app/api/reminders/route.ts` (added `user_id` parameter)

## API Usage

### Fetch Reminders for Specific User
```typescript
GET /api/reminders?user_id={userId}
```

### Fetch Events for Specific User
```typescript
GET /api/calendar/events?start_date=...&end_date=...&user_id={userId}
```

## Troubleshooting

### Dropdown doesn't appear
- Make sure at least one calendar is shared with the user

### Reminders not showing
- Check Network tab: `/api/reminders?user_id={userId}`
- Verify user has reminders in database

### Dropdown disappears on view change (Reminders page)
- Should NOT happen - dropdown is outside AdvancedCalendar
- Check that `hideCalendarSelector={true}` is passed

## Documentation

### Implementation Details
- `SHARED_CALENDAR_REMINDERS_COMPLETE.md` - Dashboard
- `ADVANCED_CALENDAR_SHARED_REMINDERS_COMPLETE.md` - Reminders page
- `SHARED_CALENDAR_COMPLETE_SUMMARY.md` - Overview

### Testing Guides
- `TEST_SHARED_CALENDAR_REMINDERS.md` - Dashboard testing
- `TEST_ADVANCED_CALENDAR_SHARED.md` - Reminders page testing

## Next Steps

1. Restart dev server: `npm run dev`
2. Clear browser cache
3. Follow quick test above
4. Read full documentation if needed
5. Deploy to production when ready

## Success Criteria

✅ Sharee can view sharer's events
✅ Sharee can view sharer's reminders
✅ Titles update with sharer's name
✅ Dropdown persists across views (Reminders page)
✅ Can switch between multiple shared calendars
✅ Can switch back to own calendar

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Network tab for API responses
3. Verify database has shared calendar records
4. Review documentation files listed above
