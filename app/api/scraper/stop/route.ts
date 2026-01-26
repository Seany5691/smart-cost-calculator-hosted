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
