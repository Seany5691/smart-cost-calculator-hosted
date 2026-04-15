/**
 * Reminder Notification Service
 * Checks for reminders that need notifications and sends emails
 */

import { query } from '@/lib/db';
import { sendReminderEmail, sendBatchedReminderEmail } from '@/lib/email';

interface ReminderWithUser {
  id: string;
  user_id: string;
  lead_id: string | null;
  title: string;
  message: string;
  reminder_date: string;
  reminder_time: string | null;
  reminder_type: string;
  priority: string;
  user_email: string;
  user_name: string;
  lead_name: string | null;
  lead_contact_person: string | null;
  lead_phone: string | null;
  lead_provider: string | null;
  lead_address: string | null;
  lead_town: string | null;
  lead_maps_address: string | null;
  email_sent_created: boolean;
  email_sent_1day: boolean;
  email_sent_30min: boolean;
  created_at: string;
}

/**
 * Check and send reminder notifications
 * This should be called periodically (e.g., every 5-15 minutes via cron job)
 */
export async function processReminderNotifications(): Promise<{
  processed: number;
  sent: number;
  errors: number;
}> {
  const stats = { processed: 0, sent: 0, errors: 0 };

  try {
    console.log('[REMINDER NOTIFICATIONS] Starting notification check...');

    // Get all pending reminders with user and lead info
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
        r.email_sent_created,
        r.email_sent_1day,
        r.email_sent_30min,
        r.created_at,
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
      WHERE r.completed = false
        AND r.status != 'completed'
        AND u.email IS NOT NULL
        AND u.email != ''
    `);

    const reminders = result.rows as ReminderWithUser[];
    console.log(`[REMINDER NOTIFICATIONS] Found ${reminders.length} active reminders`);

    const now = new Date();

    // Group reminders by user for 1-day-before batching
    const userRemindersFor1Day = new Map<string, ReminderWithUser[]>();

    for (const reminder of reminders) {
      stats.processed++;

      try {
        // Parse reminder date/time
        const reminderDateTime = reminder.reminder_time
          ? new Date(`${reminder.reminder_date}T${reminder.reminder_time}`)
          : new Date(reminder.reminder_date);

        // Calculate time differences
        const timeDiff = reminderDateTime.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        const minutesDiff = timeDiff / (1000 * 60);

        const emailData = {
          recipientEmail: reminder.user_email,
          recipientName: reminder.user_name,
          reminderTitle: reminder.title || reminder.message,
          reminderMessage: reminder.message || reminder.title,
          reminderDate: new Date(reminder.reminder_date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          reminderTime: reminder.reminder_time || undefined,
          priority: reminder.priority,
          reminderType: reminder.reminder_type,
          leadId: reminder.lead_id || undefined,
          leadName: reminder.lead_name || undefined,
          leadContact: reminder.lead_contact_person || undefined,
          leadPhone: reminder.lead_phone || undefined,
          leadProvider: reminder.lead_provider || undefined,
          leadAddress: reminder.lead_address || undefined,
          leadTown: reminder.lead_town || undefined,
          leadMapsAddress: reminder.lead_maps_address || undefined,
        };

        // Check if we need to send "created" notification
        // Creation emails are ONLY sent immediately when the reminder is created
        // The cron job should NEVER send creation emails
        // Just mark old reminders as having sent creation email (skip sending)
        if (!reminder.email_sent_created) {
          await query(
            'UPDATE reminders SET email_sent_created = true WHERE id = $1',
            [reminder.id]
          );
        }

        // Check if we need to send "1 day before" notification - GROUP BY USER
        // Only send at 5pm (17:00) for reminders that are TOMORROW
        const currentHour = now.getHours();
        const is5pmHour = currentHour === 17; // 5pm
        
        // Check if reminder is tomorrow (not just within 24 hours)
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDateStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
        const reminderDateStr = reminder.reminder_date; // Already in YYYY-MM-DD format
        const isReminderTomorrow = reminderDateStr === tomorrowDateStr;
        
        if (!reminder.email_sent_1day && isReminderTomorrow && is5pmHour) {
          const userId = reminder.user_id;
          if (!userRemindersFor1Day.has(userId)) {
            userRemindersFor1Day.set(userId, []);
          }
          userRemindersFor1Day.get(userId)!.push(reminder);
        }

        // Check if we need to send "30 minutes before" notification - INDIVIDUAL
        if (!reminder.email_sent_30min && minutesDiff <= 30 && minutesDiff > 0) {
          console.log(`[REMINDER NOTIFICATIONS] Sending 30-min email for reminder ${reminder.id}`);
          const result = await sendReminderEmail(emailData, '30min');
          
          if (result.success) {
            await query(
              'UPDATE reminders SET email_sent_30min = true WHERE id = $1',
              [reminder.id]
            );
            stats.sent++;
          } else {
            stats.errors++;
          }
        }
      } catch (error) {
        console.error(`[REMINDER NOTIFICATIONS] Error processing reminder ${reminder.id}:`, error);
        stats.errors++;
      }
    }

    // Send batched 1-day-before emails (one email per user with all their tomorrow's reminders)
    for (const [userId, userReminders] of userRemindersFor1Day.entries()) {
      try {
        const firstReminder = userReminders[0];
        console.log(`[REMINDER NOTIFICATIONS] Sending batched 1-day email for user ${userId} (${userReminders.length} reminders)`);
        
        const batchedEmailData = {
          recipientEmail: firstReminder.user_email,
          recipientName: firstReminder.user_name,
          reminders: userReminders.map(r => ({
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

        const result = await sendBatchedReminderEmail(batchedEmailData);
        
        if (result.success) {
          // Mark all reminders as having sent the 1-day email
          const reminderIds = userReminders.map(r => r.id);
          await query(
            `UPDATE reminders SET email_sent_1day = true WHERE id = ANY($1::uuid[])`,
            [reminderIds]
          );
          stats.sent++;
        } else {
          stats.errors++;
        }
      } catch (error) {
        console.error(`[REMINDER NOTIFICATIONS] Error sending batched email for user ${userId}:`, error);
        stats.errors++;
      }
    }

    console.log('[REMINDER NOTIFICATIONS] Notification check complete:', stats);
    return stats;
  } catch (error) {
    console.error('[REMINDER NOTIFICATIONS] Fatal error:', error);
    throw error;
  }
}
