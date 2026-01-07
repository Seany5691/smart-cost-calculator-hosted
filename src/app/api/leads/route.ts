// API routes for lead management
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseHelpers } from '@/lib/supabase';
import { validateLead, sanitizeLeadData } from '@/lib/leads/validation';
import { getNextLeadNumber, extractCoordinates } from '@/lib/leads/leadUtils';
import { LeadFormData, LeadStatus } from '@/lib/leads/types';

// GET /api/leads - Retrieve leads with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false, data: null },
        { status: 401 }
      );
    }

    // Extract filter parameters
    const status = searchParams.get('status');
    const provider = searchParams.get('provider');
    const searchTerm = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let leads;

    // If search term is provided, use search functionality
    if (searchTerm) {
      const filters = {
        status: status || undefined,
        provider: provider || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };
      leads = await supabaseHelpers.searchLeads(user.id, searchTerm, filters);
    } else if (status) {
      // Filter by status
      leads = await supabaseHelpers.getLeadsByStatus(user.id, status);
    } else {
      // Get all leads
      leads = await supabaseHelpers.getLeads(user.id);
    }

    return NextResponse.json({
      data: leads,
      success: true,
      error: null,
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch leads',
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
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false, data: null },
        { status: 401 }
      );
    }

    // Parse request body
    const body: LeadFormData = await request.json();

    // Sanitize input data
    const sanitizedData = sanitizeLeadData(body);

    // Validate lead data
    const validation = validateLead(sanitizedData);
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

    // Extract coordinates from maps_address if provided
    let coordinates = null;
    if (sanitizedData.maps_address) {
      coordinates = extractCoordinates(sanitizedData.maps_address);
    }

    // Get the next number for the status category
    const status = sanitizedData.status || 'leads';
    const existingLeads = await supabaseHelpers.getLeadsByStatus(user.id, status);
    const nextNumber = getNextLeadNumber(existingLeads);

    // Create lead object
    const leadData = {
      ...sanitizedData,
      status,
      number: nextNumber,
      coordinates,
      user_id: user.id,
    };

    // Insert lead into database
    const newLead = await supabaseHelpers.createLead(leadData);

    return NextResponse.json(
      {
        data: newLead,
        success: true,
        error: null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create lead',
        success: false,
        data: null,
      },
      { status: 500 }
    );
  }
}
