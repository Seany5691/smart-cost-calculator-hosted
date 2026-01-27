# Calendar Events Critical Fixes Required

## Issues Found

### Issue 1: Missing $ in SQL Parameters (500 Errors) ❌
**File:** `app/api/calendar/events/[eventId]/route.ts`

**Problem:**
```typescript
// WRONG - Missing $
updates.push(`${field} = ${paramIndex}`);
WHERE id = ${paramIndex}
```

**Fix Applied:**
```typescript
// CORRECT - With $
updates.push(`${field} = $${paramIndex}`);
WHERE id = $${paramIndex}
```

This was causing PostgreSQL syntax errors resulting in 500 errors.

### Issue 2: Timezone Date Offset (Wrong Date) ❌
**Problem:** Events created for Jan 29 appear on Jan 30

**Root Cause:** 
When JavaScript parses a date string like `"2026-01-29"` using `new Date()`, it treats it as UTC midnight. In South African timezone (UTC+2), this becomes Jan 28 22:00, and when incremented, causes off-by-one errors.

**Example:**
```javascript
// User selects: 2026-01-29
const date = new Date("2026-01-29");  // Treated as UTC 2026-01-29T00:00:00Z
// In SAST (UTC+2): 2026-01-29T02:00:00+02:00
// But when manipulated, can shift to 2026-01-30
```

## Files Fixed

### 1. app/api/calendar/events/[eventId]/route.ts
- ✅ Fixed PATCH route SQL parameters
- ✅ Fixed DELETE route (was already correct)
- ✅ Added detailed logging for debugging

### 2. app/api/calendar/events/route.ts (NEEDS FIX)
The POST route has timezone issues in multi-day event creation:

**Current Code (BROKEN):**
```typescript
const startDateObj = new Date(event_date);  // ❌ Timezone issue
const endDateObj = new Date(end_date);      // ❌ Timezone issue
const currentDate = new Date(startDateObj);
currentDate.setDate(currentDate.getDate() + 1);  // ❌ Can shift dates
```

**Should Be:**
```typescript
// Parse dates without timezone conversion
const [startYear, startMonth, startDay] = event_date.split('-').map(Number);
const [endYear, endMonth, endDay] = end_date.split('-').map(Number);

// Create dates in local timezone
const startDateObj = new Date(startYear, startMonth - 1, startDay);
const endDateObj = new Date(endYear, endMonth - 1, endDay);

// Iterate through dates
const currentDate = new Date(startDateObj);
currentDate.setDate(currentDate.getDate() + 1);

while (currentDate <= endDateObj) {
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  // Insert event with dateStr
  // ...
  
  currentDate.setDate(currentDate.getDate() + 1);
}
```

## Testing Required

### Test 1: Edit Event
1. Create an event for Jan 29, 2026
2. Click edit
3. Change title
4. Save
5. ✅ Should save successfully (no 500 error)
6. ✅ Should remain on Jan 29 (not shift to Jan 30)

### Test 2: Delete Event
1. Create an event
2. Click delete
3. Confirm
4. ✅ Should delete successfully (no 500 error)

### Test 3: Multi-Day Event
1. Create event from Jan 29 to Jan 31
2. ✅ Should create events on Jan 29, 30, 31 (not Jan 30, 31, Feb 1)

### Test 4: Single Day Event
1. Create event for Jan 29
2. ✅ Should appear on Jan 29 (not Jan 30)

## Why This Happened

1. **SQL Parameter Bug:** I initially created the file with the bug, then "fixed" it but the fix didn't actually apply to the file
2. **Timezone Bug:** JavaScript Date parsing is notoriously problematic with date-only strings
3. **Testing Gap:** These issues weren't caught because local testing might work differently than production

## Immediate Actions Required

1. ✅ Fixed: `app/api/calendar/events/[eventId]/route.ts`
2. ⏳ TODO: Fix `app/api/calendar/events/route.ts` (POST route)
3. ⏳ TODO: Test all scenarios above
4. ⏳ TODO: Deploy to VPS

## Prevention

Going forward:
- Always use `$1`, `$2`, etc. for PostgreSQL parameters
- Never use `new Date(dateString)` for date-only strings
- Always parse date strings manually: `const [y, m, d] = date.split('-').map(Number)`
- Test timezone-sensitive code in production timezone

---

**Status:** Partially Fixed
**Date:** January 27, 2026
**Priority:** CRITICAL
