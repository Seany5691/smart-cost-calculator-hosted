import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

/**
 * GET /api/calendar/shares
 * Get all calendar shares for the current user (where they are the owner)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.userId;

    // Get all shares where current user is the owner
    const result = await query(
      `SELECT 
        cs.id,
        cs.shared_with_user_id,
        cs.can_add_events,
        cs.can_edit_events,
        cs.created_at,
        u.username,
        u.email
      FROM calendar_shares cs
      JOIN users u ON cs.shared_with_user_id = u.id
      WHERE cs.owner_user_id = $1
      ORDER BY u.username`,
      [userId]
    );

    return NextResponse.json({
      shares: result.rows
    });
  } catch (error) {
    console.error('Error fetching calendar shares:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar shares' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/shares
 * Create a new calendar share
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.userId;
    const body = await request.json();
    const { shared_with_user_id, can_add_events, can_edit_events } = body;

    // Validate input
    if (!shared_with_user_id) {
      return NextResponse.json(
        { error: 'shared_with_user_id is required' },
        { status: 400 }
      );
    }

    // Cannot share with yourself
    if (shared_with_user_id === userId) {
      return NextResponse.json(
        { error: 'Cannot share calendar with yourself' },
        { status: 400 }
      );
    }

    // Check if share already exists
    const existingShare = await query(
      `SELECT id FROM calendar_shares 
       WHERE owner_user_id = $1 AND shared_with_user_id = $2`,
      [userId, shared_with_user_id]
    );

    if (existingShare.rows.length > 0) {
      return NextResponse.json(
        { error: 'Calendar is already shared with this user' },
        { status: 400 }
      );
    }

    // Create the share
    const result = await query(
      `INSERT INTO calendar_shares (
        owner_user_id,
        shared_with_user_id,
        can_add_events,
        can_edit_events
      ) VALUES ($1, $2, $3, $4)
      RETURNING id, owner_user_id, shared_with_user_id, can_add_events, can_edit_events, created_at`,
      [userId, shared_with_user_id, can_add_events || false, can_edit_events || false]
    );

    return NextResponse.json({
      message: 'Calendar shared successfully',
      share: result.rows[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating calendar share:', error);
    return NextResponse.json(
      { error: 'Failed to share calendar' },
      { status: 500 }
    );
  }
}
