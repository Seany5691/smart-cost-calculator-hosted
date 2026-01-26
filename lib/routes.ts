/**
 * Route Generation Utilities
 * Handles coordinate extraction from Google Maps URLs and route generation
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Extract coordinates from a Google Maps URL
 * Supports various Google Maps URL formats:
 * - https://www.google.com/maps/place/.../@-26.123,28.456,17z/...
 * - https://maps.google.com/?q=-26.123,28.456
 * - https://www.google.com/maps/place/.../data=!...!3d-26.123!4d28.456...
 * - https://goo.gl/maps/... (shortened URLs - returns null, needs expansion)
 */
export function extractCoordinatesFromMapsUrl(mapsUrl: string): Coordinates | null {
  if (!mapsUrl) return null;

  try {
    // Pattern 1: /@lat,lng,zoom format
    const pattern1 = /@(-?\d+\.\d+),(-?\d+\.\d+),\d+z/;
    const match1 = mapsUrl.match(pattern1);
    if (match1) {
      return {
        lat: parseFloat(match1[1]),
        lng: parseFloat(match1[2])
      };
    }

    // Pattern 2: ?q=lat,lng format
    const pattern2 = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match2 = mapsUrl.match(pattern2);
    if (match2) {
      return {
        lat: parseFloat(match2[1]),
        lng: parseFloat(match2[2])
      };
    }

    // Pattern 3: /place/.../@lat,lng format (without zoom)
    const pattern3 = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match3 = mapsUrl.match(pattern3);
    if (match3) {
      return {
        lat: parseFloat(match3[1]),
        lng: parseFloat(match3[2])
      };
    }

    // Pattern 4: data parameter with !3d (latitude) and !4d (longitude)
    // Example: data=!4m7!3m6!1s0x...!8m2!3d-26.4927695!4d27.4934838!...
    const pattern4 = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;
    const match4 = mapsUrl.match(pattern4);
    if (match4) {
      return {
        lat: parseFloat(match4[1]),
        lng: parseFloat(match4[2])
      };
    }

    // Pattern 5: ll parameter (lat,lng)
    const pattern5 = /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match5 = mapsUrl.match(pattern5);
    if (match5) {
      return {
        lat: parseFloat(match5[1]),
        lng: parseFloat(match5[2])
      };
    }

    return null;
  } catch (error) {
    console.error('Error extracting coordinates:', error);
    return null;
  }
}

/**
 * Validate coordinates are within valid ranges
 */
export function validateCoordinates(coords: Coordinates): boolean {
  return (
    coords.lat >= -90 &&
    coords.lat <= 90 &&
    coords.lng >= -180 &&
    coords.lng <= 180
  );
}

/**
 * Generate a Google Maps route URL with multiple waypoints
 * @param waypoints Array of coordinates for the route
 * @param startingPoint Optional starting point address or coordinates
 * @returns Google Maps directions URL
 */
export function generateRouteUrl(
  waypoints: Coordinates[],
  startingPoint?: string | Coordinates
): string {
  if (waypoints.length === 0) {
    throw new Error('At least one waypoint is required');
  }

  // Base URL for Google Maps directions
  let url = 'https://www.google.com/maps/dir/';

  // Add starting point if provided
  if (startingPoint) {
    if (typeof startingPoint === 'string') {
      url += encodeURIComponent(startingPoint) + '/';
    } else {
      url += `${startingPoint.lat},${startingPoint.lng}/`;
    }
  }

  // Add all waypoints
  waypoints.forEach((coord, index) => {
    url += `${coord.lat},${coord.lng}`;
    if (index < waypoints.length - 1) {
      url += '/';
    }
  });

  return url;
}

/**
 * Validate a Google Maps route URL
 */
export function validateRouteUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    return (
      (urlObj.hostname === 'www.google.com' || urlObj.hostname === 'maps.google.com') &&
      urlObj.pathname.startsWith('/maps/dir/')
    );
  } catch {
    return false;
  }
}

/**
 * Calculate the number of stops in a route URL
 */
export function calculateStopCount(waypoints: Coordinates[], startingPoint?: string | Coordinates): number {
  let count = waypoints.length;
  if (startingPoint) {
    count += 1; // Starting point counts as a stop
  }
  return count;
}
