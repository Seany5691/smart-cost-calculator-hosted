# Error Resolution Guide

## Current Error: Module not found: Can't resolve 'xlsx'

### ✅ FIXED

The `xlsx` package was missing from node_modules. This has been resolved by running:

```cmd
npm install xlsx
```

The package is now listed in `package.json` dependencies.

---

## Common Webpack Errors and Solutions

### 1. "Module not found: Can't resolve 'package-name'"

**Cause:** A required npm package is not installed.

**Solution:**
```cmd
# Install specific package
npm install package-name

# Or reinstall all dependencies
npm install
```

**Prevention:** Always run `npm install` after:
- Pulling new code from git
- Switching branches
- Cloning the repository

---

### 2. "Cannot read properties of undefined (reading 'call')"

**Cause:** Webpack cache corruption or missing dependencies.

**Solution:**
```cmd
# Step 1: Check if dependencies are installed
npm install

# Step 2: Clear webpack cache
clear-cache.bat

# Step 3: Restart dev server
npm run dev
```

---

### 3. "Fast Refresh had to perform a full reload"

**Cause:** Runtime error in a component, often due to missing dependencies.

**Solution:**
1. Check the console for the actual error (usually appears before this message)
2. Fix the underlying error (missing package, syntax error, etc.)
3. The page will auto-reload once fixed

---

### 4. Dynamic Import Errors

**Cause:** Component using dynamic imports has issues.

**Example Error:**
```
Module not found: Can't resolve 'xlsx' in 'components/leads/import'
```

**Solution:**
```cmd
npm install xlsx
```

**Check:** Look at the import trace to find which component needs the package:
```
Import trace for requested module:
./components/leads/import/ExcelImporter.tsx  ← This component needs xlsx
./app/leads/status-pages/main-sheet.tsx
./app/leads/page.tsx
```

---

## Troubleshooting Workflow

### Step 1: Identify the Error Type

Look at the console logs and identify:
- **Module not found** → Missing dependency
- **Cannot read properties** → Cache issue or missing dependency
- **Syntax error** → Code issue
- **Type error** → TypeScript issue

### Step 2: Check Dependencies

```cmd
# List installed packages
npm list --depth=0

# Check if specific package is installed
npm list xlsx
```

### Step 3: Install Missing Dependencies

```cmd
# Install all dependencies from package.json
npm install

# Or install specific package
npm install xlsx
```

### Step 4: Clear Cache

```cmd
# Use the helper script
clear-cache.bat

# Or manually
rmdir /s /q .next
rmdir /s /q node_modules\.cache
```

### Step 5: Restart Dev Server

```cmd
# Stop server (Ctrl+C)
# Then restart
npm run dev
```

---

## Package Installation Reference

### Current Project Dependencies

All required packages are in `package.json`:

**Core:**
- `next` - Next.js framework
- `react` - React library
- `react-dom` - React DOM

**Data Processing:**
- `xlsx` - Excel file parsing (for lead imports)
- `exceljs` - Excel file generation (for exports)
- `pdf-lib` - PDF generation

**Database:**
- `pg` - PostgreSQL client
- `@supabase/supabase-js` - Supabase client (for migration)

**Authentication:**
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT tokens

**UI:**
- `lucide-react` - Icon library
- `tailwindcss` - CSS framework

**Scraping:**
- `puppeteer` - Browser automation

**State Management:**
- `zustand` - State management

**Validation:**
- `zod` - Schema validation

### Installing All Dependencies

```cmd
# From project root
cd hosted-smart-cost-calculator
npm install
```

This installs all packages listed in `package.json`.

---

## Prevention Checklist

✅ **After pulling code:**
```cmd
git pull
npm install
clear-cache.bat
npm run dev
```

✅ **After switching branches:**
```cmd
git checkout branch-name
npm install
clear-cache.bat
npm run dev
```

✅ **After cloning repository:**
```cmd
git clone <repo-url>
cd hosted-smart-cost-calculator
npm install
npm run dev
```

✅ **Before committing:**
```cmd
npm run lint
npm run build
```

---

## Quick Reference Commands

```cmd
# Install dependencies
npm install

# Clear cache
clear-cache.bat

# Start dev server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Check for issues
npm run lint
```

---

## Still Having Issues?

1. **Delete node_modules and reinstall:**
   ```cmd
   rmdir /s /q node_modules
   npm install
   ```

2. **Check Node.js version:**
   ```cmd
   node --version
   ```
   Required: Node.js 18 or higher

3. **Check npm version:**
   ```cmd
   npm --version
   ```

4. **Clear npm cache:**
   ```cmd
   npm cache clean --force
   ```

5. **Check for port conflicts:**
   ```cmd
   netstat -ano | findstr :3000
   ```

---

## Error Log Analysis

When reporting errors, include:

1. **Full error message** from console
2. **Import trace** (shows which files are involved)
3. **Steps to reproduce**
4. **What you've tried**

Example:
```
Error: Module not found: Can't resolve 'xlsx'
Import trace:
  ./components/leads/import/ExcelImporter.tsx
  ./app/leads/status-pages/main-sheet.tsx
  ./app/leads/page.tsx

Tried:
  - Cleared cache
  - Restarted dev server

Solution needed: Install xlsx package
```
