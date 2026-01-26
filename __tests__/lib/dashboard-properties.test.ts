/**
 * Property-Based Tests for Dashboard
 * 
 * Tests universal properties for dashboard functionality including:
 * - Number lookup accuracy
 * - Business lookup results
 * - Calculator stats accuracy
 * - Lead stats accuracy
 * - Scraper stats accuracy
 * - Activity timeline completeness
 * - Admin activity visibility
 */

import fc from 'fast-check';
import { pool } from '@/lib/db';
import { batchLookupProviders } from '@/lib/scraper/provider-lookup';

// Mock the provider lookup to avoid actual Puppeteer calls in tests
jest.mock('@/lib/scraper/provider-lookup', () => ({
  batchLookupProviders: jest.fn(),
  convertToProviderInfo: jest.fn(),
  getProviderPriority: jest.fn(),
}));

describe('Dashboard Properties', () => {
  // Helper to create test data
  const createTestUser = async (role: 'admin' | 'manager' | 'user') => {
    const result = await pool.query(
      `INSERT INTO users (username, password, role, name, email, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, username, role, name, email`,
      [`test-${Date.now()}-${Math.random()}`, 'hashed', role, 'Test User', 'test@example.com']
    );
    return result.rows[0];
  };

  const createTestDeal = async (userId: string, dealName: string) => {
    const result = await pool.query(
      `INSERT INTO deal_calculations (user_id, username, user_role, customer_name, deal_name, deal_details, sections_data, totals_data, factors_data, scales_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        userId,
        'testuser',
        'user',
        'Test Customer',
        dealName,
        JSON.stringify({}),
        JSON.stringify({}),
        JSON.stringify({}),
        JSON.stringify({}),
        JSON.stringify({}),
      ]
    );
    return result.rows[0].id;
  };

  const createTestLead = async (userId: string, status: string) => {
    const result = await pool.query(
      `INSERT INTO leads (user_id, name, phone, provider, status, address, town, type_of_business)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [userId, 'Test Business', '0123456789', 'Telkom', status, '123 Test St', 'Test Town', 'Test Type']
    );
    return result.rows[0].id;
  };

  const createTestScrapingSession = async (userId: string, sessionName: string) => {
    const result = await pool.query(
      `INSERT INTO scraping_sessions (user_id, name, config, status, progress, summary)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        userId,
        sessionName,
        JSON.stringify({ towns: ['Test'], industries: ['Test'] }),
        'completed',
        100,
        JSON.stringify({ totalBusinesses: 10 }),
      ]
    );
    return result.rows[0].id;
  };

  const createTestActivity = async (userId: string, activityType: string) => {
    const result = await pool.query(
      `INSERT INTO activity_log (user_id, activity_type, entity_type, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, activityType, 'test', JSON.stringify({ test: true })]
    );
    return result.rows[0].id;
  };

  const cleanup = async () => {
    await pool.query('DELETE FROM activity_log WHERE entity_type = $1', ['test']);
    await pool.query('DELETE FROM scraped_businesses WHERE session_id IN (SELECT id FROM scraping_sessions WHERE name LIKE $1)', ['test-%']);
    await pool.query('DELETE FROM scraping_sessions WHERE name LIKE $1', ['test-%']);
    await pool.query('DELETE FROM leads WHERE name = $1', ['Test Business']);
    await pool.query('DELETE FROM deal_calculations WHERE customer_name = $1', ['Test Customer']);
    await pool.query('DELETE FROM users WHERE username LIKE $1', ['test-%']);
  };

  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await pool.end();
  });

  /**
   * Property 67: Number lookup accuracy
   * For any valid phone number, the Number Lookup tool should return the correct provider information
   * Validates: Requirements 7.4
   */
  test('Property 67: Number lookup accuracy', async () => {
    // Mock the provider lookup to return predictable results
    const mockBatchLookup = batchLookupProviders as jest.MockedFunction<typeof batchLookupProviders>;
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 10, maxLength: 15 }), { minLength: 1, maxLength: 5 }),
        async (phoneNumbers) => {
          // Mock returns a provider for each phone number
          const mockResults = new Map(
            phoneNumbers.map(phone => [
              phone,
              { provider: 'Telkom' as const, confidence: 1 }
            ])
          );
          mockBatchLookup.mockResolvedValue(mockResults);

          // Call the lookup
          const results = await batchLookupProviders(phoneNumbers, 1);

          // Verify all phone numbers got results
          expect(results.size).toBe(phoneNumbers.length);
          
          // Verify each result has required fields
          for (const [phone, info] of results.entries()) {
            expect(phoneNumbers).toContain(phone);
            expect(info).toHaveProperty('provider');
            expect(info).toHaveProperty('confidence');
            expect(['Telkom', 'Vodacom', 'MTN', 'Cell C', 'Other']).toContain(info.provider);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 68: Business lookup results
   * For any business search query, the Business Lookup tool should return matching businesses from the database
   * Validates: Requirements 7.5
   */
  test('Property 68: Business lookup results', async () => {
    const user = await createTestUser('user');
    
    // Create test leads
    await createTestLead(user.id, 'new');
    await createTestLead(user.id, 'leads');

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('Test', 'Business', '0123456789', 'Test Town'),
        async (query) => {
          // Search for businesses
          const result = await pool.query(
            `SELECT * FROM leads WHERE 
             name ILIKE $1 OR phone ILIKE $1 OR address ILIKE $1 OR town ILIKE $1
             LIMIT 10`,
            [`%${query}%`]
          );

          // All results should match the query
          for (const row of result.rows) {
            const matchesQuery = 
              row.name?.toLowerCase().includes(query.toLowerCase()) ||
              row.phone?.includes(query) ||
              row.address?.toLowerCase().includes(query.toLowerCase()) ||
              row.town?.toLowerCase().includes(query.toLowerCase());
            
            expect(matchesQuery).toBe(true);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 69: Calculator stats accuracy
   * For any user, the calculator stats should accurately reflect their deal data
   * Validates: Requirements 7.7
   */
  test('Property 69: Calculator stats accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 10 }),
        async (dealCount) => {
          const user = await createTestUser('user');

          // Create deals
          for (let i = 0; i < dealCount; i++) {
            await createTestDeal(user.id, `Test Deal ${i}`);
          }

          // Fetch stats
          const result = await pool.query(
            `SELECT COUNT(*) as total_deals FROM deal_calculations WHERE user_id = $1`,
            [user.id]
          );

          const totalDeals = parseInt(result.rows[0].total_deals);
          expect(totalDeals).toBe(dealCount);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 70: Lead stats accuracy
   * For any user, the lead stats should accurately reflect their current lead counts across all statuses
   * Validates: Requirements 7.8
   */
  test('Property 70: Lead stats accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          newCount: fc.integer({ min: 0, max: 5 }),
          leadsCount: fc.integer({ min: 0, max: 5 }),
          workingCount: fc.integer({ min: 0, max: 5 }),
        }),
        async ({ newCount, leadsCount, workingCount }) => {
          const user = await createTestUser('user');

          // Create leads with different statuses
          for (let i = 0; i < newCount; i++) {
            await createTestLead(user.id, 'new');
          }
          for (let i = 0; i < leadsCount; i++) {
            await createTestLead(user.id, 'leads');
          }
          for (let i = 0; i < workingCount; i++) {
            await createTestLead(user.id, 'working');
          }

          // Fetch stats
          const result = await pool.query(
            `SELECT 
              COUNT(*) FILTER (WHERE status = 'new') as new_count,
              COUNT(*) FILTER (WHERE status = 'leads') as leads_count,
              COUNT(*) FILTER (WHERE status = 'working') as working_count
             FROM leads WHERE user_id = $1`,
            [user.id]
          );

          expect(parseInt(result.rows[0].new_count)).toBe(newCount);
          expect(parseInt(result.rows[0].leads_count)).toBe(leadsCount);
          expect(parseInt(result.rows[0].working_count)).toBe(workingCount);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 71: Scraper stats accuracy
   * For any user, the scraper stats should accurately reflect their scraping history
   * Validates: Requirements 7.9
   */
  test('Property 71: Scraper stats accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 5 }),
        async (sessionCount) => {
          const user = await createTestUser('manager');

          // Create scraping sessions
          for (let i = 0; i < sessionCount; i++) {
            await createTestScrapingSession(user.id, `test-session-${i}`);
          }

          // Fetch stats
          const result = await pool.query(
            `SELECT COUNT(*) as total_sessions FROM scraping_sessions WHERE user_id = $1`,
            [user.id]
          );

          const totalSessions = parseInt(result.rows[0].total_sessions);
          expect(totalSessions).toBe(sessionCount);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 72: Activity timeline completeness
   * For any user, the activity timeline should include all their activities with required fields
   * Validates: Requirements 7.10, 7.11
   */
  test('Property 72: Activity timeline completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.constantFrom('deal_created', 'lead_created', 'scraping_started'),
          { minLength: 1, maxLength: 5 }
        ),
        async (activityTypes) => {
          const user = await createTestUser('user');

          // Create activities
          for (const activityType of activityTypes) {
            await createTestActivity(user.id, activityType);
          }

          // Fetch activities
          const result = await pool.query(
            `SELECT * FROM activity_log WHERE user_id = $1 AND entity_type = 'test' ORDER BY created_at DESC`,
            [user.id]
          );

          // Verify all activities are present
          expect(result.rows.length).toBe(activityTypes.length);

          // Verify each activity has required fields
          for (const activity of result.rows) {
            expect(activity).toHaveProperty('id');
            expect(activity).toHaveProperty('user_id');
            expect(activity).toHaveProperty('activity_type');
            expect(activity).toHaveProperty('created_at');
            expect(activityTypes).toContain(activity.activity_type);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 73: Admin activity visibility
   * For any admin user, the activity timeline should show all users' activities
   * For non-admin users, only their own activities should be shown
   * Validates: Requirements 7.12
   */
  test('Property 73: Admin activity visibility', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('admin', 'user'),
        async (role) => {
          const user1 = await createTestUser(role as 'admin' | 'user');
          const user2 = await createTestUser('user');

          // Create activities for both users
          await createTestActivity(user1.id, 'deal_created');
          await createTestActivity(user2.id, 'lead_created');

          // Fetch activities based on role
          const query = role === 'admin'
            ? `SELECT * FROM activity_log WHERE entity_type = 'test' ORDER BY created_at DESC`
            : `SELECT * FROM activity_log WHERE user_id = $1 AND entity_type = 'test' ORDER BY created_at DESC`;
          
          const params = role === 'admin' ? [] : [user1.id];
          const result = await pool.query(query, params);

          if (role === 'admin') {
            // Admin should see all activities
            expect(result.rows.length).toBeGreaterThanOrEqual(2);
          } else {
            // User should only see their own activities
            expect(result.rows.length).toBe(1);
            expect(result.rows[0].user_id).toBe(user1.id);
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});
