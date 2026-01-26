# Dates Display Fixed

## Problem
- Later Stage and Signed modals weren't working (400 errors)
- Signed leads didn't show when they were signed
- Later stage leads didn't show callback date

## Root Cause
1. **API Field Name Mismatch**: API expected camelCase but modals sent snake_case
2. **Missing Date Display**: LeadsTable and LeadsCards didn't show date_signed or date_to_call_back

## Solution

### 1. API Route Fix
**File: `app/api/leads/[id]/route.ts`**

Added support for both field name formats:
```typescript
// Accept both formats
const {
  dateToCallBack,
  date_to_call_back,
  dateSigned,
  date_signed,
  ...
} = body;

// Use unified variables
const callbackDate = date_to_call_back || dateToCallBack;
const signedDate = date_signed || dateSigned;
```

This ensures backward compatibility and works with both naming conventions.

### 2. LeadsTable Date Display
**File: `components/leads/LeadsTable.tsx`**

Added:
- New "Date Info" column
- Format date helper function
- Display signed date for signed leads (green)
- Display callback date for later stage leads (orange)
- Calendar icon for visual clarity

### 3. LeadsCards Date Display
**File: `components/leads/LeadsCards.tsx`**

Updated:
- Fixed field names from `dateToCallBack` → `date_to_call_back`
- Fixed field names from `dateSigned` → `date_signed`
- Added styled boxes with Calendar icon
- Green styling for signed date
- Orange styling for callback date
- Only show dates for relevant status

## Display Format

### Signed Leads
```
┌─────────────────────────────────┐
│ 📅 Signed: 15/01/2026          │
│ (green background, green text)  │
└─────────────────────────────────┘
```

### Later Stage Leads
```
┌─────────────────────────────────┐
│ 📅 Callback: 20/01/2026        │
│ (orange background, orange text)│
└─────────────────────────────────┘
```

## Files Modified

1. `app/api/leads/[id]/route.ts` - Accept both field name formats
2. `components/leads/LeadsTable.tsx` - Added date column and display
3. `components/leads/LeadsCards.tsx` - Fixed field names and improved styling

## Expected Behavior

✅ Later Stage modal works - saves callback date
✅ Signed modal works - saves signed date
✅ Signed leads show "Signed: [date]" in green
✅ Later stage leads show "Callback: [date]" in orange
✅ Dates formatted as DD/MM/YYYY
✅ Calendar icon for visual clarity
✅ Only shows dates for relevant status

## Testing

1. Move a lead to "Later" status
2. Fill in callback date
3. Lead should move to "Later" tab
4. Lead should display "Callback: [date]" in orange

5. Move a lead to "Signed" status
6. Fill in signed date
7. Lead should move to "Signed" tab
8. Lead should display "Signed: [date]" in green

Both modals and displays now work perfectly!
