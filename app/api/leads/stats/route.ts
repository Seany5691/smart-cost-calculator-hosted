import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

// GET /api/leads/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Build base query with optional user filter
    let whereClause = '1=1';
    const params: any[] = [];
    
    if (userId && authResult.user.role !== 'admin') {
      // Non-admin users can only see their own stats
      whereClause = 'user_id = $1::uuid';
      params.push(authResult.user.userId);
    } else if (userId && authResult.user.role === 'admin') {
      // Admin can see specific user's stats
      whereClause = 'user_id = $1::uuid';
      params.push(userId);
    }

    // Get counts by status
    const statusQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'new') as new_count,
        COUNT(*) FILTER (WHERE status = 'leads') as leads_count,
        COUNT(*) FILTER (WHERE status = 'working') as working_count,
        COUNT(*) FILTER (WHERE status = 'bad') as bad_count,
        COUNT(*) FILTER (WHERE status = 'later') as later_count,
        COUNT(*) FILTER (WHERE status = 'signed') as signed_count,
        COUNT(*) as total_leads
      FROM leads
      WHERE ${whereClause}
    `;

    const statusResult = await pool.query(statusQuery, params);
    const stats = statusResult.rows[0];

    // Get callback counts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const callbackQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE date_to_call_back = $${params.length + 1}::date) as callbacks_today,
        COUNT(*) FILTER (WHERE date_to_call_back > $${params.length + 1}::date) as callbacks_upcoming
      FROM leads
      WHERE ${whereClause} AND date_to_call_back IS NOT NULL
    `;

    const callbackParams = [...params, today.toISOString().split('T')[0]];
    const callbackResult = await pool.query(callbackQuery, callbackParams);
    const callbackStats = callbackResult.rows[0];

    return NextResponse.json({
      totalLeads: parseInt(stats.total_leads) || 0,
      newCount: parseInt(stats.new_count) || 0,
      leadsCount: parseInt(stats.leads_count) || 0,
      workingCount: parseInt(stats.working_count) || 0,
      badCount: parseInt(stats.bad_count) || 0,
      laterCount: parseInt(stats.later_count) || 0,
      signedCount: parseInt(stats.signed_count) || 0,
      callbacksToday: parseInt(callbackStats.callbacks_today) || 0,
      callbacksUpcoming: parseInt(callbackStats.callbacks_upcoming) || 0
    });
  } catch (error) {
    console.error('Error fetching lead stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead stats' },
      { status: 500 }
    );
  }
}
