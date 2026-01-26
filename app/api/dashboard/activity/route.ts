import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { pool } from '@/lib/db';

/**
 * GET /api/dashboard/activity
 * Fetches activity timeline from all components
 * Implements role-based filtering (admin sees all, users see own)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.user.userId;
    const userRole = authResult.user.role;
    const userName = authResult.user.name || authResult.user.username;

    // Get limit from query params (default 20)
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const client = await pool.connect();
    try {
      // Fetch activities from activity_log table
      // Admin sees all activities, users see only their own
      const activityQuery = userRole === 'admin'
        ? `
          SELECT 
            al.id,
            al.user_id,
            u.name as user_name,
            u.username,
            al.activity_type,
            al.entity_type,
            al.entity_id,
            al.metadata,
            al.created_at
          FROM activity_log al
          LEFT JOIN users u ON al.user_id = u.id
          ORDER BY al.created_at DESC
          LIMIT $1
        `
        : `
          SELECT 
            al.id,
            al.user_id,
            $2 as user_name,
            $3 as username,
            al.activity_type,
            al.entity_type,
            al.entity_id,
            al.metadata,
            al.created_at
          FROM activity_log al
          WHERE al.user_id = $1
          ORDER BY al.created_at DESC
          LIMIT $4
        `;

      const activityParams = userRole === 'admin' 
        ? [limit]
        : [userId, userName, authResult.user.username, limit];

      const activityResult = await client.query(activityQuery, activityParams);

      const activities = activityResult.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name || row.username,
        activityType: row.activity_type,
        entityType: row.entity_type,
        entityId: row.entity_id,
        metadata: row.metadata,
        createdAt: row.created_at,
      }));

      return NextResponse.json({
        activities,
        count: activities.length,
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('[API] Activity timeline error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity timeline' },
      { status: 500 }
    );
  }
}
