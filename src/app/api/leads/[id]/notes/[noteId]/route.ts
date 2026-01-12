import { NextRequest, NextResponse } from 'next/server';
import { storage, STORAGE_KEYS } from '@/lib/leads/localStorage';

// PUT /api/leads/[id]/notes/[noteId] - Update a note
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    const { noteId } = params;
    const body = await request.json();
    const { content } = body;
    
    if (!content || content.trim() === '') {
      return NextResponse.json(
        {
          data: null,
          success: false,
          error: 'Note content is required'
        },
        { status: 400 }
      );
    }
    
    // Get all notes from localStorage
    const allNotes = storage.get<any[]>(STORAGE_KEYS.NOTES) || [];
    
    // Find and update the note
    const noteIndex = allNotes.findIndex(note => note.id === noteId);
    
    if (noteIndex === -1) {
      return NextResponse.json(
        {
          data: null,
          success: false,
          error: 'Note not found'
        },
        { status: 404 }
      );
    }
    
    // Update the note
    const updatedNote: any = {
      ...allNotes[noteIndex],
      content: content.trim(),
      updated_at: new Date().toISOString()
    };
    
    allNotes[noteIndex] = updatedNote;
    storage.set(STORAGE_KEYS.NOTES, allNotes);
    
    return NextResponse.json({
      data: updatedNote,
      success: true,
      error: null
    });
  } catch (error: any) {
    console.error('Error updating note:', error);
    return NextResponse.json(
      {
        data: null,
        success: false,
        error: error.message || 'Failed to update note'
      },
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
    const { noteId } = params;
    
    // Get all notes from localStorage
    const allNotes = storage.get<any[]>(STORAGE_KEYS.NOTES) || [];
    
    // Find the note
    const noteIndex = allNotes.findIndex(note => note.id === noteId);
    
    if (noteIndex === -1) {
      return NextResponse.json(
        {
          data: null,
          success: false,
          error: 'Note not found'
        },
        { status: 404 }
      );
    }
    
    // Remove the note
    const deletedNote = allNotes[noteIndex];
    allNotes.splice(noteIndex, 1);
    storage.set(STORAGE_KEYS.NOTES, allNotes);
    
    return NextResponse.json({
      data: deletedNote,
      success: true,
      error: null
    });
  } catch (error: any) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      {
        data: null,
        success: false,
        error: error.message || 'Failed to delete note'
      },
      { status: 500 }
    );
  }
}
