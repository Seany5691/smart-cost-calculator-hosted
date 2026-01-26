import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

// GET /api/leads/import/sessions - Get import sessions for the current user
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get import sessions for this user
    const result = await pool.query(
      `SELECT * FROM import_sessions 
       WHERE user_id = $1::uuid 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [authResult.user.userId, limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM import_sessions WHERE user_id = $1::uuid',
      [authResult.user.userId]
    );
    const total = parseInt(countResult.rows[0].count);

    return NextResponse.json({
      sessions: result.rows,
      pagination: {
        limit,
        offset,
        total
      }
    });
  } catch (error) {
    console.error('Error fetching import sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import sessions' },
      { status: 500 }
    );
  }
}
