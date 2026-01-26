# Webpack Error Troubleshooting Guide

## Current Error
```
Uncaught TypeError: Cannot read properties of undefined (reading 'call')
at eval (page.tsx:9:73)
```

## What We've Tried

1. ✅ Cleared webpack caches (.next, .swc, node_modules/.cache)
2. ✅ Removed unused imports
3. ✅ Converted dynamic imports to static imports
4. ✅ Changed from path aliases (@/) to relative imports
5. ⏳ **Current step: Restart dev server and test**

## Step-by-Step Troubleshooting

### Test 1: Restart Dev Server
```powershell
# Stop current server (Ctrl+C)
npm run dev
```

**Expected:** Error should be gone
**If error persists:** Go to Test 2

### Test 2: Use Minimal Page
```powershell
# Rename current page
mv app/leads/page.tsx app/leads/page-full.tsx.backup

# Use minimal version
mv app/leads/page-minimal.tsx.backup app/leads/page.tsx

# Restart dev server
npm run dev
```

**Expected:** Page loads with "Minimal Test" message
**If this works:** The issue is with one of the component imports
**If this fails:** The issue is with the base page or auth store

### Test 3: Nuclear Reinstall
```powershell
.\nuclear-fix.bat
npm install
npm run dev
```

**Expected:** Fresh install should resolve any corrupted modules
**If error persists:** Go to Test 4

### Test 4: Identify Failing Component
Restore the full page and comment out imports one by one:

```typescript
// Start by commenting ALL component imports
// import MainSheetPageContent from './status-pages/main-sheet';
// import LeadsPageContent from './status-pages/leads';
// ... etc

// Then uncomment ONE at a time and test
import MainSheetPageContent from './status-pages/main-sheet';
// import LeadsPageContent from './status-pages/leads';
// ... etc
```

After each uncomment:
1. Save the file
2. Check browser console
3. If error appears, you found the problematic component

### Test 5: Check Specific Component
Once you identify the failing component, check it for:

1. **Missing dependencies:**
   ```typescript
   // Check all imports in the component
   // Verify all imported files exist
   ```

2. **Circular dependencies:**
   ```typescript
   // Component A imports Component B
   // Component B imports Component A
   // This causes webpack to fail
   ```

3. **Invalid exports:**
   ```typescript
   // Make sure component has default export
   export default function MyComponent() { ... }
   ```

4. **Server/Client component mismatch:**
   ```typescript
   // Make sure 'use client' is at the top if needed
   'use client';
   ```

## Common Causes

### 1. Circular Dependencies
**Symptom:** Webpack can't resolve module graph
**Solution:** Break the circular dependency by extracting shared code

### 2. Missing Files
**Symptom:** Import path points to non-existent file
**Solution:** Verify all import paths are correct

### 3. Invalid Exports
**Symptom:** Component doesn't have proper default export
**Solution:** Add `export default` to component

### 4. Path Alias Issues
**Symptom:** `@/` imports don't resolve correctly
**Solution:** Use relative imports instead

### 5. Webpack Cache Corruption
**Symptom:** Error persists after code fixes
**Solution:** Clear all caches and restart

## Quick Fixes

### Fix 1: Clear Everything
```powershell
.\fix-webpack.bat
npm run dev
```

### Fix 2: Nuclear Option
```powershell
.\nuclear-fix.bat
npm install
npm run dev
```

### Fix 3: Use Minimal Page
```powershell
mv app/leads/page.tsx app/leads/page-full.tsx.backup
mv app/leads/page-minimal.tsx.backup app/leads/page.tsx
npm run dev
```

## Diagnostic Commands

### Check for TypeScript Errors
```powershell
npx tsc --noEmit
```

### Check for Build Errors
```powershell
npm run build
```

### Check Module Resolution
```powershell
node -e "console.log(require.resolve('./app/leads/status-pages/main-sheet'))"
```

## Next Steps

1. **Restart dev server** - Test if relative imports fixed it
2. **If still broken** - Run nuclear fix
3. **If still broken** - Use minimal page to isolate issue
4. **If still broken** - Identify specific failing component
5. **If still broken** - Check that component for issues

## Files Available

- `fix-webpack.bat` - Quick cache clear
- `nuclear-fix.bat` - Complete reinstall
- `page-minimal.tsx.backup` - Minimal test page
- `ULTIMATE_FIX.md` - Detailed fix documentation
- `TROUBLESHOOTING_WEBPACK.md` - This guide

## Status Tracking

- [x] Applied relative imports
- [x] Cleared caches
- [ ] Restarted dev server
- [ ] Tested minimal page
- [ ] Ran nuclear fix
- [ ] Identified failing component
- [ ] Fixed specific component

---

**Current Action:** Restart dev server and test the /leads page
**If it works:** Problem solved!
**If it doesn't:** Follow Test 2 (Use Minimal Page)
