/**
 * API Route: Pause Scraping Session
 * POST /api/scraper/pause
 * 
 * Requirements: 10.3, 22.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { getSession } from '@/lib/scraper/sessionStore';
import { getPool } from '@/lib/db';

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Pause the orchestrator
    session.orchestrator.pause();

    // Update database
    const pool = getPool();
    await pool.query(
      `UPDATE scraping_sessions SET status = $1, updated_at = NOW() WHERE id = $2`,
      ['paused', sessionId]
    );

    return NextResponse.json({ status: 'paused' });
  } catch (error: any) {
    console.error('Error pausing scraping session:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});
