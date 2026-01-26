import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyAuth } from '@/lib/middleware';
import { invalidateCache } from '@/lib/cache';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  min: 2,
});

// PUT /api/config/hardware/[id] - Update a hardware item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin can update hardware items
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const id = params.id;

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const fieldMap: Record<string, string> = {
      name: 'name',
      cost: 'cost',
      managerCost: 'manager_cost',
      userCost: 'user_cost',
      quantity: 'quantity',
      locked: 'locked',
      isExtension: 'is_extension',
      isActive: 'is_active',
      displayOrder: 'display_order',
    };

    Object.entries(body).forEach(([key, value]) => {
      if (fieldMap[key]) {
        updateFields.push(`${fieldMap[key]} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE hardware_items 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, name, cost, manager_cost as "managerCost", user_cost as "userCost", 
                 quantity, locked, is_extension as "isExtension", is_active as "isActive", 
                 display_order as "displayOrder", created_at as "createdAt", updated_at as "updatedAt"`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Hardware item not found' },
        { status: 404 }
      );
    }

    // Invalidate cache after successful update
    await invalidateCache('hardware');

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating hardware item:', error);
    return NextResponse.json(
      { error: 'Failed to update hardware item' },
      { status: 500 }
    );
  }
}

// DELETE /api/config/hardware/[id] - Soft delete a hardware item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin can delete hardware items
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const id = params.id;

    // Soft delete by setting is_active to false
    const result = await pool.query(
      `UPDATE hardware_items 
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Hardware item not found' },
        { status: 404 }
      );
    }

    // Invalidate cache after successful deletion
    await invalidateCache('hardware');

    return NextResponse.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting hardware item:', error);
    return NextResponse.json(
      { error: 'Failed to delete hardware item' },
      { status: 500 }
    );
  }
}
