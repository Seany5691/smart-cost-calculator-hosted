import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

// GET /api/calendar/shares - Get calendar sharing information
// Returns both calendars shared BY the user and calendars shared WITH the user
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;

    // Get calendars shared BY this user (user is owner)
    const sharedByMe = await query(
      `SELECT cs.*, 
              u.username as shared_with_username,
              u.email as shared_with_email
       FROM calendar_shares cs
       JOIN users u ON cs.shared_with_user_id = u.id
       WHERE cs.owner_user_id = $1
       ORDER BY cs.created_at DESC`,
      [userId]
    );

    // Get calendars shared WITH this user (user is sharee)
    const sharedWithMe = await query(
      `SELECT cs.*, 
              u.username as owner_username,
              u.email as owner_email
       FROM calendar_shares cs
       JOIN users u ON cs.owner_user_id = u.id
       WHERE cs.shared_with_user_id = $1
       ORDER BY cs.created_at DESC`,
      [userId]
    );

    return NextResponse.json({
      sharedByMe: sharedByMe.rows,
      sharedWithMe: sharedWithMe.rows
    });
  } catch (error) {
    console.error('Error fetching calendar shares:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar shares' },
      { status: 500 }
    );
  }
}

// POST /api/calendar/shares - Share calendar with another user
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;
    const body = await request.json();

    const {
      shared_with_user_id,
      can_add_events = false,
      can_edit_events = false
    } = body;

    // Validation
    if (!shared_with_user_id) {
      return NextResponse.json(
        { error: 'shared_with_user_id is required' },
        { status: 400 }
      );
    }

    if (shared_with_user_id === userId) {
      return NextResponse.json(
        { error: 'Cannot share calendar with yourself' },
        { status: 400 }
      );
    }

    // Check if user exists
    const userCheck = await query(
      'SELECT id FROM users WHERE id = $1',
      [shared_with_user_id]
    );

    if (userCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if share already exists
    const existingShare = await query(
      `SELECT * FROM calendar_shares 
       WHERE owner_user_id = $1 AND shared_with_user_id = $2`,
      [userId, shared_with_user_id]
    );

    if (existingShare.rows.length > 0) {
      // Update existing share
      const result = await query(
        `UPDATE calendar_shares
         SET can_add_events = $1,
             can_edit_events = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE owner_user_id = $3 AND shared_with_user_id = $4
         RETURNING *`,
        [can_add_events, can_edit_events, userId, shared_with_user_id]
      );

      return NextResponse.json({ share: result.rows[0] });
    }

    // Create new share
    const result = await query(
      `INSERT INTO calendar_shares (
        owner_user_id, shared_with_user_id, can_add_events, can_edit_events
      ) VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [userId, shared_with_user_id, can_add_events, can_edit_events]
    );

    return NextResponse.json({ share: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating calendar share:', error);
    return NextResponse.json(
      { error: 'Failed to create calendar share' },
      { status: 500 }
    );
  }
}
