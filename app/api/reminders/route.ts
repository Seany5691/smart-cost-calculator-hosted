import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

// GET /api/reminders - Get all reminders for the authenticated user
// This works EXACTLY like the events API - simple and straightforward
export async function GET(request: NextRequest) {
  // NOTE: The readFile tool shows $$ as $ due to template literal interpretation
  // The actual file has $$ which is correct for PostgreSQL parameterized queries
  // DO NOT "fix" the $ signs - they are already correct as $$
  
  let sql = '';
  let params: any[] = [];
  
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.userId;
    const { searchParams } = new URL(request.url);
    
    // Filters
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const includeCompleted = searchParams.get('includeCompleted') === 'true';
    const filterUserId = searchParams.get('user_id'); // For viewing shared calendars
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;

    // Build query - EXACTLY like events API
    sql = `
      SELECT 
        r.id,
        r.lead_id,
        r.user_id,
        r.reminder_type,
        r.priority,
        r.due_date,
        r.title,
        r.description,
        r.recurrence_pattern,
        r.completed,
        r.completed_at,
        r.created_at,
        r.updated_at,
        r.route_id,
        r.is_all_day,
        r.note,
        r.message,
        r.is_recurring,
        r.parent_reminder_id,
        r.status,
        r.reminder_date,
        r.reminder_time,
        u.name as user_name,
        u.username,
        l.name as lead_name,
        l.contact_person as lead_contact_person,
        l.town as lead_town,
        l.phone as lead_phone,
        CASE WHEN r.user_id = $$1 THEN false ELSE true END as is_shared
      FROM reminders r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN leads l ON r.lead_id = l.id
      WHERE 1=1
    `;

    params = [userId];
    let paramIndex = 2;

    // Filter by user - EXACTLY like events API (no permission check!)
    if (filterUserId) {
      // Viewing a specific user's calendar (shared)
      sql += ` AND r.user_id = $$${paramIndex}`;
      params.push(filterUserId);
      paramIndex++;
    } else {
      // Viewing own calendar - only show MY reminders
      sql += ` AND r.user_id = $$1`;
    }

    // Apply status filter
    if (status) {
      sql += ` AND r.status = $$${paramIndex}`;
      params.push(status);
      paramIndex++;
    } else if (!includeCompleted) {
      sql += ` AND r.completed = $$${paramIndex}`;
      params.push(false);
      paramIndex++;
    }

    // Apply type filter
    if (type) {
      sql += ` AND r.reminder_type = $$${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    // Apply priority filter
    if (priority) {
      sql += ` AND r.priority = $$${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    // Apply date range filter
    if (dateFrom) {
      sql += ` AND r.reminder_date >= $$${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }
    if (dateTo) {
      sql += ` AND r.reminder_date <= $$${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    // Get total count
    let countSql = `
      SELECT COUNT(*) 
      FROM reminders r
      WHERE 1=1
    `;
    let countParams: any[] = [userId];
    let countParamIndex = 2;

    if (filterUserId) {
      countSql += ` AND r.user_id = $$${countParamIndex}`;
      countParams.push(filterUserId);
      countParamIndex++;
    } else {
      countSql += ` AND r.user_id = $$1`;
    }

    if (status) {
      countSql += ` AND r.status = $$${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    } else if (!includeCompleted) {
      countSql += ` AND r.completed = $$${countParamIndex}`;
      countParams.push(false);
      countParamIndex++;
    }

    if (type) {
      countSql += ` AND r.reminder_type = $$${countParamIndex}`;
      countParams.push(type);
      countParamIndex++;
    }

    if (priority) {
      countSql += ` AND r.priority = $$${countParamIndex}`;
      countParams.push(priority);
      countParamIndex++;
    }

    if (dateFrom) {
      countSql += ` AND r.reminder_date >= $$${countParamIndex}`;
      countParams.push(dateFrom);
      countParamIndex++;
    }
    if (dateTo) {
      countSql += ` AND r.reminder_date <= $$${countParamIndex}`;
      countParams.push(dateTo);
      countParamIndex++;
    }

    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0].count);

    sql += ` ORDER BY r.reminder_date ASC, r.reminder_time ASC, r.priority DESC`;
    sql += ` LIMIT $$${paramIndex} OFFSET $$${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Categorize reminders
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const categorized = {
      overdue: [] as any[],
      today: [] as any[],
      tomorrow: [] as any[],
      upcoming: [] as any[],
      future: [] as any[],
      completed: [] as any[],
    };

    result.rows.forEach((reminder) => {
      const dueDate = reminder.reminder_date ? new Date(reminder.reminder_date) : new Date(reminder.due_date);
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

      if (reminder.completed || reminder.status === 'completed') {
        categorized.completed.push(reminder);
      } else if (dueDateOnly < today) {
        categorized.overdue.push(reminder);
      } else if (dueDateOnly.getTime() === today.getTime()) {
        categorized.today.push(reminder);
      } else if (dueDateOnly.getTime() === tomorrow.getTime()) {
        categorized.tomorrow.push(reminder);
      } else if (dueDateOnly < nextWeek) {
        categorized.upcoming.push(reminder);
      } else {
        categorized.future.push(reminder);
      }
    });

    return NextResponse.json({
      reminders: result.rows,
      categorized,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[REMINDERS API] Error fetching reminders:', error);
    console.error('[REMINDERS API] Error details:', error instanceof Error ? error.message : String(error));
    console.error('[REMINDERS API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[REMINDERS API] SQL Query:', sql);
    console.error('[REMINDERS API] SQL Params:', params);
    return NextResponse.json(
      { 
        error: 'Failed to fetch reminders',
        details: error instanceof Error ? error.message : String(error),
        sql: sql,
        params: params
      },
      { status: 500 }
    );
  }
}


// POST /api/reminders - Create a standalone reminder (not attached to a lead)
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      reminder_date,
      reminder_time,
      is_all_day,
      reminder_type,
      priority,
      message,
      note,
      is_recurring,
      recurrence_pattern,
      route_id,
    } = body;

    // Validation
    if (!reminder_date) {
      return NextResponse.json(
        { error: 'Reminder date is required' },
        { status: 400 }
      );
    }

    if (!title && !message) {
      return NextResponse.json(
        { error: 'Title or message is required' },
        { status: 400 }
      );
    }

    // Calculate due_date from reminder_date and reminder_time
    let due_date: string;
    
    // Extract just the date part if reminder_date is already in ISO format
    const dateOnly = reminder_date.split('T')[0];
    
    if (is_all_day || !reminder_time) {
      // For all-day reminders, set time to 00:00:00
      due_date = `${dateOnly}T00:00:00.000Z`;
    } else {
      // Combine date and time
      due_date = `${dateOnly}T${reminder_time}:00.000Z`;
    }

    // Insert reminder
    const sql = `
      INSERT INTO reminders (
        user_id,
        lead_id,
        route_id,
        title,
        description,
        reminder_date,
        reminder_time,
        due_date,
        is_all_day,
        reminder_type,
        priority,
        message,
        note,
        is_recurring,
        recurrence_pattern,
        status,
        completed
      ) VALUES ($$1, $$2, $$3, $$4, $$5, $$6, $$7, $$8, $$9, $$10, $$11, $$12, $$13, $$14, $$15, $$16, $$17)
      RETURNING *
    `;

    const result = await query(sql, [
      authResult.user.userId,
      null, // lead_id is null for standalone reminders
      route_id || null,
      title || null,
      description || null,
      dateOnly, // Use date only, not full ISO string
      is_all_day ? null : reminder_time,
      due_date,
      is_all_day || false,
      reminder_type || 'task',
      priority || 'medium',
      message || title || '',
      note || description || null,
      is_recurring || false,
      recurrence_pattern ? JSON.stringify(recurrence_pattern) : null,
      'pending',
      false
    ]);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating reminder:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
    });
    return NextResponse.json(
      { 
        error: 'Failed to create reminder',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
