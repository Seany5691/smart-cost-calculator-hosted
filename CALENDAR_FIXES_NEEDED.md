# Calendar Fixes Needed

## Issues to Fix

### 1. Date Picker Timezone Issue ❌
**Problem:** Selecting 29/01/2026 creates event on 30/01/2026
**Cause:** `toISOString()` converts to UTC, causing date shift
**Fix:** Use local date formatting without timezone conversion

### 2. No Edit/Delete for Events ❌
**Problem:** Cannot edit or delete calendar events
**Fix:** 
- Add Edit and Delete buttons in event popover
- Create EditCalendarEventModal component
- Add delete confirmation
- Preserve date/time when editing

### 3. Button Layout Issues ❌
**Problem:** Buttons in random places, don't match calendar design
**Current:** Colored buttons (blue/green) that stand out
**Fix:**
- Redesign header layout
- Use glassmorphic styling (bg-white/10, border-emerald-500/30)
- Better positioning and spacing
- Match calendar aesthetic

### 4. Calendar Events Not in Reminders ❌
**Problem:** Calendar events don't appear in Upcoming Reminders card or Reminders tab
**Fix:** Add calendar events to both locations with distinct styling

## Implementation Plan

### Phase 1: Fix Date Timezone Issue
- [ ] Update AddCalendarEventModal date initialization
- [ ] Use local date string format (YYYY-MM-DD)
- [ ] Test: Select 29th → Should create on 29th

### Phase 2: Add Edit/Delete Functionality
- [ ] Create EditCalendarEventModal component
- [ ] Add Edit/Delete buttons to event popover
- [ ] Implement delete confirmation
- [ ] Preserve date/time in edit modal
- [ ] Test: Edit event → Date stays same

### Phase 3: Redesign Button Layout
- [ ] Move buttons to better positions
- [ ] Apply glassmorphic styling
- [ ] Remove bright colors
- [ ] Add subtle hover effects
- [ ] Test: Buttons look integrated with calendar

### Phase 4: Add Events to Reminders Display
- [ ] Fetch calendar events in dashboard
- [ ] Add events to Upcoming Reminders card
- [ ] Add events to Reminders tab
- [ ] Use distinct styling (blue for events vs yellow for reminders)
- [ ] Test: Events appear in both locations

## Files to Modify

1. `components/leads/AddCalendarEventModal.tsx` - Fix date issue
2. `components/leads/EditCalendarEventModal.tsx` - NEW - Edit modal
3. `components/leads/dashboard/CallbackCalendar.tsx` - Button layout, edit/delete
4. `components/leads/dashboard/UpcomingReminders.tsx` - Add events display
5. `app/leads/page.tsx` - Fetch events for reminders display

## Priority Order

1. **HIGH**: Fix date timezone issue (breaks functionality)
2. **HIGH**: Add edit/delete (essential feature)
3. **MEDIUM**: Redesign button layout (UX improvement)
4. **MEDIUM**: Add events to reminders (feature request)
