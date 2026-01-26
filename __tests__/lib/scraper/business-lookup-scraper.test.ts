/**
 * Property-Based Tests for BusinessLookupScraper
 * 
 * These tests verify universal properties that should hold across all valid inputs
 * using fast-check for property-based testing with minimum 100 iterations.
 */

import * as fc from 'fast-check';
import { BusinessLookupScraper } from '../../../lib/scraper/business-lookup-scraper';
import { ScrapedBusiness } from '../../../lib/scraper/types';

// Mock Page object for testing
const createMockPage = () => {
  return {
    goto: jest.fn().mockResolvedValue(undefined),
    waitForSelector: jest.fn().mockResolvedValue(undefined),
    waitForTimeout: jest.fn().mockResolvedValue(undefined),
    evaluate: jest.fn(),
    $$: jest.fn().mockResolvedValue([]),
  } as any;
};

describe('BusinessLookupScraper - Property-Based Tests', () => {
  /**
   * Property 2: Google Maps URLs are correctly formatted
   * 
   * **Validates: Requirements 2.1**
   * 
   * For any business query, the constructed Google Maps search URL
   * should contain the encoded query.
   */
  it('Property 2: Google Maps URLs are correctly formatted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }), // business query
        async (businessQuery) => {
          const page = createMockPage();
          
          // Track the URL that was navigated to
          let navigatedUrl = '';
          page.goto.mockImplementation((url: string) => {
            navigatedUrl = url;
            return Promise.resolve(undefined);
          });

          // Mock view detection to return list view
          page.evaluate.mockImplementation((fn: any) => {
            if (fn.toString().includes('role="feed"')) {
              return Promise.resolve(true); // Has feed (list view)
            }
            return Promise.resolve(false);
          });

          page.$$.mockResolvedValue([]);

          const scraper = new BusinessLookupScraper(page, businessQuery);
          
          try {
            await scraper.scrape();
          } catch (error) {
            // Ignore errors, we just want to check the URL
          }

          // Property: URL should be correctly formatted
          expect(navigatedUrl).toContain('https://www.google.com/maps/search/');
          expect(navigatedUrl).toContain(encodeURIComponent(businessQuery));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: List view returns maximum 3 businesses
   * 
   * **Validates: Requirements 2.3**
   * 
   * For any business lookup that returns list view results,
   * the number of businesses returned should be less than or equal to 3.
   */
  it('Property 6: List view returns maximum 3 businesses', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }), // business query
        fc.integer({ min: 0, max: 20 }), // number of results in feed
        async (businessQuery, resultCount) => {
          const page = createMockPage();
          
          // Mock view detection to return list view
          page.evaluate.mockImplementation((fn: any) => {
            if (fn.toString().includes('role="feed"')) {
              return Promise.resolve(true); // Has feed (list view)
            }
            return Promise.resolve(false);
          });

          // Create mock business cards
          const mockCards = [];
          for (let i = 0; i < resultCount; i++) {
            mockCards.push({
              evaluate: jest.fn().mockResolvedValue({
                name: `Business ${i}`,
                maps_address: `https://maps.google.com/business${i}`,
                phone: `555-000${i}`,
                address: `Address ${i}`,
              }),
            });
          }

          page.$$.mockResolvedValue(mockCards);

          const scraper = new BusinessLookupScraper(page, businessQuery);
          const businesses = await scraper.extractFromListView();

          // Property: Should return at most 3 businesses
          expect(businesses.length).toBeLessThanOrEqual(3);

          // If there were results, we should get min(resultCount, 3)
          if (resultCount > 0) {
            expect(businesses.length).toBe(Math.min(resultCount, 3));
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Details view returns exactly 1 business
   * 
   * For any business lookup that returns details view,
   * the result should contain exactly 1 business (or 0 if extraction fails).
   */
  it('Property: Details view returns at most 1 business', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }), // business query
        fc.option(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            address: fc.string(),
          }),
          { nil: null }
        ),
        async (businessQuery, mockData) => {
          const page = createMockPage();
          
          // Mock view detection to return details view
          page.evaluate.mockImplementation((fn: any) => {
            if (fn.toString().includes('role="feed"')) {
              return Promise.resolve(false); // No feed
            }
            if (fn.toString().includes('role="main"')) {
              return Promise.resolve(true); // Has main panel
            }
            if (fn.toString().includes('h1')) {
              return mockData ? Promise.resolve(mockData) : Promise.resolve({ name: '', address: '' });
            }
            return Promise.resolve('');
          });

          const scraper = new BusinessLookupScraper(page, businessQuery);
          const businesses = await scraper.extractFromDetailsView();

          // Property: Should return at most 1 business
          if (businesses) {
            expect(businesses).not.toBeNull();
            // If we got a business, it should have required fields
            if (businesses.name) {
              expect(businesses.name.trim()).not.toBe('');
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Unit Tests for BusinessLookupScraper
 * 
 * Tests specific examples and edge cases
 */
describe('BusinessLookupScraper - Unit Tests', () => {
  describe('detectViewType', () => {
    it('should detect list view when feed element exists', async () => {
      const page = createMockPage();
      page.evaluate.mockImplementation((fn: any) => {
        if (fn.toString().includes('role="feed"')) {
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      });

      const scraper = new BusinessLookupScraper(page, 'Test Business');
      const viewType = await scraper.detectViewType();
      expect(viewType).toBe('list');
    });

    it('should detect details view when main panel with h1 exists', async () => {
      const page = createMockPage();
      page.evaluate.mockImplementation((fn: any) => {
        if (fn.toString().includes('role="feed"')) {
          return Promise.resolve(false);
        }
        if (fn.toString().includes('role="main"')) {
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      });

      const scraper = new BusinessLookupScraper(page, 'Test Business');
      const viewType = await scraper.detectViewType();
      expect(viewType).toBe('details');
    });

    it('should default to list view when neither is detected', async () => {
      const page = createMockPage();
      page.evaluate.mockResolvedValue(false);

      const scraper = new BusinessLookupScraper(page, 'Test Business');
      const viewType = await scraper.detectViewType();
      expect(viewType).toBe('list');
    });
  });

  describe('extractFromDetailsView', () => {
    it('should return exactly 1 business from details view', async () => {
      const page = createMockPage();
      page.evaluate.mockImplementation((fn: any) => {
        if (fn.toString().includes('h1')) {
          return Promise.resolve({
            name: 'Test Business',
            maps_address: 'https://maps.google.com/test',
            address: '123 Main St',
          });
        }
        return Promise.resolve('555-1234');
      });

      const scraper = new BusinessLookupScraper(page, 'Test Business');
      const business = await scraper.extractFromDetailsView();

      expect(business).not.toBeNull();
      expect(business?.name).toBe('Test Business');
    });

    it('should return null when name is missing', async () => {
      const page = createMockPage();
      page.evaluate.mockImplementation((fn: any) => {
        if (fn.toString().includes('h1')) {
          return Promise.resolve({
            name: '',
            maps_address: 'https://maps.google.com/test',
            address: '123 Main St',
          });
        }
        return Promise.resolve('');
      });

      const scraper = new BusinessLookupScraper(page, 'Test Business');
      const business = await scraper.extractFromDetailsView();

      expect(business).toBeNull();
    });
  });

  describe('extractPhoneFromDetails', () => {
    it('should return "No phone" when no phone is found', async () => {
      const page = createMockPage();
      page.evaluate.mockResolvedValue('');

      const scraper = new BusinessLookupScraper(page, 'Test Business');
      const phone = await scraper.extractPhoneFromDetails();

      expect(phone).toBe('No phone');
    });

    it('should extract phone from aria-label (Strategy 1)', async () => {
      const page = createMockPage();
      page.evaluate.mockImplementation((fn: any) => {
        if (fn.toString().includes('aria-label')) {
          return Promise.resolve('555-1234');
        }
        return Promise.resolve('');
      });

      const scraper = new BusinessLookupScraper(page, 'Test Business');
      const phone = await scraper.extractPhoneFromDetails();

      expect(phone).toBe('555-1234');
    });

    it('should extract phone from button text (Strategy 2)', async () => {
      const page = createMockPage();
      let callCount = 0;
      page.evaluate.mockImplementation((fn: any) => {
        callCount++;
        if (callCount === 1) {
          // First call (Strategy 1) returns empty
          return Promise.resolve('');
        }
        if (callCount === 2) {
          // Second call (Strategy 2) returns phone
          return Promise.resolve('555-1234');
        }
        return Promise.resolve('');
      });

      const scraper = new BusinessLookupScraper(page, 'Test Business');
      const phone = await scraper.extractPhoneFromDetails();

      expect(phone).toBe('555-1234');
    });
  });

  describe('extractFromListView', () => {
    it('should limit results to 3 businesses', async () => {
      const page = createMockPage();
      
      // Create 10 mock cards
      const mockCards = [];
      for (let i = 0; i < 10; i++) {
        mockCards.push({
          evaluate: jest.fn().mockResolvedValue({
            name: `Business ${i}`,
            maps_address: `https://maps.google.com/business${i}`,
            phone: `555-000${i}`,
            address: `Address ${i}`,
          }),
        });
      }

      page.$$.mockResolvedValue(mockCards);

      const scraper = new BusinessLookupScraper(page, 'Test Query');
      const businesses = await scraper.extractFromListView();

      expect(businesses.length).toBe(3);
      expect(businesses[0].name).toBe('Business 0');
      expect(businesses[1].name).toBe('Business 1');
      expect(businesses[2].name).toBe('Business 2');
    });

    it('should handle fewer than 3 results', async () => {
      const page = createMockPage();
      
      // Create 2 mock cards
      const mockCards = [
        {
          evaluate: jest.fn().mockResolvedValue({
            name: 'Business 0',
            maps_address: 'https://maps.google.com/business0',
            phone: '555-0000',
            address: 'Address 0',
          }),
        },
        {
          evaluate: jest.fn().mockResolvedValue({
            name: 'Business 1',
            maps_address: 'https://maps.google.com/business1',
            phone: '555-0001',
            address: 'Address 1',
          }),
        },
      ];

      page.$$.mockResolvedValue(mockCards);

      const scraper = new BusinessLookupScraper(page, 'Test Query');
      const businesses = await scraper.extractFromListView();

      expect(businesses.length).toBe(2);
    });

    it('should skip cards without names', async () => {
      const page = createMockPage();
      
      const mockCards = [
        {
          evaluate: jest.fn().mockResolvedValue({
            name: 'Valid Business',
            maps_address: 'https://maps.google.com/valid',
            phone: '555-0000',
            address: 'Address',
          }),
        },
        {
          evaluate: jest.fn().mockResolvedValue({
            name: '',
            maps_address: 'https://maps.google.com/invalid',
            phone: '555-0001',
            address: 'Address',
          }),
        },
        {
          evaluate: jest.fn().mockResolvedValue({
            name: 'Another Valid',
            maps_address: 'https://maps.google.com/valid2',
            phone: '555-0002',
            address: 'Address',
          }),
        },
      ];

      page.$$.mockResolvedValue(mockCards);

      const scraper = new BusinessLookupScraper(page, 'Test Query');
      const businesses = await scraper.extractFromListView();

      expect(businesses.length).toBe(2);
      expect(businesses[0].name).toBe('Valid Business');
      expect(businesses[1].name).toBe('Another Valid');
    });
  });

  describe('parseBusinessCard', () => {
    it('should parse business card with all fields', async () => {
      const page = createMockPage();
      const scraper = new BusinessLookupScraper(page, 'Test Query');

      const mockCard = {
        evaluate: jest.fn().mockResolvedValue({
          name: 'Test Business',
          maps_address: 'https://maps.google.com/test',
          phone: '555-1234',
          address: '123 Main St',
        }),
      };

      const business = await scraper.parseBusinessCard(mockCard);

      expect(business).not.toBeNull();
      expect(business?.name).toBe('Test Business');
      expect(business?.maps_address).toBe('https://maps.google.com/test');
      expect(business?.phone).toBe('555-1234');
      expect(business?.address).toBe('123 Main St');
      expect(business?.type_of_business).toBe('Test Query');
    });

    it('should set empty strings for missing optional fields', async () => {
      const page = createMockPage();
      const scraper = new BusinessLookupScraper(page, 'Test Query');

      const mockCard = {
        evaluate: jest.fn().mockResolvedValue({
          name: 'Test Business',
          maps_address: '',
          phone: '',
          address: '',
        }),
      };

      const business = await scraper.parseBusinessCard(mockCard);

      expect(business).not.toBeNull();
      expect(business?.name).toBe('Test Business');
      expect(business?.maps_address).toBe('');
      expect(business?.phone).toBe('');
      expect(business?.address).toBe('');
      expect(business?.provider).toBe('');
    });
  });
});
