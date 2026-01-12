import { NextRequest, NextResponse } from 'next/server';
import { generateId } from '@/lib/leads/localStorage';

// NOTE: This is a mock API that returns data structure for client-side localStorage
// The actual storage happens on the client side since localStorage is browser-only

// GET /api/leads/[id]/notes - Get all notes for a lead
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    
    // Return empty array - client will handle localStorage
    // This endpoint exists to maintain API contract
    return NextResponse.json({
      data: [],
      success: true,
      error: null,
      _note: 'Client-side localStorage implementation'
    });
  } catch (error: any) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      {
        data: null,
        success: false,
        error: error.message || 'Failed to fetch notes'
      },
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
    const leadId = params.id;
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
    
    // Create new note structure - client will save to localStorage
    const newNote: any = {
      id: generateId(),
      lead_id: leadId,
      user_id: 'local-user',
      content: content.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return NextResponse.json({
      data: newNote,
      success: true,
      error: null,
      _note: 'Client must save to localStorage'
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      {
        data: null,
        success: false,
        error: error.message || 'Failed to create note'
      },
      { status: 500 }
    );
  }
}
