import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

// POST /api/leads/bulk - Bulk update leads
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leadIds, updates } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'Lead IDs are required' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Updates object is required' },
        { status: 400 }
      );
    }

    // Build update query dynamically
    const allowedFields = [
      'status',
      'provider',
      'contact_person',
      'type_of_business',
      'background_color',
      'list_name',
      'notes'
    ];

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(snakeKey)) {
        updateFields.push(`${snakeKey} = $${paramIndex}`);
        updateValues.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Add updated_at
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add lead IDs to params
    updateValues.push(leadIds);

    // Execute bulk update
    const query = `
      UPDATE leads 
      SET ${updateFields.join(', ')}
      WHERE id = ANY($${paramIndex})
      RETURNING *
    `;

    const result = await pool.query(query, updateValues);

    // Log interactions for each lead
    for (const lead of result.rows) {
      await pool.query(
        `INSERT INTO interactions (lead_id, user_id, interaction_type, new_value, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          lead.id,
          authResult.user.userId,
          'bulk_update',
          JSON.stringify(updates),
          JSON.stringify({ updated_fields: Object.keys(updates) })
        ]
      );
    }

    return NextResponse.json({
      message: `Successfully updated ${result.rows.length} leads`,
      updated: result.rows
    });
  } catch (error) {
    console.error('Error bulk updating leads:', error);
    return NextResponse.json(
      { error: 'Failed to bulk update leads' },
      { status: 500 }
    );
  }
}

// DELETE /api/leads/bulk - Bulk delete leads
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leadIds } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'Lead IDs are required' },
        { status: 400 }
      );
    }

    // Delete leads (cascade will delete notes, reminders, attachments, interactions)
    const result = await pool.query(
      'DELETE FROM leads WHERE id = ANY($1) AND user_id = $2::uuid RETURNING id',
      [leadIds, authResult.user.userId]
    );

    return NextResponse.json({
      message: `Successfully deleted ${result.rows.length} leads`,
      deletedCount: result.rows.length
    });
  } catch (error) {
    console.error('Error bulk deleting leads:', error);
    return NextResponse.json(
      { error: 'Failed to bulk delete leads' },
      { status: 500 }
    );
  }
}
