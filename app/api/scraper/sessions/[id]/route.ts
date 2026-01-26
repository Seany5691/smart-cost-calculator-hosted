/**
 * API Route: Get/Delete Scraping Session
 * GET /api/scraper/sessions/:id - Load session
 * DELETE /api/scraper/sessions/:id - Delete session
 * 
 * Requirements: 8.2, 8.4, 27.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { getPool } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (authRequest: AuthenticatedRequest) => {
    try {
      const user = authRequest.user;
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { id } = params;

      if (!id) {
        return NextResponse.json(
          { error: 'Missing required parameter: id' },
          { status: 400 }
        );
      }

      const pool = getPool();
      
      // Get session with user verification
      const sessionResult = await pool.query(
        `SELECT 
          id,
          user_id,
          name,
          config,
          status,
          progress,
          state,
          summary,
          created_at,
          updated_at
         FROM scraping_sessions
         WHERE id = $1`,
        [id]
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

      // Get businesses for this session
      const businessesResult = await pool.query(
        `SELECT 
          id,
          maps_address,
          name,
          phone,
          provider,
          address,
          town,
          type_of_business,
          created_at
         FROM scraped_businesses
         WHERE session_id = $1
         ORDER BY created_at ASC`,
        [id]
      );

      // Parse JSON fields safely
      let config = null;
      let state = null;
      let summary = null;
      
      if (session.config) {
        try {
          config = typeof session.config === 'string' ? JSON.parse(session.config) : session.config;
        } catch (parseError) {
          console.error(`Failed to parse config for session ${id}:`, parseError);
        }
      }
      
      if (session.state) {
        try {
          state = typeof session.state === 'string' ? JSON.parse(session.state) : session.state;
        } catch (parseError) {
          console.error(`Failed to parse state for session ${id}:`, parseError);
        }
      }
      
      if (session.summary) {
        try {
          summary = typeof session.summary === 'string' ? JSON.parse(session.summary) : session.summary;
        } catch (parseError) {
          console.error(`Failed to parse summary for session ${id}:`, parseError);
        }
      }

      return NextResponse.json({
        session: {
          id: session.id,
          name: session.name,
          config,
          status: session.status,
          progress: session.progress,
          state,
          summary,
          createdAt: session.created_at,
          updatedAt: session.updated_at,
        },
        businesses: businessesResult.rows,
      });
    } catch (error: any) {
      console.error('Error loading scraping session:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  })(request);
}

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

      const { id } = params;

      if (!id) {
        return NextResponse.json(
          { error: 'Missing required parameter: id' },
          { status: 400 }
        );
      }

      const pool = getPool();
      
      // Verify session exists and user owns it
      const sessionResult = await pool.query(
        `SELECT user_id FROM scraping_sessions WHERE id = $1`,
        [id]
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
        [id]
      );

      return NextResponse.json({
        success: true,
        message: 'Session deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting scraping session:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  })(request);
}
