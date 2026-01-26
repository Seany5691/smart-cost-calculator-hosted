/**
 * API Route: List Scraping Sessions
 * GET /api/scraper/sessions
 * 
 * Requirements: 8.3, 27.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { getPool } from '@/lib/db';

export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pool = getPool();
    
    // Get all sessions for the authenticated user
    const result = await pool.query(
      `SELECT 
        id,
        name,
        status,
        progress,
        summary,
        created_at,
        updated_at
       FROM scraping_sessions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user.userId]
    );

    // Format sessions for response
    const sessions = result.rows.map((row) => {
      let summary = null;
      
      // Safely parse summary JSON
      if (row.summary) {
        try {
          summary = typeof row.summary === 'string' ? JSON.parse(row.summary) : row.summary;
        } catch (parseError) {
          console.error(`Failed to parse summary for session ${row.id}:`, parseError);
          // Continue with null summary - will default to 0 values
        }
      }
      
      return {
        id: row.id,
        name: row.name,
        status: row.status,
        progress: row.progress,
        businessCount: summary?.totalBusinesses || 0,
        townsCompleted: summary?.townsCompleted || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    return NextResponse.json({ sessions });
  } catch (error: any) {
    console.error('Error listing scraping sessions:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});
