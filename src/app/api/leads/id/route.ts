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

    // Validate lead ID
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
        error: 'Failed to fetch lead',
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
    const updates: Partial<LeadFormData> = await request.json();

    // Validate lead ID
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

    // Validate lead data
    const validation = validateLead(updates);
    if (!validation.isValid) {
      return NextResponse.json({
        error: 'Invalid lead data',
        success: false,
        data: null,
        validationErrors: validation.errors,
      }, { status: 400 });
    }

    // Get existing lead
    const existingLead = await leadsAdapter.getLeadById(user.id, id);
    if (!existingLead) {
      return NextResponse.json(
        { error: 'Lead not found', success: false, data: null },
        { status: 404 }
      );
    }

    // Sanitize input data
    const sanitizedData = sanitizeLeadData(updates);

    // Validate status transition if status is being updated
    if (sanitizedData.status && sanitizedData.status !== existingLead.status) {
      const statusValidation = validateStatusTransition(
        existingLead.status,
        sanitizedData.status
      );
      if (!statusValidation.isValid) {
        return NextResponse.json({
          error: 'Invalid status transition',
          success: false,
          data: null,
          validationErrors: statusValidation.errors,
        }, { status: 400 });
      }

      // Get next number for new status category
      const newStatusLeads = await leadsAdapter.getLeadsByStatus(
        user.id,
        sanitizedData.status
      );
      const maxNumber = Math.max(...newStatusLeads.map((l: any) => l.number || 0), 0);
      (sanitizedData as any).number = maxNumber + 1;

      // Renumber old status category
      await leadsAdapter.renumberLeads(user.id, existingLead.status);
    }

    // Extract coordinates if maps_address is updated
    let finalUpdates: any = { ...sanitizedData };
    if (sanitizedData.maps_address && sanitizedData.maps_address !== existingLead.maps_address) {
      const coordinates = extractCoordinates(sanitizedData.maps_address);
      finalUpdates.coordinates = coordinates;
    }

    // Update lead in database
    const updatedLead = await leadsAdapter.updateLead(user.id, id, finalUpdates);

    return NextResponse.json({
      data: updatedLead,
      success: true,
      error: null,
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      {
        error: 'Failed to update lead',
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

    // Validate lead ID
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

    // Check if lead exists
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
    await leadsAdapter.renumberLeads(user.id, existingLead.status);

    return NextResponse.json({
      data: { id, deleted: true },
      success: true,
      error: null,
    });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete lead',
        success: false,
        data: null,
      },
      { status: 500 }
    );
  }
}
