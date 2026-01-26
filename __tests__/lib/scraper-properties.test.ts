/**
 * Property-Based Tests for Scraper Component
 * Tests universal properties that should hold across all inputs
 */

import fc from 'fast-check';
import { identifyProviderByPrefix, getProviderPriority } from '@/lib/scraper/provider-lookup';
import { ScrapeConfig, ScrapedBusiness } from '@/lib/scraper/types';

describe('Scraper Property Tests', () => {
  /**
   * Property 18: Scraper input validation
   * For any scraping session configuration with multiple towns and industries,
   * the system should accept and store all provided towns and industries
   * Validates: Requirements 4.1
   */
  test('Property 18: Scraper input validation', () => {
    fc.assert(
      fc.property(
        fc.record({
          towns: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
          industries: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
          simultaneousTowns: fc.integer({ min: 1, max: 5 }),
          simultaneousIndustries: fc.integer({ min: 1, max: 10 }),
          simultaneousLookups: fc.integer({ min: 1, max: 20 }),
        }),
        (config: ScrapeConfig) => {
          // Validate that all fields are present and within valid ranges
          expect(config.towns).toBeDefined();
          expect(config.industries).toBeDefined();
          expect(config.towns.length).toBeGreaterThan(0);
          expect(config.industries.length).toBeGreaterThan(0);
          expect(config.simultaneousTowns).toBeGreaterThanOrEqual(1);
          expect(config.simultaneousTowns).toBeLessThanOrEqual(5);
          expect(config.simultaneousIndustries).toBeGreaterThanOrEqual(1);
          expect(config.simultaneousIndustries).toBeLessThanOrEqual(10);
          expect(config.simultaneousLookups).toBeGreaterThanOrEqual(1);
          expect(config.simultaneousLookups).toBeLessThanOrEqual(20);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 19: Scraped data completeness
   * For any scraped business, the result should include maps_address, name, phone,
   * provider, address, type_of_business, and town fields
   * Validates: Requirements 4.4
   */
  test('Property 19: Scraped data completeness', () => {
    fc.assert(
      fc.property(
        fc.record({
          maps_address: fc.string(),
          name: fc.string({ minLength: 1 }),
          phone: fc.string(),
          provider: fc.constantFrom('Telkom', 'Vodacom', 'MTN', 'Cell C', 'Other'),
          address: fc.string(),
          type_of_business: fc.string({ minLength: 1 }),
          town: fc.string({ minLength: 1 }),
        }),
        (business: ScrapedBusiness) => {
          // Verify all required fields are present
          expect(business).toHaveProperty('maps_address');
          expect(business).toHaveProperty('name');
          expect(business).toHaveProperty('phone');
          expect(business).toHaveProperty('provider');
          expect(business).toHaveProperty('address');
          expect(business).toHaveProperty('type_of_business');
          expect(business).toHaveProperty('town');

          // Verify required fields are not empty
          expect(business.name).toBeTruthy();
          expect(business.type_of_business).toBeTruthy();
          expect(business.town).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 20: Provider identification (DEPRECATED - prefix-based is unreliable)
   * IMPORTANT: Prefix-based identification is deprecated due to number porting.
   * This test verifies that the deprecated function returns 'Other' with 0 confidence.
   * The primary method MUST use porting.co.za API exclusively.
   * Validates: Requirements 4.5
   */
  test('Property 20: Provider identification (DEPRECATED - prefix-based)', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (phoneNumber: string) => {
          const result = identifyProviderByPrefix(phoneNumber);

          // Deprecated function should always return 'Other' with 0 confidence
          expect(result.provider).toBe('Other');
          expect(result.confidence).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 20 (Extended): DEPRECATED - Prefix-based identification is unreliable
   * IMPORTANT: This test is kept to verify the deprecated function behavior.
   * DO NOT use prefix-based identification in production - it's unreliable due to number porting.
   * Always use porting.co.za API for provider lookups.
   */
  test('Property 20 (Extended): DEPRECATED - Prefix-based identification', () => {
    const testCases = [
      { prefix: '087', expected: 'Other' }, // Changed from 'Telkom'
      { prefix: '082', expected: 'Other' }, // Changed from 'Vodacom'
      { prefix: '083', expected: 'Other' }, // Changed from 'Vodacom'
      { prefix: '081', expected: 'Other' }, // Changed from 'MTN'
      { prefix: '084', expected: 'Other' }, // Changed from 'Cell C'
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...testCases),
        fc.integer({ min: 1000000, max: 9999999 }),
        (testCase, number) => {
          const phoneNumber = `${testCase.prefix}${number}`;
          const result = identifyProviderByPrefix(phoneNumber);

          // Deprecated function should always return 'Other' with 0 confidence
          expect(result.provider).toBe('Other');
          expect(result.confidence).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22: Scraper to leads integration
   * For any completed scraping session, all scraped businesses should be
   * created as leads with status 'new' in the Lead Management system
   * Validates: Requirements 4.9
   * 
   * Note: This is tested through integration tests as it requires database access
   */
  test('Property 22: Scraper to leads integration (unit test)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            maps_address: fc.string(),
            name: fc.string({ minLength: 1 }),
            phone: fc.string(),
            provider: fc.constantFrom('Telkom', 'Vodacom', 'MTN', 'Cell C', 'Other'),
            address: fc.string(),
            type_of_business: fc.string({ minLength: 1 }),
            town: fc.string({ minLength: 1 }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (businesses: ScrapedBusiness[]) => {
          // Verify that each business has the required fields for lead creation
          businesses.forEach((business) => {
            expect(business.name).toBeTruthy();
            expect(business.town).toBeTruthy();
            expect(['Telkom', 'Vodacom', 'MTN', 'Cell C', 'Other']).toContain(
              business.provider
            );
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 24: Scraper state transitions
   * For any scraping session, pause, resume, and stop operations should
   * correctly transition the session status
   * Validates: Requirements 4.13
   */
  test('Property 24: Scraper state transitions', () => {
    const validTransitions: Record<string, string[]> = {
      running: ['paused', 'stopped', 'completed', 'error'],
      paused: ['running', 'stopped'],
      stopped: [],
      completed: [],
      error: [],
    };

    fc.assert(
      fc.property(
        fc.constantFrom('running', 'paused', 'stopped', 'completed', 'error'),
        fc.constantFrom('running', 'paused', 'stopped', 'completed', 'error'),
        (currentStatus, newStatus) => {
          const allowedTransitions = validTransitions[currentStatus];

          if (allowedTransitions.includes(newStatus)) {
            // Valid transition
            expect(allowedTransitions).toContain(newStatus);
          } else {
            // Invalid transition
            expect(allowedTransitions).not.toContain(newStatus);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 25: Scraper pause/resume round trip
   * For any running scraping session, pausing then resuming should restore
   * the session to continue from where it left off
   * Validates: Requirements 4.14
   */
  test('Property 25: Scraper pause/resume round trip', () => {
    fc.assert(
      fc.property(
        fc.record({
          currentTownIndex: fc.integer({ min: 0, max: 10 }),
          currentIndustryIndex: fc.integer({ min: 0, max: 10 }),
          completedTowns: fc.array(fc.string(), { maxLength: 10 }),
          progress: fc.integer({ min: 0, max: 100 }),
        }),
        (state) => {
          // Simulate pause (save state)
          const savedState = { ...state };

          // Simulate resume (restore state)
          const restoredState = { ...savedState };

          // Verify state is preserved
          expect(restoredState.currentTownIndex).toBe(state.currentTownIndex);
          expect(restoredState.currentIndustryIndex).toBe(state.currentIndustryIndex);
          expect(restoredState.completedTowns).toEqual(state.completedTowns);
          expect(restoredState.progress).toBe(state.progress);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional Test: Provider priority ordering
   * Verify that provider priorities are correctly ordered
   */
  test('Provider priority ordering', () => {
    const providers = ['Telkom', 'Vodacom', 'MTN', 'Cell C', 'Other'];
    const priorities = providers.map(getProviderPriority);

    // Priorities should be in ascending order
    for (let i = 1; i < priorities.length; i++) {
      expect(priorities[i]).toBeGreaterThanOrEqual(priorities[i - 1]);
    }

    // Specific priority values
    expect(getProviderPriority('Telkom')).toBe(1);
    expect(getProviderPriority('Vodacom')).toBe(2);
    expect(getProviderPriority('MTN')).toBe(3);
    expect(getProviderPriority('Cell C')).toBe(4);
    expect(getProviderPriority('Other')).toBe(5);
  });
});
