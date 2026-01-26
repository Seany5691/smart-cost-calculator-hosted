import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

// GET /api/leads/[id]/interactions - Get all interactions for a lead
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadId = params.id;

    // Get all interactions for the lead with user information
    const result = await query(
      `SELECT 
        i.id,
        i.lead_id,
        i.user_id,
        i.interaction_type,
        i.old_value,
        i.new_value,
        i.metadata,
        i.created_at,
        u.name as user_name,
        u.username
      FROM interactions i
      JOIN users u ON i.user_id = u.id
      WHERE i.lead_id = $1
      ORDER BY i.created_at DESC`,
      [leadId]
    );

    return NextResponse.json({ interactions: result.rows });
  } catch (error) {
    console.error('Error fetching interactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch interactions' },
      { status: 500 }
    );
  }
}
