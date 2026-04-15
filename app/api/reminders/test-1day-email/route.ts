import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';
import { sendBatchedReminderEmail } from '@/lib/email';

/**
 * POST /api/reminders/test-1day-email
 * TEST ENDPOINT - Send batched 1-day-before email for current user
 * This endpoint is for testing purposes only and should be removed after testing
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.userId;

    console.log('[TEST 1-DAY EMAIL] Fetching reminders for user:', userId);

    // Get all reminders due tomorrow for this user
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const result = await query(`
      SELECT 
        r.id,
        r.user_id,
        r.lead_id,
        r.title,
        r.message,
        r.reminder_date,
        r.reminder_time,
        r.reminder_type,
        r.priority,
        u.email as user_email,
        u.name as user_name,
        l.id as lead_id,
        l.name as lead_name,
        l.contact_person as lead_contact_person,
        l.phone as lead_phone,
        l.provider as lead_provider,
        l.address as lead_address,
        l.town as lead_town,
        l.maps_address as lead_maps_address
      FROM reminders r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN leads l ON r.lead_id = l.id
      WHERE r.user_id = $1
        AND r.completed = false
        AND r.status != 'completed'
        AND r.reminder_date >= $2
        AND r.reminder_date < $2::date + interval '1 day'
      ORDER BY r.reminder_time ASC, r.priority DESC
    `, [userId, tomorrowStr]);

    const reminders = result.rows;

    if (reminders.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No reminders found for tomorrow',
        hint: 'Create some reminders for tomorrow to test the batched email',
      });
    }

    console.log(`[TEST 1-DAY EMAIL] Found ${reminders.length} reminders for tomorrow`);

    // Get user info
    const firstReminder = reminders[0];

    // Prepare batched email data
    const batchedEmailData = {
      recipientEmail: firstReminder.user_email,
      recipientName: firstReminder.user_name,
      reminders: reminders.map((r: any) => ({
        reminderTitle: r.title || r.message,
        reminderMessage: r.message || r.title,
        reminderDate: new Date(r.reminder_date).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        reminderTime: r.reminder_time || undefined,
        priority: r.priority,
        reminderType: r.reminder_type,
        leadId: r.lead_id || undefined,
        leadName: r.lead_name || undefined,
        leadContact: r.lead_contact_person || undefined,
        leadPhone: r.lead_phone || undefined,
        leadProvider: r.lead_provider || undefined,
        leadAddress: r.lead_address || undefined,
        leadTown: r.lead_town || undefined,
        leadMapsAddress: r.lead_maps_address || undefined,
      })),
    };

    console.log(`[TEST 1-DAY EMAIL] Sending batched email to ${batchedEmailData.recipientEmail}`);

    // Send the batched email
    const emailResult = await sendBatchedReminderEmail(batchedEmailData);

    if (emailResult.success) {
      return NextResponse.json({
        success: true,
        message: `Batched email sent successfully to ${batchedEmailData.recipientEmail}`,
        reminderCount: reminders.length,
        reminders: reminders.map((r: any) => ({
          id: r.id,
          title: r.title || r.message,
          date: r.reminder_date,
          time: r.reminder_time,
          priority: r.priority,
        })),
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to send email',
        details: emailResult.error,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[TEST 1-DAY EMAIL] Error:', error);
    return NextResponse.json({
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
