import { NextRequest, NextResponse } from 'next/server';
import { processReminderNotifications } from '@/lib/reminderNotifications';

/**
 * POST /api/reminders/notifications
 * Manually trigger reminder notification check
 * Can be called by cron job or admin
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication check for cron job secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[REMINDER NOTIFICATIONS API] Starting notification check...');
    const stats = await processReminderNotifications();

    return NextResponse.json({
      success: true,
      message: 'Reminder notifications processed',
      stats,
    });
  } catch (error) {
    console.error('[REMINDER NOTIFICATIONS API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process reminder notifications',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reminders/notifications
 * Get notification processing status (for debugging)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      status: 'ready',
      message: 'Reminder notification service is operational',
      config: {
        emailConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASSWORD),
        cronSecretConfigured: !!process.env.CRON_SECRET,
      },
    });
  } catch (error) {
    console.error('[REMINDER NOTIFICATIONS API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get notification status',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
