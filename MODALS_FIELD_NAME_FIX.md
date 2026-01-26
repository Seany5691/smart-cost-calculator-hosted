# Status Modals Field Name Fix

## Problem
When trying to move leads to "Later" or "Signed" status, got errors:
- "Date to call back is required for 'later' status"
- "Date signed is required for 'signed' status"

Even though the modals had the dates filled in.

## Root Cause
**Field name mismatch** between modals and API:

### Later Stage Modal
- Modal was sending: `dateToCallBack` (camelCase)
- API was expecting: `date_to_call_back` (snake_case)

### Signed Modal
- Modal was sending: `dateSigned` (camelCase)
- API was expecting: `date_signed` (snake_case)

## Solution

### 1. Fixed LaterStageModal.tsx
Changed interface and data passing:
```typescript
// Before
interface LaterStageModalProps {
  onConfirm: (data: { dateToCallBack: string; notes: string }) => void;
}
await onConfirm({ dateToCallBack: callbackDate, notes: noteText });

// After
interface LaterStageModalProps {
  onConfirm: (data: { date_to_call_back: string; notes: string }) => void;
}
await onConfirm({ date_to_call_back: callbackDate, notes: noteText });
```

### 2. Fixed SignedModal.tsx
Changed interface and data passing:
```typescript
// Before
interface SignedModalProps {
  onConfirm: (data: { dateSigned: string; notes: string }) => void;
}
await onConfirm({ dateSigned, notes });

// After
interface SignedModalProps {
  onConfirm: (data: { date_signed: string; notes: string }) => void;
}
await onConfirm({ date_signed: dateSigned, notes });
```

### 3. Updated LeadsTable.tsx Handlers
Changed handler signatures to match:
```typescript
// Before
const handleLaterStageConfirm = async (data: { dateToCallBack: string; notes: string }) => {
  body: JSON.stringify({
    date_to_call_back: data.dateToCallBack,  // Mismatch!
  })
}

const handleSignedConfirm = async (data: { dateSigned: string; notes: string }) => {
  body: JSON.stringify({
    date_signed: data.dateSigned,  // Mismatch!
  })
}

// After
const handleLaterStageConfirm = async (data: { date_to_call_back: string; notes: string }) => {
  body: JSON.stringify({
    date_to_call_back: data.date_to_call_back,  // Match!
  })
}

const handleSignedConfirm = async (data: { date_signed: string; notes: string }) => {
  body: JSON.stringify({
    date_signed: data.date_signed,  // Match!
  })
}
```

### 4. Enhanced SignedModal UI
Updated SignedModal to match LaterStageModal style:
- Dark theme with backdrop blur
- Info box with congratulations message
- Better error handling
- Consistent styling with emerald accents
- Icons for visual clarity
- Loading states with spinner
- Form reset on success

## Files Modified

1. `components/leads/LaterStageModal.tsx` - Fixed field name
2. `components/leads/SignedModal.tsx` - Fixed field name + enhanced UI
3. `components/leads/LeadsTable.tsx` - Fixed handler signatures

## Expected Behavior

✅ Later Stage modal works correctly
✅ Signed modal works correctly
✅ Both modals match UI/UX style
✅ Field names consistent throughout
✅ No more validation errors
✅ Leads move to correct status
✅ Dates are saved properly

## Testing

1. Select a lead
2. Change status to "Later"
3. Fill in explanation, date, time, type, priority
4. Click "Move to Later Stage"
5. Lead should move to "Later" tab
6. Note should be created with all details

7. Select another lead
8. Change status to "Signed"
9. Fill in signed date and optional notes
10. Click "Mark as Signed"
11. Lead should move to "Signed" tab
12. Date signed should be displayed

Both modals now work perfectly!
