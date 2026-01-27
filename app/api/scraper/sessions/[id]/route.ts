/**
 * API Route: Delete Scraping Session
 * DELETE /api/scraper/sessions/[id]
 * 
 * Deletes a scraping session and all associated businesses (CASCADE)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { getPool } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (authRequest: AuthenticatedRequest) => {
    try {
      const user = authRequest.user;
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { id: sessionId } = params;

      if (!sessionId) {
        return NextResponse.json(
          { error: 'Missing required parameter: sessionId' },
          { status: 400 }
        );
      }

      const pool = getPool();

      // Verify session exists and belongs to user
      const sessionResult = await pool.query(
        `SELECT id, user_id FROM scraping_sessions WHERE id = $1`,
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      const session = sessionResult.rows[0];

      // Verify user ownership
      if (session.user_id !== user.userId) {
        return NextResponse.json(
          { error: 'Forbidden: You do not own this session' },
          { status: 403 }
        );
      }

      // Delete session (CASCADE will delete associated businesses)
      await pool.query(
        `DELETE FROM scraping_sessions WHERE id = $1`,
        [sessionId]
      );

      return NextResponse.json({
        success: true,
        message: 'Session deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting session:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  })(request);
}
