# Calendar Events & Reminders Enhancement Implementation Plan

## Overview
This document outlines the implementation plan for 7 key improvements to the reminders and calendar system in the leads section.

## Issues to Fix

### 1. Calendar Text Visibility (CRITICAL - UI Fix)
**Problem:** When calendar days are highlighted with past/today/future colors, the text becomes unreadable.
**Solution:** Change text color to black when a day has reminders.
**Files:** `components/leads/dashboard/CallbackCalendar.tsx`
**Status:** ✅ READY TO IMPLEMENT

### 2. Calendar Events System (NEW FEATURE)
**Problem:** Need ability to add calendar events (not just reminders) and share calendars between users.
**Requirements:**
- Add events to calendar (separate from lead reminders)
- Share entire calendar with other users (PA can see boss's calendar)
- Sharee can add events to sharer's calendar
- Events appear in "Upcoming Reminders" card for owner only
- Events appear in Reminders tab for owner only
- Calendar dropdown to view shared calendars

**Implementation Steps:**
a. Database Changes:
   - Create `calendar_events` table
   - Create `calendar_shares` table
   
b. API Routes:
   - `/api/calendar/events` - CRUD for calendar events
   - `/api/calendar/shares` - Manage calendar sharing
   
c. UI Components:
   - AddCalendarEventModal
   - CalendarShareModal
   - Calendar dropdown for viewing shared calendars
   
d. Integration:
   - Update CallbackCalendar to show events
   - Update UpcomingReminders to show events
   - Update Reminders tab to show events

**Status:** ✅ READY TO IMPLEMENT

### 3. Edit Reminder Date Reset (BUG FIX)
**Problem:** When editing a reminder, the date field is cleared and must be re-entered.
**Solution:** Ensure date is properly populated from reminder data.
**Files:** `components/leads/EditReminderModal.tsx`
**Status:** ✅ READY TO IMPLEMENT

### 4. Dropdown Reminder Missing Fields (BUG FIX)
**Problem:** Creating reminder from dropdown doesn't show priority and type fields.
**Solution:** Add priority and type selection to AddReminderModal.
**Files:** `components/leads/AddReminderModal.tsx`
**Status:** ✅ READY TO IMPLEMENT

### 5. "This Week" vs "7 Days" Logic (BUG FIX)
**Problem:** Both filters show the same results.
**Solution:** 
- "This Week" = Remaining days in current week (today through Sunday)
- "7 Days" = Next consecutive 7 days from today
**Files:** `components/leads/dashboard/UpcomingReminders.tsx`
**Status:** ✅ READY TO IMPLEMENT

### 6. Today's Reminders Showing Tomorrow (BUG FIX)
**Problem:** Calendar shows today's reminders under tomorrow's date.
**Solution:** Fix date comparison logic in calendar.
**Files:** `components/leads/dashboard/CallbackCalendar.tsx`
**Status:** ✅ READY TO IMPLEMENT

### 7. Date/Time Picker UI/UX (UI ENHANCEMENT)
**Problem:** Date and time dropdowns are plain white and difficult to use.
**Solution:** 
- Style date/time inputs to match glassmorphic theme
- Replace time input with better time picker
**Files:** 
- `components/leads/AddReminderModal.tsx`
- `components/leads/EditReminderModal.tsx`
**Status:** ✅ READY TO IMPLEMENT

## Implementation Order

### Phase 1: Quick Fixes (Issues 1, 3, 5, 6, 7)
1. Fix calendar text visibility
2. Fix edit reminder date reset
3. Fix "This Week" vs "7 Days" logic
4. Fix today's reminders showing tomorrow
5. Improve date/time picker UI

### Phase 2: Feature Enhancement (Issue 4)
6. Add priority and type fields to dropdown reminder modal

### Phase 3: Major Feature (Issue 2)
7. Implement calendar events system
   - Database schema
   - API routes
   - UI components
   - Integration

## Database Schema for Calendar Events

```sql
-- Calendar Events Table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  is_all_day BOOLEAN DEFAULT false,
  event_type VARCHAR(50) DEFAULT 'event',
  priority VARCHAR(50) DEFAULT 'medium',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Calendar Shares Table
CREATE TABLE IF NOT EXISTS calendar_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_add_events BOOLEAN DEFAULT false,
  can_edit_events BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_user_id, shared_with_user_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_shares_owner ON calendar_shares(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_shares_shared_with ON calendar_shares(shared_with_user_id);
```

## Testing Checklist

### Phase 1 Tests
- [ ] Calendar text is black when day has reminders
- [ ] Edit reminder preserves date value
- [ ] "This Week" shows only remaining week days
- [ ] "7 Days" shows next 7 consecutive days
- [ ] Today's reminders appear on correct date
- [ ] Date/time pickers match UI theme

### Phase 2 Tests
- [ ] Dropdown reminder modal shows priority field
- [ ] Dropdown reminder modal shows type field
- [ ] Priority and type are saved correctly

### Phase 3 Tests
- [ ] Can create calendar events
- [ ] Can share calendar with other users
- [ ] Sharee can view sharer's calendar
- [ ] Sharee can add events to sharer's calendar (if permitted)
- [ ] Events appear in owner's Upcoming Reminders
- [ ] Events appear in owner's Reminders tab
- [ ] Events do NOT appear in sharee's reminders
- [ ] Calendar dropdown shows shared calendars

## Notes
- All existing functionality must remain working
- No changes to other parts of the system
- Focus only on these 7 specific issues
