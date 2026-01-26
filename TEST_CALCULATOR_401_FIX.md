# 🧪 Test Checklist - Calculator 401 Fix

## ✅ Pre-Test Setup

- [ ] Dev server is stopped
- [ ] Changes are saved
- [ ] Ready to restart server

---

## 🚀 Test Procedure

### 1. Restart Dev Server

```bash
cd hosted-smart-cost-calculator
npm run dev
```

**Or use the batch file:**
```bash
RESTART_FOR_401_FIX.bat
```

Wait for: `✓ Ready in X ms`

---

### 2. Open Browser & DevTools

1. Open http://localhost:3000
2. Press F12 to open DevTools
3. Go to Console tab
4. Go to Network tab

---

### 3. Log In

1. Enter your credentials
2. Click Login
3. Should redirect to dashboard

**Check Console:**
- [ ] No errors during login
- [ ] Token stored successfully

---

### 4. Navigate to Calculator

1. Click "Calculator" in navigation
2. Wait for page to load

**Check Console - Should see:**
```
✅ [CALCULATOR WIZARD] Initializing configs with token...
✅ [CALCULATOR WIZARD] Core configs loaded successfully
✅ [CALCULATOR WIZARD] Factors and scales loaded successfully
```

**Check Network Tab - Should see:**
```
✅ GET /api/config/hardware 200 OK
✅ GET /api/config/connectivity 200 OK
✅ GET /api/config/licensing 200 OK
✅ GET /api/config/factors 200 OK
✅ GET /api/config/scales 200 OK
```

**Should NOT see:**
```
❌ 401 Unauthorized errors
❌ Configuration loading failed messages
```

---

### 5. Verify Calculator Functionality

- [ ] Calculator wizard displays
- [ ] Can see "Deal Details" step
- [ ] Can see all navigation steps
- [ ] No error messages
- [ ] No red error boxes

---

### 6. Test Calculator Steps

1. Fill in Deal Details
   - [ ] Customer name field works
   - [ ] Deal name field works
   - [ ] Can click Next

2. Check Hardware Step
   - [ ] Hardware items display
   - [ ] Can select items
   - [ ] Prices show correctly

3. Check Connectivity Step
   - [ ] Connectivity items display
   - [ ] Can select items
   - [ ] Prices show correctly

4. Check Licensing Step
   - [ ] Licensing items display
   - [ ] Can select items
   - [ ] Prices show correctly

---

## 🎯 Success Criteria

### Must Pass (Critical)
- ✅ No 401 errors in Network tab
- ✅ Console shows "configs loaded successfully"
- ✅ Calculator wizard displays
- ✅ All config items load and display

### Should Pass (Important)
- ✅ Can navigate through all steps
- ✅ Can select items in each step
- ✅ Prices calculate correctly
- ✅ No console errors

### Nice to Have
- ✅ Fast loading (< 2 seconds)
- ✅ Smooth transitions between steps
- ✅ No warning messages

---

## 🐛 If Tests Fail

### If Still Getting 401 Errors

1. **Check if server restarted**
   - Stop server completely (Ctrl+C)
   - Wait 5 seconds
   - Start again: `npm run dev`

2. **Check if logged in**
   - Open Console
   - Type: `localStorage.getItem('auth-storage')`
   - Should see token and user data
   - If null, log in again

3. **Check browser cache**
   - Hard refresh: Ctrl+Shift+R
   - Or clear cache: Ctrl+Shift+Del

4. **Check token is being sent**
   - Open Network tab
   - Click on a failed request
   - Check Headers tab
   - Look for: `Authorization: Bearer <token>`
   - If missing, there's still an issue

### If Calculator Doesn't Display

1. **Check console for errors**
   - Look for red error messages
   - Note the error message
   - Check which component is failing

2. **Check if config loaded**
   - Console should show "configs loaded successfully"
   - If not, check Network tab for which endpoint failed

3. **Try the retry button**
   - If error message appears with retry button
   - Click retry
   - Check if it works after retry

---

## 📊 Expected vs Actual

### Before Fix
```
Network Tab:
❌ GET /api/config/hardware 401 (Unauthorized)
❌ GET /api/config/connectivity 401 (Unauthorized)
❌ GET /api/config/licensing 401 (Unauthorized)

Console:
❌ Error loading core configs
❌ Failed to fetch hardware items

UI:
❌ Configuration Loading Failed error message
```

### After Fix
```
Network Tab:
✅ GET /api/config/hardware 200 (OK)
✅ GET /api/config/connectivity 200 (OK)
✅ GET /api/config/licensing 200 (OK)

Console:
✅ [CALCULATOR WIZARD] Initializing configs with token...
✅ [CALCULATOR WIZARD] Core configs loaded successfully

UI:
✅ Calculator wizard displays
✅ All steps accessible
```

---

## 📝 Test Results

**Date:** _________________  
**Tester:** _________________  
**Result:** ⬜ PASS  ⬜ FAIL  

**Notes:**
```
_________________________________________________
_________________________________________________
_________________________________________________
```

**Issues Found:**
```
_________________________________________________
_________________________________________________
_________________________________________________
```

---

## 🎉 If All Tests Pass

Congratulations! The calculator 401 issue is resolved.

**Next steps:**
1. Test with different user roles (admin, manager, user)
2. Test creating a full proposal
3. Test saving and loading deals
4. Consider this issue closed ✅

---

## 📚 Related Documents

- `CALCULATOR_401_FIXED.md` - Technical fix details
- `CALCULATOR_401_ISSUE_RESOLVED.md` - Complete resolution summary
- `CONTEXT_TRANSFER_SUMMARY.md` - Updated context
