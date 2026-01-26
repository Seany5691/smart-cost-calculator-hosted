import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

// PUT /api/leads/[id]/notes/[noteId] - Update a note
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { noteId } = params;
    const { content } = await request.json();

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      );
    }

    // Check if note exists and belongs to the user (or user is admin)
    const checkResult = await query(
      `SELECT user_id, content FROM notes WHERE id = $1`,
      [noteId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const note = checkResult.rows[0];
    const isAdmin = authResult.user.role === 'admin';
    const isOwner = note.user_id === authResult.user.userId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'You can only edit your own notes' },
        { status: 403 }
      );
    }

    // Update the note
    const result = await query(
      `UPDATE notes 
       SET content = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, lead_id, user_id, content, created_at, updated_at`,
      [content.trim(), noteId]
    );

    // Get user information for the response
    const userResult = await query(
      `SELECT name, username FROM users WHERE id = $1`,
      [result.rows[0].user_id]
    );

    const updatedNote = {
      ...result.rows[0],
      user_name: userResult.rows[0].name,
      username: userResult.rows[0].username,
    };

    // Log the interaction
    await query(
      `INSERT INTO interactions (lead_id, user_id, interaction_type, old_value, new_value, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [
        result.rows[0].lead_id,
        authResult.user.userId,
        'note_updated',
        note.content,
        content.trim(),
        JSON.stringify({ note_id: noteId }),
      ]
    );

    return NextResponse.json({ note: updatedNote });
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

// DELETE /api/leads/[id]/notes/[noteId] - Delete a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { noteId } = params;

    // Check if note exists and belongs to the user (or user is admin)
    const checkResult = await query(
      `SELECT user_id, lead_id, content FROM notes WHERE id = $1`,
      [noteId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const note = checkResult.rows[0];
    const isAdmin = authResult.user.role === 'admin';
    const isOwner = note.user_id === authResult.user.userId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'You can only delete your own notes' },
        { status: 403 }
      );
    }

    // Delete the note
    await query(`DELETE FROM notes WHERE id = $1`, [noteId]);

    // Log the interaction
    await query(
      `INSERT INTO interactions (lead_id, user_id, interaction_type, old_value, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [
        note.lead_id,
        authResult.user.userId,
        'note_deleted',
        note.content,
        JSON.stringify({ note_id: noteId }),
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}
