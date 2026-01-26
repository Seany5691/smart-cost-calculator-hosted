import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

// GET /api/leads/[id] - Get a single lead
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user owns the lead or has it shared with them
    const result = await pool.query(
      `SELECT l.* FROM leads l
       LEFT JOIN lead_shares ls ON l.id = ls.lead_id
       WHERE l.id = $1::uuid AND (l.user_id = $2::uuid OR ls.shared_with_user_id = $2::uuid)
       LIMIT 1`,
      [params.id, authResult.user.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const response = NextResponse.json(result.rows[0]);
    
    // Prevent caching to ensure fresh data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Error fetching lead:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead' },
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
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get existing lead - check if user owns it or has it shared
    const existingResult = await pool.query(
      `SELECT l.*, 
        CASE WHEN l.user_id = $2::uuid THEN true ELSE false END as is_owner
       FROM leads l
       LEFT JOIN lead_shares ls ON l.id = ls.lead_id
       WHERE l.id = $1::uuid AND (l.user_id = $2::uuid OR ls.shared_with_user_id = $2::uuid)
       LIMIT 1`,
      [params.id, authResult.user.userId]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const existingLead = existingResult.rows[0];
    
    // Anyone with access (owner or sharee) can update the lead
    // No ownership check needed - access check already done above
    
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
      status,
      notes,
      dateToCallBack,
      date_to_call_back,
      dateSigned,
      date_signed,
      coordinates,
      backgroundColor,
      listName
    } = body;

    // Support both camelCase and snake_case for backward compatibility
    const callbackDate = date_to_call_back || dateToCallBack;
    const signedDate = date_signed || dateSigned;

    // Validate status-specific requirements
    if (status === 'later' && !callbackDate) {
      return NextResponse.json(
        { error: 'Date to call back is required for "later" status' },
        { status: 400 }
      );
    }

    if (status === 'signed' && !signedDate) {
      return NextResponse.json(
        { error: 'Date signed is required for "signed" status' },
        { status: 400 }
      );
    }

    const statusChanged = status && status !== existingLead.status;

    // Update lead
    const result = await pool.query(
      `UPDATE leads SET
        maps_address = COALESCE($1, maps_address),
        name = COALESCE($2, name),
        phone = COALESCE($3, phone),
        provider = COALESCE($4, provider),
        address = COALESCE($5, address),
        town = COALESCE($6, town),
        contact_person = COALESCE($7, contact_person),
        type_of_business = COALESCE($8, type_of_business),
        status = COALESCE($9, status),
        notes = COALESCE($10, notes),
        date_to_call_back = COALESCE($11, date_to_call_back),
        date_signed = COALESCE($12, date_signed),
        coordinates = COALESCE($13, coordinates),
        background_color = COALESCE($14, background_color),
        list_name = COALESCE($15, list_name),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16
      RETURNING *`,
      [
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
        callbackDate,
        signedDate,
        coordinates ? JSON.stringify(coordinates) : null,
        backgroundColor,
        listName,
        params.id
      ]
    );

    // Log interaction
    await pool.query(
      `INSERT INTO interactions (lead_id, user_id, interaction_type, old_value, new_value, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.id,
        authResult.user.userId,
        'lead_updated',
        JSON.stringify(existingLead),
        JSON.stringify(result.rows[0]),
        JSON.stringify({ fields_updated: Object.keys(body) })
      ]
    );

    // If status changed, log status change
    if (statusChanged) {
      await pool.query(
        `INSERT INTO interactions (lead_id, user_id, interaction_type, old_value, new_value)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          params.id,
          authResult.user.userId,
          'status_change',
          existingLead.status,
          status
        ]
      );

      // Log activity
      await pool.query(
        `INSERT INTO activity_log (user_id, activity_type, entity_type, entity_id, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          authResult.user.userId,
          'lead_status_changed',
          'lead',
          params.id,
          JSON.stringify({ 
            name: result.rows[0].name,
            old_status: existingLead.status,
            new_status: status
          })
        ]
      );
    }

    // If callback scheduled
    if (callbackDate && callbackDate !== existingLead.date_to_call_back) {
      await pool.query(
        `INSERT INTO interactions (lead_id, user_id, interaction_type, new_value)
         VALUES ($1, $2, $3, $4)`,
        [
          params.id,
          authResult.user.userId,
          'callback_scheduled',
          callbackDate
        ]
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    );
  }
}

// PATCH /api/leads/[id] - Partially update a lead
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get existing lead - check if user owns it or has it shared
    const existingResult = await pool.query(
      `SELECT l.*, 
        CASE WHEN l.user_id = $2::uuid THEN true ELSE false END as is_owner
       FROM leads l
       LEFT JOIN lead_shares ls ON l.id = ls.lead_id
       WHERE l.id = $1::uuid AND (l.user_id = $2::uuid OR ls.shared_with_user_id = $2::uuid)
       LIMIT 1`,
      [params.id, authResult.user.userId]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const existingLead = existingResult.rows[0];
    
    // Anyone with access (owner or sharee) can update the lead
    const body = await request.json();
    
    // Build dynamic update query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Only update fields that are provided in the request
    if (body.background_color !== undefined) {
      updates.push(`background_color = $${paramIndex++}`);
      values.push(body.background_color);
    }
    if (body.mapsAddress !== undefined) {
      updates.push(`maps_address = $${paramIndex++}`);
      values.push(body.mapsAddress);
    }
    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(body.name);
    }
    if (body.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(body.phone);
    }
    if (body.provider !== undefined) {
      updates.push(`provider = $${paramIndex++}`);
      values.push(body.provider);
    }
    if (body.address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      values.push(body.address);
    }
    if (body.town !== undefined) {
      updates.push(`town = $${paramIndex++}`);
      values.push(body.town);
    }
    if (body.contactPerson !== undefined) {
      updates.push(`contact_person = $${paramIndex++}`);
      values.push(body.contactPerson);
    }
    if (body.typeOfBusiness !== undefined) {
      updates.push(`type_of_business = $${paramIndex++}`);
      values.push(body.typeOfBusiness);
    }
    if (body.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(body.status);
    }
    if (body.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(body.notes);
    }
    if (body.dateToCallBack !== undefined || body.date_to_call_back !== undefined) {
      updates.push(`date_to_call_back = $${paramIndex++}`);
      values.push(body.date_to_call_back || body.dateToCallBack);
    }
    if (body.dateSigned !== undefined || body.date_signed !== undefined) {
      updates.push(`date_signed = $${paramIndex++}`);
      values.push(body.date_signed || body.dateSigned);
    }
    if (body.coordinates !== undefined) {
      updates.push(`coordinates = $${paramIndex++}`);
      values.push(body.coordinates ? JSON.stringify(body.coordinates) : null);
    }
    if (body.listName !== undefined) {
      updates.push(`list_name = $${paramIndex++}`);
      values.push(body.listName);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Add updated_at timestamp
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Add lead ID as the last parameter
    values.push(params.id);

    // Execute update
    const result = await pool.query(
      `UPDATE leads SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    // Log interaction
    await pool.query(
      `INSERT INTO interactions (lead_id, user_id, interaction_type, old_value, new_value, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.id,
        authResult.user.userId,
        'lead_updated',
        JSON.stringify(existingLead),
        JSON.stringify(result.rows[0]),
        JSON.stringify({ fields_updated: Object.keys(body), method: 'PATCH' })
      ]
    );

    // If status changed, log status change
    if (body.status && body.status !== existingLead.status) {
      await pool.query(
        `INSERT INTO interactions (lead_id, user_id, interaction_type, old_value, new_value)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          params.id,
          authResult.user.userId,
          'status_change',
          existingLead.status,
          body.status
        ]
      );

      // Log activity
      await pool.query(
        `INSERT INTO activity_log (user_id, activity_type, entity_type, entity_id, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          authResult.user.userId,
          'lead_status_changed',
          'lead',
          params.id,
          JSON.stringify({ 
            name: result.rows[0].name,
            old_status: existingLead.status,
            new_status: body.status
          })
        ]
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error patching lead:', error);
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    );
  }
}

// DELETE /api/leads/[id] - Delete a lead or unshare it
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if lead exists and get ownership info
    const leadResult = await pool.query(
      'SELECT id, user_id, name FROM leads WHERE id = $1::uuid',
      [params.id]
    );

    if (leadResult.rows.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const lead = leadResult.rows[0];
    const isOwner = lead.user_id === authResult.user.userId;

    // Check if user has shared access
    const shareResult = await pool.query(
      'SELECT id FROM lead_shares WHERE lead_id = $1::uuid AND shared_with_user_id = $2::uuid',
      [params.id, authResult.user.userId]
    );

    const isSharee = shareResult.rows.length > 0;

    // If user is neither owner nor sharee, deny access
    if (!isOwner && !isSharee) {
      return NextResponse.json({ 
        error: 'Lead not found or access denied' 
      }, { status: 404 });
    }

    // If user is a sharee (not owner), just remove the share
    if (isSharee && !isOwner) {
      await pool.query(
        'DELETE FROM lead_shares WHERE lead_id = $1::uuid AND shared_with_user_id = $2::uuid',
        [params.id, authResult.user.userId]
      );

      return NextResponse.json({ 
        message: 'Lead unshared successfully',
        action: 'unshared'
      });
    }

    // If user is the owner, delete the lead entirely (for everyone)
    if (isOwner) {
      // Delete lead (cascade will delete notes, reminders, attachments, interactions, shares)
      await pool.query('DELETE FROM leads WHERE id = $1', [params.id]);

      return NextResponse.json({ 
        message: 'Lead deleted successfully',
        action: 'deleted'
      });
    }

    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  } catch (error) {
    console.error('Error deleting/unsharing lead:', error);
    return NextResponse.json(
      { error: 'Failed to delete/unshare lead' },
      { status: 500 }
    );
  }
}
