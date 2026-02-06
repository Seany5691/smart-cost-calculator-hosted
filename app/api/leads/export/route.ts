import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';
import * as XLSX from 'xlsx';

// GET /api/leads/export - Export leads to Excel with notes and reminders
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    if (!status) {
      return NextResponse.json({ error: 'Status parameter is required' }, { status: 400 });
    }

    // Fetch leads for the specified status
    const leadsResult = await pool.query(
      `SELECT 
        l.id,
        l.name,
        l.phone,
        l.provider,
        l.address,
        l.town,
        l.maps_address,
        l.created_at
      FROM leads l
      LEFT JOIN lead_shares ls ON l.id = ls.lead_id
      WHERE (l.user_id = $1::uuid OR ls.shared_with_user_id = $1::uuid)
        AND l.status = $2
      ORDER BY l.created_at DESC`,
      [authResult.user.userId, status]
    );

    const leads = leadsResult.rows;

    if (leads.length === 0) {
      return NextResponse.json({ error: 'No leads found for this status' }, { status: 404 });
    }

    // Fetch notes and reminders for all leads
    const leadIds = leads.map(lead => lead.id);
    
    const notesResult = await pool.query(
      `SELECT 
        n.lead_id,
        n.content,
        n.created_at,
        u.name as user_name
      FROM notes n
      JOIN users u ON n.user_id = u.id
      WHERE n.lead_id = ANY($1::uuid[])
      ORDER BY n.lead_id, n.created_at DESC`,
      [leadIds]
    );

    const remindersResult = await pool.query(
      `SELECT 
        r.lead_id,
        r.message,
        r.reminder_date,
        r.reminder_time,
        r.status,
        u.name as user_name
      FROM reminders r
      JOIN users u ON r.user_id = u.id
      WHERE r.lead_id = ANY($1::uuid[])
      ORDER BY r.lead_id, r.reminder_date ASC`,
      [leadIds]
    );

    // Group notes and reminders by lead_id
    const notesByLead = new Map<string, any[]>();
    const remindersByLead = new Map<string, any[]>();

    notesResult.rows.forEach(note => {
      if (!notesByLead.has(note.lead_id)) {
        notesByLead.set(note.lead_id, []);
      }
      notesByLead.get(note.lead_id)!.push(note);
    });

    remindersResult.rows.forEach(reminder => {
      if (!remindersByLead.has(reminder.lead_id)) {
        remindersByLead.set(reminder.lead_id, []);
      }
      remindersByLead.get(reminder.lead_id)!.push(reminder);
    });

    // Build Excel data
    const excelData = leads.map(lead => {
      const notes = notesByLead.get(lead.id) || [];
      const reminders = remindersByLead.get(lead.id) || [];

      // Format notes
      const notesText = notes.length > 0
        ? notes.map(n => `[${new Date(n.created_at).toLocaleDateString()}] ${n.user_name}: ${n.content}`).join('\n\n')
        : '';

      // Format reminders
      const remindersText = reminders.length > 0
        ? reminders.map(r => {
            const time = r.reminder_time ? ` at ${r.reminder_time}` : '';
            return `[${r.reminder_date}${time}] ${r.message} (${r.status}) - ${r.user_name}`;
          }).join('\n\n')
        : '';

      return {
        'Maps URL': lead.maps_address || '',
        'Name': lead.name || '',
        'Phone Number': lead.phone || '',
        'Provider': lead.provider || '',
        'Address': lead.address || '',
        'Notes': notesText,
        'Reminders': remindersText,
      };
    });

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 50 }, // Maps URL
      { wch: 25 }, // Name
      { wch: 15 }, // Phone Number
      { wch: 15 }, // Provider
      { wch: 30 }, // Address
      { wch: 50 }, // Notes
      { wch: 50 }, // Reminders
    ];

    // Make Maps URL column a hyperlink
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
      const cell = worksheet[cellAddress];
      if (cell && cell.v) {
        cell.l = { Target: cell.v, Tooltip: 'Open in Google Maps' };
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, status.charAt(0).toUpperCase() + status.slice(1));

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return Excel file
    const fileName = `leads-${status}-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting leads:', error);
    return NextResponse.json(
      { error: 'Failed to export leads', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
