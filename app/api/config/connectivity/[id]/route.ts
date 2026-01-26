import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyAuth } from '@/lib/middleware';
import { invalidateCache } from '@/lib/cache';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  min: 2,
});

// PUT /api/config/connectivity/[id] - Update a connectivity item
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

    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const id = params.id;

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
      `UPDATE connectivity_items 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, name, cost, manager_cost as "managerCost", user_cost as "userCost", 
                 quantity, locked, is_active as "isActive", 
                 display_order as "displayOrder", created_at as "createdAt", updated_at as "updatedAt"`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Connectivity item not found' },
        { status: 404 }
      );
    }

    await invalidateCache('connectivity');

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating connectivity item:', error);
    return NextResponse.json(
      { error: 'Failed to update connectivity item' },
      { status: 500 }
    );
  }
}

// DELETE /api/config/connectivity/[id] - Soft delete a connectivity item
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

    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const id = params.id;

    const result = await pool.query(
      `UPDATE connectivity_items 
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Connectivity item not found' },
        { status: 404 }
      );
    }

    await invalidateCache('connectivity');

    return NextResponse.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting connectivity item:', error);
    return NextResponse.json(
      { error: 'Failed to delete connectivity item' },
      { status: 500 }
    );
  }
}
