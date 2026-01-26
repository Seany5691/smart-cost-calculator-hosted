/**
 * Property-Based Tests for IndustryScraper
 * 
 * These tests verify universal properties that should hold across all valid inputs
 * using fast-check for property-based testing with minimum 100 iterations.
 */

import * as fc from 'fast-check';
import { IndustryScraper } from '../../../lib/scraper/industry-scraper';
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

describe('IndustryScraper - Property-Based Tests', () => {
  /**
   * Property 3: Businesses without names are filtered out
   * 
   * **Validates: Requirements 1.4, 25.1**
   * 
   * For any list of scraped businesses returned by the scraper,
   * all businesses in the list should have non-empty name fields.
   */
  it('Property 3: Businesses without names are filtered out', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // town
        fc.string({ minLength: 1, maxLength: 50 }), // industry
        fc.array(
          fc.record({
            name: fc.option(fc.string(), { nil: '' }), // Can be empty or null
            maps_address: fc.string(),
            phone: fc.string(),
            address: fc.string(),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (town, industry, mockBusinessData) => {
          const page = createMockPage();
          
          // Mock the page evaluation to return our test data
          page.evaluate.mockImplementation((fn: any) => {
            if (fn.toString().includes('role="feed"')) {
              return Promise.resolve(true); // hasReachedEndOfList
            }
            return Promise.resolve(undefined);
          });

          // Mock business card elements
          const mockCards = mockBusinessData.map((data) => ({
            evaluate: jest.fn().mockResolvedValue(data),
          }));
          page.$$.mockResolvedValue(mockCards);

          const scraper = new IndustryScraper(page, town, industry);
          const businesses = await scraper.extractFromListView();

          // Property: All returned businesses must have non-empty names
          for (const business of businesses) {
            expect(business.name).toBeTruthy();
            expect(business.name.trim()).not.toBe('');
          }

          // Verify that businesses without names were filtered out
          const inputWithNames = mockBusinessData.filter(
            (data) => data.name && data.name.trim() !== ''
          );
          expect(businesses.length).toBeLessThanOrEqual(inputWithNames.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: All businesses have required and optional fields
   * 
   * **Validates: Requirements 1.5**
   * 
   * For any scraped business, it should have:
   * - name field (non-empty string)
   * - maps_address, phone, address, provider, type_of_business, town fields (may be empty strings)
   */
  it('Property 4: All businesses have required and optional fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // town
        fc.string({ minLength: 1, maxLength: 50 }), // industry
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            maps_address: fc.option(fc.webUrl(), { nil: '' }),
            phone: fc.option(fc.string(), { nil: '' }),
            address: fc.option(fc.string(), { nil: '' }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (town, industry, mockBusinessData) => {
          const page = createMockPage();
          
          page.evaluate.mockImplementation((fn: any) => {
            if (fn.toString().includes('role="feed"')) {
              return Promise.resolve(true);
            }
            return Promise.resolve(undefined);
          });

          const mockCards = mockBusinessData.map((data) => ({
            evaluate: jest.fn().mockResolvedValue(data),
          }));
          page.$$.mockResolvedValue(mockCards);

          const scraper = new IndustryScraper(page, town, industry);
          const businesses = await scraper.extractFromListView();

          // Property: All businesses have required and optional fields
          for (const business of businesses) {
            // Required field
            expect(business).toHaveProperty('name');
            expect(typeof business.name).toBe('string');
            expect(business.name.trim()).not.toBe('');

            // Optional fields (must exist but can be empty strings)
            expect(business).toHaveProperty('maps_address');
            expect(typeof business.maps_address).toBe('string');

            expect(business).toHaveProperty('phone');
            expect(typeof business.phone).toBe('string');

            expect(business).toHaveProperty('address');
            expect(typeof business.address).toBe('string');

            expect(business).toHaveProperty('provider');
            expect(typeof business.provider).toBe('string');

            expect(business).toHaveProperty('type_of_business');
            expect(typeof business.type_of_business).toBe('string');
            expect(business.type_of_business).toBe(industry);

            expect(business).toHaveProperty('town');
            expect(typeof business.town).toBe('string');
            expect(business.town).toBe(town);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Parsing errors don't stop scraping
   * 
   * **Validates: Requirements 1.7**
   * 
   * For any scraping operation where individual card parsing fails,
   * the system should continue processing remaining cards and return partial results.
   */
  it('Property 5: Parsing errors don\'t stop scraping', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // town
        fc.string({ minLength: 1, maxLength: 50 }), // industry
        fc.integer({ min: 1, max: 10 }), // number of valid businesses
        fc.integer({ min: 1, max: 5 }), // number of failing cards
        async (town, industry, validCount, failCount) => {
          const page = createMockPage();
          
          page.evaluate.mockImplementation((fn: any) => {
            if (fn.toString().includes('role="feed"')) {
              return Promise.resolve(true);
            }
            return Promise.resolve(undefined);
          });

          // Create mock cards: some valid, some that throw errors
          const mockCards = [];
          
          // Add valid cards
          for (let i = 0; i < validCount; i++) {
            mockCards.push({
              evaluate: jest.fn().mockResolvedValue({
                name: `Business ${i}`,
                maps_address: `https://maps.google.com/business${i}`,
                phone: `555-000${i}`,
                address: `Address ${i}`,
              }),
            });
          }

          // Add failing cards
          for (let i = 0; i < failCount; i++) {
            mockCards.push({
              evaluate: jest.fn().mockRejectedValue(new Error('Parse error')),
            });
          }

          // Shuffle cards to mix valid and failing
          mockCards.sort(() => Math.random() - 0.5);

          page.$$.mockResolvedValue(mockCards);

          const scraper = new IndustryScraper(page, town, industry);
          const businesses = await scraper.extractFromListView();

          // Property: Should return partial results despite errors
          // We should get at least some businesses (the valid ones)
          expect(businesses.length).toBeGreaterThan(0);
          expect(businesses.length).toBeLessThanOrEqual(validCount);

          // All returned businesses should be valid
          for (const business of businesses) {
            expect(business.name).toBeTruthy();
            expect(business.name.trim()).not.toBe('');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 19: Missing optional fields default to empty strings
   * 
   * **Validates: Requirements 25.5**
   * 
   * For any business record created from scraped data, if an optional field
   * (phone, address, provider) is missing from the source, it should be set
   * to an empty string (not null or undefined).
   */
  it('Property 19: Missing optional fields default to empty strings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // town
        fc.string({ minLength: 1, maxLength: 50 }), // industry
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            // Randomly include or exclude optional fields
            maps_address: fc.option(fc.webUrl(), { nil: undefined }),
            phone: fc.option(fc.string(), { nil: undefined }),
            address: fc.option(fc.string(), { nil: undefined }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (town, industry, mockBusinessData) => {
          const page = createMockPage();
          
          page.evaluate.mockImplementation((fn: any) => {
            if (fn.toString().includes('role="feed"')) {
              return Promise.resolve(true);
            }
            return Promise.resolve(undefined);
          });

          const mockCards = mockBusinessData.map((data) => ({
            evaluate: jest.fn().mockResolvedValue(data),
          }));
          page.$$.mockResolvedValue(mockCards);

          const scraper = new IndustryScraper(page, town, industry);
          const businesses = await scraper.extractFromListView();

          // Property: Missing optional fields should be empty strings, not null/undefined
          for (const business of businesses) {
            // Check that optional fields are strings (not null or undefined)
            expect(typeof business.maps_address).toBe('string');
            expect(typeof business.phone).toBe('string');
            expect(typeof business.address).toBe('string');
            expect(typeof business.provider).toBe('string');

            // Verify they're not null or undefined
            expect(business.maps_address).not.toBeNull();
            expect(business.maps_address).not.toBeUndefined();
            expect(business.phone).not.toBeNull();
            expect(business.phone).not.toBeUndefined();
            expect(business.address).not.toBeNull();
            expect(business.address).not.toBeUndefined();
            expect(business.provider).not.toBeNull();
            expect(business.provider).not.toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Unit Tests for IndustryScraper
 * 
 * Tests specific examples and edge cases
 */
describe('IndustryScraper - Unit Tests', () => {
  describe('parseBusinessCard', () => {
    it('should skip cards without names', async () => {
      const page = createMockPage();
      const scraper = new IndustryScraper(page, 'Cape Town', 'Restaurants');

      const mockCard = {
        evaluate: jest.fn().mockResolvedValue({
          name: '',
          maps_address: 'https://maps.google.com/test',
          phone: '555-1234',
          address: '123 Main St',
        }),
      };

      const result = await scraper.parseBusinessCard(mockCard);
      expect(result).toBeNull();
    });

    it('should filter out opening hours as names', async () => {
      const page = createMockPage();
      const scraper = new IndustryScraper(page, 'Cape Town', 'Restaurants');

      const mockCard = {
        evaluate: jest.fn().mockResolvedValue({
          name: 'Opens at 9:00 AM',
          maps_address: 'https://maps.google.com/test',
          phone: '555-1234',
          address: '123 Main St',
        }),
      };

      const result = await scraper.parseBusinessCard(mockCard);
      expect(result).toBeNull();
    });

    it('should filter out ratings as names', async () => {
      const page = createMockPage();
      const scraper = new IndustryScraper(page, 'Cape Town', 'Restaurants');

      const mockCard = {
        evaluate: jest.fn().mockResolvedValue({
          name: '4.5 (123)',
          maps_address: 'https://maps.google.com/test',
          phone: '555-1234',
          address: '123 Main St',
        }),
      };

      const result = await scraper.parseBusinessCard(mockCard);
      expect(result).toBeNull();
    });

    it('should set empty strings for missing optional fields', async () => {
      const page = createMockPage();
      const scraper = new IndustryScraper(page, 'Cape Town', 'Restaurants');

      const mockCard = {
        evaluate: jest.fn().mockResolvedValue({
          name: 'Valid Business',
          maps_address: '',
          phone: '',
          address: '',
        }),
      };

      const result = await scraper.parseBusinessCard(mockCard);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Valid Business');
      expect(result?.maps_address).toBe('');
      expect(result?.phone).toBe('');
      expect(result?.address).toBe('');
      expect(result?.provider).toBe('');
    });

    it('should include town and industry in business object', async () => {
      const page = createMockPage();
      const town = 'Cape Town';
      const industry = 'Restaurants';
      const scraper = new IndustryScraper(page, town, industry);

      const mockCard = {
        evaluate: jest.fn().mockResolvedValue({
          name: 'Test Business',
          maps_address: 'https://maps.google.com/test',
          phone: '555-1234',
          address: '123 Main St',
        }),
      };

      const result = await scraper.parseBusinessCard(mockCard);
      expect(result).not.toBeNull();
      expect(result?.town).toBe(town);
      expect(result?.type_of_business).toBe(industry);
    });
  });

  describe('helper methods', () => {
    let scraper: IndustryScraper;

    beforeEach(() => {
      const page = createMockPage();
      scraper = new IndustryScraper(page, 'Cape Town', 'Restaurants');
    });

    it('isOpeningHours should detect opening hours patterns', () => {
      expect(scraper['isOpeningHours']('Opens at 9:00 AM')).toBe(true);
      expect(scraper['isOpeningHours']('Closed')).toBe(true);
      expect(scraper['isOpeningHours']('Monday 9:00 AM')).toBe(true);
      expect(scraper['isOpeningHours']('Valid Business Name')).toBe(false);
    });

    it('looksLikePhoneNumber should detect phone patterns', () => {
      expect(scraper['looksLikePhoneNumber']('555-123-4567')).toBe(true);
      expect(scraper['looksLikePhoneNumber']('+1234567890')).toBe(true);
      expect(scraper['looksLikePhoneNumber']('(555) 123-4567')).toBe(true);
      expect(scraper['looksLikePhoneNumber']('123')).toBe(false);
      expect(scraper['looksLikePhoneNumber']('Not a phone')).toBe(false);
    });

    it('looksLikeRating should detect rating patterns', () => {
      expect(scraper['looksLikeRating']('4.5 (123)')).toBe(true);
      expect(scraper['looksLikeRating']('4.5 stars')).toBe(true);
      expect(scraper['looksLikeRating']('4.5/5')).toBe(true);
      expect(scraper['looksLikeRating']('Valid Business Name')).toBe(false);
    });
  });
});
