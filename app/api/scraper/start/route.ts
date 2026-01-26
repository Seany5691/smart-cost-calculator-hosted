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

    if (!industries || !Array.isArray(industries) || industries.length === 0) {
      return NextResponse.json(
        { error: 'Industries array is required and must not be empty' },
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
    if (towns.length === 1) {
      sessionName = `${towns[0]} - ${industries.length} ${industries.length === 1 ? 'Industry' : 'Industries'}`;
    } else if (towns.length <= 3) {
      sessionName = `${towns.join(', ')} - ${industries.length} ${industries.length === 1 ? 'Industry' : 'Industries'}`;
    } else {
      sessionName = `${towns.slice(0, 2).join(', ')} +${towns.length - 2} more - ${industries.length} ${industries.length === 1 ? 'Industry' : 'Industries'}`;
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
