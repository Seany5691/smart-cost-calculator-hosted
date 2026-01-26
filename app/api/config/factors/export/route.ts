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

    // Fetch factors (get most recent)
    const result = await query('SELECT factors_data FROM factors ORDER BY created_at DESC LIMIT 1');

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No factors to export' }, { status: 404 });
    }

    const factorData = result.rows[0].factors_data;
    
    // Define structure
    const terms = ['36_months', '48_months', '60_months'];
    const escalations = ['0%', '10%', '15%'];
    const ranges = ['0-20000', '20001-50000', '50001-100000', '100000+'];

    // Build export data
    const exportData: any[] = [];

    terms.forEach(term => {
      escalations.forEach(escalation => {
        ranges.forEach(range => {
          const costFactor = factorData.cost?.[term]?.[escalation]?.[range] || 0;
          const managerFactor = factorData.managerFactors?.[term]?.[escalation]?.[range] || 0;
          const userFactor = factorData.userFactors?.[term]?.[escalation]?.[range] || 0;

          exportData.push({
            Term: term.replace('_', ' '),
            Escalation: escalation,
            Range: range,
            'Cost Factor': parseFloat(costFactor.toFixed(6)),
            'Manager Factor': parseFloat(managerFactor.toFixed(6)),
            'User Factor': parseFloat(userFactor.toFixed(6))
          });
        });
      });
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Factors');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `factors-config-${timestamp}.xlsx`;

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    console.error('Factors export error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export factors configuration' },
      { status: 500 }
    );
  }
}
