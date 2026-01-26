import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

// GET /api/leads/[id]/notes - Get all notes for a lead
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

    // Check if user has access to this lead (owner or shared)
    const accessCheck = await query(
      `SELECT l.id FROM leads l
       LEFT JOIN lead_shares ls ON l.id = ls.lead_id
       WHERE l.id = $1 AND (l.user_id = $2 OR ls.shared_with_user_id = $2)
       LIMIT 1`,
      [leadId, authResult.user.userId]
    );

    if (accessCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 });
    }

    // Get all notes for the lead with user information
    const result = await query(
      `SELECT 
        n.id,
        n.lead_id,
        n.user_id,
        n.content,
        n.created_at,
        n.updated_at,
        u.name as user_name,
        u.username
      FROM notes n
      JOIN users u ON n.user_id = u.id
      WHERE n.lead_id = $1::uuid
      ORDER BY n.created_at DESC`,
      [leadId]
    );

    return NextResponse.json({ notes: result.rows });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

// POST /api/leads/[id]/notes - Create a new note
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadId = params.id;
    const { content } = await request.json();

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      );
    }

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

    // Insert the note
    const result = await query(
      `INSERT INTO notes (lead_id, user_id, content, created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, lead_id, user_id, content, created_at, updated_at`,
      [leadId, authResult.user.userId, content.trim()]
    );

    // Get user information for the response
    const userResult = await query(
      `SELECT name, username FROM users WHERE id = $1::uuid`,
      [authResult.user.userId]
    );

    const note = {
      ...result.rows[0],
      user_name: userResult.rows[0].name,
      username: userResult.rows[0].username,
    };

    // Log the interaction
    await query(
      `INSERT INTO interactions (lead_id, user_id, interaction_type, new_value, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [
        leadId,
        authResult.user.userId,
        'note_added',
        content.trim(),
        JSON.stringify({ note_id: result.rows[0].id }),
      ]
    );

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}
