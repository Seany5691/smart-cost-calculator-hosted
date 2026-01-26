# Google Maps URL Parsing Fix - COMPLETE

## Issue
When trying to generate a route, the system showed an error:
```
Some leads have invalid Google Maps URLs. Please check the addresses and try again.
```

The system wasn't recognizing newer Google Maps URL formats like:
```
https://www.google.com/maps/place/PharmaCity/data=!4m7!3m6!1s0x1e95cbd12a23b639:0x4a22f32eb46195f9!8m2!3d-26.4927695!4d27.4934838!16s%2Fg%2F1pzq_c7d4!19sChIJObYjKtHLlR4R-ZVhtC7zIko?authuser=0&hl=en&rclk=1
```

## Root Cause
The `extractCoordinatesFromMapsUrl` function in `lib/routes.ts` only supported 3 URL patterns and didn't handle the newer Google Maps format where coordinates are embedded in the `data` parameter as `!3d` (latitude) and `!4d` (longitude).

## Fixes Applied

### 1. Updated `lib/routes.ts`
Added two new patterns to the `extractCoordinatesFromMapsUrl` function:

**Pattern 4** (NEW): `!3dlat!4dlng` format
- Matches URLs like: `data=!...!3d-26.4927695!4d27.4934838!...`
- Regex: `/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/`

**Pattern 5** (NEW): `ll` parameter format
- Matches URLs like: `?ll=-26.123,28.456`
- Regex: `/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/`

### 2. Improved Error Messages in `main-sheet.tsx`
Updated the route generation error handling to:
- Show which specific leads are failing
- Display the first 50 characters of the failing URL
- Log detailed information to the console for debugging

## Supported URL Formats

The system now supports **5 different Google Maps URL formats**:

1. **Standard place URL with coordinates**
   ```
   https://www.google.com/maps/place/Business/@-26.123,28.456,17z
   ```

2. **Query parameter format**
   ```
   https://maps.google.com/?q=-26.123,28.456
   ```

3. **Place URL without zoom**
   ```
   https://www.google.com/maps/place/Business/@-26.123,28.456
   ```

4. **Data parameter format** (NEW)
   ```
   https://www.google.com/maps/place/Business/data=!3d-26.4927695!4d27.4934838
   ```

5. **LL parameter format** (NEW)
   ```
   https://www.google.com/maps?ll=-26.123,28.456
   ```

## CRITICAL: Clear Cache to Apply Fix

The fix requires clearing both server and browser caches:

### Option 1: Use the Batch File
Run `RESTART_FOR_ROUTES_FIX.bat` which will:
1. Stop the dev server
2. Clear Next.js cache
3. Restart the dev server
4. Remind you to clear browser cache

### Option 2: Manual Steps
1. **Stop the dev server** (Ctrl+C in the terminal)
2. **Clear Next.js cache**:
   ```bash
   rmdir /s /q .next
   ```
3. **Restart dev server**:
   ```bash
   npm run dev
   ```
4. **Clear browser cache**:
   - Press `Ctrl+Shift+Delete`
   - Select "Cached images and files"
   - Click "Clear data"
5. **Hard refresh the page**: `Ctrl+F5` or `Ctrl+Shift+R`

## Testing

After clearing caches, test the route generation:

1. Go to Leads > Main Sheet
2. Add some leads to the working area
3. Make sure they have Google Maps URLs (any of the 5 formats above)
4. Click "Generate Route"
5. The route should generate successfully

If you still see errors, check the browser console (F12) to see which specific leads are failing and what their URLs look like.

## Debugging

If a lead still fails, you can test the URL parsing in the browser console:

```javascript
const testUrl = "YOUR_GOOGLE_MAPS_URL_HERE";
const pattern = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;
const match = testUrl.match(pattern);
console.log(match ? { lat: parseFloat(match[1]), lng: parseFloat(match[2]) } : "No match");
```

This will help identify if the URL format is different from the 5 supported patterns.
