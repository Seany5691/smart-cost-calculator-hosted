import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

// GET - Get unread share notifications for current user
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notifications = await query(`
      SELECT 
        lsn.id,
        lsn.lead_id,
        lsn.shared_by_user_id,
        lsn.created_at,
        l.name as business_name,
        l.contact_person,
        u.username as shared_by_username
      FROM lead_share_notifications lsn
      JOIN leads l ON lsn.lead_id = l.id
      JOIN users u ON lsn.shared_by_user_id = u.id
      WHERE lsn.user_id = $1::uuid AND lsn.is_read = false
      ORDER BY lsn.created_at DESC
    `, [authResult.user.userId]);

    return NextResponse.json({ notifications: notifications.rows });
  } catch (error) {
    console.error('Error fetching share notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST - Mark notification as read
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    await query(
      'UPDATE lead_share_notifications SET is_read = true WHERE id = $1 AND user_id = $2::uuid',
      [notificationId, authResult.user.userId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
  }
}
