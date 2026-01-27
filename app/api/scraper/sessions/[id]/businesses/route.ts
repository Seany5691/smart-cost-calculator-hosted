/**
 * API Route: Get Businesses from Scraping Session
 * GET /api/scraper/sessions/[id]/businesses
 * 
 * Returns all businesses scraped in a specific session
 * Enables cross-device sync by loading from database
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
        `SELECT id, name, user_id, status, summary 
         FROM scraping_sessions 
         WHERE id = $1`,
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

      // Fetch all businesses for this session
      const businessesResult = await pool.query(
        `SELECT 
          name,
          phone,
          provider,
          town,
          type_of_business as industry,
          address,
          maps_address as website
         FROM scraped_businesses
         WHERE session_id = $1
         ORDER BY created_at ASC`,
        [sessionId]
      );

      // Transform to match frontend Business interface
      const businesses = businessesResult.rows.map(row => ({
        name: row.name,
        phone: row.phone || '',
        provider: row.provider || 'Unknown',
        town: row.town,
        industry: row.industry,
        address: row.address || '',
        website: row.website || '',
      }));

      // Parse summary for additional info
      let summary = null;
      if (session.summary) {
        try {
          summary = typeof session.summary === 'string' 
            ? JSON.parse(session.summary) 
            : session.summary;
        } catch (error) {
          console.error('Failed to parse session summary:', error);
        }
      }

      return NextResponse.json({
        sessionId: session.id,
        sessionName: session.name,
        status: session.status,
        businesses,
        summary: summary || {
          totalBusinesses: businesses.length,
          townsCompleted: 0,
          errors: 0,
        },
      });
    } catch (error: any) {
      console.error('Error fetching session businesses:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  })(request);
}
