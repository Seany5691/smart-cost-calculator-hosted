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

    console.log('[HARDWARE_IMPORT] Starting import process');
    console.log('[HARDWARE_IMPORT] Field mapping:', fieldMapping);
    console.log('[HARDWARE_IMPORT] Total rows to process:', jsonData.length);

    // Process each row
    for (let i = 0; i < jsonData.length; i++) {
      const row: any = jsonData[i];
      
      console.log(`[HARDWARE_IMPORT] Processing row ${i + 1}:`, row);
      
      try {
        // Extract fields using mapping
        console.log(`[HARDWARE_IMPORT] Extracting name from field: ${fieldMapping.name}`);
        const name = row[fieldMapping.name]?.toString().trim();
        console.log(`[HARDWARE_IMPORT] Extracted name: "${name}"`);
        
        console.log(`[HARDWARE_IMPORT] Extracting cost from field: ${fieldMapping.cost}`);
        const costValue = row[fieldMapping.cost];
        console.log(`[HARDWARE_IMPORT] Raw cost value:`, costValue);
        const cost = parseFloat(costValue) || 0;
        console.log(`[HARDWARE_IMPORT] Parsed cost:`, cost);
        
        const managerCost = fieldMapping.managerCost && row[fieldMapping.managerCost] 
          ? parseFloat(row[fieldMapping.managerCost]) 
          : cost;
        const userCost = fieldMapping.userCost && row[fieldMapping.userCost]
          ? parseFloat(row[fieldMapping.userCost])
          : cost;
        const isExtension = fieldMapping.isExtension && row[fieldMapping.isExtension]
          ? (row[fieldMapping.isExtension].toString().toLowerCase() === 'true' || 
             row[fieldMapping.isExtension].toString().toLowerCase() === 'yes' ||
             row[fieldMapping.isExtension] === true ||
             row[fieldMapping.isExtension] === 1)
          : false;
        const locked = fieldMapping.locked && row[fieldMapping.locked]
          ? (row[fieldMapping.locked].toString().toLowerCase() === 'true' || 
             row[fieldMapping.locked].toString().toLowerCase() === 'yes' ||
             row[fieldMapping.locked] === true ||
             row[fieldMapping.locked] === 1)
          : false;

        console.log(`[HARDWARE_IMPORT] Extracted values:`, { name, cost, managerCost, userCost, isExtension, locked });

        // Validate required fields
        if (!name || isNaN(cost)) {
          const errorMsg = `Row ${i + 2}: Missing or invalid required fields (name: "${name}", cost: ${cost})`;
          console.log(`[HARDWARE_IMPORT] Validation failed:`, errorMsg);
          errors.push(errorMsg);
          continue;
        }

        // Check if item exists
        console.log(`[HARDWARE_IMPORT] Checking if item exists: "${name}"`);
        const existingResult = await query(
          'SELECT id, display_order FROM hardware_items WHERE LOWER(name) = LOWER($1) AND is_active = true',
          [name]
        );
        console.log(`[HARDWARE_IMPORT] Existing items found:`, existingResult.rows.length);

        if (existingResult.rows.length > 0) {
          // Update existing item
          const existingItem = existingResult.rows[0];
          console.log(`[HARDWARE_IMPORT] Updating existing item with id:`, existingItem.id);
          const updateResult = await query(
            `UPDATE hardware_items 
             SET cost = $1, manager_cost = $2, user_cost = $3, is_extension = $4, locked = $5, updated_at = NOW()
             WHERE id = $6`,
            [cost, managerCost, userCost, isExtension, locked, existingItem.id]
          );
          console.log(`[HARDWARE_IMPORT] Update result:`, updateResult.rowCount, 'rows affected');
          updated++;
        } else {
          // Get max display order
          console.log(`[HARDWARE_IMPORT] Creating new item`);
          const maxOrderResult = await query(
            'SELECT COALESCE(MAX(display_order), -1) as max_order FROM hardware_items WHERE is_active = true'
          );
          const displayOrder = maxOrderResult.rows[0].max_order + 1;
          console.log(`[HARDWARE_IMPORT] New display order:`, displayOrder);

          // Create new item
          const insertResult = await query(
            `INSERT INTO hardware_items (name, cost, manager_cost, user_cost, quantity, locked, is_extension, is_active, display_order, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 0, $5, $6, true, $7, NOW(), NOW())`,
            [name, cost, managerCost, userCost, locked, isExtension, displayOrder]
          );
          console.log(`[HARDWARE_IMPORT] Insert result:`, insertResult.rowCount, 'rows affected');
          created++;
        }
        console.log(`[HARDWARE_IMPORT] Row ${i + 1} processed successfully`);
      } catch (error: any) {
        console.error(`[HARDWARE_IMPORT] Error processing row ${i + 1}:`, error);
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    console.log(`[HARDWARE_IMPORT] Import complete. Created: ${created}, Updated: ${updated}, Errors: ${errors.length}`);

    // Invalidate cache (optional - table may not exist)
    try {
      await query('UPDATE config_cache SET updated_at = NOW() WHERE config_type = $1', ['hardware']);
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
    console.error('Hardware import error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import hardware configuration' },
      { status: 500 }
    );
  }
}
