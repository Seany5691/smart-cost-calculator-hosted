import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

// PUT /api/calendar/events/[eventId] - Update a calendar event
export async function PUT(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.userId;
    const { eventId } = params;
    const body = await request.json();

    // Check if event exists and user has permission
    const eventCheck = await query(
      `SELECT ce.*, cs.can_edit_events
       FROM calendar_events ce
       LEFT JOIN calendar_shares cs ON ce.user_id = cs.owner_user_id AND cs.shared_with_user_id = $1
       WHERE ce.id = $2`,
      [userId, eventId]
    );

    if (eventCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const event = eventCheck.rows[0];

    // Check permission: must be owner or have edit permission
    const isOwner = event.user_id === userId;
    const canEdit = event.can_edit_events === true;

    if (!isOwner && !canEdit) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this event' },
        { status: 403 }
      );
    }

    // Update the event
    const {
      title,
      description,
      event_date,
      event_time,
      is_all_day,
      event_type,
      priority,
      location
    } = body;

    const result = await query(
      `UPDATE calendar_events
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           event_date = COALESCE($3, event_date),
           event_time = CASE WHEN $5 = true THEN NULL ELSE COALESCE($4, event_time) END,
           is_all_day = COALESCE($5, is_all_day),
           event_type = COALESCE($6, event_type),
           priority = COALESCE($7, priority),
           location = COALESCE($8, location),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [
        title,
        description,
        event_date,
        event_time,
        is_all_day,
        event_type,
        priority,
        location,
        eventId
      ]
    );

    return NextResponse.json({ event: result.rows[0] });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to update calendar event' },
      { status: 500 }
    );
  }
}

// DELETE /api/calendar/events/[eventId] - Delete a calendar event
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.userId;
    const { eventId } = params;

    // Check if event exists and user has permission
    const eventCheck = await query(
      `SELECT ce.*, cs.can_edit_events
       FROM calendar_events ce
       LEFT JOIN calendar_shares cs ON ce.user_id = cs.owner_user_id AND cs.shared_with_user_id = $1
       WHERE ce.id = $2`,
      [userId, eventId]
    );

    if (eventCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const event = eventCheck.rows[0];

    // Check permission: must be owner or have edit permission
    const isOwner = event.user_id === userId;
    const canEdit = event.can_edit_events === true;

    if (!isOwner && !canEdit) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this event' },
        { status: 403 }
      );
    }

    // Delete the event
    await query('DELETE FROM calendar_events WHERE id = $1', [eventId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to delete calendar event' },
      { status: 500 }
    );
  }
}
