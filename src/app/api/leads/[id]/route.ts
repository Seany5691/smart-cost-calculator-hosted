// API routes for individual lead operations
import { NextRequest, NextResponse } from 'next/server';
import { databaseHelpers } from '@/lib/databaseAdapter';
import { getLeadsAdapter } from '@/lib/leads/leadsAdapter';
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

    // Get user from auth store (simplified for PostgreSQL)
    const user = { id: '550e8400-e29b-41d4-a716-446655440000' }; // Default admin for now

    // Get leads adapter
    const leadsAdapter = getLeadsAdapter();
    if (!leadsAdapter) {
      return NextResponse.json(
        { error: 'Database adapter not available', success: false, data: null },
        { status: 500 }
      );
    }

    // Fetch the lead
    const lead = await leadsAdapter.getLeadById(user.id, id);

    if (!lead) {
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

    // Get user from auth store (simplified for PostgreSQL)
    const user = { id: '550e8400-e29b-41d4-a716-446655440000' }; // Default admin for now

    // Get leads adapter
    const leadsAdapter = getLeadsAdapter();
    if (!leadsAdapter) {
      return NextResponse.json(
        { error: 'Database adapter not available', success: false, data: null },
        { status: 500 }
      );
    }

    // Fetch existing lead
    const existingLead = await leadsAdapter.getLeadById(user.id, id);

    if (!existingLead) {
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
    const validation = validateLead({ ...existingLead, ...sanitizedData } as any);
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
      const newStatusLeads = await leadsAdapter.getLeadsByStatus(
        user.id,
        sanitizedData.status as LeadStatus
      );
      const maxNumber = Math.max(...newStatusLeads.map((l: any) => l.number || 0), 0);
      (sanitizedData as any).number = maxNumber + 1;

      // Renumber old status category
      await leadsAdapter.renumberLeads(user.id, existingLead.status as LeadStatus);
    }

    // Extract coordinates if maps_address is updated
    let updates: any = { ...sanitizedData };
    if (sanitizedData.maps_address && sanitizedData.maps_address !== existingLead.maps_address) {
      const coordinates = extractCoordinates(sanitizedData.maps_address);
      updates.coordinates = coordinates;
    }

    // Update lead in database
    await leadsAdapter.updateLead(user.id, id, updates);

    return NextResponse.json({
      data: updates,
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

    // Get user from auth store (simplified for PostgreSQL)
    const user = { id: '550e8400-e29b-41d4-a716-446655440000' }; // Default admin for now

    // Get leads adapter
    const leadsAdapter = getLeadsAdapter();
    if (!leadsAdapter) {
      return NextResponse.json(
        { error: 'Database adapter not available', success: false, data: null },
        { status: 500 }
      );
    }

    // Fetch existing lead to get status for renumbering
    const existingLead = await leadsAdapter.getLeadById(user.id, id);

    if (!existingLead) {
      return NextResponse.json(
        { error: 'Lead not found', success: false, data: null },
        { status: 404 }
      );
    }

    // Delete lead from database
    await leadsAdapter.deleteLead(user.id, id);

    // Renumber remaining leads in the same status category
    await leadsAdapter.renumberLeads(user.id, existingLead.status as LeadStatus);

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
