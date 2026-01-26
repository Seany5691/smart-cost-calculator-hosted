# IMMEDIATE FIX - Logout and Login Required

## Current Status

✅ Dashboard works  
❌ Calculator gets 401 errors  

## Root Cause

The auth token is **NULL** when the calculator tries to fetch config data.

## Why This Happened

When we consolidated the auth stores (from `auth.ts` to `auth-simple.ts`), your existing login session might have:
1. An expired token
2. Token in wrong format
3. OR no token at all in localStorage

## The Fix (Takes 30 Seconds)

### Step 1: Logout
1. Go to dashboard: `http://localhost:3000`
2. Scroll down
3. Click the **Logout** button (red button at bottom)

### Step 2: Login Again
1. You'll be redirected to login page
2. Enter your username and password
3. Click Login

### Step 3: Test Calculator
1. Go to calculator: `http://localhost:3000/calculator`
2. It should load without 401 errors
3. You should see the calculator wizard

## Why This Works

When you login:
1. The login API returns a fresh JWT token
2. `auth-simple.ts` saves it to localStorage with key `'auth-storage'`
3. The calculator page loads the token from localStorage
4. Config API calls include the token in Authorization header
5. Everything works ✅

## If That Doesn't Work

### Plan B: Clear Storage
1. Press F12 (DevTools)
2. Go to **Application** tab
3. Click **Local Storage** → `localhost:3000`
4. Right-click → **Clear**
5. Refresh page (F5)
6. Login again

### Plan C: Restart Dev Server
```bash
# Stop server (Ctrl+C in terminal)
npm run dev
```

Then logout and login again.

## Why Not Just Restart Server?

Restarting the server won't help because:
- The issue is in the **browser's localStorage**
- The token (or lack of it) is stored client-side
- Server restart doesn't affect client-side storage
- You need to **logout and login** to get a fresh token

## Technical Explanation

The calculator page does this:
```typescript
// 1. Load token from localStorage
useAuthStore.getState().hydrate();

// 2. Fetch configs (needs token)
initializeConfigs();
  → fetchHardware() → gets token from auth store → NULL!
  → fetchConnectivity() → gets token from auth store → NULL!
  → etc.
```

If the token is NULL, all API calls fail with 401.

## Admin vs User

You asked about admin permissions. The config APIs (`/api/config/hardware`, etc.) are available to **ALL authenticated users**, not just admins. They only check:
```typescript
if (!authResult.authenticated) {
  return 401;
}
```

They don't check `if (user.role !== 'admin')`.

So this is NOT a permissions issue - it's simply that the token is missing.

## Action Required

**Please logout and login again.** That's all you need to do.

Let me know if the calculator works after that!
