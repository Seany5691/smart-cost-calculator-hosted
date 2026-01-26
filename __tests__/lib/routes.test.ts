import {
  extractCoordinatesFromMapsUrl,
  validateCoordinates,
  generateRouteUrl,
  validateRouteUrl,
  calculateStopCount,
  type Coordinates
} from '@/lib/routes';

describe('Route Generation Utilities', () => {
  describe('extractCoordinatesFromMapsUrl', () => {
    it('should extract coordinates from @lat,lng,zoom format', () => {
      const url = 'https://www.google.com/maps/place/Test/@-26.123456,28.654321,17z/data=...';
      const coords = extractCoordinatesFromMapsUrl(url);
      
      expect(coords).not.toBeNull();
      expect(coords?.lat).toBe(-26.123456);
      expect(coords?.lng).toBe(28.654321);
    });

    it('should extract coordinates from ?q=lat,lng format', () => {
      const url = 'https://maps.google.com/?q=-26.123456,28.654321';
      const coords = extractCoordinatesFromMapsUrl(url);
      
      expect(coords).not.toBeNull();
      expect(coords?.lat).toBe(-26.123456);
      expect(coords?.lng).toBe(28.654321);
    });

    it('should extract coordinates from @lat,lng format without zoom', () => {
      const url = 'https://www.google.com/maps/place/Test/@-26.123456,28.654321/data=...';
      const coords = extractCoordinatesFromMapsUrl(url);
      
      expect(coords).not.toBeNull();
      expect(coords?.lat).toBe(-26.123456);
      expect(coords?.lng).toBe(28.654321);
    });

    it('should return null for invalid URLs', () => {
      expect(extractCoordinatesFromMapsUrl('')).toBeNull();
      expect(extractCoordinatesFromMapsUrl('not a url')).toBeNull();
      expect(extractCoordinatesFromMapsUrl('https://example.com')).toBeNull();
    });

    it('should handle positive and negative coordinates', () => {
      const url1 = 'https://www.google.com/maps/@40.7128,-74.0060,15z';
      const coords1 = extractCoordinatesFromMapsUrl(url1);
      expect(coords1?.lat).toBe(40.7128);
      expect(coords1?.lng).toBe(-74.0060);

      const url2 = 'https://www.google.com/maps/@-33.8688,151.2093,15z';
      const coords2 = extractCoordinatesFromMapsUrl(url2);
      expect(coords2?.lat).toBe(-33.8688);
      expect(coords2?.lng).toBe(151.2093);
    });
  });

  describe('validateCoordinates', () => {
    it('should validate correct coordinates', () => {
      expect(validateCoordinates({ lat: 0, lng: 0 })).toBe(true);
      expect(validateCoordinates({ lat: -26.123, lng: 28.654 })).toBe(true);
      expect(validateCoordinates({ lat: 90, lng: 180 })).toBe(true);
      expect(validateCoordinates({ lat: -90, lng: -180 })).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      expect(validateCoordinates({ lat: 91, lng: 0 })).toBe(false);
      expect(validateCoordinates({ lat: -91, lng: 0 })).toBe(false);
      expect(validateCoordinates({ lat: 0, lng: 181 })).toBe(false);
      expect(validateCoordinates({ lat: 0, lng: -181 })).toBe(false);
    });
  });

  describe('generateRouteUrl', () => {
    it('should generate route URL with waypoints only', () => {
      const waypoints: Coordinates[] = [
        { lat: -26.123, lng: 28.654 },
        { lat: -26.456, lng: 28.789 }
      ];
      
      const url = generateRouteUrl(waypoints);
      
      expect(url).toContain('https://www.google.com/maps/dir/');
      expect(url).toContain('-26.123,28.654');
      expect(url).toContain('-26.456,28.789');
    });

    it('should generate route URL with starting point as coordinates', () => {
      const waypoints: Coordinates[] = [
        { lat: -26.123, lng: 28.654 }
      ];
      const startingPoint: Coordinates = { lat: -26.000, lng: 28.000 };
      
      const url = generateRouteUrl(waypoints, startingPoint);
      
      expect(url).toContain('-26,28');
      expect(url).toContain('-26.123,28.654');
    });

    it('should generate route URL with starting point as address', () => {
      const waypoints: Coordinates[] = [
        { lat: -26.123, lng: 28.654 }
      ];
      const startingPoint = 'Office Address, Johannesburg';
      
      const url = generateRouteUrl(waypoints, startingPoint);
      
      expect(url).toContain('Office%20Address');
      expect(url).toContain('-26.123,28.654');
    });

    it('should throw error for empty waypoints', () => {
      expect(() => generateRouteUrl([])).toThrow('At least one waypoint is required');
    });

    it('should handle multiple waypoints', () => {
      const waypoints: Coordinates[] = [
        { lat: -26.1, lng: 28.1 },
        { lat: -26.2, lng: 28.2 },
        { lat: -26.3, lng: 28.3 },
        { lat: -26.4, lng: 28.4 }
      ];
      
      const url = generateRouteUrl(waypoints);
      
      expect(url).toContain('-26.1,28.1');
      expect(url).toContain('-26.2,28.2');
      expect(url).toContain('-26.3,28.3');
      expect(url).toContain('-26.4,28.4');
    });
  });

  describe('validateRouteUrl', () => {
    it('should validate correct Google Maps route URLs', () => {
      expect(validateRouteUrl('https://www.google.com/maps/dir//-26.123,28.654/-26.456,28.789')).toBe(true);
      expect(validateRouteUrl('https://maps.google.com/maps/dir/Office/-26.123,28.654')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateRouteUrl('')).toBe(false);
      expect(validateRouteUrl('not a url')).toBe(false);
      expect(validateRouteUrl('https://example.com')).toBe(false);
      expect(validateRouteUrl('https://www.google.com/search?q=test')).toBe(false);
    });
  });

  describe('calculateStopCount', () => {
    it('should count waypoints only', () => {
      const waypoints: Coordinates[] = [
        { lat: -26.1, lng: 28.1 },
        { lat: -26.2, lng: 28.2 }
      ];
      
      expect(calculateStopCount(waypoints)).toBe(2);
    });

    it('should count waypoints plus starting point', () => {
      const waypoints: Coordinates[] = [
        { lat: -26.1, lng: 28.1 },
        { lat: -26.2, lng: 28.2 }
      ];
      const startingPoint: Coordinates = { lat: -26.0, lng: 28.0 };
      
      expect(calculateStopCount(waypoints, startingPoint)).toBe(3);
    });

    it('should count waypoints plus starting point as string', () => {
      const waypoints: Coordinates[] = [
        { lat: -26.1, lng: 28.1 }
      ];
      const startingPoint = 'Office Address';
      
      expect(calculateStopCount(waypoints, startingPoint)).toBe(2);
    });

    it('should handle empty waypoints', () => {
      expect(calculateStopCount([])).toBe(0);
    });
  });
});
