import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

// GET /api/calendar/events - Get all calendar events for the authenticated user
// Includes events from owned calendar and shared calendars
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;
    const { searchParams } = new URL(request.url);
    const viewUserId = searchParams.get('viewUserId'); // Optional: view another user's calendar if shared

    // If viewUserId is provided, check if current user has access to that calendar
    if (viewUserId && viewUserId !== userId) {
      const shareCheck = await query(
        `SELECT * FROM calendar_shares 
         WHERE owner_user_id = $1 AND shared_with_user_id = $2`,
        [viewUserId, userId]
      );

      if (shareCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Access denied to this calendar' }, { status: 403 });
      }

      // Return events for the viewed user's calendar
      const events = await query(
        `SELECT ce.*, 
                u.username as created_by_username,
                u.email as created_by_email
         FROM calendar_events ce
         LEFT JOIN users u ON ce.created_by = u.id
         WHERE ce.user_id = $1
         ORDER BY ce.event_date DESC, ce.event_time DESC`,
        [viewUserId]
      );

      return NextResponse.json({ events: events.rows });
    }

    // Return events for the authenticated user's own calendar
    const events = await query(
      `SELECT ce.*, 
              u.username as created_by_username,
              u.email as created_by_email
       FROM calendar_events ce
       LEFT JOIN users u ON ce.created_by = u.id
       WHERE ce.user_id = $1
       ORDER BY ce.event_date DESC, ce.event_time DESC`,
      [userId]
    );

    return NextResponse.json({ events: events.rows });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

// POST /api/calendar/events - Create a new calendar event
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;
    const body = await request.json();

    const {
      title,
      description,
      event_date,
      event_time,
      is_all_day = false,
      event_type = 'event',
      priority = 'medium',
      location,
      owner_user_id // Optional: if creating event on someone else's calendar
    } = body;

    // Validation
    if (!title || !event_date) {
      return NextResponse.json(
        { error: 'Title and event date are required' },
        { status: 400 }
      );
    }

    // Determine the owner of the event
    let eventOwnerId = owner_user_id || userId;

    // If creating on someone else's calendar, verify permission
    if (owner_user_id && owner_user_id !== userId) {
      const shareCheck = await query(
        `SELECT * FROM calendar_shares 
         WHERE owner_user_id = $1 AND shared_with_user_id = $2 AND can_add_events = true`,
        [owner_user_id, userId]
      );

      if (shareCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'You do not have permission to add events to this calendar' },
          { status: 403 }
        );
      }

      eventOwnerId = owner_user_id;
    }

    // Create the event
    const result = await query(
      `INSERT INTO calendar_events (
        user_id, title, description, event_date, event_time, is_all_day,
        event_type, priority, location, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        eventOwnerId,
        title,
        description || null,
        event_date,
        is_all_day ? null : event_time,
        is_all_day,
        event_type,
        priority,
        location || null,
        userId // created_by is always the current user
      ]
    );

    return NextResponse.json({ event: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to create calendar event' },
      { status: 500 }
    );
  }
}
