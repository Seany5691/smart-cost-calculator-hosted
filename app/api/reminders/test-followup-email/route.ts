import { NextRequest, NextResponse } from 'next/server';
import { processReminderNotifications } from '@/lib/reminderNotifications';

/**
 * Test endpoint to manually trigger reminder notification check
 * This helps debug the follow-up email functionality
 * 
 * Usage: POST to /api/reminders/test-followup-email
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[TEST FOLLOW-UP] Manual notification check triggered');
    
    const result = await processReminderNotifications();
    
    return NextResponse.json({
      success: true,
      message: 'Notification check completed',
      stats: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[TEST FOLLOW-UP] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
