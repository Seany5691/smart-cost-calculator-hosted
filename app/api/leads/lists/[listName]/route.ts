import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

// DELETE /api/leads/lists/[listName] - Delete all leads in a list
export async function DELETE(
  request: NextRequest,
  { params }: { params: { listName: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const listName = decodeURIComponent(params.listName);

    // Delete all leads in the list (cascade will delete notes, reminders, attachments, interactions)
    const result = await pool.query(
      'DELETE FROM leads WHERE list_name = $1 AND user_id = $2::uuid RETURNING id',
      [listName, authResult.user.userId]
    );

    return NextResponse.json({
      message: `Successfully deleted ${result.rows.length} leads from list "${listName}"`,
      deletedCount: result.rows.length
    });
  } catch (error) {
    console.error('Error deleting list:', error);
    return NextResponse.json(
      { error: 'Failed to delete list' },
      { status: 500 }
    );
  }
}
