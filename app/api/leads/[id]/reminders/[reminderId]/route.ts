import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

// PUT /api/leads/[id]/reminders/[reminderId] - Update a reminder
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reminderId: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reminderId } = await params;
    const updates = await request.json();

    // Build dynamic update query (Requirements 16.12, 30.18)
    const allowedFields = [
      'message',
      'reminder_date',
      'reminder_time',
      'status',
      'completed',
      'priority',
      'reminder_type',
      'title',
      'description',
      'note',
      'is_all_day',
    ];

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        // Validate status
        if (key === 'status') {
          const validStatuses = ['pending', 'completed', 'snoozed'];
          if (!validStatuses.includes(updates[key])) {
            throw new Error('Invalid status. Must be one of: pending, completed, snoozed');
          }
        }

        // Validate date format
        if (key === 'reminder_date') {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(updates[key])) {
            throw new Error('reminder_date must be in YYYY-MM-DD format');
          }
        }

        // Validate time format
        if (key === 'reminder_time') {
          const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
          if (!timeRegex.test(updates[key])) {
            throw new Error('reminder_time must be in HH:MM or HH:MM:SS format');
          }
        }

        updateFields.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Add reminderId to values
    values.push(reminderId);

    const result = await query(
      `UPDATE reminders 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, lead_id, user_id, message, reminder_date, reminder_time, 
                 status, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }

    // Get user information for the response
    const userResult = await query(
      `SELECT name, username FROM users WHERE id = $1`,
      [result.rows[0].user_id]
    );

    const reminder = {
      ...result.rows[0],
      user_name: userResult.rows[0].name,
      username: userResult.rows[0].username,
    };

    // Log the interaction
    await query(
      `INSERT INTO interactions (lead_id, user_id, interaction_type, new_value, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [
        result.rows[0].lead_id,
        authResult.user.userId,
        updates.status === 'completed' ? 'reminder_completed' : 'reminder_updated',
        result.rows[0].message,
        JSON.stringify({
          reminder_id: reminderId,
          updates,
        }),
      ]
    );

    return NextResponse.json({ reminder });
  } catch (error) {
    console.error('Error updating reminder:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update reminder' },
      { status: 500 }
    );
  }
}

// DELETE /api/leads/[id]/reminders/[reminderId] - Delete a reminder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reminderId: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reminderId } = await params;

    // Get reminder info before deleting
    const reminderResult = await query(
      `SELECT lead_id, message FROM reminders WHERE id = $1`,
      [reminderId]
    );

    if (reminderResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }

    const { lead_id, message } = reminderResult.rows[0];

    // Delete the reminder
    await query(`DELETE FROM reminders WHERE id = $1`, [reminderId]);

    // Log the interaction
    await query(
      `INSERT INTO interactions (lead_id, user_id, interaction_type, old_value, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [
        lead_id,
        authResult.user.userId,
        'reminder_deleted',
        message,
        JSON.stringify({ reminder_id: reminderId }),
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return NextResponse.json(
      { error: 'Failed to delete reminder' },
      { status: 500 }
    );
  }
}
