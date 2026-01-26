import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { query } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or super_admin
    if (authResult.user.role !== 'admin' && authResult.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fieldMappingStr = formData.get('fieldMapping') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!fieldMappingStr) {
      return NextResponse.json({ error: 'No field mapping provided' }, { status: 400 });
    }

    const fieldMapping = JSON.parse(fieldMappingStr);

    // Read file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    // Process each row
    for (let i = 0; i < jsonData.length; i++) {
      const row: any = jsonData[i];
      
      try {
        // Extract fields using mapping
        const name = row[fieldMapping.name]?.toString().trim();
        const cost = parseFloat(row[fieldMapping.cost]) || 0;
        const managerCost = fieldMapping.managerCost && row[fieldMapping.managerCost] 
          ? parseFloat(row[fieldMapping.managerCost]) 
          : cost;
        const userCost = fieldMapping.userCost && row[fieldMapping.userCost]
          ? parseFloat(row[fieldMapping.userCost])
          : cost;
        const locked = fieldMapping.locked && row[fieldMapping.locked]
          ? (row[fieldMapping.locked].toString().toLowerCase() === 'true' || 
             row[fieldMapping.locked].toString().toLowerCase() === 'yes' ||
             row[fieldMapping.locked] === true ||
             row[fieldMapping.locked] === 1)
          : false;

        // Validate required fields
        if (!name || isNaN(cost)) {
          errors.push(`Row ${i + 2}: Missing or invalid required fields (name, cost)`);
          continue;
        }

        // Check if item exists
        const existingResult = await query(
          'SELECT id, display_order FROM connectivity_items WHERE LOWER(name) = LOWER($1) AND is_active = true',
          [name]
        );

        if (existingResult.rows.length > 0) {
          // Update existing item
          const existingItem = existingResult.rows[0];
          await query(
            `UPDATE connectivity_items 
             SET cost = $1, manager_cost = $2, user_cost = $3, locked = $4, updated_at = NOW()
             WHERE id = $5`,
            [cost, managerCost, userCost, locked, existingItem.id]
          );
          updated++;
        } else {
          // Get max display order
          const maxOrderResult = await query(
            'SELECT COALESCE(MAX(display_order), -1) as max_order FROM connectivity_items WHERE is_active = true'
          );
          const displayOrder = maxOrderResult.rows[0].max_order + 1;

          // Create new item
          await query(
            `INSERT INTO connectivity_items (name, cost, manager_cost, user_cost, quantity, locked, is_active, display_order, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 0, $5, true, $6, NOW(), NOW())`,
            [name, cost, managerCost, userCost, locked, displayOrder]
          );
          created++;
        }
      } catch (error: any) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    // Invalidate cache (optional - table may not exist)
    try {
      await query('UPDATE config_cache SET updated_at = NOW() WHERE config_type = $1', ['connectivity']);
    } catch (error) {
      // Config cache table doesn't exist yet, skip cache invalidation
      console.log('Config cache table not found, skipping cache invalidation');
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Connectivity import error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import connectivity configuration' },
      { status: 500 }
    );
  }
}
