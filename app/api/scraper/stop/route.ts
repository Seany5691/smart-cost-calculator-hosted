/**
 * API Route: Stop Scraping Session
 * POST /api/scraper/stop
 * 
 * Requirements: 10.2, 27.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { getSession, deleteSession } from '@/lib/scraper/sessionStore';
import { getPool } from '@/lib/db';
import { markAsCompleted, processNextInQueue } from '@/lib/scraper/queueManager';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = authResult.user;

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing required field: sessionId' },
        { status: 400 }
      );
    }

    // Get session from memory
    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or already completed' },
        { status: 404 }
      );
    }

    // Stop the orchestrator
    await session.orchestrator.stop();

    // Get results count
    const businessesCollected = session.orchestrator.getResults().length;

    // Update database
    const pool = getPool();
    await pool.query(
      `UPDATE scraping_sessions SET status = $1, updated_at = NOW() WHERE id = $2`,
      ['stopped', sessionId]
    );

    // Remove from memory
    deleteSession(sessionId);

    // Mark queue item as completed if it exists
    await markAsCompleted(sessionId).catch(err => {
      console.log(`[SCRAPER API] No queue item to mark complete: ${err.message}`);
    });
    
    // Process next item in queue
    console.log(`[SCRAPER API] Session stopped, checking for next queued session...`);
    const nextSessionId = await processNextInQueue();
    
    if (nextSessionId) {
      console.log(`[SCRAPER API] Starting next queued session: ${nextSessionId}`);
      // Import the helper function from start route
      const { startQueuedSession } = await import('../start/route');
      await startQueuedSession(nextSessionId);
    }

    return NextResponse.json({ 
      status: 'stopped',
      businessesCollected 
    });
  } catch (error: any) {
    console.error('Error stopping scraping session:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
