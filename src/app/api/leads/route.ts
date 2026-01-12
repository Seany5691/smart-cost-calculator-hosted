// API routes for lead management
import { NextRequest, NextResponse } from 'next/server';
import { postgresqlLeads } from '@/lib/leads/postgresqlLeads';
import { validateLead, sanitizeLeadData } from '@/lib/leads/validation';
import { extractCoordinates } from '@/lib/leads/leadUtils';
import { Lead, LeadFormData, LeadSearchFilters, LeadStatus } from '@/lib/leads/types';

// GET /api/leads - Retrieve leads with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get user from auth store (simplified for PostgreSQL)
    const user = { id: '550e8400-e29b-41d4-a716-446655440000' }; // Default admin for now
    
    // Parse query parameters
    const status = searchParams.get('status') as LeadStatus | null;
    const listName = searchParams.get('list_name');
    const provider = searchParams.get('provider');
    const searchTerm = searchParams.get('search');
    
    // Build filters object
    const filters: LeadSearchFilters = {};
    if (status) filters.status = status;
    if (listName) filters.list_name = listName;
    if (provider) filters.provider = provider;
    if (searchTerm) filters.searchTerm = searchTerm;
    
    // Fetch leads
    const leads = await postgresqlLeads.getLeads(user.id, filters);
    
    return NextResponse.json({
      data: leads,
      success: true,
      error: null,
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch leads',
        success: false,
        data: null,
      },
      { status: 500 }
    );
  }
}

// POST /api/leads - Create a new lead
export async function POST(request: NextRequest) {
  try {
    const leadData: LeadFormData = await request.json();
    
    // Get user from auth store (simplified for PostgreSQL)
    const user = { id: '550e8400-e29b-41d4-a716-446655440000' }; // Default admin for now
    
    // Validate lead data
    const validation = validateLead(leadData);
    if (!validation.isValid) {
      return NextResponse.json({
        error: 'Invalid lead data',
        success: false,
        data: null,
        validationErrors: validation.errors,
      }, { status: 400 });
    }
    
    // Sanitize input data
    const sanitizedData = sanitizeLeadData(leadData);
    
    // Extract coordinates if maps_address is provided
    let finalLeadData = { ...sanitizedData };
    if (sanitizedData.maps_address) {
      const coordinates = extractCoordinates(sanitizedData.maps_address);
      // Add coordinates to lead data (type assertion for flexibility)
      finalLeadData = { ...finalLeadData, coordinates } as any;
    }
    
    // Create lead
    const newLead = await postgresqlLeads.createLead(user.id, finalLeadData);
    
    return NextResponse.json({
      data: newLead,
      success: true,
      error: null,
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      {
        error: 'Failed to create lead',
        success: false,
        data: null,
      },
      { status: 500 }
    );
  }
}

// PUT /api/leads - Bulk update leads
export async function PUT(request: NextRequest) {
  try {
    const { leadIds, updates } = await request.json();
    
    // Get user from auth store (simplified for PostgreSQL)
    const user = { id: '550e8400-e29b-41d4-a716-446655440000' }; // Default admin for now
    
    // Validate input
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({
        error: 'Invalid lead IDs',
        success: false,
        data: null,
      }, { status: 400 });
    }
    
    // Sanitize input data
    const sanitizedUpdates = sanitizeLeadData(updates);
    
    // Bulk update leads
    const updatedLeads = await postgresqlLeads.bulkUpdateLeads(
      user.id,
      leadIds,
      sanitizedUpdates as Partial<Lead>
    );
    
    return NextResponse.json({
      data: updatedLeads,
      success: true,
      error: null,
    });
  } catch (error) {
    console.error('Error bulk updating leads:', error);
    return NextResponse.json(
      {
        error: 'Failed to update leads',
        success: false,
        data: null,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/leads - Delete multiple leads
export async function DELETE(request: NextRequest) {
  try {
    const { leadIds } = await request.json();
    
    // Get user from auth store (simplified for PostgreSQL)
    const user = { id: '550e8400-e29b-41d4-a716-446655440000' }; // Default admin for now
    
    // Validate input
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({
        error: 'Invalid lead IDs',
        success: false,
        data: null,
      }, { status: 400 });
    }
    
    // Delete leads
    await postgresqlLeads.bulkDeleteLeads(user.id, leadIds);
    
    return NextResponse.json({
      data: { deleted: leadIds.length },
      success: true,
      error: null,
    });
  } catch (error) {
    console.error('Error deleting leads:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete leads',
        success: false,
        data: null,
      },
      { status: 500 }
    );
  }
}
