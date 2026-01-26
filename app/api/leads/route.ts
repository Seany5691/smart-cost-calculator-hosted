import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

/**
 * GET /api/leads - Get all leads with filtering, searching, sorting, and pagination
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 * - status: Comma-separated list of statuses to filter by
 * - provider: Comma-separated list of providers to filter by
 * - town: Comma-separated list of towns to filter by
 * - listName: Filter by list name
 * - search: Search term to filter across multiple fields
 * - sortBy: Field to sort by (number, name, provider, town, date)
 * - sortDirection: Sort direction (asc, desc)
 * 
 * Requirements: 30.1, 8.14, 4.11, 4.19-4.26
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Pagination - default to 50 per page as per requirements
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Filters
    const status = searchParams.get('status')?.split(',').filter(Boolean);
    const provider = searchParams.get('provider')?.split(',').filter(Boolean);
    const town = searchParams.get('town')?.split(',').filter(Boolean);
    // Support both listName (camelCase) and list_name (snake_case) for compatibility
    const listName = searchParams.get('listName') || searchParams.get('list_name');
    const search = searchParams.get('search');
    
    // Sorting - support number, name, provider, town, date
    const sortBy = searchParams.get('sortBy') || 'number';
    const sortDirection = searchParams.get('sortDirection') || 'asc';

    // Build query
    let query = `SELECT * FROM leads WHERE user_id = $1::uuid`;
    const params: any[] = [authResult.user.userId];
    let paramIndex = 2;

    // Apply filters
    if (status && status.length > 0) {
      query += ` AND status = ANY($` + paramIndex + `)`;
      params.push(status);
      paramIndex++;
    }

    if (provider && provider.length > 0) {
      query += ` AND provider = ANY($` + paramIndex + `)`;
      params.push(provider);
      paramIndex++;
    }

    if (town && town.length > 0) {
      query += ` AND town = ANY($` + paramIndex + `)`;
      params.push(town);
      paramIndex++;
    }

    if (listName) {
      console.log('[LEADS-GET] Filtering by list_name:', listName);
      query += ` AND list_name = $` + paramIndex;
      params.push(listName);
      paramIndex++;
    }

    // Search across multiple fields (name, phone, provider, address, type_of_business, notes)
    // Requirements: 8.14
    if (search) {
      query += ` AND (
        name ILIKE $` + paramIndex + ` OR
        phone ILIKE $` + paramIndex + ` OR
        provider ILIKE $` + paramIndex + ` OR
        address ILIKE $` + paramIndex + ` OR
        type_of_business ILIKE $` + paramIndex + ` OR
        notes ILIKE $` + paramIndex + `
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count before pagination
    console.log('[LEADS-GET] Query:', query);
    console.log('[LEADS-GET] Params:', params);
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add sorting
    // Map sortBy to actual column names
    const sortColumnMap: Record<string, string> = {
      'number': 'number',
      'name': 'name',
      'provider': 'provider',
      'town': 'town',
      'date': 'created_at'
    };
    
    const sortColumn = sortColumnMap[sortBy] || 'number';
    const direction = sortDirection.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    
    // Add sorting with NULLS LAST to handle null values properly
    query += ` ORDER BY ` + sortColumn + ` ` + direction + ` NULLS LAST`;
    
    // Add pagination
    query += ` LIMIT $` + paramIndex + ` OFFSET $` + (paramIndex + 1);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Now add shared leads with the SAME filters applied
    let sharedLeadsQuery = `
      SELECT DISTINCT l.* FROM leads l
      INNER JOIN lead_shares ls ON l.id = ls.lead_id
      WHERE ls.shared_with_user_id = $1::uuid
    `;
    const sharedParams: any[] = [authResult.user.userId];
    let sharedParamIndex = 2;

    // Apply the SAME filters to shared leads
    if (status && status.length > 0) {
      sharedLeadsQuery += ` AND l.status = ANY($${sharedParamIndex})`;
      sharedParams.push(status);
      sharedParamIndex++;
    }

    if (provider && provider.length > 0) {
      sharedLeadsQuery += ` AND l.provider = ANY($${sharedParamIndex})`;
      sharedParams.push(provider);
      sharedParamIndex++;
    }

    if (town && town.length > 0) {
      sharedLeadsQuery += ` AND l.town = ANY($${sharedParamIndex})`;
      sharedParams.push(town);
      sharedParamIndex++;
    }

    if (listName) {
      sharedLeadsQuery += ` AND l.list_name = $${sharedParamIndex}`;
      sharedParams.push(listName);
      sharedParamIndex++;
    }

    // Apply search to shared leads
    if (search) {
      sharedLeadsQuery += ` AND (
        l.name ILIKE $${sharedParamIndex} OR
        l.phone ILIKE $${sharedParamIndex} OR
        l.provider ILIKE $${sharedParamIndex} OR
        l.address ILIKE $${sharedParamIndex} OR
        l.type_of_business ILIKE $${sharedParamIndex} OR
        l.notes ILIKE $${sharedParamIndex}
      )`;
      sharedParams.push(`%${search}%`);
      sharedParamIndex++;
    }

    console.log('[LEADS-GET] Shared leads query:', sharedLeadsQuery);
    console.log('[LEADS-GET] Shared leads params:', sharedParams);
    
    const sharedResult = await pool.query(sharedLeadsQuery, sharedParams);
    
    // Combine owned and shared leads
    const allLeads = [...result.rows, ...sharedResult.rows];

    // Separate "No Good" leads (background_color #FF0000) and regular leads
    // Requirements: 4.13 - "No Good" leads should always appear at the bottom
    const regularLeads = allLeads.filter((lead: any) => lead.background_color !== '#FF0000');
    const noGoodLeads = allLeads.filter((lead: any) => lead.background_color === '#FF0000');
    
    // Combine with "No Good" leads at the end
    const sortedLeads = [...regularLeads, ...noGoodLeads];

    const response = NextResponse.json({
      leads: sortedLeads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

    // Prevent caching to ensure fresh data on every request
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads - Create a new lead
 * 
 * Requirements: 30.2, 22.1-22.9
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      mapsAddress,
      name,
      phone,
      provider,
      address,
      town,
      contactPerson,
      typeOfBusiness,
      status = 'new',
      notes,
      dateToCallBack,
      dateSigned,
      coordinates,
      backgroundColor,
      listName
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Validate status-specific requirements
    if (status === 'later' && !dateToCallBack) {
      return NextResponse.json(
        { error: 'Date to call back is required for "later" status' },
        { status: 400 }
      );
    }

    if (status === 'signed' && !dateSigned) {
      return NextResponse.json(
        { error: 'Date signed is required for "signed" status' },
        { status: 400 }
      );
    }

    // Get the next number for this user (auto-increment per user)
    // Requirements: 14.20, 22.4
    const numberResult = await pool.query(
      'SELECT COALESCE(MAX(number), 0) + 1 as next_number FROM leads WHERE user_id = $1::uuid',
      [authResult.user.userId]
    );
    const number = numberResult.rows[0].next_number;

    // Insert lead
    const result = await pool.query(
      `INSERT INTO leads (
        number, maps_address, name, phone, provider, address, town,
        contact_person, type_of_business, status, notes, date_to_call_back,
        date_signed, coordinates, background_color, list_name, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        number,
        mapsAddress,
        name,
        phone,
        provider,
        address,
        town,
        contactPerson,
        typeOfBusiness,
        status,
        notes,
        dateToCallBack,
        dateSigned,
        coordinates ? JSON.stringify(coordinates) : null,
        backgroundColor,
        listName,
        authResult.user.userId
      ]
    );

    // Log interaction
    await pool.query(
      `INSERT INTO interactions (lead_id, user_id, interaction_type, new_value, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        result.rows[0].id,
        authResult.user.userId,
        'lead_created',
        status,
        JSON.stringify({ name, provider, town })
      ]
    );

    // Log activity
    await pool.query(
      `INSERT INTO activity_log (user_id, activity_type, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        authResult.user.userId,
        'lead_created',
        'lead',
        result.rows[0].id,
        JSON.stringify({ name, provider, status })
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    );
  }
}
