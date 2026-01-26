import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { query } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
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

    // Fetch hardware items
    const result = await query(
      'SELECT name, cost, manager_cost, user_cost, is_extension, locked FROM hardware WHERE is_active = true ORDER BY display_order ASC'
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No hardware items to export' }, { status: 404 });
    }

    // Format data for export
    const exportData = result.rows.map(row => ({
      Name: row.name,
      Cost: parseFloat(row.cost).toFixed(2),
      'Manager Cost': parseFloat(row.manager_cost).toFixed(2),
      'User Cost': parseFloat(row.user_cost).toFixed(2),
      'Is Extension': row.is_extension ? 'TRUE' : 'FALSE',
      Locked: row.locked ? 'TRUE' : 'FALSE'
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Hardware');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `hardware-config-${timestamp}.xlsx`;

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    console.error('Hardware export error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export hardware configuration' },
      { status: 500 }
    );
  }
}
