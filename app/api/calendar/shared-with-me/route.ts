import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

/**
 * GET /api/calendar/shared-with-me
 * Get all calendars that have been shared with the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.userId;

    // Get all calendars shared with current user
    const result = await query(
      `SELECT 
        cs.id,
        cs.owner_user_id,
        cs.can_add_events,
        cs.can_edit_events,
        cs.created_at,
        u.username as owner_username,
        u.name as owner_name,
        u.email as owner_email
      FROM calendar_shares cs
      JOIN users u ON cs.owner_user_id = u.id
      WHERE cs.shared_with_user_id = $1
      ORDER BY u.name, u.username`,
      [userId]
    );

    return NextResponse.json({
      shared_calendars: result.rows
    });
  } catch (error) {
    console.error('Error fetching shared calendars:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared calendars' },
      { status: 500 }
    );
  }
}
