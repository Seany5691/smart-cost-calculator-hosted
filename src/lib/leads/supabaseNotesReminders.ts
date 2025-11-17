// Supabase helpers for lead notes and reminders
import { supabase } from '@/lib/supabase';

export interface LeadNote {
  id: string;
  leadId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export type ReminderType = 'call' | 'email' | 'meeting' | 'task' | 'followup' | 'quote' | 'document';
export type ReminderPriority = 'high' | 'medium' | 'low';

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly';
  interval: number; // Every X days/weeks/months
  days?: number[]; // For weekly: [0=Sun, 1=Mon, etc.]
  endDate?: string; // Optional end date
}

export interface LeadReminder {
  id: string;
  leadId: string | null; // Nullable for standalone reminders
  userId: string;
  routeId?: string | null; // For route-linked reminders
  title?: string | null; // For standalone reminders
  description?: string | null; // Additional details
  reminderDate: string;
  reminderTime?: string | null; // "HH:MM" format (24-hour)
  isAllDay: boolean;
  reminderType: ReminderType;
  priority: ReminderPriority;
  note: string;
  completed: boolean;
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern | null;
  parentReminderId?: string | null; // Links to parent for recurring instances
  createdAt?: string;
  updatedAt?: string;
}

export interface ReminderTemplate {
  id: string;
  userId: string;
  name: string;
  reminderType: ReminderType;
  priority: ReminderPriority;
  defaultTime?: string | null;
  isAllDay: boolean;
  defaultNote?: string;
  daysOffset: number; // Days from now
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// NOTES FUNCTIONS
// ============================================================================

export async function getLeadNotes(leadId: string): Promise<LeadNote[]> {
  const { data, error } = await supabase
    .from('lead_notes')
    .select('*')
    .eq('leadId', leadId)
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('Error fetching lead notes:', error);
    throw error;
  }

  return data || [];
}

export async function createLeadNote(
  leadId: string,
  userId: string,
  content: string
): Promise<LeadNote> {
  console.log('[Supabase] Creating note:', { leadId, userId, content });
  
  const { data, error } = await supabase
    .from('lead_notes')
    .insert({
      leadId,
      userId,
      content,
    })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Error creating lead note:', error);
    console.error('[Supabase] Error details:', JSON.stringify(error, null, 2));
    
    // Check if it's a "relation does not exist" error
    if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
      console.error('\n⚠️  DATABASE MIGRATION REQUIRED ⚠️');
      console.error('The lead_notes table does not exist in your database.');
      console.error('Please run the migration file: leads-supabase-migration.sql');
      console.error('Instructions: Open Supabase SQL Editor and paste the contents of the migration file.\n');
    }
    
    throw error;
  }

  console.log('[Supabase] Note created successfully:', data);
  return data;
}

export async function updateLeadNote(
  noteId: string,
  content: string
): Promise<LeadNote> {
  const { data, error } = await supabase
    .from('lead_notes')
    .update({ content })
    .eq('id', noteId)
    .select()
    .single();

  if (error) {
    console.error('Error updating lead note:', error);
    throw error;
  }

  return data;
}

export async function deleteLeadNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('lead_notes')
    .delete()
    .eq('id', noteId);

  if (error) {
    console.error('Error deleting lead note:', error);
    throw error;
  }
}

// ============================================================================
// REMINDERS FUNCTIONS
// ============================================================================

export async function getLeadReminders(leadId: string): Promise<LeadReminder[]> {
  const { data, error } = await supabase
    .from('lead_reminders')
    .select('*')
    .eq('leadId', leadId)
    .order('reminderDate', { ascending: true });

  if (error) {
    console.error('Error fetching lead reminders:', error);
    throw error;
  }

  return data || [];
}

export async function getAllUserReminders(userId: string): Promise<LeadReminder[]> {
  const { data, error } = await supabase
    .from('lead_reminders')
    .select('*')
    .eq('userId', userId)
    .order('reminderDate', { ascending: true });

  if (error) {
    console.error('Error fetching user reminders:', error);
    throw error;
  }

  return data || [];
}

export async function createLeadReminder(
  leadId: string | null,
  userId: string,
  reminderDate: string,
  note: string,
  options?: {
    reminderTime?: string | null;
    isAllDay?: boolean;
    reminderType?: ReminderType;
    priority?: ReminderPriority;
    routeId?: string | null;
    title?: string | null;
    description?: string | null;
    isRecurring?: boolean;
    recurrencePattern?: RecurrencePattern | null;
  }
): Promise<LeadReminder> {
  console.log('[Supabase] Creating reminder:', { 
    leadId, 
    userId, 
    reminderDate, 
    note, 
    ...options 
  });
  
  const reminderData: any = {
    leadId,
    userId,
    reminderDate,
    note,
    completed: false,
    reminderTime: options?.reminderTime || null,
    isAllDay: options?.isAllDay ?? true,
    reminderType: options?.reminderType || 'task',
    priority: options?.priority || 'medium',
    routeId: options?.routeId || null,
    title: options?.title || null,
    description: options?.description || null,
    isRecurring: options?.isRecurring || false,
    recurrencePattern: options?.recurrencePattern || null,
  };
  
  const { data, error } = await supabase
    .from('lead_reminders')
    .insert(reminderData)
    .select()
    .single();
  
  console.log('[Supabase] Insert result - data:', data, 'error:', error);

  if (error) {
    console.error('Error creating lead reminder:', error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error.details);
    console.error('Error hint:', error.hint);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    console.error('Attempted to insert:', reminderData);
    
    // Check if it's a "relation does not exist" error
    if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
      console.error('\n⚠️  DATABASE MIGRATION REQUIRED ⚠️');
      console.error('The lead_reminders table does not exist in your database.');
      console.error('Please run the migration file: enhanced-reminders-migration.sql');
      console.error('Instructions: Open Supabase SQL Editor and paste the contents of the migration file.\n');
    }
    
    // Check for RLS/auth issues
    if (error.code === '42501' || (error.message && error.message.includes('policy'))) {
      console.error('\n⚠️  PERMISSION/RLS ISSUE ⚠️');
      console.error('Row Level Security policy is blocking the insert.');
      console.error('This usually means auth.uid() is not matching the userId.');
      console.error('Check that you are logged in and the user ID is correct.\n');
    }
    
    throw error;
  }

  return data;
}

export async function updateLeadReminder(
  reminderId: string,
  updates: Partial<Omit<LeadReminder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<LeadReminder> {
  const { data, error } = await supabase
    .from('lead_reminders')
    .update(updates)
    .eq('id', reminderId)
    .select()
    .single();

  if (error) {
    console.error('Error updating lead reminder:', error);
    throw error;
  }

  return data;
}

export async function toggleReminderCompletion(reminderId: string): Promise<LeadReminder> {
  // First get the current state
  const { data: current, error: fetchError } = await supabase
    .from('lead_reminders')
    .select('completed')
    .eq('id', reminderId)
    .single();

  if (fetchError) {
    console.error('Error fetching reminder:', fetchError);
    throw fetchError;
  }

  // Toggle the completion state
  const { data, error } = await supabase
    .from('lead_reminders')
    .update({ completed: !current.completed })
    .eq('id', reminderId)
    .select()
    .single();

  if (error) {
    console.error('Error toggling reminder completion:', error);
    throw error;
  }

  return data;
}

export async function deleteLeadReminder(reminderId: string): Promise<void> {
  const { error } = await supabase
    .from('lead_reminders')
    .delete()
    .eq('id', reminderId);

  if (error) {
    console.error('Error deleting lead reminder:', error);
    throw error;
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export async function getLeadNotesAndReminders(leadId: string) {
  const [notes, reminders] = await Promise.all([
    getLeadNotes(leadId),
    getLeadReminders(leadId),
  ]);

  return { notes, reminders };
}

// ============================================================================
// MIGRATION HELPERS (for moving from localStorage to Supabase)
// ============================================================================

export async function migrateLocalStorageNotesToSupabase(
  localNotes: any[],
  userId: string
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const note of localNotes) {
    try {
      await createLeadNote(note.lead_id, userId, note.content);
      success++;
    } catch (error) {
      console.error('Failed to migrate note:', note, error);
      failed++;
    }
  }

  return { success, failed };
}

export async function migrateLocalStorageRemindersToSupabase(
  localReminders: any[],
  userId: string
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const reminder of localReminders) {
    try {
      await createLeadReminder(
        reminder.leadId,
        userId,
        reminder.reminderDate,
        reminder.note || 'Reminder'
      );
      success++;
    } catch (error) {
      console.error('Failed to migrate reminder:', reminder, error);
      failed++;
    }
  }

  return { success, failed };
}


// ============================================================================
// REMINDER TEMPLATES FUNCTIONS
// ============================================================================

export async function getReminderTemplates(userId: string): Promise<ReminderTemplate[]> {
  const { data, error } = await supabase
    .from('reminder_templates')
    .select('*')
    .eq('userId', userId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching reminder templates:', error);
    throw error;
  }

  return data || [];
}

export async function createReminderTemplate(
  userId: string,
  template: Omit<ReminderTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<ReminderTemplate> {
  const { data, error } = await supabase
    .from('reminder_templates')
    .insert({
      userId,
      ...template,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating reminder template:', error);
    throw error;
  }

  return data;
}

export async function updateReminderTemplate(
  templateId: string,
  updates: Partial<Omit<ReminderTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<ReminderTemplate> {
  const { data, error } = await supabase
    .from('reminder_templates')
    .update(updates)
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    console.error('Error updating reminder template:', error);
    throw error;
  }

  return data;
}

export async function deleteReminderTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('reminder_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    console.error('Error deleting reminder template:', error);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getReminderTypeIcon(type: ReminderType): string {
  const icons: Record<ReminderType, string> = {
    call: '📞',
    email: '📧',
    meeting: '📅',
    task: '📝',
    followup: '🔔',
    quote: '💰',
    document: '📄',
  };
  return icons[type] || '📝';
}

export function getReminderTypeLabel(type: ReminderType): string {
  const labels: Record<ReminderType, string> = {
    call: 'Phone Call',
    email: 'Email',
    meeting: 'Meeting',
    task: 'Task',
    followup: 'Follow-up',
    quote: 'Quote',
    document: 'Document',
  };
  return labels[type] || 'Task';
}

export function getReminderPriorityColor(priority: ReminderPriority): string {
  const colors: Record<ReminderPriority, string> = {
    high: 'red',
    medium: 'yellow',
    low: 'green',
  };
  return colors[priority] || 'gray';
}

export function getReminderPriorityLabel(priority: ReminderPriority): string {
  const labels: Record<ReminderPriority, string> = {
    high: 'High Priority',
    medium: 'Medium Priority',
    low: 'Low Priority',
  };
  return labels[priority] || 'Medium Priority';
}

export function formatReminderTime(time: string | null | undefined, isAllDay: boolean): string {
  if (isAllDay || !time) return 'All Day';
  
  // Convert 24-hour time to 12-hour format
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function getDefaultTemplates(): Omit<ReminderTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] {
  return [
    {
      name: 'Initial Contact',
      reminderType: 'call',
      priority: 'high',
      defaultTime: '09:00',
      isAllDay: false,
      defaultNote: 'Make initial contact call',
      daysOffset: 0,
      isRecurring: false,
    },
    {
      name: 'Follow-up Call',
      reminderType: 'call',
      priority: 'medium',
      defaultTime: '14:00',
      isAllDay: false,
      defaultNote: 'Follow up on previous conversation',
      daysOffset: 3,
      isRecurring: false,
    },
    {
      name: 'Send Quote',
      reminderType: 'quote',
      priority: 'high',
      defaultTime: '10:00',
      isAllDay: false,
      defaultNote: 'Prepare and send pricing quote',
      daysOffset: 1,
      isRecurring: false,
    },
    {
      name: 'Quote Follow-up',
      reminderType: 'followup',
      priority: 'medium',
      defaultTime: '15:00',
      isAllDay: false,
      defaultNote: 'Follow up on sent quote',
      daysOffset: 7,
      isRecurring: false,
    },
    {
      name: 'Schedule Meeting',
      reminderType: 'meeting',
      priority: 'high',
      defaultTime: '11:00',
      isAllDay: false,
      defaultNote: 'Schedule in-person or virtual meeting',
      daysOffset: 2,
      isRecurring: false,
    },
    {
      name: 'Send Contract',
      reminderType: 'document',
      priority: 'high',
      defaultTime: '09:00',
      isAllDay: false,
      defaultNote: 'Review and send contract documents',
      daysOffset: 14,
      isRecurring: false,
    },
    {
      name: 'Monthly Check-in',
      reminderType: 'call',
      priority: 'low',
      defaultTime: '14:00',
      isAllDay: false,
      defaultNote: 'Monthly customer check-in call',
      daysOffset: 30,
      isRecurring: true,
      recurrencePattern: {
        type: 'monthly',
        interval: 1,
      },
    },
  ];
}
