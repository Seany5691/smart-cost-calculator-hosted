import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyAuth } from '@/lib/middleware';
import { invalidateCache } from '@/lib/cache';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  min: 2,
});

// GET /api/config/licensing - Get all licensing items
// All authenticated users can view (needed for calculator)
// Only admins can modify (POST/PUT/DELETE)
export async function GET(request: NextRequest) {
  try {
    // Verify authentication - all authenticated users can read config
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const result = await pool.query(
      `SELECT id, name, cost, manager_cost as "managerCost", user_cost as "userCost", 
              quantity, locked, is_active as "isActive", 
              display_order as "displayOrder", created_at as "createdAt", updated_at as "updatedAt"
       FROM licensing_items 
       WHERE is_active = true 
       ORDER BY display_order ASC, name ASC`
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching licensing items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch licensing items' },
      { status: 500 }
    );
  }
}

// POST /api/config/licensing - Create a new licensing item
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin can create licensing items
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      cost,
      managerCost,
      userCost,
      quantity = 1,
      locked = false,
      displayOrder = 0,
    } = body;

    // Validation
    if (!name || cost === undefined || managerCost === undefined || userCost === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, cost, managerCost, userCost' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO licensing_items 
       (name, cost, manager_cost, user_cost, quantity, locked, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING id, name, cost, manager_cost as "managerCost", user_cost as "userCost", 
                 quantity, locked, is_active as "isActive", 
                 display_order as "displayOrder", created_at as "createdAt", updated_at as "updatedAt"`,
      [name, cost, managerCost, userCost, quantity, locked, displayOrder]
    );

    // Invalidate cache after successful creation
    await invalidateCache('licensing');

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating licensing item:', error);
    return NextResponse.json(
      { error: 'Failed to create licensing item' },
      { status: 500 }
    );
  }
}

// PUT /api/config/licensing - Update a licensing item
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin can update licensing items
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

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
      isActive: 'is_active',
      displayOrder: 'display_order',
    };

    Object.entries(updates).forEach(([key, value]) => {
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
      `UPDATE licensing_items 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, name, cost, manager_cost as "managerCost", user_cost as "userCost", 
                 quantity, locked, is_active as "isActive", 
                 display_order as "displayOrder", created_at as "createdAt", updated_at as "updatedAt"`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Licensing item not found' },
        { status: 404 }
      );
    }

    // Invalidate cache after successful update
    await invalidateCache('licensing');

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating licensing item:', error);
    return NextResponse.json(
      { error: 'Failed to update licensing item' },
      { status: 500 }
    );
  }
}

// DELETE /api/config/licensing - Soft delete a licensing item
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin can delete licensing items
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    // Soft delete by setting is_active to false
    const result = await pool.query(
      `UPDATE licensing_items 
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Licensing item not found' },
        { status: 404 }
      );
    }

    // Invalidate cache after successful deletion
    await invalidateCache('licensing');

    return NextResponse.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting licensing item:', error);
    return NextResponse.json(
      { error: 'Failed to delete licensing item' },
      { status: 500 }
    );
  }
}
