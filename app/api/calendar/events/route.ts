import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

/**
 * GET /api/calendar/events
 * Get all calendar events for the current user
 * Includes events from shared calendars if user has access
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.userId;

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let sql = `
      SELECT 
        ce.*,
        u.username as creator_username,
        CASE 
          WHEN ce.user_id = $1 THEN true
          ELSE false
        END as is_owner
      FROM calendar_events ce
      JOIN users u ON ce.created_by = u.id
      WHERE (
        ce.user_id = $1
        OR ce.user_id IN (
          SELECT owner_user_id 
          FROM calendar_shares 
          WHERE shared_with_user_id = $1
        )
      )
    `;

    const params: any[] = [userId];
    let paramIndex = 2;

    if (startDate) {
      sql += ` AND ce.event_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      sql += ` AND ce.event_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    sql += ` ORDER BY ce.event_date, ce.event_time NULLS LAST`;

    const result = await query(sql, params);

    return NextResponse.json({
      events: result.rows
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/events
 * Create a new calendar event
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
    const {
      title,
      description,
      event_date,
      end_date,
      event_time,
      end_time,
      is_all_day,
      is_multi_day,
      event_type,
      priority,
      location,
      user_id // Optional: for creating events on shared calendars
    } = body;

    // Validate required fields
    if (!title || !event_date) {
      return NextResponse.json(
        { error: 'Title and event_date are required' },
        { status: 400 }
      );
    }

    // Determine the owner of the event
    let eventOwnerId = user_id || userId;

    // If creating on someone else's calendar, verify permission
    if (user_id && user_id !== userId) {
      const permissionCheck = await query(
        `SELECT can_add_events 
         FROM calendar_shares 
         WHERE owner_user_id = $1 AND shared_with_user_id = $2`,
        [user_id, userId]
      );

      if (permissionCheck.rows.length === 0 || !permissionCheck.rows[0].can_add_events) {
        return NextResponse.json(
          { error: 'You do not have permission to add events to this calendar' },
          { status: 403 }
        );
      }
    }

    // Create the event
    const result = await query(
      `INSERT INTO calendar_events (
        user_id,
        title,
        description,
        event_date,
        event_time,
        is_all_day,
        event_type,
        priority,
        location,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        eventOwnerId,
        title,
        description || null,
        event_date,
        event_time || null,
        is_all_day || false,
        event_type || 'event',
        priority || 'medium',
        location || null,
        userId // The person who created it
      ]
    );

    // If multi-day event, create additional entries for each day
    if (is_multi_day && end_date && end_date > event_date) {
      const startDateObj = new Date(event_date);
      const endDateObj = new Date(end_date);
      const currentDate = new Date(startDateObj);
      currentDate.setDate(currentDate.getDate() + 1); // Start from day after first

      while (currentDate <= endDateObj) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        await query(
          `INSERT INTO calendar_events (
            user_id,
            title,
            description,
            event_date,
            event_time,
            is_all_day,
            event_type,
            priority,
            location,
            created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            eventOwnerId,
            title,
            description || null,
            dateStr,
            event_time || null,
            is_all_day || false,
            event_type || 'event',
            priority || 'medium',
            location || null,
            userId
          ]
        );

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return NextResponse.json({
      message: 'Calendar event created successfully',
      event: result.rows[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to create calendar event' },
      { status: 500 }
    );
  }
}
