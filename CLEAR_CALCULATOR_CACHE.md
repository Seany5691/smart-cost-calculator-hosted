# Clear Calculator Cache

## Problem
After refreshing the page, all calculator changes are gone because the old state is cached in localStorage.

## Solution
You need to clear the calculator's localStorage cache. Here are three ways to do it:

### Option 1: Clear via Browser Console (Recommended)
1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Run this command:
```javascript
localStorage.removeItem('calculator-storage')
location.reload()
```

### Option 2: Clear All localStorage
1. Open Developer Tools (F12)
2. Go to the Application tab (Chrome) or Storage tab (Firefox)
3. Find "Local Storage" in the left sidebar
4. Click on your site's URL
5. Find the key `calculator-storage`
6. Right-click and delete it
7. Refresh the page

### Option 3: Add a Reset Button (Temporary)
Add this to your calculator page temporarily:
```javascript
<button onClick={() => {
  localStorage.removeItem('calculator-storage');
  window.location.reload();
}}>
  Clear Cache & Reload
</button>
```

## Why This Happened
The calculator store uses Zustand's `persist` middleware which saves state to localStorage. When you refresh, it loads the old cached state instead of the new default values.

## After Clearing Cache
Once you clear the cache and reload:
1. The settlement calculator toggle should work
2. You should be able to enter manual settlement values
3. All new component features should be visible
4. The calculator will use the new implementations

## Preventing This in Development
During development, you can disable persistence temporarily by commenting out the `persist` wrapper in `lib/store/calculator.ts`, but this will lose state on refresh.
