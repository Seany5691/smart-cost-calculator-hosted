/**
 * API Route: Save Scraping Session
 * POST /api/scraper/sessions/save
 * 
 * Requirements: 8.1, 10.5, 27.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { getSession, markSessionComplete } from '@/lib/scraper/sessionStore';
import { getPool } from '@/lib/db';
import { batchInsertBusinesses } from '@/lib/scraper/batchOperations';

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, name } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing required field: sessionId' },
        { status: 400 }
      );
    }

    const pool = getPool();

    // Check if session exists in database and belongs to user
    const sessionCheck = await pool.query(
      `SELECT id, status, user_id FROM scraping_sessions WHERE id = $1`,
      [sessionId]
    );

    if (sessionCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const dbSession = sessionCheck.rows[0];

    // Verify user ownership
    if (dbSession.user_id !== user.userId) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this session' },
        { status: 403 }
      );
    }

    // If session is already completed (auto-saved), just update the name
    if (dbSession.status === 'completed') {
      const sessionName = name || `Session ${new Date().toISOString()}`;
      
      await pool.query(
        `UPDATE scraping_sessions 
         SET name = $1, updated_at = NOW()
         WHERE id = $2`,
        [sessionName, sessionId]
      );

      // Get business count for response
      const businessCount = await pool.query(
        `SELECT COUNT(*) as count FROM scraped_businesses WHERE session_id = $1`,
        [sessionId]
      );

      return NextResponse.json({
        success: true,
        sessionId,
        businessesCount: parseInt(businessCount.rows[0].count),
        message: 'Session name updated successfully',
      });
    }

    // If session is still in memory (not auto-saved yet), use the old logic
    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found in memory. It may have already been saved.' },
        { status: 404 }
      );
    }

    const orchestrator = session.orchestrator;
    const loggingManager = orchestrator.getLoggingManager();
    
    // Get results and summary
    const businesses = orchestrator.getResults();
    const summary = loggingManager.getSummary();
    const progress = orchestrator.getProgress();

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update session with name and summary
      const sessionName = name || `Session ${new Date().toISOString()}`;
      await client.query(
        `UPDATE scraping_sessions 
         SET name = $1, summary = $2, status = $3, progress = $4, updated_at = NOW()
         WHERE id = $5`,
        [
          sessionName,
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
        await batchInsertBusinesses(client, sessionId, businesses);
      }

      await client.query('COMMIT');

      // Mark session as complete in memory
      markSessionComplete(sessionId);

      return NextResponse.json({
        success: true,
        sessionId,
        businessesCount: businesses.length,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error saving scraping session:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});
