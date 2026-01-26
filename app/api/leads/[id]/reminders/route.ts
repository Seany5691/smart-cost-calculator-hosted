import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

// GET /api/leads/[id]/reminders - Get all reminders for a lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: leadId } = await params;

    // Check if user has access to this lead (owner or shared)
    const accessCheck = await query(
      `SELECT l.id FROM leads l
       LEFT JOIN lead_shares ls ON l.id = ls.lead_id
       WHERE l.id = $1::uuid AND (l.user_id = $2::uuid OR ls.shared_with_user_id = $2::uuid)
       LIMIT 1`,
      [leadId, authResult.user.userId]
    );

    if (accessCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 });
    }

    // Get all reminders for the lead with user information
    // Sort by reminder_date and reminder_time (Requirements 16.7, 30.16)
    const result = await query(
      `SELECT 
        r.id,
        r.lead_id,
        r.user_id,
        r.message,
        r.reminder_date,
        r.reminder_time,
        r.status,
        r.created_at,
        u.name as user_name,
        u.username
      FROM reminders r
      JOIN users u ON r.user_id = u.id
      WHERE r.lead_id = $1::uuid
      ORDER BY r.reminder_date ASC, r.reminder_time ASC`,
      [leadId]
    );

    return NextResponse.json({ reminders: result.rows });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reminders' },
      { status: 500 }
    );
  }
}

// POST /api/leads/[id]/reminders - Create a new reminder
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: leadId } = await params;
    const {
      title,
      description,
      message,
      note,
      reminder_date,
      reminder_time,
      is_all_day = false,
      reminder_type = 'task',
      priority = 'medium',
      status = 'pending',
      completed = false,
      is_recurring = false,
      recurrence_pattern = null,
      route_id = null,
      shared_with_user_ids = [], // Array of user IDs to share reminder with
    } = await request.json();

    // Check if user has access to this lead (owner or shared)
    const accessCheck = await query(
      `SELECT l.id FROM leads l
       LEFT JOIN lead_shares ls ON l.id = ls.lead_id
       WHERE l.id = $1::uuid AND (l.user_id = $2::uuid OR ls.shared_with_user_id = $2::uuid)
       LIMIT 1`,
      [leadId, authResult.user.userId]
    );

    if (accessCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 });
    }

    // Validation - either message or title is required
    if (!message && !title) {
      return NextResponse.json(
        { error: 'message or title is required' },
        { status: 400 }
      );
    }

    if (!reminder_date) {
      return NextResponse.json(
        { error: 'reminder_date is required' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(reminder_date)) {
      return NextResponse.json(
        { error: 'reminder_date must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    // Validate time format if provided (HH:MM or HH:MM:SS)
    if (reminder_time && !is_all_day) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
      if (!timeRegex.test(reminder_time)) {
        return NextResponse.json(
          { error: 'reminder_time must be in HH:MM or HH:MM:SS format' },
          { status: 400 }
        );
      }
    }

    // Construct due_date from reminder_date and reminder_time
    let due_date;
    if (is_all_day || !reminder_time) {
      // For all-day reminders, set to start of day
      due_date = `${reminder_date} 00:00:00`;
    } else {
      // Combine date and time
      due_date = `${reminder_date} ${reminder_time}`;
    }

    // Insert the reminder with all fields
    const result = await query(
      `INSERT INTO reminders (
        lead_id, user_id, title, description, message, note,
        reminder_date, reminder_time, is_all_day,
        reminder_type, priority, status, completed,
        is_recurring, recurrence_pattern, route_id,
        due_date, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        leadId,
        authResult.user.userId,
        title || message || 'Reminder', // Use message as title if title not provided
        description || null,
        message || title || '',
        note || null,
        reminder_date,
        reminder_time || null,
        is_all_day,
        reminder_type,
        priority,
        status,
        completed,
        is_recurring,
        recurrence_pattern ? JSON.stringify(recurrence_pattern) : null,
        route_id,
        due_date,
      ]
    );

    const reminder = result.rows[0];

    // Share reminder with specified users (excluding the creator)
    // Only users in shared_with_user_ids will receive the reminder
    if (Array.isArray(shared_with_user_ids) && shared_with_user_ids.length > 0) {
      for (const userId of shared_with_user_ids) {
        // Don't share with self - creator already has access as the owner
        if (userId === authResult.user.userId) continue;

        try {
          await query(
            'INSERT INTO reminder_shares (reminder_id, shared_with_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [reminder.id, userId]
          );
        } catch (shareError) {
          console.error('Error sharing reminder with user:', userId, shareError);
          // Continue with other users even if one fails
        }
      }
    }

    // Log the interaction
    await query(
      `INSERT INTO interactions (lead_id, user_id, interaction_type, new_value, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [
        leadId,
        authResult.user.userId,
        'reminder_created',
        message || title || '',
        JSON.stringify({
          reminder_id: reminder.id,
          reminder_date,
          reminder_time,
          reminder_type,
          priority,
          shared_with: shared_with_user_ids,
        }),
      ]
    );

    return NextResponse.json({ reminder }, { status: 201 });
  } catch (error) {
    console.error('Error creating reminder:', error);
    return NextResponse.json(
      { error: 'Failed to create reminder', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
