/**
 * Scraper Service
 * Handles Google Maps scraping operations
 */

import { Page } from 'puppeteer';
import { getBrowserPool } from './browser-pool';
import { batchLookupProviders } from './provider-lookup';
import { getRateLimiter } from './rate-limiter';
import {
  ScrapeConfig,
  ScrapedBusiness,
  SessionStatus,
  LogEntry,
  ScrapingSession,
} from './types';
import { pool } from '../db';

// In-memory session storage (for active sessions)
const activeSessions = new Map<string, SessionStatus>();

/**
 * Start a new scraping session
 */
export async function startSession(
  userId: string,
  name: string,
  config: ScrapeConfig
): Promise<string> {
  // Create session in database
  const result = await pool.query(
    `INSERT INTO scraping_sessions (user_id, name, config, status, progress, state, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     RETURNING id`,
    [
      userId,
      name,
      JSON.stringify(config),
      'running',
      0,
      JSON.stringify({
        currentTownIndex: 0,
        currentIndustryIndex: 0,
        completedTowns: [],
      }),
    ]
  );

  const sessionId = result.rows[0].id;

  // Initialize session status
  const sessionStatus: SessionStatus = {
    sessionId,
    status: 'running',
    progress: 0,
    townsRemaining: config.towns.length,
    businessesScraped: 0,
    estimatedTimeRemaining: 0,
    logs: [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Scraping session started: ${name}`,
      },
    ],
  };

  activeSessions.set(sessionId, sessionStatus);

  // Start scraping in background (don't await)
  processScraping(sessionId, userId, config).catch((error) => {
    console.error(`Error in scraping session ${sessionId}:`, error);
    updateSessionStatus(sessionId, 'error');
  });

  return sessionId;
}

/**
 * Pause a scraping session
 */
export async function pauseSession(sessionId: string): Promise<void> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  session.status = 'paused';
  session.logs.push({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Scraping session paused',
  });

  // Update database
  await pool.query(
    `UPDATE scraping_sessions SET status = $1, updated_at = NOW() WHERE id = $2`,
    ['paused', sessionId]
  );
}

/**
 * Resume a paused scraping session
 */
export async function resumeSession(sessionId: string): Promise<void> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    // Load from database
    const result = await pool.query(
      `SELECT * FROM scraping_sessions WHERE id = $1`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      throw new Error('Session not found');
    }

    const dbSession = result.rows[0];
    const config: ScrapeConfig = JSON.parse(dbSession.config);

    const sessionStatus: SessionStatus = {
      sessionId,
      status: 'running',
      progress: dbSession.progress,
      townsRemaining: config.towns.length - (dbSession.state?.completedTowns?.length || 0),
      businessesScraped: 0,
      estimatedTimeRemaining: 0,
      logs: [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Scraping session resumed',
        },
      ],
    };

    activeSessions.set(sessionId, sessionStatus);

    // Resume scraping
    processScraping(sessionId, dbSession.user_id, config, dbSession.state).catch((error) => {
      console.error(`Error resuming scraping session ${sessionId}:`, error);
      updateSessionStatus(sessionId, 'error');
    });
  } else {
    session.status = 'running';
    session.logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Scraping session resumed',
    });

    await pool.query(
      `UPDATE scraping_sessions SET status = $1, updated_at = NOW() WHERE id = $2`,
      ['running', sessionId]
    );
  }
}

/**
 * Stop a scraping session
 */
export async function stopSession(sessionId: string): Promise<void> {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.status = 'stopped';
    session.logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Scraping session stopped',
    });
  }

  await pool.query(
    `UPDATE scraping_sessions SET status = $1, updated_at = NOW() WHERE id = $2`,
    ['stopped', sessionId]
  );
}

/**
 * Get session status
 */
export async function getSessionStatus(sessionId: string): Promise<SessionStatus> {
  const session = activeSessions.get(sessionId);
  if (session) {
    return session;
  }

  // Load from database
  const result = await pool.query(
    `SELECT * FROM scraping_sessions WHERE id = $1`,
    [sessionId]
  );

  if (result.rows.length === 0) {
    throw new Error('Session not found');
  }

  const dbSession = result.rows[0];
  const config: ScrapeConfig = JSON.parse(dbSession.config);

  return {
    sessionId,
    status: dbSession.status,
    progress: dbSession.progress,
    townsRemaining: config.towns.length - (dbSession.state?.completedTowns?.length || 0),
    businessesScraped: dbSession.summary?.totalBusinesses || 0,
    estimatedTimeRemaining: 0,
    logs: [],
  };
}

/**
 * Process scraping for a session
 */
async function processScraping(
  sessionId: string,
  userId: string,
  config: ScrapeConfig,
  state?: any
): Promise<void> {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  const browserPool = getBrowserPool();
  await browserPool.initialize();

  const startTownIndex = state?.currentTownIndex || 0;
  const completedTowns = state?.completedTowns || [];
  let totalBusinesses = 0;

  try {
    // Process towns sequentially to avoid serverless timeouts
    for (let townIndex = startTownIndex; townIndex < config.towns.length; townIndex++) {
      // Check if session is paused or stopped
      if (session.status === 'paused' || session.status === 'stopped') {
        await updateSessionState(sessionId, {
          currentTownIndex: townIndex,
          currentIndustryIndex: 0,
          completedTowns,
        });
        return;
      }

      const town = config.towns[townIndex];
      session.currentTown = town;

      session.logs.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Starting scraping for town: ${town}`,
      });

      const townStartTime = Date.now();
      let townBusinessCount = 0;

      // Process industries for this town
      for (const industry of config.industries) {
        if ((session.status as string) === 'paused' || (session.status as string) === 'stopped') {
          await updateSessionState(sessionId, {
            currentTownIndex: townIndex,
            currentIndustryIndex: 0,
            completedTowns,
          });
          return;
        }

        session.currentIndustry = industry;

        try {
          // Use rate limiter for scraping
          const rateLimiter = getRateLimiter({ requestsPerSecond: 1, maxRetries: 3 });
          const businesses = await rateLimiter.execute(() =>
            scrapeGoogleMaps(town, industry)
          );

          townBusinessCount += businesses.length;
          totalBusinesses += businesses.length;

          // Perform provider lookups for businesses with phone numbers
          const businessesWithPhones = businesses.filter((b) => b.phone && b.phone.trim() !== '');
          
          if (businessesWithPhones.length > 0) {
            session.logs.push({
              timestamp: new Date().toISOString(),
              level: 'info',
              message: `Looking up providers for ${businessesWithPhones.length} phone numbers...`,
            });

            try {
              const phoneNumbers = businessesWithPhones.map((b) => b.phone);
              const providerMap = await batchLookupProviders(phoneNumbers);

              // Update businesses with provider information
              for (const business of businessesWithPhones) {
                const providerInfo = providerMap.get(business.phone);
                if (providerInfo) {
                  business.provider = providerInfo.provider;
                } else {
                  business.provider = 'Unknown';
                }
              }

              session.logs.push({
                timestamp: new Date().toISOString(),
                level: 'info',
                message: `Provider lookups completed. Found ${providerMap.size} providers.`,
              });
            } catch (error: any) {
              session.logs.push({
                timestamp: new Date().toISOString(),
                level: 'error',
                message: `Provider lookup failed: ${error.message}`,
              });

              // Set all providers to Unknown on failure
              for (const business of businessesWithPhones) {
                if (!business.provider) {
                  business.provider = 'Unknown';
                }
              }
            }
          }

          // Save businesses to database
          for (const business of businesses) {
            await saveScrapedBusiness(sessionId, business);
          }

          session.logs.push({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Scraped ${businesses.length} businesses for ${industry} in ${town}`,
          });
        } catch (error: any) {
          session.logs.push({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: `Error scraping ${industry} in ${town}: ${error.message}`,
          });
        }

        // Rate limiting: wait 1 second between industries
        await sleep(1000);
      }

      const townEndTime = Date.now();
      const townDuration = (townEndTime - townStartTime) / 1000;

      completedTowns.push(town);
      session.townsRemaining = config.towns.length - completedTowns.length;
      session.businessesScraped = totalBusinesses;
      session.progress = Math.round((completedTowns.length / config.towns.length) * 100);

      // Calculate estimated time remaining
      const avgTimePerTown = townDuration;
      session.estimatedTimeRemaining = Math.round(avgTimePerTown * session.townsRemaining);

      session.logs.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Completed town ${town}: ${townBusinessCount} businesses in ${townDuration.toFixed(1)}s`,
      });

      // Update database
      await updateSessionProgress(sessionId, session.progress, {
        currentTownIndex: townIndex + 1,
        currentIndustryIndex: 0,
        completedTowns,
      });
    }

    // Scraping completed
    session.status = 'completed';
    session.progress = 100;
    session.logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Scraping completed: ${totalBusinesses} businesses scraped`,
    });

    await updateSessionStatus(sessionId, 'completed', {
      totalBusinesses,
      townsCompleted: completedTowns.length,
      errors: session.logs.filter((log) => log.level === 'error').length,
    });
  } catch (error: any) {
    session.status = 'error';
    session.logs.push({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: `Fatal error: ${error.message}`,
    });

    await updateSessionStatus(sessionId, 'error');
  }
}

/**
 * Scrape Google Maps for businesses
 */
async function scrapeGoogleMaps(
  town: string,
  industry: string
): Promise<ScrapedBusiness[]> {
  const browserPool = getBrowserPool();
  const { page } = await browserPool.acquirePage();

  try {
    const searchQuery = `${industry} in ${town}, South Africa`;
    const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for results to load
    await page.waitForSelector('div[role="feed"]', { timeout: 10000 });

    // Scroll to load more results
    await autoScroll(page);

    // Extract business data
    const businesses = await page.evaluate((town, industry) => {
      const results: any[] = [];
      const elements = document.querySelectorAll('div[role="feed"] > div > div > a');

      elements.forEach((element: any) => {
        try {
          const href = element.getAttribute('href') || '';
          const nameElement = element.querySelector('div[class*="fontHeadlineSmall"]');
          const addressElement = element.querySelector('div[class*="fontBodyMedium"]');

          if (nameElement) {
            const name = nameElement.textContent?.trim() || '';
            const address = addressElement?.textContent?.trim() || '';

            results.push({
              maps_address: href,
              name,
              phone: '', // Will be extracted in detail page if needed
              provider: '',
              address,
              type_of_business: industry,
              town,
            });
          }
        } catch (error) {
          console.error('Error extracting business:', error);
        }
      });

      return results;
    }, town, industry);

    // Identify providers for phone numbers
    const businessesWithProviders = businesses.map((business) => ({
      ...business,
      provider: business.provider || 'Unknown', // Provider will be looked up after scraping
    }));

    return businessesWithProviders;
  } finally {
    await browserPool.releasePage(page);
  }
}

/**
 * Auto-scroll to load more results
 */
async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const feed = document.querySelector('div[role="feed"]');
    if (!feed) return;

    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = feed.scrollHeight;
        feed.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight || totalHeight > 3000) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

/**
 * Save scraped business to database and create lead
 */
async function saveScrapedBusiness(
  sessionId: string,
  business: ScrapedBusiness
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Save to scraped_businesses table
    await client.query(
      `INSERT INTO scraped_businesses (session_id, maps_address, name, phone, provider, address, town, type_of_business, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
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

    // Create lead with status 'new'
    // Check if lead already exists (by phone or name+town)
    try {
      const existingLead = await client.query(
        `SELECT id FROM leads WHERE (phone = $1 AND phone IS NOT NULL AND phone != '') OR (name = $2 AND town = $3)`,
        [business.phone, business.name, business.town]
      );

      if (existingLead.rows.length === 0) {
        // Get the next number for 'new' status leads
        const numberResult = await client.query(
          `SELECT COALESCE(MAX(number), 0) + 1 as next_number FROM leads WHERE status = 'new'`
        );
        const nextNumber = numberResult.rows[0].next_number;

        // Insert new lead
        await client.query(
          `INSERT INTO leads (
            number, maps_address, name, phone, provider, address, town, 
            type_of_business, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
          [
            nextNumber,
            business.maps_address,
            business.name,
            business.phone,
            business.provider,
            business.address,
            business.town,
            business.type_of_business,
            'new',
          ]
        );
      }
    } catch (leadError: any) {
      // Log lead creation error but don't fail the entire operation
      console.error(`Failed to create lead for business "${business.name}":`, leadError.message);
      // Continue with commit - the scraped business was saved successfully
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update session status in database
 */
async function updateSessionStatus(
  sessionId: string,
  status: string,
  summary?: any
): Promise<void> {
  if (summary) {
    await pool.query(
      `UPDATE scraping_sessions SET status = $1, summary = $2, updated_at = NOW() WHERE id = $3`,
      [status, JSON.stringify(summary), sessionId]
    );
  } else {
    await pool.query(
      `UPDATE scraping_sessions SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, sessionId]
    );
  }
}

/**
 * Update session progress in database
 */
async function updateSessionProgress(
  sessionId: string,
  progress: number,
  state: any
): Promise<void> {
  await pool.query(
    `UPDATE scraping_sessions SET progress = $1, state = $2, updated_at = NOW() WHERE id = $3`,
    [progress, JSON.stringify(state), sessionId]
  );
}

/**
 * Update session state in database
 */
async function updateSessionState(sessionId: string, state: any): Promise<void> {
  await pool.query(
    `UPDATE scraping_sessions SET state = $1, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(state), sessionId]
  );
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


