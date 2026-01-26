/**
 * Integration Tests for Scraper System
 * 
 * These tests verify end-to-end workflows including:
 * - Full scraping session with database persistence
 * - Session pause and resume functionality
 * - Error recovery and graceful degradation
 * - Concurrent operations without race conditions
 * 
 * Tests use mocking to avoid actual browser launches while still
 * testing the integration between components.
 */

import { EventEmitter } from 'events';
import { ScrapingOrchestrator } from '../../lib/scraper/scraping-orchestrator';
import { BrowserWorker } from '../../lib/scraper/browser-worker';
import { ProviderLookupService } from '../../lib/scraper/provider-lookup-service';
import { ScrapeConfig, ScrapedBusiness } from '../../lib/scraper/types';
import { v4 as uuidv4 } from 'uuid';

// Mock puppeteer to avoid actual browser launches
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

// Mock database pool
const mockPool = {
  query: jest.fn(),
  end: jest.fn(),
};

jest.mock('../../lib/db', () => ({
  pool: mockPool,
}));

describe('Scraper Integration Tests', () => {
  let testUserId: string;
  const mockSessions: Map<string, any> = new Map();
  const mockBusinesses: Map<string, any[]> = new Map();
  const mockLeads: any[] = [];

  beforeAll(() => {
    testUserId = uuidv4();
    
    // Setup mock database responses
    mockPool.query.mockImplementation((query: string, params?: any[]) => {
      // INSERT INTO scraping_sessions
      if (query.includes('INSERT INTO scraping_sessions')) {
        const sessionId = params![0];
        mockSessions.set(sessionId, {
          id: sessionId,
          user_id: params![1],
          name: params![2],
          config: params![3],
          status: params![4],
          progress: params![5],
          summary: params![6] || null,
          state: params![7] || params![6], // Handle both 7 and 6 param versions
        });
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      
      // INSERT INTO scraped_businesses
      if (query.includes('INSERT INTO scraped_businesses')) {
        const sessionId = params![1];
        if (!mockBusinesses.has(sessionId)) {
          mockBusinesses.set(sessionId, []);
        }
        mockBusinesses.get(sessionId)!.push({
          id: params![0],
          session_id: sessionId,
          maps_address: params![2],
          name: params![3],
          phone: params![4],
          provider: params![5],
          address: params![6],
          town: params![7],
          type_of_business: params![8],
        });
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      
      // SELECT FROM scraping_sessions
      if (query.includes('SELECT * FROM scraping_sessions WHERE id')) {
        const sessionId = params![0];
        const session = mockSessions.get(sessionId);
        return Promise.resolve({ rows: session ? [session] : [], rowCount: session ? 1 : 0 });
      }
      
      // SELECT FROM scraped_businesses
      if (query.includes('SELECT * FROM scraped_businesses WHERE session_id')) {
        const sessionId = params![0];
        const businesses = mockBusinesses.get(sessionId) || [];
        return Promise.resolve({ rows: businesses, rowCount: businesses.length });
      }
      
      // UPDATE scraping_sessions
      if (query.includes('UPDATE scraping_sessions')) {
        const sessionId = params![2];
        const session = mockSessions.get(sessionId);
        if (session) {
          session.status = params![0];
          session.progress = params![1];
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      
      // INSERT INTO leads
      if (query.includes('INSERT INTO leads')) {
        mockLeads.push({
          id: params![0],
          number: params![1],
          name: params![2],
          phone: params![3],
          address: params![4],
          town: params![5],
          status: params![6],
          created_by: params![7],
        });
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      
      // SELECT FROM leads (check existing)
      if (query.includes('SELECT * FROM leads WHERE phone')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      
      // SELECT MAX(number) FROM leads
      if (query.includes('SELECT MAX(number)')) {
        const maxNum = mockLeads.length > 0 ? Math.max(...mockLeads.map(l => l.number)) : 0;
        return Promise.resolve({ rows: [{ max_num: maxNum }], rowCount: 1 });
      }
      
      // SELECT FROM leads (verify created)
      if (query.includes('SELECT * FROM leads WHERE created_by')) {
        const leads = mockLeads.filter(l => l.created_by === params![0]);
        return Promise.resolve({ rows: leads, rowCount: leads.length });
      }
      
      // DELETE queries (cleanup)
      if (query.includes('DELETE FROM')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
  });

  beforeEach(() => {
    // Clear mock data before each test
    mockSessions.clear();
    mockBusinesses.clear();
    mockLeads.length = 0;
    mockPool.query.mockClear();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  /**
   * Integration Test 16.1: Full Scraping Session
   * 
   * Tests the complete workflow:
   * 1. Start session with multiple towns and industries
   * 2. Verify progress events emitted correctly
   * 3. Verify all businesses collected
   * 4. Verify provider lookups performed
   * 5. Verify session saved to database
   * 6. Verify leads created from businesses
   */
  describe('16.1 Full Scraping Session', () => {
    it('should complete full scraping workflow with database persistence', async () => {
      const towns = ['Cape Town', 'Johannesburg'];
      const industries = ['Restaurant', 'Hotel'];
      const eventEmitter = new EventEmitter();
      
      const config: ScrapeConfig = {
        towns,
        industries,
        simultaneousTowns: 2,
        simultaneousIndustries: 1,
        simultaneousLookups: 1,
      };

      // Track progress events
      const progressEvents: any[] = [];
      eventEmitter.on('progress', (progress) => {
        progressEvents.push(progress);
      });

      // Track completion
      let completionEvent: any = null;
      eventEmitter.on('complete', (data) => {
        completionEvent = data;
      });

      // Mock BrowserWorker.processTown to return mock businesses
      const originalProcessTown = BrowserWorker.prototype.processTown;
      BrowserWorker.prototype.processTown = jest.fn(async function(
        this: BrowserWorker,
        town: string,
        industriesParam: string[]
      ): Promise<ScrapedBusiness[]> {
        // Simulate scraping delay
        await new Promise(resolve => setTimeout(resolve, 50));
        
        return industriesParam.map((industry, idx) => ({
          maps_address: `https://maps.google.com/?q=${town}+${industry}`,
          name: `${industry} Business ${idx + 1} in ${town}`,
          phone: `012345678${idx}`,
          provider: '',
          address: `${idx + 1} Main St, ${town}`,
          type_of_business: industry,
          town: town,
        }));
      });

      // Mock ProviderLookupService to return mock providers
      const originalLookupProviders = ProviderLookupService.prototype.lookupProviders;
      ProviderLookupService.prototype.lookupProviders = jest.fn(async function(
        phoneNumbers: string[]
      ): Promise<Map<string, string>> {
        const results = new Map<string, string>();
        phoneNumbers.forEach((phone, idx) => {
          const providers = ['Telkom', 'Vodacom', 'MTN', 'Cell C'];
          results.set(phone, providers[idx % providers.length]);
        });
        return results;
      });

      try {
        // Create orchestrator and start scraping
        const orchestrator = new ScrapingOrchestrator(
          towns,
          industries,
          config,
          eventEmitter
        );

        await orchestrator.start();

        // Verify progress events were emitted
        expect(progressEvents.length).toBeGreaterThan(0);
        
        // Verify progress values are valid
        progressEvents.forEach(event => {
          expect(event.percentage).toBeGreaterThanOrEqual(0);
          expect(event.percentage).toBeLessThanOrEqual(100);
          expect(event.completedTowns).toBeLessThanOrEqual(event.totalTowns);
        });

        // Verify final progress shows completion
        const lastProgress = progressEvents[progressEvents.length - 1];
        expect(lastProgress.percentage).toBe(100);
        expect(lastProgress.completedTowns).toBe(towns.length);

        // Verify completion event was emitted
        expect(completionEvent).not.toBeNull();
        expect(completionEvent.businesses).toBeDefined();
        expect(completionEvent.summary).toBeDefined();

        // Verify all businesses were collected
        const results = orchestrator.getResults();
        expect(results.length).toBe(towns.length * industries.length);

        // Verify each business has required fields
        results.forEach(business => {
          expect(business.name).toBeTruthy();
          expect(business.town).toBeTruthy();
          expect(business.type_of_business).toBeTruthy();
          expect(towns).toContain(business.town);
          expect(industries).toContain(business.type_of_business);
        });

        // Verify provider lookups were performed
        const businessesWithProviders = results.filter(b => b.provider && b.provider !== '');
        expect(businessesWithProviders.length).toBeGreaterThan(0);

        // Save session to database
        const sessionId = uuidv4();
        const sessionName = 'Test Integration Session';
        const { pool } = require('../../lib/db');
        
        await pool.query(
          `INSERT INTO scraping_sessions (id, user_id, name, config, status, progress, summary, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [
            sessionId,
            testUserId,
            sessionName,
            JSON.stringify(config),
            'completed',
            100,
            JSON.stringify(orchestrator.getLoggingManager().getSummary()),
          ]
        );

        // Save businesses to database
        for (const business of results) {
          await pool.query(
            `INSERT INTO scraped_businesses (id, session_id, maps_address, name, phone, provider, address, town, type_of_business, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
            [
              uuidv4(),
              sessionId,
              business.maps_address,
              business.name,
              business.phone,
              business.provider,
              business.address,
              business.town,
              business.type_of_business,
            ]
          );
        }

        // Verify session was saved
        const savedSessionResult = await pool.query(
          'SELECT * FROM scraping_sessions WHERE id = $1',
          [sessionId]
        );
        const savedSession = savedSessionResult.rows[0];
        expect(savedSession).toBeDefined();
        expect(savedSession.name).toBe(sessionName);
        expect(savedSession.status).toBe('completed');
        expect(savedSession.progress).toBe(100);

        // Verify businesses were saved
        const savedBusinessesResult = await pool.query(
          'SELECT * FROM scraped_businesses WHERE session_id = $1',
          [sessionId]
        );
        expect(savedBusinessesResult.rows.length).toBe(results.length);

        // Verify leads were created (mock lead creation)
        // In real implementation, this would be done by the API endpoint
        for (const business of results.slice(0, 2)) { // Create leads for first 2 businesses
          // Check if lead exists
          const existingLeadResult = await pool.query(
            'SELECT * FROM leads WHERE phone = $1 OR (name = $2 AND town = $3)',
            [business.phone, business.name, business.town]
          );

          if (existingLeadResult.rows.length === 0) {
            // Get next number for "new" status
            const maxNumberResult = await pool.query(
              'SELECT MAX(number) as max_num FROM leads WHERE status = $1',
              ['new']
            );
            const nextNumber = (maxNumberResult.rows[0]?.max_num || 0) + 1;

            await pool.query(
              `INSERT INTO leads (id, number, name, phone, address, town, status, created_by, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
              [
                uuidv4(),
                nextNumber,
                business.name,
                business.phone,
                business.address,
                business.town,
                'new',
                testUserId,
              ]
            );
          }
        }

        // Verify leads were created
        const createdLeadsResult = await pool.query(
          'SELECT * FROM leads WHERE created_by = $1 AND town IN ($2, $3)',
          [testUserId, towns[0], towns[1]]
        );
        expect(createdLeadsResult.rows.length).toBeGreaterThanOrEqual(2);

      } finally {
        // Restore original methods
        BrowserWorker.prototype.processTown = originalProcessTown;
        ProviderLookupService.prototype.lookupProviders = originalLookupProviders;
      }
    }, 30000);
  });

  /**
   * Integration Test 16.2: Session Resume
   * 
   * Tests pause and resume functionality:
   * 1. Start session, pause after first town
   * 2. Verify state saved correctly
   * 3. Resume session
   * 4. Verify scraping continues from saved state
   */
  describe('16.2 Session Resume', () => {
    it('should pause and resume scraping session correctly', async () => {
      const towns = ['Durban', 'Pretoria', 'Port Elizabeth'];
      const industries = ['Cafe', 'Bakery'];
      const eventEmitter = new EventEmitter();
      
      const config: ScrapeConfig = {
        towns,
        industries,
        simultaneousTowns: 1, // Use 1 worker for predictable pausing
        simultaneousIndustries: 1,
        simultaneousLookups: 1,
      };

      let townsProcessed = 0;

      // Mock BrowserWorker.processTown
      const originalProcessTown = BrowserWorker.prototype.processTown;
      BrowserWorker.prototype.processTown = jest.fn(async function(
        this: BrowserWorker,
        town: string,
        industriesParam: string[]
      ): Promise<ScrapedBusiness[]> {
        townsProcessed++;
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return industriesParam.map((industry, idx) => ({
          maps_address: `https://maps.google.com/?q=${town}+${industry}`,
          name: `${industry} in ${town}`,
          phone: `01234567${townsProcessed}${idx}`,
          provider: '',
          address: `${town} address`,
          type_of_business: industry,
          town: town,
        }));
      });

      try {
        // Create orchestrator
        const orchestrator = new ScrapingOrchestrator(
          towns,
          industries,
          config,
          eventEmitter
        );

        // Start scraping in background
        const scrapePromise = orchestrator.start();

        // Wait for first town to complete
        await new Promise(resolve => setTimeout(resolve, 200));

        // Pause scraping
        orchestrator.pause();
        expect(orchestrator.getStatus()).toBe('paused');

        // Get current progress
        const pausedProgress = orchestrator.getProgress();
        const pausedResults = orchestrator.getResults();
        
        expect(pausedProgress.completedTowns).toBeGreaterThan(0);
        expect(pausedProgress.completedTowns).toBeLessThan(towns.length);
        expect(pausedResults.length).toBeGreaterThan(0);

        // Save state to database
        const sessionId = uuidv4();
        const state = {
          currentTownIndex: pausedProgress.completedTowns,
          completedTowns: pausedProgress.completedTowns,
          results: pausedResults,
        };
        const { pool } = require('../../lib/db');

        await pool.query(
          `INSERT INTO scraping_sessions (id, user_id, name, config, status, progress, state, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [
            sessionId,
            testUserId,
            'Paused Session',
            JSON.stringify(config),
            'paused',
            Math.round((pausedProgress.completedTowns / pausedProgress.totalTowns) * 100),
            JSON.stringify(state),
          ]
        );

        // Verify state was saved
        const savedSessionResult = await pool.query(
          'SELECT * FROM scraping_sessions WHERE id = $1',
          [sessionId]
        );
        const savedSession = savedSessionResult.rows[0];
        expect(savedSession).toBeDefined();
        expect(savedSession.status).toBe('paused');
        
        const savedState = JSON.parse(savedSession.state);
        expect(savedState.completedTowns).toBe(pausedProgress.completedTowns);

        // Resume scraping
        orchestrator.resume();
        expect(orchestrator.getStatus()).toBe('running');

        // Wait for completion
        await scrapePromise;

        // Verify all towns were processed
        const finalProgress = orchestrator.getProgress();
        expect(finalProgress.completedTowns).toBe(towns.length);
        expect(finalProgress.completedTowns).toBe(finalProgress.totalTowns);

        // Verify all businesses were collected
        const finalResults = orchestrator.getResults();
        expect(finalResults.length).toBe(towns.length * industries.length);

        // Update session status
        await pool.query(
          'UPDATE scraping_sessions SET status = $1, progress = $2, updated_at = NOW() WHERE id = $3',
          ['completed', 100, sessionId]
        );

        // Verify final state
        const completedSessionResult = await pool.query(
          'SELECT * FROM scraping_sessions WHERE id = $1',
          [sessionId]
        );
        const completedSession = completedSessionResult.rows[0];
        expect(completedSession.status).toBe('completed');
        expect(completedSession.progress).toBe(100);

      } finally {
        BrowserWorker.prototype.processTown = originalProcessTown;
      }
    }, 30000);
  });

  /**
   * Integration Test 16.3: Error Recovery
   * 
   * Tests error handling and recovery:
   * 1. Simulate browser crash during scraping
   * 2. Verify worker recovers and continues
   * 3. Verify partial results preserved
   */
  describe('16.3 Error Recovery', () => {
    it('should recover from browser crashes and continue scraping', async () => {
      const towns = ['Bloemfontein', 'Kimberley', 'Polokwane'];
      const industries = ['Gym', 'Spa'];
      const eventEmitter = new EventEmitter();
      
      const config: ScrapeConfig = {
        towns,
        industries,
        simultaneousTowns: 1,
        simultaneousIndustries: 1,
        simultaneousLookups: 1,
      };

      let callCount = 0;
      const errorLogs: string[] = [];

      // Listen for log events from LoggingManager
      eventEmitter.on('log', (log) => {
        if (log.level === 'error') {
          errorLogs.push(log.message);
        }
      });

      // Mock BrowserWorker.processTown to fail on second town
      const originalProcessTown = BrowserWorker.prototype.processTown;
      BrowserWorker.prototype.processTown = jest.fn(async function(
        this: BrowserWorker,
        town: string,
        industriesParam: string[]
      ): Promise<ScrapedBusiness[]> {
        callCount++;
        
        // Simulate crash on second town
        if (callCount === 2) {
          throw new Error('Browser crashed');
        }

        await new Promise(resolve => setTimeout(resolve, 50));
        
        return industriesParam.map((industry, idx) => ({
          maps_address: `https://maps.google.com/?q=${town}+${industry}`,
          name: `${industry} in ${town}`,
          phone: `01234567${callCount}${idx}`,
          provider: '',
          address: `${town} address`,
          type_of_business: industry,
          town: town,
        }));
      });

      try {
        const orchestrator = new ScrapingOrchestrator(
          towns,
          industries,
          config,
          eventEmitter
        );

        await orchestrator.start();

        // Verify error was logged
        expect(errorLogs.length).toBeGreaterThan(0);

        // Verify partial results were preserved
        const results = orchestrator.getResults();
        expect(results.length).toBeGreaterThan(0);
        expect(results.length).toBeLessThan(towns.length * industries.length);

        // Verify successful towns were processed
        const processedTowns = [...new Set(results.map(b => b.town))];
        expect(processedTowns.length).toBeGreaterThan(0);

        // Verify each business has valid data
        results.forEach(business => {
          expect(business.name).toBeTruthy();
          expect(business.town).toBeTruthy();
          expect(business.type_of_business).toBeTruthy();
        });

        // Verify summary includes error count
        const summary = orchestrator.getLoggingManager().getSummary();
        expect(summary.totalErrors).toBeGreaterThan(0);

      } finally {
        BrowserWorker.prototype.processTown = originalProcessTown;
      }
    }, 30000);
  });

  /**
   * Integration Test 16.4: Concurrency
   * 
   * Tests concurrent operations:
   * 1. Test with multiple simultaneous towns
   * 2. Test with multiple simultaneous industries
   * 3. Verify no race conditions or data corruption
   */
  describe('16.4 Concurrency', () => {
    it('should handle concurrent operations without race conditions', async () => {
      const towns = ['East London', 'George', 'Nelspruit', 'Pietermaritzburg'];
      const industries = ['Pharmacy', 'Clinic', 'Hospital'];
      const eventEmitter = new EventEmitter();
      
      const config: ScrapeConfig = {
        towns,
        industries,
        simultaneousTowns: 3, // Multiple workers
        simultaneousIndustries: 2, // Multiple industries per worker
        simultaneousLookups: 2,
      };

      // Track concurrent operations
      const activeTowns = new Set<string>();
      const activeIndustries = new Set<string>();
      let maxConcurrentTowns = 0;
      let maxConcurrentIndustries = 0;

      // Mock BrowserWorker.processTown
      const originalProcessTown = BrowserWorker.prototype.processTown;
      BrowserWorker.prototype.processTown = jest.fn(async function(
        this: BrowserWorker,
        town: string,
        industriesParam: string[]
      ): Promise<ScrapedBusiness[]> {
        // Track concurrent town processing
        activeTowns.add(town);
        maxConcurrentTowns = Math.max(maxConcurrentTowns, activeTowns.size);

        // Process industries with concurrency
        const results: ScrapedBusiness[] = [];
        
        for (const industry of industriesParam) {
          activeIndustries.add(`${town}|${industry}`);
          maxConcurrentIndustries = Math.max(maxConcurrentIndustries, activeIndustries.size);

          await new Promise(resolve => setTimeout(resolve, 50));

          results.push({
            maps_address: `https://maps.google.com/?q=${town}+${industry}`,
            name: `${industry} in ${town}`,
            phone: `0123456789`,
            provider: '',
            address: `${town} address`,
            type_of_business: industry,
            town: town,
          });

          activeIndustries.delete(`${town}|${industry}`);
        }

        activeTowns.delete(town);
        return results;
      });

      try {
        const orchestrator = new ScrapingOrchestrator(
          towns,
          industries,
          config,
          eventEmitter
        );

        await orchestrator.start();

        // Verify concurrency was used
        expect(maxConcurrentTowns).toBeGreaterThan(1);
        expect(maxConcurrentTowns).toBeLessThanOrEqual(config.simultaneousTowns);

        // Verify all businesses were collected
        const results = orchestrator.getResults();
        expect(results.length).toBe(towns.length * industries.length);

        // Verify no data corruption - each town-industry combination should appear exactly once
        const combinations = new Map<string, number>();
        results.forEach(business => {
          const key = `${business.town}|${business.type_of_business}`;
          combinations.set(key, (combinations.get(key) || 0) + 1);
        });

        // Each combination should appear exactly once
        combinations.forEach((count, key) => {
          expect(count).toBe(1);
        });

        // Verify all expected combinations are present
        expect(combinations.size).toBe(towns.length * industries.length);

        // Verify each town appears correct number of times
        const townCounts = new Map<string, number>();
        results.forEach(business => {
          townCounts.set(business.town, (townCounts.get(business.town) || 0) + 1);
        });

        towns.forEach(town => {
          expect(townCounts.get(town)).toBe(industries.length);
        });

        // Verify each industry appears correct number of times
        const industryCounts = new Map<string, number>();
        results.forEach(business => {
          industryCounts.set(business.type_of_business, (industryCounts.get(business.type_of_business) || 0) + 1);
        });

        industries.forEach(industry => {
          expect(industryCounts.get(industry)).toBe(towns.length);
        });

      } finally {
        BrowserWorker.prototype.processTown = originalProcessTown;
      }
    }, 30000);
  });
});
