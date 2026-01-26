import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

// GET /api/leads/lists - Get all unique list names for the current user
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(
      `SELECT DISTINCT list_name 
       FROM leads 
       WHERE user_id = $1::uuid AND list_name IS NOT NULL
       ORDER BY list_name`,
      [authResult.user.userId]
    );

    const listNames = result.rows.map(row => row.list_name);

    return NextResponse.json({ listNames });
  } catch (error) {
    console.error('Error fetching list names:', error);
    return NextResponse.json(
      { error: 'Failed to fetch list names' },
      { status: 500 }
    );
  }
}
