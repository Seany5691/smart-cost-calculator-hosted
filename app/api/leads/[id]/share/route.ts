import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

// GET - Get list of users with access to this lead
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

    // Check if user has access to this lead (owner or shared with)
    const leadCheck = await query(
      'SELECT * FROM leads WHERE id = $1::uuid AND user_id = $2::uuid',
      [leadId, authResult.user.userId]
    );

    const sharedCheck = await query(
      'SELECT * FROM lead_shares WHERE lead_id = $1::uuid AND shared_with_user_id = $2::uuid',
      [leadId, authResult.user.userId]
    );

    if (leadCheck.rows.length === 0 && sharedCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 });
    }

    // Get all users who have access to this lead
    const shares = await query(`
      SELECT 
        ls.id,
        ls.shared_with_user_id as user_id,
        u.username,
        u.email,
        ls.shared_by_user_id,
        ub.username as shared_by_username,
        ls.created_at
      FROM lead_shares ls
      JOIN users u ON ls.shared_with_user_id = u.id
      JOIN users ub ON ls.shared_by_user_id = ub.id
      WHERE ls.lead_id = $1::uuid
      ORDER BY ls.created_at DESC
    `, [leadId]);

    // Get lead owner info
    const owner = await query(
      'SELECT l.user_id, u.username, u.email FROM leads l JOIN users u ON l.user_id = u.id WHERE l.id = $1::uuid',
      [leadId]
    );

    return NextResponse.json({ 
      shares: shares.rows, 
      owner: owner.rows[0] || null 
    });
  } catch (error) {
    console.error('Error fetching lead shares:', error);
    return NextResponse.json({ error: 'Failed to fetch lead shares' }, { status: 500 });
  }
}

// POST - Share lead with users
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
    const { userIds } = await request.json();

    console.log('[SHARE] Attempting to share lead:', { leadId, userIds, currentUser: authResult.user.userId });

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs array is required' }, { status: 400 });
    }

    // Check if user has access to this lead (owner or already shared with)
    const leadCheck = await query(
      'SELECT * FROM leads WHERE id = $1::uuid AND user_id = $2::uuid',
      [leadId, authResult.user.userId]
    );

    const sharedCheck = await query(
      'SELECT * FROM lead_shares WHERE lead_id = $1::uuid AND shared_with_user_id = $2::uuid',
      [leadId, authResult.user.userId]
    );

    console.log('[SHARE] Access check:', { 
      isOwner: leadCheck.rows.length > 0, 
      hasSharedAccess: sharedCheck.rows.length > 0 
    });

    if (leadCheck.rows.length === 0 && sharedCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 });
    }

    // Share with each user
    const results = [];
    for (const userId of userIds) {
      // Don't share with self
      if (userId === authResult.user.userId) continue;

      // Check if already shared
      const existing = await query(
        'SELECT id FROM lead_shares WHERE lead_id = $1::uuid AND shared_with_user_id = $2::uuid',
        [leadId, userId]
      );

      if (existing.rows.length === 0) {
        console.log('[SHARE] Creating share:', { leadId, userId, sharedBy: authResult.user.userId });
        
        await query(
          'INSERT INTO lead_shares (lead_id, shared_by_user_id, shared_with_user_id) VALUES ($1::uuid, $2::uuid, $3::uuid)',
          [leadId, authResult.user.userId, userId]
        );

        // Create notification
        await query(
          'INSERT INTO lead_share_notifications (user_id, lead_id, shared_by_user_id) VALUES ($1::uuid, $2::uuid, $3::uuid)',
          [userId, leadId, authResult.user.userId]
        );

        results.push({ userId, status: 'shared' });
      } else {
        results.push({ userId, status: 'already_shared' });
      }
    }

    console.log('[SHARE] Share complete:', results);
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('[SHARE] Error sharing lead:', error);
    return NextResponse.json({ 
      error: 'Failed to share lead', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// DELETE - Remove share access
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: leadId } = await params;
    const { searchParams } = new URL(request.url);
    const userIdToRemove = searchParams.get('userId');

    if (!userIdToRemove) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if user is the owner or the one who shared it
    const leadCheck = await query(
      'SELECT * FROM leads WHERE id = $1::uuid AND user_id = $2::uuid',
      [leadId, authResult.user.userId]
    );

    const shareCheck = await query(
      'SELECT * FROM lead_shares WHERE lead_id = $1::uuid AND shared_with_user_id = $2::uuid AND shared_by_user_id = $3::uuid',
      [leadId, userIdToRemove, authResult.user.userId]
    );

    if (leadCheck.rows.length === 0 && shareCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Not authorized to remove this share' }, { status: 403 });
    }

    // Remove the share
    await query(
      'DELETE FROM lead_shares WHERE lead_id = $1::uuid AND shared_with_user_id = $2::uuid',
      [leadId, userIdToRemove]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing lead share:', error);
    return NextResponse.json({ error: 'Failed to remove lead share' }, { status: 500 });
  }
}
