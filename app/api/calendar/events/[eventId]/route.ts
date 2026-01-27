import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyToken } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * GET /api/calendar/events/[eventId]
 * Get a specific calendar event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
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
    const { eventId } = params;

    // Get event and verify access
    const result = await pool.query(
      `SELECT ce.*, u.username as creator_username
       FROM calendar_events ce
       JOIN users u ON ce.created_by = u.id
       WHERE ce.id = $1
       AND (
         ce.user_id = $2
         OR ce.user_id IN (
           SELECT owner_user_id 
           FROM calendar_shares 
           WHERE shared_with_user_id = $2
         )
       )`,
      [eventId, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Event not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      event: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar event' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/calendar/events/[eventId]
 * Update a calendar event
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string } }
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
    const { eventId } = params;
    const body = await request.json();

    console.log('[CALENDAR EVENT UPDATE] Request:', { eventId, userId, body });

    // Check if user owns the event or has edit permission
    const eventCheck = await pool.query(
      `SELECT ce.user_id, ce.created_by
       FROM calendar_events ce
       WHERE ce.id = $1`,
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const event = eventCheck.rows[0];
    const isOwner = event.user_id === userId;
    const isCreator = event.created_by === userId;

    // If not owner or creator, check for edit permission
    if (!isOwner && !isCreator) {
      const permissionCheck = await pool.query(
        `SELECT can_edit_events 
         FROM calendar_shares 
         WHERE owner_user_id = $1 AND shared_with_user_id = $2`,
        [event.user_id, userId]
      );

      if (permissionCheck.rows.length === 0 || !permissionCheck.rows[0].can_edit_events) {
        return NextResponse.json(
          { error: 'You do not have permission to edit this event' },
          { status: 403 }
        );
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const allowedFields = [
      'title', 'description', 'event_date', 'event_time',
      'is_all_day', 'event_type', 'priority', 'location'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(body[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(eventId);

    const queryText = `
      UPDATE calendar_events 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    console.log('[CALENDAR EVENT UPDATE] Query:', { queryText, values });

    const result = await pool.query(queryText, values);

    console.log('[CALENDAR EVENT UPDATE] Success:', result.rows[0]);

    return NextResponse.json({
      message: 'Event updated successfully',
      event: result.rows[0]
    });
  } catch (error) {
    console.error('[CALENDAR EVENT UPDATE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update calendar event' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar/events/[eventId]
 * Delete a calendar event
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
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
    const { eventId } = params;

    console.log('[CALENDAR EVENT DELETE] Request:', { eventId, userId });

    // Check if user owns the event or created it
    const eventCheck = await pool.query(
      `SELECT user_id, created_by
       FROM calendar_events
       WHERE id = $1`,
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const event = eventCheck.rows[0];
    const isOwner = event.user_id === userId;
    const isCreator = event.created_by === userId;

    if (!isOwner && !isCreator) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this event' },
        { status: 403 }
      );
    }

    // Delete the event
    await pool.query(
      `DELETE FROM calendar_events WHERE id = $1`,
      [eventId]
    );

    console.log('[CALENDAR EVENT DELETE] Success');

    return NextResponse.json({
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('[CALENDAR EVENT DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete calendar event' },
      { status: 500 }
    );
  }
}
