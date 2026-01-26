# Quick Fix for Webpack Errors

## 🚨 Error: "Cannot read properties of undefined (reading 'call')"

### ⚡ Solution 1: Missing Dependencies (Most Common)

If you see errors about missing modules like `xlsx`, `exceljs`, etc.:

```cmd
npm install
```

This reinstalls all dependencies from package.json.

### ⚡ Solution 2: Clear Cache (If dependencies are installed)

1. **Stop your dev server** (press Ctrl+C in the terminal)

2. **Run the clear cache script:**
   ```cmd
   clear-cache.bat
   ```
   Or in PowerShell:
   ```powershell
   .\clear-cache.ps1
   ```

3. **Restart dev server:**
   ```cmd
   npm run dev
   ```

4. **Refresh your browser** (Ctrl+F5 for hard refresh)

### ✅ That's it!

The error should be gone. This clears Next.js's webpack cache which sometimes gets corrupted during development.

---

## 📝 What the scripts do:

- Delete `.next` folder (Next.js build cache)
- Delete `node_modules/.cache` folder (webpack cache)
- These folders are automatically recreated when you run `npm run dev`

## 🔄 When to use this:

- After seeing webpack errors
- After pulling new code from git
- After switching branches
- When components aren't updating properly
- When you see "Cannot read properties" errors

## 💡 Pro Tip:

Add this to your workflow:
```cmd
# After pulling code
git pull
clear-cache.bat
npm run dev
```

---

See `WEBPACK_ERROR_FIX.md` for detailed explanation and troubleshooting.
