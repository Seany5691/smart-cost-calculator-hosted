/**
 * API Route: Get Active Scraping Session for Current User
 * GET /api/scraper/active-session
 * 
 * Returns the currently running scraping session for the authenticated user
 * Used to detect if user has a scrape in progress and allow reconnecting
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = authResult.user;

    // Query for active session belonging to this user
    // Only show sessions that are actually running (updated within last 2 hours)
    const pool = getPool();
    const result = await pool.query(
      `SELECT 
        id,
        name,
        config,
        status,
        progress,
        created_at,
        updated_at
       FROM scraping_sessions
       WHERE user_id = $1 
       AND status = 'running'
       AND updated_at > NOW() - INTERVAL '2 hours'
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ 
        hasActiveSession: false,
        session: null 
      });
    }

    const session = result.rows[0];

    // Parse config to get towns and industries
    const config = typeof session.config === 'string' 
      ? JSON.parse(session.config) 
      : session.config;

    return NextResponse.json({
      hasActiveSession: true,
      session: {
        id: session.id,
        name: session.name,
        status: session.status,
        progress: session.progress,
        towns: config.towns || [],
        industries: config.industries || [],
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      }
    });
  } catch (error: any) {
    console.error('Error fetching active session:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
