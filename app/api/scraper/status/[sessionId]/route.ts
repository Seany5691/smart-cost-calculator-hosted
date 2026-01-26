/**
 * API Route: Get Scraping Session Status
 * GET /api/scraper/status/:sessionId
 * 
 * Requirements: 27.3, 27.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { getSession } from '@/lib/scraper/sessionStore';
import { getPool } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  return withAuth(async (authRequest: AuthenticatedRequest) => {
    try {
      const user = authRequest.user;
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { sessionId } = params;

      if (!sessionId) {
        return NextResponse.json(
          { error: 'Missing required parameter: sessionId' },
          { status: 400 }
        );
      }

      // Check if session exists in memory (active session)
      const activeSession = getSession(sessionId);
      
      if (activeSession) {
        // Get status from active orchestrator
        const orchestrator = activeSession.orchestrator;
        const progress = orchestrator.getProgress();
        const status = orchestrator.getStatus();
        const loggingManager = orchestrator.getLoggingManager();
        const logs = loggingManager.getDisplayLogEntries();

        // Calculate progress percentage
        const progressPercentage = progress.totalTowns > 0 
          ? Math.round((progress.completedTowns / progress.totalTowns) * 100) 
          : 0;

        // Calculate estimated time remaining
        let estimatedTimeRemaining = 0;
        if (progress.townCompletionTimes.length > 0) {
          const townsRemaining = progress.totalTowns - progress.completedTowns;
          const averageTimePerTown = progress.townCompletionTimes.reduce((sum, time) => sum + time, 0) / progress.townCompletionTimes.length;
          estimatedTimeRemaining = Math.round((averageTimePerTown * townsRemaining) / 1000); // Convert to seconds
        }

        return NextResponse.json({
          sessionId,
          status,
          progress: progressPercentage,
          townsRemaining: progress.totalTowns - progress.completedTowns,
          businessesScraped: progress.totalBusinesses,
          estimatedTimeRemaining,
          logs,
        });
      }

      // Session not in memory, check database
      const pool = getPool();
      const result = await pool.query(
        `SELECT s.*, u.id as user_id 
         FROM scraping_sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.id = $1`,
        [sessionId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      const dbSession = result.rows[0];

      // Verify user ownership
      if (dbSession.user_id !== user.userId) {
        return NextResponse.json(
          { error: 'Forbidden: You do not own this session' },
          { status: 403 }
        );
      }

      // Return database status
      const config = JSON.parse(dbSession.config);
      const state = dbSession.state ? JSON.parse(dbSession.state) : null;
      const summary = dbSession.summary ? JSON.parse(dbSession.summary) : null;

      return NextResponse.json({
        sessionId,
        status: dbSession.status,
        progress: dbSession.progress || 0,
        townsRemaining: config.towns.length - (state?.completedTowns?.length || 0),
        businessesScraped: summary?.totalBusinesses || 0,
        estimatedTimeRemaining: 0,
        logs: [],
      });
    } catch (error: any) {
      console.error('Error getting scraping session status:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  })(request);
}
