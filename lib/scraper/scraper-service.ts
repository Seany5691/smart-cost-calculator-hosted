/**
 * Scraper Service
 * Handles Google Maps scraping operations
 * 
 * NOTE: Most functions in this file are DEPRECATED.
 * Use ScrapingOrchestrator for new scraping operations.
 */

import { Page } from 'playwright';
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
 * @deprecated This function is no longer used. Use ScrapingOrchestrator instead.
 */
async function processScraping(
  sessionId: string,
  userId: string,
  config: ScrapeConfig,
  state?: any
): Promise<void> {
  // DEPRECATED: This function is no longer used
  throw new Error('processScraping is deprecated. Use ScrapingOrchestrator instead.');
}

/**
 * Scrape Google Maps for businesses
 * @deprecated This function is no longer used. Use IndustryScraper or BusinessLookupScraper instead.
 */
async function scrapeGoogleMaps(
  town: string,
  industry: string
): Promise<ScrapedBusiness[]> {
  // DEPRECATED: This function is no longer used
  throw new Error('scrapeGoogleMaps is deprecated. Use IndustryScraper or BusinessLookupScraper instead.');
}

/**
 * Auto-scroll to load more results
 * @deprecated This function is no longer used.
 */
async function autoScroll(page: Page): Promise<void> {
  // DEPRECATED: This function is no longer used
  throw new Error('autoScroll is deprecated.');
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


