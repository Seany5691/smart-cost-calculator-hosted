// API routes for individual lead operations
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseHelpers } from '@/lib/supabase';
import { validateLead, sanitizeLeadData, validateUUID } from '@/lib/leads/validation';
import { validateStatusTransition, extractCoordinates } from '@/lib/leads/leadUtils';
import { LeadFormData, LeadStatus } from '@/lib/leads/types';

// GET /api/leads/[id] - Get a single lead
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate UUID format
    if (!validateUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid lead ID format', success: false, data: null },
        { status: 400 }
      );
    }

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false, data: null },
        { status: 401 }
      );
    }

    // Fetch the lead
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !lead) {
      return NextResponse.json(
        { error: 'Lead not found', success: false, data: null },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: lead,
      success: true,
      error: null,
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch lead',
        success: false,
        data: null,
      },
      { status: 500 }
    );
  }
}

// PUT /api/leads/[id] - Update a lead
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate UUID format
    if (!validateUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid lead ID format', success: false, data: null },
        { status: 400 }
      );
    }

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false, data: null },
        { status: 401 }
      );
    }

    // Fetch existing lead
    const { data: existingLead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingLead) {
      return NextResponse.json(
        { error: 'Lead not found', success: false, data: null },
        { status: 404 }
      );
    }

    // Parse request body
    const body: Partial<LeadFormData> = await request.json();

    // Sanitize input data
    const sanitizedData = sanitizeLeadData(body);

    // Validate lead data (partial validation for updates)
    const validation = validateLead({ ...existingLead, ...sanitizedData });
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          success: false,
          data: null,
          validationErrors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Handle status change with validation
    if (sanitizedData.status && sanitizedData.status !== existingLead.status) {
      const statusValidation = validateStatusTransition(
        existingLead,
        sanitizedData.status as LeadStatus
      );

      if (!statusValidation.isValid) {
        return NextResponse.json(
          {
            error: 'Invalid status transition',
            success: false,
            data: null,
            validationErrors: statusValidation.errors,
          },
          { status: 400 }
        );
      }

      // Get next number for new status category
      const newStatusLeads = await supabaseHelpers.getLeadsByStatus(
        user.id,
        sanitizedData.status
      );
      const maxNumber = Math.max(...newStatusLeads.map((l: any) => l.number || 0), 0);
      (sanitizedData as any).number = maxNumber + 1;

      // Renumber old status category
      await supabaseHelpers.renumberLeads(user.id, existingLead.status);
    }

    // Extract coordinates if maps_address is updated
    let updates: any = { ...sanitizedData };
    if (sanitizedData.maps_address && sanitizedData.maps_address !== existingLead.maps_address) {
      const coordinates = extractCoordinates(sanitizedData.maps_address);
      updates.coordinates = coordinates;
    }

    // Update lead in database
    const updatedLead = await supabaseHelpers.updateLead(id, updates);

    return NextResponse.json({
      data: updatedLead,
      success: true,
      error: null,
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update lead',
        success: false,
        data: null,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/leads/[id] - Delete a lead
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate UUID format
    if (!validateUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid lead ID format', success: false, data: null },
        { status: 400 }
      );
    }

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false, data: null },
        { status: 401 }
      );
    }

    // Fetch existing lead to get status for renumbering
    const { data: existingLead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingLead) {
      return NextResponse.json(
        { error: 'Lead not found', success: false, data: null },
        { status: 404 }
      );
    }

    // Delete lead from database
    await supabaseHelpers.deleteLead(id);

    // Renumber remaining leads in the same status category
    await supabaseHelpers.renumberLeads(user.id, existingLead.status);

    return NextResponse.json({
      data: { id, deleted: true },
      success: true,
      error: null,
    });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete lead',
        success: false,
        data: null,
      },
      { status: 500 }
    );
  }
}
