# Add Lead Button Authentication Fix

## Issue
When manually adding a lead via the "Add Lead" button, users received a 401 Unauthorized error.

## Root Cause
The `AddLeadButton.tsx` component was reading the auth token from the wrong localStorage key:
- **Incorrect**: `localStorage.getItem('token')`
- **Correct**: Read from `localStorage.getItem('auth-storage')` and parse the JSON structure

## Solution Applied

### 1. Added `getAuthToken()` Helper Function
Added the same helper function pattern used successfully in other components:

```typescript
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (!authStorage) return null;
    
    const parsed = JSON.parse(authStorage);
    return parsed?.state?.token || parsed?.token || null;
  } catch (error) {
    console.error('Error reading auth token:', error);
    return null;
  }
}
```

### 2. Updated Fetch Call in `handleSubmit`
Changed from:
```typescript
const token = localStorage.getItem('token');
const response = await fetch('/api/leads', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({...})
});
```

To:
```typescript
const token = getAuthToken();
const headers: HeadersInit = {
  'Content-Type': 'application/json'
};

if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

const response = await fetch('/api/leads', {
  method: 'POST',
  headers,
  body: JSON.stringify({...})
});
```

## Files Modified
- `hosted-smart-cost-calculator/components/leads/AddLeadButton.tsx`

## Testing
After clearing browser cache (Ctrl+Shift+Delete):
1. Navigate to Leads section
2. Click "Add Lead" button
3. Fill in required fields (Name and Google Maps URL)
4. Click "Add Lead"
5. Lead should be added successfully without 401 error

## Related Fixes
This follows the same authentication pattern applied to:
- `lib/store/leads.ts`
- `lib/store/import.ts`
- `lib/store/reminders.ts`
- `lib/store/routes.ts`
- `app/leads/status-pages/main-sheet.tsx`
- `components/leads/import/ExcelImporter.tsx`
- `components/leads/import/ScrapedListSelector.tsx`

## Status
✅ **FIXED** - AddLeadButton now correctly reads auth token from `auth-storage` localStorage key
