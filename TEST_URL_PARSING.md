# Test URL Parsing

To test if the URL parsing is working correctly, open the browser console and run:

```javascript
// Test the URL you provided
const testUrl = "https://www.google.com/maps/place/PharmaCity/data=!4m7!3m6!1s0x1e95cbd12a23b639:0x4a22f32eb46195f9!8m2!3d-26.4927695!4d27.4934838!16s%2Fg%2F1pzq_c7d4!19sChIJObYjKtHLlR4R-ZVhtC7zIko?authuser=0&hl=en&rclk=1";

// Extract coordinates using regex
const pattern = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;
const match = testUrl.match(pattern);

if (match) {
  console.log("Coordinates found:", {
    lat: parseFloat(match[1]),
    lng: parseFloat(match[2])
  });
} else {
  console.log("No coordinates found");
}
```

Expected output:
```
Coordinates found: { lat: -26.4927695, lng: 27.4934838 }
```

## If the test fails:

1. **Clear browser cache**: Press Ctrl+Shift+Delete and clear cached files
2. **Hard refresh**: Press Ctrl+F5 or Ctrl+Shift+R
3. **Restart dev server**: Stop the server and run `npm run dev` again

## Supported URL Formats:

The updated `extractCoordinatesFromMapsUrl` function now supports:

1. `/@lat,lng,zoom` format
2. `?q=lat,lng` format  
3. `/@lat,lng` format (without zoom)
4. **`!3dlat!4dlng` format** (NEW - your URL format)
5. `?ll=lat,lng` format

## Example URLs that should work:

```
https://www.google.com/maps/place/Business/@-26.123,28.456,17z
https://maps.google.com/?q=-26.123,28.456
https://www.google.com/maps/place/Business/@-26.123,28.456
https://www.google.com/maps/place/Business/data=!3d-26.4927695!4d27.4934838
https://www.google.com/maps?ll=-26.123,28.456
```
