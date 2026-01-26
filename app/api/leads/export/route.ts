import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';
import ExcelJS from 'exceljs';

// GET /api/leads/export - Export leads to Excel
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadIds = searchParams.get('leadIds')?.split(',').filter(Boolean);

    let query = 'SELECT * FROM leads';
    const params: any[] = [];

    if (leadIds && leadIds.length > 0) {
      query += ' WHERE id = ANY($1)';
      params.push(leadIds);
    }

    query += ' ORDER BY provider, number';

    const result = await pool.query(query, params);

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leads');

    // Define columns
    worksheet.columns = [
      { header: 'Number', key: 'number', width: 10 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Provider', key: 'provider', width: 15 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'Town', key: 'town', width: 20 },
      { header: 'Contact Person', key: 'contact_person', width: 25 },
      { header: 'Type of Business', key: 'type_of_business', width: 25 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Date to Call Back', key: 'date_to_call_back', width: 18 },
      { header: 'Date Signed', key: 'date_signed', width: 15 },
      { header: 'Maps Address', key: 'maps_address', width: 50 },
      { header: 'List Name', key: 'list_name', width: 20 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    result.rows.forEach(lead => {
      const row = worksheet.addRow({
        number: lead.number,
        name: lead.name,
        phone: lead.phone,
        provider: lead.provider,
        address: lead.address,
        town: lead.town,
        contact_person: lead.contact_person,
        type_of_business: lead.type_of_business,
        status: lead.status,
        notes: lead.notes,
        date_to_call_back: lead.date_to_call_back ? new Date(lead.date_to_call_back).toLocaleDateString() : '',
        date_signed: lead.date_signed ? new Date(lead.date_signed).toLocaleDateString() : '',
        maps_address: lead.maps_address,
        list_name: lead.list_name
      });

      // Add hyperlink to maps_address if it exists
      if (lead.maps_address) {
        const cell = row.getCell('maps_address');
        cell.value = {
          text: lead.maps_address,
          hyperlink: lead.maps_address
        };
        cell.font = { color: { argb: 'FF0000FF' }, underline: true };
      }
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return as downloadable file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="leads-export-${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });
  } catch (error) {
    console.error('Error exporting leads:', error);
    return NextResponse.json(
      { error: 'Failed to export leads' },
      { status: 500 }
    );
  }
}
