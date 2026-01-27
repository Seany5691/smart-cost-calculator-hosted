import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

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
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.userId;
    const { shareId } = params;
    const body = await request.json();
    const { can_add_events, can_edit_events } = body;

    // Verify the share belongs to the current user
    const shareCheck = await query(
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
    const result = await query(
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
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.userId;
    const { shareId } = params;

    // Verify the share belongs to the current user
    const shareCheck = await query(
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
    await query(
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
