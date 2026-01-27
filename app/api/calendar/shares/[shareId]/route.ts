import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

// PUT /api/calendar/shares/[shareId] - Update calendar share permissions
export async function PUT(
  request: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.userId;
    const { shareId } = params;
    const body = await request.json();

    // Check if share exists and user is the owner
    const shareCheck = await query(
      'SELECT * FROM calendar_shares WHERE id = $1 AND owner_user_id = $2',
      [shareId, userId]
    );

    if (shareCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Calendar share not found or you do not have permission' },
        { status: 404 }
      );
    }

    const { can_add_events, can_edit_events } = body;

    // Update the share
    const result = await query(
      `UPDATE calendar_shares
       SET can_add_events = COALESCE($1, can_add_events),
           can_edit_events = COALESCE($2, can_edit_events),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [can_add_events, can_edit_events, shareId]
    );

    return NextResponse.json({ share: result.rows[0] });
  } catch (error) {
    console.error('Error updating calendar share:', error);
    return NextResponse.json(
      { error: 'Failed to update calendar share' },
      { status: 500 }
    );
  }
}

// DELETE /api/calendar/shares/[shareId] - Remove calendar share
export async function DELETE(
  request: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.userId;
    const { shareId } = params;

    // Check if share exists and user is the owner
    const shareCheck = await query(
      'SELECT * FROM calendar_shares WHERE id = $1 AND owner_user_id = $2',
      [shareId, userId]
    );

    if (shareCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Calendar share not found or you do not have permission' },
        { status: 404 }
      );
    }

    // Delete the share
    await query('DELETE FROM calendar_shares WHERE id = $1', [shareId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar share:', error);
    return NextResponse.json(
      { error: 'Failed to delete calendar share' },
      { status: 500 }
    );
  }
}
