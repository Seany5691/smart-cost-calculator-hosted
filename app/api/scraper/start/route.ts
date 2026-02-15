/**
 * API Route: Start Scraping Session
 * POST /api/scraper/start
 * 
 * Requirements: 10.1, 27.1, 27.2, 28.1, 28.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { ScrapingOrchestrator } from '@/lib/scraper/scraping-orchestrator';
import { setSession } from '@/lib/scraper/sessionStore';
import { ScrapeConfig } from '@/lib/scraper/types';
import { getPool } from '@/lib/db';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { isScrapingActive, addToQueue, processNextInQueue, markAsCompleted } from '@/lib/scraper/queueManager';

export async function POST(request: NextRequest) {
  try {
    console.log('[SCRAPER API] Received POST request to /api/scraper/start');
    console.log('[SCRAPER API] Headers:', Object.fromEntries(request.headers.entries()));
    
    // Verify authentication
    const authResult = await verifyAuth(request);
    console.log('[SCRAPER API] Auth result:', { 
      authenticated: authResult.authenticated, 
      hasUser: !!authResult.user,
      error: authResult.error 
    });
    
    if (!authResult.authenticated || !authResult.user) {
      console.error('[SCRAPER API] Authentication failed:', authResult.error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = authResult.user;
    console.log('[SCRAPER API] Authenticated user:', { userId: user.userId, username: user.username });

    const body = await request.json();
    const { towns, industries, config } = body;

    // Validate input
    if (!towns || !Array.isArray(towns) || towns.length === 0) {
      return NextResponse.json(
        { error: 'Towns array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Industries are optional - if empty, will search for business names directly
    if (!industries || !Array.isArray(industries)) {
      return NextResponse.json(
        { error: 'Industries must be an array (can be empty for business-only search)' },
        { status: 400 }
      );
    }

    // Set defaults for concurrency settings
    const scrapeConfig: ScrapeConfig = {
      towns,
      industries,
      simultaneousTowns: config?.simultaneousTowns || 2,
      simultaneousIndustries: config?.simultaneousIndustries || 2,
      simultaneousLookups: config?.simultaneousLookups || 2,
      enableProviderLookup: config?.enableProviderLookup !== undefined ? config.enableProviderLookup : true, // Default to true
    };

    // Validate concurrency ranges
    if (scrapeConfig.simultaneousTowns < 1 || scrapeConfig.simultaneousTowns > 5) {
      return NextResponse.json(
        { error: 'simultaneousTowns must be between 1 and 5' },
        { status: 400 }
      );
    }

    if (scrapeConfig.simultaneousIndustries < 1 || scrapeConfig.simultaneousIndustries > 3) {
      return NextResponse.json(
        { error: 'simultaneousIndustries must be between 1 and 3' },
        { status: 400 }
      );
    }

    if (scrapeConfig.simultaneousLookups < 1 || scrapeConfig.simultaneousLookups > 3) {
      return NextResponse.json(
        { error: 'simultaneousLookups must be between 1 and 3' },
        { status: 400 }
      );
    }

    // Generate session ID
    const sessionId = randomUUID();

    // Create a meaningful session name
    let sessionName = '';
    if (industries.length === 0) {
      // Business-only search (no industries selected)
      if (towns.length === 1) {
        sessionName = `${towns[0]} - Business Search`;
      } else if (towns.length <= 3) {
        sessionName = `${towns.join(', ')} - Business Search`;
      } else {
        sessionName = `${towns.slice(0, 2).join(', ')} +${towns.length - 2} more - Business Search`;
      }
    } else {
      // Industry search
      if (towns.length === 1) {
        sessionName = `${towns[0]} - ${industries.length} ${industries.length === 1 ? 'Industry' : 'Industries'}`;
      } else if (towns.length <= 3) {
        sessionName = `${towns.join(', ')} - ${industries.length} ${industries.length === 1 ? 'Industry' : 'Industries'}`;
      } else {
        sessionName = `${towns.slice(0, 2).join(', ')} +${towns.length - 2} more - ${industries.length} ${industries.length === 1 ? 'Industry' : 'Industries'}`;
      }
    }

    // Create session in database
    const pool = getPool();
    await pool.query(
      `INSERT INTO scraping_sessions (id, user_id, name, config, status, progress, state, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [
        sessionId,
        user.userId,
        sessionName,
        JSON.stringify(scrapeConfig),
        'running',
        0,
        JSON.stringify({
          currentTownIndex: 0,
          currentIndustryIndex: 0,
          completedTowns: [],
        }),
      ]
    );

    // Check if another scraping session is currently active
    const isActive = await isScrapingActive();
    
    if (isActive) {
      // Another session is running - add this request to the queue
      console.log(`[SCRAPER API] Another session is active, adding ${sessionId} to queue`);
      
      try {
        const queueItem = await addToQueue(user.userId, sessionId, scrapeConfig);
        
        // Log queued activity
        await pool.query(
          `INSERT INTO activity_log (user_id, activity_type, entity_type, entity_id, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            user.userId,
            'scraping_queued',
            'scraping_session',
            sessionId,
            JSON.stringify({
              session_name: sessionName,
              queue_position: queueItem.queuePosition,
              estimated_wait_minutes: queueItem.estimatedWaitMinutes,
            })
          ]
        );
        
        return NextResponse.json({ 
          sessionId, 
          status: 'queued',
          queuePosition: queueItem.queuePosition,
          estimatedWaitMinutes: queueItem.estimatedWaitMinutes
        }, { status: 201 });
      } catch (queueError: any) {
        console.error('[SCRAPER API] Error adding to queue:', queueError);
        // If queue fails, delete the session and return error
        await pool.query('DELETE FROM scraping_sessions WHERE id = $1', [sessionId]);
        const errorMessage = queueError instanceof Error ? queueError.message : String(queueError);
        return NextResponse.json(
          { error: `Failed to add to queue: ${errorMessage}` },
          { status: 500 }
        );
      }
    }

    // No active session - start immediately
    console.log(`[SCRAPER API] No active session, starting ${sessionId} immediately`);

    // Log activity
    await pool.query(
      `INSERT INTO activity_log (user_id, activity_type, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.userId,
        'scraping_started',
        'scraping_session',
        sessionId,
        JSON.stringify({
          session_name: sessionName,
          towns_count: towns.length,
          industries_count: industries.length,
        })
      ]
    );

    // Create event emitter for this session
    const eventEmitter = new EventEmitter();

    // Create orchestrator
    const orchestrator = new ScrapingOrchestrator(
      towns,
      industries,
      scrapeConfig,
      eventEmitter
    );

    // Store session in memory
    setSession(sessionId, {
      orchestrator,
      eventEmitter,
      createdAt: Date.now(),
    });

    // Listen for completion event to auto-save session
    eventEmitter.once('complete', async () => {
      try {
        console.log(`[SCRAPER API] Session ${sessionId} completed, auto-saving...`);
        
        const loggingManager = orchestrator.getLoggingManager();
        const businesses = orchestrator.getResults();
        const summary = loggingManager.getSummary();
        const progress = orchestrator.getProgress();

        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Update session with summary
          await client.query(
            `UPDATE scraping_sessions 
             SET summary = $1, status = $2, progress = $3, updated_at = NOW()
             WHERE id = $4`,
            [
              JSON.stringify({
                totalBusinesses: businesses.length,
                townsCompleted: progress.completedTowns,
                errors: summary.totalErrors,
                totalDuration: summary.totalDuration,
                averageDuration: summary.averageDuration,
              }),
              'completed',
              100,
              sessionId,
            ]
          );

          // Save businesses to database using batch operations
          if (businesses.length > 0) {
            const { batchInsertBusinesses } = await import('@/lib/scraper/batchOperations');
            await batchInsertBusinesses(client, sessionId, businesses);
          }

          await client.query('COMMIT');
          console.log(`[SCRAPER API] Session ${sessionId} auto-saved successfully with ${businesses.length} businesses`);
          
          // Log completion activity
          await pool.query(
            `INSERT INTO activity_log (user_id, activity_type, entity_type, entity_id, metadata)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              user.userId,
              'scraping_completed',
              'scraping_session',
              sessionId,
              JSON.stringify({
                session_name: sessionName,
                businesses_scraped: businesses.length,
                towns_completed: progress.completedTowns,
              })
            ]
          );
          
          // Mark queue item as completed if it exists
          await markAsCompleted(sessionId).catch(err => {
            console.log(`[SCRAPER API] No queue item to mark complete (session started immediately): ${err.message}`);
          });
          
          // Process next item in queue
          console.log(`[SCRAPER API] Checking for next queued session...`);
          const nextSessionId = await processNextInQueue();
          
          if (nextSessionId) {
            console.log(`[SCRAPER API] Starting next queued session: ${nextSessionId}`);
            // Trigger the next session to start
            // We'll call a helper function to start the session
            await startQueuedSession(nextSessionId);
          } else {
            console.log(`[SCRAPER API] No more sessions in queue`);
          }
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`[SCRAPER API] Error auto-saving session ${sessionId}:`, error);
        } finally {
          client.release();
        }
      } catch (error) {
        console.error(`[SCRAPER API] Error in completion handler for session ${sessionId}:`, error);
      }
    });

    // Start scraping in background (don't await)
    orchestrator.start().catch(async (error) => {
      console.error(`Error in scraping session ${sessionId}:`, error);
      
      // Update session status to error
      await pool.query(
        `UPDATE scraping_sessions SET status = $1, updated_at = NOW() WHERE id = $2`,
        ['error', sessionId]
      );
    });

    return NextResponse.json({ sessionId, status: 'started' }, { status: 201 });
  } catch (error: any) {
    console.error('Error starting scraping session:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to start a queued session
 * This is called when the previous session completes
 * Exported so it can be used by stop route
 */
export async function startQueuedSession(sessionId: string): Promise<void> {
  try {
    const pool = getPool();
    
    // Get session details from database
    const sessionResult = await pool.query(
      `SELECT user_id, name, config FROM scraping_sessions WHERE id = $1`,
      [sessionId]
    );
    
    if (sessionResult.rows.length === 0) {
      console.error(`[SCRAPER API] Queued session ${sessionId} not found in database`);
      return;
    }
    
    const session = sessionResult.rows[0];
    const scrapeConfig: ScrapeConfig = JSON.parse(session.config);
    
    console.log(`[SCRAPER API] Starting queued session ${sessionId} for user ${session.user_id}`);
    
    // Create event emitter for this session
    const eventEmitter = new EventEmitter();

    // Create orchestrator
    const orchestrator = new ScrapingOrchestrator(
      scrapeConfig.towns,
      scrapeConfig.industries,
      scrapeConfig,
      eventEmitter
    );

    // Store session in memory
    setSession(sessionId, {
      orchestrator,
      eventEmitter,
      createdAt: Date.now(),
    });

    // Listen for completion event to auto-save session and process next in queue
    eventEmitter.once('complete', async () => {
      try {
        console.log(`[SCRAPER API] Queued session ${sessionId} completed, auto-saving...`);
        
        const loggingManager = orchestrator.getLoggingManager();
        const businesses = orchestrator.getResults();
        const summary = loggingManager.getSummary();
        const progress = orchestrator.getProgress();

        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Update session with summary
          await client.query(
            `UPDATE scraping_sessions 
             SET summary = $1, status = $2, progress = $3, updated_at = NOW()
             WHERE id = $4`,
            [
              JSON.stringify({
                totalBusinesses: businesses.length,
                townsCompleted: progress.completedTowns,
                errors: summary.totalErrors,
                totalDuration: summary.totalDuration,
                averageDuration: summary.averageDuration,
              }),
              'completed',
              100,
              sessionId,
            ]
          );

          // Save businesses to database using batch operations
          if (businesses.length > 0) {
            const { batchInsertBusinesses } = await import('@/lib/scraper/batchOperations');
            await batchInsertBusinesses(client, sessionId, businesses);
          }

          await client.query('COMMIT');
          console.log(`[SCRAPER API] Queued session ${sessionId} auto-saved successfully with ${businesses.length} businesses`);
          
          // Log completion activity
          await pool.query(
            `INSERT INTO activity_log (user_id, activity_type, entity_type, entity_id, metadata)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              session.user_id,
              'scraping_completed',
              'scraping_session',
              sessionId,
              JSON.stringify({
                session_name: session.name,
                businesses_scraped: businesses.length,
                towns_completed: progress.completedTowns,
              })
            ]
          );
          
          // Mark queue item as completed
          await markAsCompleted(sessionId).catch(err => {
            console.log(`[SCRAPER API] Error marking queue item complete: ${err.message}`);
          });
          
          // Process next item in queue (recursive)
          console.log(`[SCRAPER API] Checking for next queued session...`);
          const nextSessionId = await processNextInQueue();
          
          if (nextSessionId) {
            console.log(`[SCRAPER API] Starting next queued session: ${nextSessionId}`);
            await startQueuedSession(nextSessionId);
          } else {
            console.log(`[SCRAPER API] No more sessions in queue`);
          }
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`[SCRAPER API] Error auto-saving queued session ${sessionId}:`, error);
        } finally {
          client.release();
        }
      } catch (error) {
        console.error(`[SCRAPER API] Error in completion handler for queued session ${sessionId}:`, error);
      }
    });

    // Start scraping in background (don't await)
    orchestrator.start().catch(async (error) => {
      console.error(`Error in queued scraping session ${sessionId}:`, error);
      
      // Update session status to error
      await pool.query(
        `UPDATE scraping_sessions SET status = $1, updated_at = NOW() WHERE id = $2`,
        ['error', sessionId]
      );
      
      // Mark queue item as completed (even on error)
      await markAsCompleted(sessionId).catch(err => {
        console.log(`[SCRAPER API] Error marking failed queue item complete: ${err.message}`);
      });
      
      // Process next in queue despite error
      const nextSessionId = await processNextInQueue();
      if (nextSessionId) {
        console.log(`[SCRAPER API] Starting next queued session after error: ${nextSessionId}`);
        await startQueuedSession(nextSessionId);
      }
    });
    
    console.log(`[SCRAPER API] Queued session ${sessionId} started successfully`);
  } catch (error) {
    console.error(`[SCRAPER API] Error starting queued session ${sessionId}:`, error);
  }
}
