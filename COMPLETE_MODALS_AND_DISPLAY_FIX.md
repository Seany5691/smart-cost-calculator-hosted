# Complete Modals and Display Fix

## Issues to Fix

1. ✅ **API Field Name Mismatch** - FIXED
   - API now accepts both camelCase and snake_case
   
2. **Signed Date Display Missing**
   - Signed leads don't show when they were signed
   - Need to add date_signed display to LeadsTable and LeadsCards
   
3. **Later Stage Callback Date Display Missing**
   - Later stage leads don't show callback date
   - Need to add date_to_call_back display

4. **Notes and Reminders Modals**
   - Current modals don't match new app style
   - Need to update AddNoteModal and AddReminderModal to match LaterStageModal/SignedModal style

## Implementation Plan

### 1. API Route Fix (DONE)
- Updated `/api/leads/[id]/route.ts` to accept both field name formats
- Now works with both camelCase and snake_case

### 2. Display Signed Date
Update LeadsTable.tsx and LeadsCards.tsx to show:
- For signed leads: Display "Signed on: [date]" with green styling
- Use Calendar icon
- Format date nicely

### 3. Display Callback Date  
Update LeadsTable.tsx and LeadsCards.tsx to show:
- For later stage leads: Display "Callback: [date]" with orange styling
- Use Calendar icon
- Format date nicely

### 4. Update Notes Modal
Match LaterStageModal style:
- Dark theme with backdrop blur
- Info box explaining purpose
- Better form styling
- Error handling
- Loading states

### 5. Update Reminders Modal
Match LaterStageModal style:
- Dark theme with backdrop blur
- Reminder type selection (call, email, meeting, followup)
- Priority selection (high, medium, low)
- Date and time selection
- All day checkbox
- Better form styling

## Expected Result

✅ Later Stage modal works - creates note with callback details
✅ Signed modal works - records signed date
✅ Signed leads display "Signed on: [date]"
✅ Later stage leads display "Callback: [date]"
✅ Notes modal matches new app style
✅ Reminders modal matches new app style with full functionality
✅ All modals work correctly
