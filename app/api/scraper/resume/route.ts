/**
 * API Route: Resume Scraping Session
 * POST /api/scraper/resume
 * 
 * Requirements: 10.4, 22.2
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

    // Resume the orchestrator
    session.orchestrator.resume();

    // Update database
    const pool = getPool();
    await pool.query(
      `UPDATE scraping_sessions SET status = $1, updated_at = NOW() WHERE id = $2`,
      ['running', sessionId]
    );

    return NextResponse.json({ status: 'resumed' });
  } catch (error: any) {
    console.error('Error resuming scraping session:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});
