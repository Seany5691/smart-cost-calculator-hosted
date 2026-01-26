# HOW TO PROPERLY RESTART THE DEV SERVER

## THE PROBLEM

The dev server keeps code in MEMORY. Even if you:
- Delete the .next folder
- Clear browser cache
- Make code changes

**If the dev server is still running, it will regenerate .next with the OLD code from memory!**

## THE SOLUTION

### Step 1: STOP the Dev Server
In your terminal where `npm run dev` is running:
- Press `Ctrl+C`
- Wait for it to fully stop
- Make sure you see the command prompt again

### Step 2: Delete .next Folder
```
cd hosted-smart-cost-calculator
rmdir /s /q .next
```

OR use the batch file:
```
clear-next-cache.bat
```

### Step 3: Verify .next is Gone
```
dir .next
```

You should see "File Not Found" or "The system cannot find the file specified"

### Step 4: START Dev Server Fresh
```
npm run dev
```

Wait for it to fully compile. You should see:
```
✓ Compiled in X seconds
```

### Step 5: Clear Browser Cache
- Press `Ctrl+Shift+R` (hard refresh)
- OR Press `Ctrl+Shift+Delete` and clear cached files

### Step 6: Test
1. Navigate to `localhost:3000/login`
2. Login
3. Go to dashboard
4. Open browser console (F12)
5. Click Calculator button
6. You should see in console:
   ```
   [CALCULATOR PAGE] Rendering calculator page
   [CALCULATOR PAGE] Setting up keyboard shortcuts
   [CALCULATOR PAGE] About to render CalculatorWizard
   ```

## WHY THIS HAPPENS

Next.js dev server:
1. Loads your code into memory
2. Watches for file changes
3. Hot-reloads when files change
4. BUT keeps the in-memory code if you just delete .next

When you delete .next while the server is running:
- Server regenerates .next from its in-memory code
- The in-memory code is the OLD code
- So .next gets the OLD code again

## THE FIX

**ALWAYS stop the dev server BEFORE deleting .next!**

## CHECKLIST

- [ ] Stop dev server (Ctrl+C)
- [ ] Delete .next folder
- [ ] Verify .next is deleted
- [ ] Start dev server (npm run dev)
- [ ] Clear browser cache (Ctrl+Shift+R)
- [ ] Test calculator page
- [ ] Check console for [CALCULATOR PAGE] logs
