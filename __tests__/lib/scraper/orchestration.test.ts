/**
 * Property-Based Tests for Orchestration Layer
 * 
 * Tests verify universal properties that should hold across all valid inputs
 * using fast-check for property-based testing with minimum 100 iterations.
 * 
 * Requirements: 1.1, 4.4, 4.6
 */

import * as fc from 'fast-check';
import { EventEmitter } from 'events';
import { ScrapingOrchestrator } from '../../../lib/scraper/scraping-orchestrator';
import { BrowserWorker } from '../../../lib/scraper/browser-worker';
import { ScrapeConfig, ScrapedBusiness } from '../../../lib/scraper/types';

// Mock puppeteer to avoid actual browser launches in tests
jest.mock('puppeteer', () => ({
  default: {
    launch: jest.fn().mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({
        goto: jest.fn(),
        waitForSelector: jest.fn(),
        waitForTimeout: jest.fn(),
        evaluate: jest.fn(),
        $: jest.fn(),
        setViewport: jest.fn(),
        setUserAgent: jest.fn(),
        close: jest.fn(),
      }),
      close: jest.fn(),
    }),
  },
}));

describe('Orchestration Layer - Property-Based Tests', () => {
  /**
   * Property 1: All town-industry combinations are scraped
   * 
   * **Validates: Requirements 1.1**
   * 
   * For any list of towns and list of industries, when scraping is initiated,
   * the system should attempt to scrape every possible town-industry combination
   * (cartesian product).
   * 
   * Note: This test verifies the orchestration logic without actual browser scraping.
   * We mock the scraping to verify that all combinations are attempted.
   */
  it('Property 1: All town-industry combinations are scraped', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        async (towns, industries) => {
          // Remove duplicates
          const uniqueTowns = [...new Set(towns)];
          const uniqueIndustries = [...new Set(industries)];

          if (uniqueTowns.length === 0 || uniqueIndustries.length === 0) {
            return true; // Skip empty cases
          }

          const eventEmitter = new EventEmitter();
          const config: ScrapeConfig = {
            towns: uniqueTowns,
            industries: uniqueIndustries,
            simultaneousTowns: 1, // Use 1 worker for predictable testing
            simultaneousIndustries: 1,
            simultaneousLookups: 1,
          };

          // Track which combinations were attempted
          const attemptedCombinations = new Set<string>();

          // Mock BrowserWorker.processTown to track combinations
          const originalProcessTown = BrowserWorker.prototype.processTown;
          BrowserWorker.prototype.processTown = jest.fn(async function(
            this: BrowserWorker,
            town: string,
            industriesParam: string[]
          ): Promise<ScrapedBusiness[]> {
            // Record each town-industry combination
            for (const industry of industriesParam) {
              attemptedCombinations.add(`${town}|${industry}`);
            }
            
            // Return mock businesses
            return industriesParam.map(industry => ({
              maps_address: `https://maps.google.com/?q=${town}+${industry}`,
              name: `Business in ${town}`,
              phone: '0123456789',
              provider: '',
              address: `${town} address`,
              type_of_business: industry,
              town: town,
            }));
          });

          try {
            const orchestrator = new ScrapingOrchestrator(
              uniqueTowns,
              uniqueIndustries,
              config,
              eventEmitter
            );

            // Start scraping (will use mocked processTown)
            await orchestrator.start();

            // Calculate expected combinations (cartesian product)
            const expectedCombinations = new Set<string>();
            for (const town of uniqueTowns) {
              for (const industry of uniqueIndustries) {
                expectedCombinations.add(`${town}|${industry}`);
              }
            }

            // Verify all combinations were attempted
            expect(attemptedCombinations.size).toBe(expectedCombinations.size);
            
            for (const expected of expectedCombinations) {
              expect(attemptedCombinations.has(expected)).toBe(true);
            }

            // Verify results contain businesses from all combinations
            const results = orchestrator.getResults();
            expect(results.length).toBeGreaterThanOrEqual(uniqueTowns.length * uniqueIndustries.length);

          } finally {
            // Restore original method
            BrowserWorker.prototype.processTown = originalProcessTown;
          }
        }
      ),
      { numRuns: 100, timeout: 30000 }
    );
  }, 60000);

  /**
   * Property 10: Provider lookups happen after scraping completes
   * 
   * **Validates: Requirements 4.4**
   * 
   * For any scraping session, provider lookups should only be performed
   * after all town-industry scraping is complete.
   * 
   * We verify this by tracking the order of operations.
   */
  it('Property 10: Provider lookups happen after scraping completes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
        async (towns, industries) => {
          // Remove duplicates
          const uniqueTowns = [...new Set(towns)];
          const uniqueIndustries = [...new Set(industries)];

          if (uniqueTowns.length === 0 || uniqueIndustries.length === 0) {
            return true; // Skip empty cases
          }

          const eventEmitter = new EventEmitter();
          const config: ScrapeConfig = {
            towns: uniqueTowns,
            industries: uniqueIndustries,
            simultaneousTowns: 1,
            simultaneousIndustries: 1,
            simultaneousLookups: 1,
          };

          // Track operation order
          const operations: Array<{ type: 'scrape' | 'provider_lookup'; timestamp: number }> = [];
          let scrapingComplete = false;

          // Mock BrowserWorker.processTown
          const originalProcessTown = BrowserWorker.prototype.processTown;
          BrowserWorker.prototype.processTown = jest.fn(async function(
            this: BrowserWorker,
            town: string,
            industriesParam: string[]
          ): Promise<ScrapedBusiness[]> {
            operations.push({ type: 'scrape', timestamp: Date.now() });
            
            // Small delay to simulate scraping
            await new Promise(resolve => setTimeout(resolve, 10));
            
            return industriesParam.map(industry => ({
              maps_address: `https://maps.google.com/?q=${town}+${industry}`,
              name: `Business in ${town}`,
              phone: '0123456789',
              provider: '',
              address: `${town} address`,
              type_of_business: industry,
              town: town,
            }));
          });

          // Mock ProviderLookupService
          const ProviderLookupService = require('../../../lib/scraper/provider-lookup-service').ProviderLookupService;
          const originalLookupProviders = ProviderLookupService.prototype.lookupProviders;
          ProviderLookupService.prototype.lookupProviders = jest.fn(async function(
            phoneNumbers: string[]
          ): Promise<Map<string, string>> {
            // Record that provider lookup happened
            operations.push({ type: 'provider_lookup', timestamp: Date.now() });
            
            // Verify scraping is complete
            expect(scrapingComplete).toBe(true);
            
            // Return mock results
            const results = new Map<string, string>();
            for (const phone of phoneNumbers) {
              results.set(phone, 'Telkom');
            }
            return results;
          });

          try {
            const orchestrator = new ScrapingOrchestrator(
              uniqueTowns,
              uniqueIndustries,
              config,
              eventEmitter
            );

            // Listen for completion to mark scraping as done
            eventEmitter.on('complete', () => {
              scrapingComplete = true;
            });

            await orchestrator.start();

            // Verify operation order: all scrapes should come before provider lookups
            const scrapeOperations = operations.filter(op => op.type === 'scrape');
            const providerOperations = operations.filter(op => op.type === 'provider_lookup');

            if (providerOperations.length > 0) {
              // Last scrape should happen before first provider lookup
              const lastScrapeTime = Math.max(...scrapeOperations.map(op => op.timestamp));
              const firstProviderTime = Math.min(...providerOperations.map(op => op.timestamp));
              
              expect(lastScrapeTime).toBeLessThanOrEqual(firstProviderTime);
            }

            // Verify all scraping happened (one per town)
            expect(scrapeOperations.length).toBe(uniqueTowns.length);

          } finally {
            // Restore original methods
            BrowserWorker.prototype.processTown = originalProcessTown;
            ProviderLookupService.prototype.lookupProviders = originalLookupProviders;
          }
        }
      ),
      { numRuns: 100, timeout: 30000 }
    );
  }, 60000);

  /**
   * Property 11: Progress values are within valid ranges
   * 
   * **Validates: Requirements 4.6**
   * 
   * For any progress state, the following should hold:
   * (1) completedTowns <= totalTowns
   * (2) completedIndustries <= totalIndustries
   * (3) progress percentage should be between 0 and 100
   */
  it('Property 11: Progress values are within valid ranges', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        async (towns, industries) => {
          // Remove duplicates
          const uniqueTowns = [...new Set(towns)];
          const uniqueIndustries = [...new Set(industries)];

          if (uniqueTowns.length === 0 || uniqueIndustries.length === 0) {
            return true; // Skip empty cases
          }

          const eventEmitter = new EventEmitter();
          const config: ScrapeConfig = {
            towns: uniqueTowns,
            industries: uniqueIndustries,
            simultaneousTowns: 1,
            simultaneousIndustries: 1,
            simultaneousLookups: 1,
          };

          // Track all progress events
          const progressEvents: Array<{
            percentage: number;
            completedTowns: number;
            totalTowns: number;
            townsRemaining: number;
          }> = [];

          eventEmitter.on('progress', (progress) => {
            progressEvents.push(progress);
          });

          // Mock BrowserWorker.processTown
          const originalProcessTown = BrowserWorker.prototype.processTown;
          BrowserWorker.prototype.processTown = jest.fn(async function(
            this: BrowserWorker,
            town: string,
            industriesParam: string[]
          ): Promise<ScrapedBusiness[]> {
            await new Promise(resolve => setTimeout(resolve, 10));
            
            return industriesParam.map(industry => ({
              maps_address: `https://maps.google.com/?q=${town}+${industry}`,
              name: `Business in ${town}`,
              phone: '0123456789',
              provider: '',
              address: `${town} address`,
              type_of_business: industry,
              town: town,
            }));
          });

          try {
            const orchestrator = new ScrapingOrchestrator(
              uniqueTowns,
              uniqueIndustries,
              config,
              eventEmitter
            );

            await orchestrator.start();

            // Get final progress state
            const finalProgress = orchestrator.getProgress();

            // Verify final progress constraints
            // (1) completedTowns <= totalTowns
            expect(finalProgress.completedTowns).toBeLessThanOrEqual(finalProgress.totalTowns);
            expect(finalProgress.completedTowns).toBeGreaterThanOrEqual(0);

            // (2) completedIndustries <= totalIndustries
            expect(finalProgress.completedIndustries).toBeLessThanOrEqual(finalProgress.totalIndustries);
            expect(finalProgress.completedIndustries).toBeGreaterThanOrEqual(0);

            // (3) Verify all progress events had valid percentages
            for (const event of progressEvents) {
              expect(event.percentage).toBeGreaterThanOrEqual(0);
              expect(event.percentage).toBeLessThanOrEqual(100);

              // Verify completedTowns <= totalTowns
              expect(event.completedTowns).toBeLessThanOrEqual(event.totalTowns);
              expect(event.completedTowns).toBeGreaterThanOrEqual(0);

              // Verify townsRemaining is consistent
              expect(event.townsRemaining).toBe(event.totalTowns - event.completedTowns);
              expect(event.townsRemaining).toBeGreaterThanOrEqual(0);
            }

            // Verify progress increases monotonically
            for (let i = 1; i < progressEvents.length; i++) {
              expect(progressEvents[i].completedTowns).toBeGreaterThanOrEqual(
                progressEvents[i - 1].completedTowns
              );
            }

            // Verify final state shows completion
            if (progressEvents.length > 0) {
              const lastEvent = progressEvents[progressEvents.length - 1];
              expect(lastEvent.completedTowns).toBe(uniqueTowns.length);
              expect(lastEvent.percentage).toBe(100);
            }

          } finally {
            // Restore original method
            BrowserWorker.prototype.processTown = originalProcessTown;
          }
        }
      ),
      { numRuns: 100, timeout: 30000 }
    );
  }, 60000);

  /**
   * Additional property: Worker count matches configuration
   * 
   * For any configuration, the number of workers created should match
   * the simultaneousTowns setting.
   */
  it('Property: Worker count matches configuration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // simultaneousTowns
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
        async (simultaneousTowns, towns, industries) => {
          const uniqueTowns = [...new Set(towns)];
          const uniqueIndustries = [...new Set(industries)];

          if (uniqueTowns.length === 0 || uniqueIndustries.length === 0) {
            return true;
          }

          const eventEmitter = new EventEmitter();
          const config: ScrapeConfig = {
            towns: uniqueTowns,
            industries: uniqueIndustries,
            simultaneousTowns,
            simultaneousIndustries: 1,
            simultaneousLookups: 1,
          };

          // Track worker IDs
          const workerIds = new Set<number>();

          const originalProcessTown = BrowserWorker.prototype.processTown;
          BrowserWorker.prototype.processTown = jest.fn(async function(
            this: BrowserWorker,
            town: string,
            industriesParam: string[]
          ): Promise<ScrapedBusiness[]> {
            workerIds.add(this.getWorkerId());
            await new Promise(resolve => setTimeout(resolve, 10));
            
            return industriesParam.map(industry => ({
              maps_address: '',
              name: `Business`,
              phone: '',
              provider: '',
              address: '',
              type_of_business: industry,
              town: town,
            }));
          });

          try {
            const orchestrator = new ScrapingOrchestrator(
              uniqueTowns,
              uniqueIndustries,
              config,
              eventEmitter
            );

            await orchestrator.start();

            // Number of workers used should be min(simultaneousTowns, number of towns)
            const expectedWorkers = Math.min(simultaneousTowns, uniqueTowns.length);
            expect(workerIds.size).toBeLessThanOrEqual(expectedWorkers);

          } finally {
            BrowserWorker.prototype.processTown = originalProcessTown;
          }
        }
      ),
      { numRuns: 100, timeout: 30000 }
    );
  }, 60000);

  /**
   * Additional property: All businesses have required town and industry fields
   * 
   * For any scraping session, all returned businesses should have the town
   * and type_of_business fields populated correctly.
   */
  it('Property: All businesses have required town and industry fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
        async (towns, industries) => {
          const uniqueTowns = [...new Set(towns)];
          const uniqueIndustries = [...new Set(industries)];

          if (uniqueTowns.length === 0 || uniqueIndustries.length === 0) {
            return true;
          }

          const eventEmitter = new EventEmitter();
          const config: ScrapeConfig = {
            towns: uniqueTowns,
            industries: uniqueIndustries,
            simultaneousTowns: 1,
            simultaneousIndustries: 1,
            simultaneousLookups: 1,
          };

          const originalProcessTown = BrowserWorker.prototype.processTown;
          BrowserWorker.prototype.processTown = jest.fn(async function(
            this: BrowserWorker,
            town: string,
            industriesParam: string[]
          ): Promise<ScrapedBusiness[]> {
            return industriesParam.map(industry => ({
              maps_address: '',
              name: `Business in ${town}`,
              phone: '',
              provider: '',
              address: '',
              type_of_business: industry,
              town: town,
            }));
          });

          try {
            const orchestrator = new ScrapingOrchestrator(
              uniqueTowns,
              uniqueIndustries,
              config,
              eventEmitter
            );

            await orchestrator.start();

            const results = orchestrator.getResults();

            // All businesses should have town and type_of_business
            for (const business of results) {
              expect(business.town).toBeDefined();
              expect(business.town.length).toBeGreaterThan(0);
              expect(uniqueTowns).toContain(business.town);

              expect(business.type_of_business).toBeDefined();
              expect(business.type_of_business.length).toBeGreaterThan(0);
              expect(uniqueIndustries).toContain(business.type_of_business);
            }

          } finally {
            BrowserWorker.prototype.processTown = originalProcessTown;
          }
        }
      ),
      { numRuns: 100, timeout: 30000 }
    );
  }, 60000);
});
