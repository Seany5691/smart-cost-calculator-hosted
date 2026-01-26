# Webpack Error Fix Guide

## Error: "Cannot read properties of undefined (reading 'call')"

This error typically occurs when Next.js webpack has cached module information that's out of sync with your code.

## Quick Fix

### Option 1: Use the Clear Cache Scripts

**Windows Command Prompt:**
```cmd
clear-cache.bat
```

**PowerShell:**
```powershell
.\clear-cache.ps1
```

### Option 2: Manual Steps

1. **Stop the dev server** (Ctrl+C)

2. **Clear the Next.js cache:**
   ```cmd
   rmdir /s /q .next
   rmdir /s /q node_modules\.cache
   ```

3. **Restart the dev server:**
   ```cmd
   npm run dev
   ```

## Why This Happens

This error occurs when:
- Webpack's Hot Module Replacement (HMR) gets confused
- Module exports/imports change while the dev server is running
- The `.next` build cache becomes corrupted
- Dynamic imports reference modules that webpack can't resolve

## Prevention

To minimize these errors:

1. **Restart dev server after major changes:**
   - Adding/removing dynamic imports
   - Changing export types (default vs named)
   - Modifying file structure

2. **Use consistent export patterns:**
   ```tsx
   // ✅ Good - Default export
   export default function MyComponent() {
     return <div>Content</div>;
   }
   
   // ❌ Avoid mixing with dynamic imports
   export function MyComponent() {
     return <div>Content</div>;
   }
   ```

3. **Clear cache regularly:**
   - Run `clear-cache.bat` or `clear-cache.ps1` when errors persist
   - Delete `.next` folder before production builds

## Dynamic Import Best Practices

When using `dynamic()` imports in Next.js:

```tsx
// ✅ Correct - Component has default export
const MyComponent = dynamic(() => import('./MyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false // Optional: disable SSR for client-only components
});

// ✅ Correct - Named export with proper syntax
const MyComponent = dynamic(() => 
  import('./MyComponent').then(mod => mod.MyComponent),
  {
    loading: () => <div>Loading...</div>
  }
);
```

## Still Having Issues?

If clearing the cache doesn't work:

1. **Delete node_modules and reinstall:**
   ```cmd
   rmdir /s /q node_modules
   npm install
   ```

2. **Check for circular dependencies:**
   - Look for components importing each other
   - Use tools like `madge` to detect cycles

3. **Verify all imports are correct:**
   - Check file paths
   - Ensure all imported files exist
   - Verify export/import syntax matches

4. **Check Next.js version compatibility:**
   ```cmd
   npm list next
   ```
   Current version: 15.5.9

## Common Scenarios

### Scenario 1: Error after adding new page
**Solution:** Clear cache and restart dev server

### Scenario 2: Error in multiple pages simultaneously
**Solution:** Likely a shared component issue - check imports in common components

### Scenario 3: Error only in production build
**Solution:** Delete `.next` folder and rebuild:
```cmd
rmdir /s /q .next
npm run build
```

## Additional Resources

- [Next.js Dynamic Imports](https://nextjs.org/docs/advanced-features/dynamic-import)
- [Webpack Module Federation](https://webpack.js.org/concepts/module-federation/)
- [Next.js Troubleshooting](https://nextjs.org/docs/messages)
