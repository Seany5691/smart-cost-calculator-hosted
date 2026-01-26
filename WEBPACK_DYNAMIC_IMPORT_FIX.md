# Webpack Dynamic Import Fix

## Issue
After clearing the `.next` cache and restarting the dev server, the calculator page was throwing this error:
```
Uncaught TypeError: Cannot read properties of undefined (reading 'call')
at options.factory (webpack.js:715:31)
```

## Root Cause
The error was caused by dynamic imports (`next/dynamic`) conflicting with webpack's module resolution after the cache was cleared. This issue was related to Task 11.3 (code splitting and optimization) from a previous implementation.

## Solution Applied
Removed all dynamic imports and replaced them with regular imports:

### Files Modified:

1. **app/calculator/page.tsx**
   - Changed from: `const CalculatorWizard = dynamic(() => import(...))`
   - Changed to: `import CalculatorWizard from '@/components/calculator/CalculatorWizard'`

2. **app/admin/page.tsx**
   - Removed all dynamic imports for admin components
   - Changed to regular imports for: HardwareConfig, ConnectivityConfig, LicensingConfig, FactorsConfig, ScalesConfig, UserManagement

## Why This Works
- Next.js 14's default webpack configuration handles code splitting automatically
- The custom webpack splitChunks configuration was already removed from `next.config.js`
- Regular imports allow webpack to properly resolve modules without the dynamic import complexity
- Next.js will still optimize bundle sizes through automatic code splitting

## Trade-offs
- Slightly larger initial bundle size (but Next.js still does automatic code splitting)
- No custom loading states for individual components
- More reliable module resolution and fewer webpack errors

## Next Steps
1. Restart the dev server (already done)
2. Clear browser localStorage cache
3. Test all calculator features

## Prevention
If you need to re-implement code splitting in the future:
- Use Next.js's built-in automatic code splitting instead of custom webpack config
- Test thoroughly after clearing `.next` cache
- Consider using React.lazy() with Suspense instead of next/dynamic for better control
