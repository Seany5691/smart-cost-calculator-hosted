# ✅ Calculator 401 Error - FIXED

## 🎯 Problem Identified

The calculator was getting **401 Unauthorized errors** when fetching config data because:

**Root Cause:** The `CalculatorWizard` component was calling config fetch functions **without passing the authentication token**.

```typescript
// ❌ BEFORE (Missing token parameter)
fetchHardware()
fetchConnectivity()
fetchLicensing()
fetchFactors()
fetchScales()
```

## 🔧 Solution Applied

Updated `CalculatorWizard.tsx` to:

1. **Import the auth store** to access the token
2. **Pass the token** to all config fetch functions
3. **Include token in dependency array** for proper re-fetching

```typescript
// ✅ AFTER (Token passed correctly)
import { useAuthStore } from '@/lib/store/auth-simple';

const { token } = useAuthStore();

fetchHardware(token)
fetchConnectivity(token)
fetchLicensing(token)
fetchFactors(token)
fetchScales(token)
```

## 📝 Changes Made

### File: `hosted-smart-cost-calculator/components/calculator/CalculatorWizard.tsx`

**Change 1: Import auth store**
```typescript
import { useAuthStore } from '@/lib/store/auth-simple';
```

**Change 2: Get token from auth store**
```typescript
const { token } = useAuthStore();
```

**Change 3: Pass token to all fetch calls in useEffect**
```typescript
await Promise.all([
  fetchHardware(token),
  fetchConnectivity(token),
  fetchLicensing(token),
]);

await Promise.all([
  fetchFactors(token),
  fetchScales(token),
]);
```

**Change 4: Pass token in retry button**
```typescript
onClick={() => {
  setConfigError(null);
  fetchHardware(token);
  fetchConnectivity(token);
  fetchLicensing(token);
  fetchFactors(token);
  fetchScales(token);
}}
```

**Change 5: Add token to dependency array**
```typescript
}, [fetchHardware, fetchConnectivity, fetchLicensing, fetchFactors, fetchScales, token]);
```

## ✅ Why This Works

1. **API routes are correct** - They already allow authenticated users to GET config
2. **Config store is correct** - It already sends the token in Authorization header
3. **Auth system is correct** - Token is stored and available
4. **Missing link was here** - CalculatorWizard wasn't passing the token to fetch functions

## 🧪 Testing

After this fix, the flow is:

1. ✅ User logs in → Token stored in auth store
2. ✅ User navigates to calculator → Page loads
3. ✅ CalculatorWizard gets token from auth store
4. ✅ Passes token to config fetch functions
5. ✅ Config store sends token in Authorization header
6. ✅ API verifies token and returns config data
7. ✅ Calculator displays correctly

## 🚀 Next Steps

**You need to restart the dev server for changes to take effect:**

```bash
# Stop the current server (Ctrl+C)
# Then run:
npm run dev
```

**Then test:**
1. Log in to the application
2. Navigate to the calculator
3. Check browser console - should see "Core configs loaded successfully"
4. Calculator should load without 401 errors

## 📊 Expected Behavior

**Before Fix:**
```
❌ GET /api/config/hardware 401 (Unauthorized)
❌ GET /api/config/connectivity 401 (Unauthorized)
❌ GET /api/config/licensing 401 (Unauthorized)
❌ GET /api/config/factors 401 (Unauthorized)
❌ GET /api/config/scales 401 (Unauthorized)
```

**After Fix:**
```
✅ GET /api/config/hardware 200 (OK)
✅ GET /api/config/connectivity 200 (OK)
✅ GET /api/config/licensing 200 (OK)
✅ GET /api/config/factors 200 (OK)
✅ GET /api/config/scales 200 (OK)
```

## 🎯 Summary

The issue was **NOT** with:
- ❌ API route permissions (already correct)
- ❌ Middleware authentication (already correct)
- ❌ Config store request logic (already correct)
- ❌ Auth token storage (already correct)

The issue **WAS** with:
- ✅ **CalculatorWizard not passing token to fetch functions**

**Status:** 🟢 **FIXED - Ready to test after server restart**
