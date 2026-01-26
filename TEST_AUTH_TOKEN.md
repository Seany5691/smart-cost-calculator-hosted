# Test Auth Token - Quick Diagnostic

## The Real Issue

The debug logs I added aren't showing up, which means either:
1. The dev server hasn't reloaded the new code
2. OR you haven't refreshed the calculator page

But the main issue is clear: **The token is NULL when config.ts tries to fetch data.**

## Quick Test - Run This in Browser Console

Open the calculator page, press F12, go to Console tab, and run:

```javascript
// Test 1: Check localStorage
const stored = localStorage.getItem('auth-storage');
console.log('Stored auth data:', stored);

if (stored) {
  const parsed = JSON.parse(stored);
  console.log('Parsed:', parsed);
  console.log('Has token?', !!parsed.token);
  console.log('Token preview:', parsed.token ? parsed.token.substring(0, 30) + '...' : 'NULL');
} else {
  console.log('NO AUTH DATA IN LOCALSTORAGE!');
}
```

## What You Should See

### If Logged In Correctly:
```
Stored auth data: {"user":{...},"token":"eyJ...","isAuthenticated":true}
Parsed: {user: {...}, token: "eyJ...", isAuthenticated: true}
Has token? true
Token preview: eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

### If NOT Logged In:
```
NO AUTH DATA IN LOCALSTORAGE!
```

## The Solution

Based on your symptoms, I believe you need to **logout and login again**:

### Why?
1. When we changed from `auth.ts` to `auth-simple.ts`, both use the same localStorage key
2. BUT if you were logged in with the OLD auth.ts store, the data format might be slightly different
3. OR the token might have expired
4. Logging out and back in will save a fresh token in the correct format

### Steps:
1. Go to dashboard (`http://localhost:3000`)
2. Click **Logout** button
3. You'll be redirected to login page
4. **Login** with your credentials
5. Go to calculator page
6. It should work now

## Alternative: Clear Everything

If logout doesn't work:

1. Press F12 → Application tab
2. Local Storage → `localhost:3000`
3. Right-click → **Clear**
4. Refresh page (F5)
5. Login again
6. Try calculator

## Why This Happens

The config API routes (`/api/config/hardware`, etc.) require authentication. They check for a valid JWT token in the `Authorization` header. 

When the calculator page loads:
1. It calls `useAuthStore.getState().hydrate()` to load token from localStorage
2. Then it calls `initializeConfigs()` which fetches hardware/connectivity/licensing/etc
3. Each fetch gets the token from the auth store
4. If token is NULL → 401 Unauthorized

The dashboard works because those API calls don't require auth (or they're using a different pattern).

## Admin vs User Access

You're correct that only admins should access the admin page. But the calculator config APIs are available to ALL authenticated users (admin, manager, user). The API routes only check `if (!authResult.authenticated)`, not the role.

So this is NOT a permissions issue - it's a "token not found" issue.

## Next Step

Please try logging out and back in. That should fix it immediately.
