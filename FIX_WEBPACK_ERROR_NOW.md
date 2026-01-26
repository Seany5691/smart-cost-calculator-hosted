# 🔧 Fix Webpack Error - Step by Step Guide

## Current Issue
You're seeing this error:
```
TypeError: Cannot read properties of undefined (reading 'call')
at options.factory (webpack.js:715:31)
```

## The Solution

This error requires a **nuclear cleanup** - completely removing all build artifacts and reinstalling from scratch.

## Option 1: Use the Automated Script (RECOMMENDED)

### Step 1: Stop the Dev Server
If the dev server is running, press `Ctrl+C` to stop it.

### Step 2: Run the Cleanup Script
In the `hosted-smart-cost-calculator` directory, run:

```batch
restart-clean.bat
```

This script will:
1. Kill all Node processes
2. Delete `.next` directory
3. Delete `node_modules`
4. Delete `package-lock.json`
5. Clear npm cache
6. Reinstall dependencies
7. Start the dev server

### Step 3: Test the Application
Once the server starts, open your browser to:
- http://localhost:3000/calculator

## Option 2: Manual Cleanup (If Script Fails)

### Step 1: Kill All Node Processes
```batch
taskkill /F /IM node.exe
```

### Step 2: Navigate to Project Directory
```batch
cd C:\Users\DELL\Documents\HostedSmartCostCalculator\hosted-smart-cost-calculator
```

### Step 3: Delete Build Artifacts
```batch
rmdir /s /q .next
rmdir /s /q node_modules
del /f /q package-lock.json
```

### Step 4: Clear npm Cache
```batch
npm cache clean --force
npm cache verify
```

### Step 5: Reinstall Dependencies
```batch
npm install --legacy-peer-deps
```

### Step 6: Start Dev Server
```batch
npm run dev
```

## Why This Works

The webpack error is caused by corrupted build artifacts in the `.next` cache. These artifacts reference a custom webpack configuration that was removed, but the cached chunks still try to use it.

By deleting everything and reinstalling:
1. All corrupted webpack chunks are removed
2. Fresh dependencies are installed
3. New webpack chunks are generated with correct configuration
4. Module resolution works correctly

## Verification

After the cleanup, you should see:
```
▲ Next.js 14.2.18
- Local: http://localhost:3000
✓ Ready in 2-3s
```

And NO webpack errors in the browser console.

## If the Error Persists

If you still see the error after the nuclear cleanup:

1. **Check for running processes:**
   ```batch
   tasklist | findstr node
   ```
   If any are running, kill them:
   ```batch
   taskkill /F /IM node.exe
   ```

2. **Verify files are deleted:**
   - Check that `.next` folder is gone
   - Check that `node_modules` folder is gone
   - Check that `package-lock.json` is gone

3. **Clear browser cache:**
   - Press `Ctrl+Shift+Delete`
   - Clear cached images and files
   - Or use incognito mode

4. **Try a different port:**
   ```batch
   set PORT=3001
   npm run dev
   ```

## What NOT to Do

❌ Don't just delete `.next` - you need to delete everything
❌ Don't skip clearing npm cache - it holds corrupted references
❌ Don't try to fix the webpack config - it's already correct
❌ Don't downgrade packages - versions are correct

## Next Steps After Fix

Once the error is fixed:

1. ✅ Test the calculator page
2. ✅ Clear localStorage cache in browser:
   ```javascript
   localStorage.removeItem('calculator-storage')
   location.reload()
   ```
3. ✅ Verify all calculator features work
4. ✅ Continue with development

## Summary

**The fix is simple: Delete everything and reinstall.**

Run `restart-clean.bat` and wait for it to complete. The error will be gone.

---

**Need Help?** If the script fails or the error persists, check the console output for specific error messages.
