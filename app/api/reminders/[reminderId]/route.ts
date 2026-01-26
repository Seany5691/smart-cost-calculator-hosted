import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

// PUT /api/reminders/[reminderId] - Update a standalone reminder
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ reminderId: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reminderId } = await params;
    const updates = await request.json();

    // Build dynamic update query
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

    // Add reminderId and userId to values
    values.push(reminderId);
    values.push(authResult.user.userId);

    // Only allow updating reminders owned by the user
    const result = await query(
      `UPDATE reminders 
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Reminder not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({ reminder: result.rows[0] });
  } catch (error) {
    console.error('Error updating reminder:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update reminder' },
      { status: 500 }
    );
  }
}

// DELETE /api/reminders/[reminderId] - Delete a standalone reminder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reminderId: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reminderId } = await params;

    // Only allow deleting reminders owned by the user
    const result = await query(
      `DELETE FROM reminders 
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [reminderId, authResult.user.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Reminder not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return NextResponse.json(
      { error: 'Failed to delete reminder' },
      { status: 500 }
    );
  }
}
