import { NextRequest, NextResponse } from 'next/server';
import { sendReminderEmail } from '@/lib/email';

/**
 * Test endpoint to send a sample follow-up email
 * This lets you see what the follow-up email looks like
 * 
 * Usage: POST to /api/reminders/test-followup-sample
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[TEST FOLLOW-UP SAMPLE] Sending sample follow-up email...');
    
    // Sample data for the follow-up email
    const sampleData = {
      recipientEmail: 'sean@smartintegrate.co.za',
      recipientName: 'Sean',
      reminderTitle: 'Follow up with Sky Arch Travel',
      reminderMessage: 'Call to discuss solar panel installation quote and finalize pricing details',
      reminderDate: '16 Apr 2026',
      reminderTime: '17:44:00',
      priority: 'high',
      reminderType: 'lead',
      leadId: 'sample-lead-123',
      leadName: 'Sky Arch Travel',
      leadPhone: '016 004 0021',
      leadProvider: 'SWITCH/SWITCH',
      leadAddress: '123 Main Street',
      leadTown: 'Sasolburg, Gauteng',
      leadMapsAddress: 'https://www.google.com/maps/search/?api=1&query=Sky+Arch+Travel+Sasolburg',
    };
    
    const result = await sendReminderEmail(sampleData, 'followup');
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Sample follow-up email sent successfully to sean@smartintegrate.co.za',
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send email',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[TEST FOLLOW-UP SAMPLE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
