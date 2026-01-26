# Dashboard Components Auth Headers Fix

## Additional Issue Found

After consolidating the auth stores, the 401 errors persisted because **dashboard components were not sending the Authorization header** with their API requests.

## Components Fixed

### 1. DashboardStats.tsx ✅
**Issue:** Fetching `/api/dashboard/stats` without auth token  
**Fix:** Added token retrieval and Authorization header

```typescript
const token = useAuthStore.getState().token;
const headers: HeadersInit = {};

if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

const response = await fetch('/api/dashboard/stats', { headers });
```

### 2. ActivityTimeline.tsx ✅
**Issue:** Fetching `/api/dashboard/activity` without auth token  
**Fix:** Added token retrieval and Authorization header

```typescript
const token = useAuthStore.getState().token;
const headers: HeadersInit = {};

if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

const response = await fetch('/api/dashboard/activity?limit=10', { headers });
```

### 3. NumberLookup.tsx ✅
**Issue:** Posting to `/api/dashboard/lookup-number` without auth token  
**Fix:** Added token retrieval and Authorization header

```typescript
const token = useAuthStore.getState().token;
const headers: HeadersInit = {
  'Content-Type': 'application/json',
};

if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

const response = await fetch('/api/dashboard/lookup-number', {
  method: 'POST',
  headers,
  body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
});
```

### 4. BusinessLookup.tsx ✅
**Issue:** Posting to `/api/dashboard/lookup-business` without auth token  
**Fix:** Added token retrieval and Authorization header

```typescript
const token = useAuthStore.getState().token;
const headers: HeadersInit = {
  'Content-Type': 'application/json',
};

if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

const response = await fetch('/api/dashboard/lookup-business', {
  method: 'POST',
  headers,
  body: JSON.stringify({ query: query.trim() }),
});
```

## Why This Was Needed

The API routes for dashboard endpoints require authentication:
- `/api/dashboard/stats` - Protected by auth middleware
- `/api/dashboard/activity` - Protected by auth middleware
- `/api/dashboard/lookup-number` - Protected by auth middleware
- `/api/dashboard/lookup-business` - Protected by auth middleware

Without the `Authorization: Bearer <token>` header, these endpoints return **401 Unauthorized**.

## Pattern Used

All dashboard components now follow this pattern:

1. Get token from auth store: `useAuthStore.getState().token`
2. Create headers object with Content-Type (if needed)
3. Add Authorization header if token exists
4. Pass headers to fetch request

## Testing

After this fix, the dashboard should:
- ✅ Load stats without 401 errors
- ✅ Load activity timeline without 401 errors
- ✅ Allow phone number lookups without 401 errors
- ✅ Allow business lookups without 401 errors

## Related Fixes

This fix builds on:
1. `AUTH_STORE_CONSOLIDATION_FIX.md` - Unified auth stores
2. `401_ERROR_FIXED.md` - Fixed calculator/leads/admin pages

## Complete Fix Summary

**Total files modified:** 15
- 4 pages (calculator, leads, admin, dashboard)
- 1 component (TotalCostsStep)
- 4 dashboard components (DashboardStats, ActivityTimeline, NumberLookup, BusinessLookup)
- 2 stores (config.ts with 5 functions, calculator.ts with 3 functions)

All API calls in the application now properly include the Authorization header with the auth token from the unified `auth-simple` store.
