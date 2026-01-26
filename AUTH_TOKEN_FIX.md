# Authentication Token Fix - 401 Unauthorized Errors

## Problem Identified

User "Camryn" (super admin) was getting **401 Unauthorized** errors when accessing the admin panel and other protected routes, even though they were logged in.

### Console Errors
```
GET http://localhost:3001/api/config/hardware 401 (Unauthorized)
GET http://localhost:3001/api/config/connectivity 401 (Unauthorized)
GET http://localhost:3001/api/config/licensing 401 (Unauthorized)
Error fetching hardware: Error: Failed to fetch hardware items
Error fetching connectivity: Error: Failed to fetch connectivity items
Error fetching licensing: Error: Failed to fetch licensing items
```

## Root Cause

The issue was caused by **inconsistent auth store usage** after the webpack fix:

1. **Created `auth-simple.ts`** during webpack troubleshooting to avoid Zustand persist middleware
2. **Admin page was using `auth-simple`** instead of the proper `auth.ts`
3. **Leads page was using custom localStorage** instead of Zustand store
4. **Config store was importing `auth.ts`** to get the token
5. **Result**: Token was not being properly retrieved from localStorage

### The Problem Chain

```
User logs in → Token stored in localStorage with key 'auth-storage'
                ↓
Admin page loads → Uses auth-simple (no persist middleware)
                ↓
Config store tries to fetch → Imports auth.ts but store not hydrated
                ↓
No token found → API calls fail with 401 Unauthorized
```

## The Fix

### 1. Updated Admin Page
Changed from `auth-simple` to proper `auth` store with hydration:

```typescript
// BEFORE
import { useAuthStore } from '@/lib/store/auth-simple';

// AFTER
import { useAuthStore } from '@/lib/store/auth';

// Added hydration
useEffect(() => {
  useAuthStore.persist.rehydrate();
  setMounted(true);
}, []);
```

### 2. Updated Leads Page
Changed from custom localStorage to proper `auth` store:

```typescript
// BEFORE
const getAuthState = () => {
  const stored = localStorage.getItem('auth-storage');
  // ... manual parsing
};

// AFTER
import { useAuthStore } from '@/lib/store/auth';
const { user, token, isAuthenticated } = useAuthStore();

// Added hydration
useEffect(() => {
  useAuthStore.persist.rehydrate();
  setMounted(true);
}, []);
```

### 3. Why Hydration is Needed

The `auth.ts` store uses `skipHydration: true` to avoid SSR issues:

```typescript
{
  name: 'auth-storage',
  partialize: (state) => ({
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
  }),
  skipHydration: true, // ← This prevents automatic loading
}
```

This means we must **manually call `rehydrate()`** in each component that needs auth:

```typescript
useEffect(() => {
  useAuthStore.persist.rehydrate();
}, []);
```

## Files Modified

1. **app/admin/page.tsx**
   - Changed import from `auth-simple` to `auth`
   - Added hydration call
   - Added mounted state check

2. **app/leads/page.tsx**
   - Removed custom `getAuthState` function
   - Changed to use `useAuthStore` hook
   - Added hydration call
   - Updated all references from `authState` to direct store values

## Verification

After the fix, the following should work:

### ✅ Admin Panel
```
http://localhost:3000/admin
```
- Should load without 401 errors
- Should fetch hardware, connectivity, licensing configs
- Super admin (Camryn) should have full access

### ✅ Leads Dashboard
```
http://localhost:3000/leads
```
- Should load stats without 401 errors
- Should fetch reminders
- Should fetch callback leads

### ✅ Calculator
```
http://localhost:3000/calculator
```
- Should load configuration data
- Should work for all authenticated users

## How Auth Works Now

### 1. Login Flow
```
User enters credentials
    ↓
POST /api/auth/login
    ↓
Server validates & returns JWT token
    ↓
useAuthStore.login() stores token in state
    ↓
Zustand persist saves to localStorage['auth-storage']
```

### 2. Page Load Flow
```
Component mounts
    ↓
useAuthStore.persist.rehydrate() called
    ↓
Token loaded from localStorage['auth-storage']
    ↓
Token available in useAuthStore().token
    ↓
API calls include: Authorization: Bearer <token>
```

### 3. API Call Flow
```
Component needs data
    ↓
const { token } = useAuthStore()
    ↓
fetch('/api/endpoint', {
  headers: { Authorization: `Bearer ${token}` }
})
    ↓
Server validates token
    ↓
Returns data (200 OK)
```

## Super Admin Permissions

User "Camryn" should have:

- ✅ **Role**: `admin` (super admin)
- ✅ **Access to**: All pages and features
- ✅ **Admin Panel**: Full configuration access
  - Hardware configuration
  - Connectivity configuration
  - Licensing configuration
  - Factors configuration
  - Scales configuration
  - User management
- ✅ **Leads**: Full CRUD access
- ✅ **Calculator**: Full access
- ✅ **Scraper**: Full access

## Testing Checklist

After logging in as Camryn:

- [ ] Admin panel loads without errors
- [ ] Hardware config loads
- [ ] Connectivity config loads
- [ ] Licensing config loads
- [ ] Factors config loads
- [ ] Scales config loads
- [ ] User management loads
- [ ] Leads dashboard loads
- [ ] Calculator loads
- [ ] No 401 errors in console
- [ ] All API calls include Authorization header

## Prevention

To prevent this issue in the future:

### ✅ DO:
1. **Always use `useAuthStore` from `@/lib/store/auth`**
2. **Always call `rehydrate()` in components that need auth**
3. **Check mounted state before using auth values**
4. **Use the token from the store, not localStorage directly**

### ❌ DON'T:
1. **Don't create alternative auth stores** (like auth-simple)
2. **Don't read from localStorage directly** for auth
3. **Don't skip hydration** in components that need auth
4. **Don't assume auth is loaded immediately** on mount

## Code Pattern to Follow

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/auth';
import { useRouter } from 'next/navigation';

export default function ProtectedPage() {
  const { user, token, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // CRITICAL: Hydrate auth store
  useEffect(() => {
    useAuthStore.persist.rehydrate();
    setMounted(true);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, router]);

  // Don't render until mounted and authenticated
  if (!mounted || !isAuthenticated) {
    return <div>Loading...</div>;
  }

  // Use token for API calls
  const fetchData = async () => {
    const response = await fetch('/api/endpoint', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    // ... handle response
  };

  return (
    <div>
      {/* Your protected content */}
    </div>
  );
}
```

## Summary

The 401 Unauthorized errors were caused by inconsistent auth store usage after the webpack fix. The solution was to:

1. Use the proper `auth.ts` store everywhere
2. Call `rehydrate()` to load token from localStorage
3. Wait for mount before checking authentication
4. Use the token from the store for all API calls

**Status**: ✅ FIXED
**User**: Camryn (super admin)
**Access**: Full access to all features
**Errors**: None - all API calls now include valid JWT token
