import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyToken } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * PATCH /api/calendar/shares/[shareId]
 * Update permissions for a calendar share
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId;
    const { shareId } = params;
    const body = await request.json();
    const { can_add_events, can_edit_events } = body;

    // Verify the share belongs to the current user
    const shareCheck = await pool.query(
      `SELECT id FROM calendar_shares 
       WHERE id = $1 AND owner_user_id = $2`,
      [shareId, userId]
    );

    if (shareCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Calendar share not found or access denied' },
        { status: 404 }
      );
    }

    // Update the share
    const result = await pool.query(
      `UPDATE calendar_shares 
       SET can_add_events = $1,
           can_edit_events = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, owner_user_id, shared_with_user_id, can_add_events, can_edit_events, updated_at`,
      [can_add_events, can_edit_events, shareId]
    );

    return NextResponse.json({
      message: 'Permissions updated successfully',
      share: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating calendar share:', error);
    return NextResponse.json(
      { error: 'Failed to update calendar share' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar/shares/[shareId]
 * Remove a calendar share
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId;
    const { shareId } = params;

    // Verify the share belongs to the current user
    const shareCheck = await pool.query(
      `SELECT id FROM calendar_shares 
       WHERE id = $1 AND owner_user_id = $2`,
      [shareId, userId]
    );

    if (shareCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Calendar share not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the share
    await pool.query(
      `DELETE FROM calendar_shares WHERE id = $1`,
      [shareId]
    );

    return NextResponse.json({
      message: 'Calendar share removed successfully'
    });
  } catch (error) {
    console.error('Error deleting calendar share:', error);
    return NextResponse.json(
      { error: 'Failed to remove calendar share' },
      { status: 500 }
    );
  }
}
