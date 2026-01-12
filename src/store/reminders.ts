// Reminders Store - Global state management for reminders
import { create } from 'zustand';
import { useMemo } from 'react';

interface RemindersState {
  reminders: any[];
  loading: boolean;
  lastFetch: number | null;
  
  // Actions
  fetchAllReminders: (userId: string, force?: boolean) => Promise<void>;
  fetchLeadReminders: (leadId: string) => Promise<any[]>;
  addReminder: (
    leadId: string | null, 
    userId: string, 
    reminderDate: string, 
    note: string,
    options?: any
  ) => Promise<any>;
  toggleComplete: (reminderId: string) => Promise<void>;
  updateReminder: (reminderId: string, updates: Partial<any>) => Promise<void>;
  deleteReminder: (reminderId: string) => Promise<void>;
  clearReminders: () => void;
}

export const useRemindersStore = create<RemindersState>((set, get) => ({
  reminders: [],
  loading: false,
  lastFetch: null,

  // Fetch all reminders for a user
  fetchAllReminders: async (userId: string, force = false) => {
    const now = Date.now();
    const lastFetch = get().lastFetch;
    
    // Skip if fetched recently (within 5 minutes) unless forced
    if (!force && lastFetch && (now - lastFetch) < 5 * 60 * 1000) {
      return;
    }

    set({ loading: true });
    try {
      // PostgreSQL placeholder - return empty for now
      const reminders: any[] = [];
      set({ reminders, lastFetch: now, loading: false });
    } catch (error) {
      console.error('Error fetching reminders:', error);
      set({ loading: false });
    }
  },

  // Fetch reminders for a specific lead
  fetchLeadReminders: async (leadId: string) => {
    try {
      // PostgreSQL placeholder - return empty for now
      const reminders = [];
      return reminders;
    } catch (error) {
      console.error('Error fetching lead reminders:', error);
      return [];
    }
  },

  // Add a new reminder
  addReminder: async (
    leadId: string | null, 
    userId: string, 
    reminderDate: string, 
    note: string,
    options?: {
      reminderTime?: string | null;
      isAllDay?: boolean;
      reminderType?: any;
      priority?: any;
      routeId?: string | null;
      title?: string | null;
      description?: string | null;
      isRecurring?: boolean;
      recurrencePattern?: any;
    }
  ) => {
    try {
      console.log('[RemindersStore] Adding reminder:', { leadId, userId, reminderDate, note, options });
      // PostgreSQL placeholder - create reminder
      const newReminder = {
        id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        leadId,
        userId,
        reminderDate,
        note,
        ...options,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      console.log('[RemindersStore] Reminder created:', newReminder);
      
      // Add to local state
      set((state) => {
        const updatedReminders = [...state.reminders, newReminder];
        console.log('[RemindersStore] Updated reminders count:', updatedReminders.length);
        if (leadId) {
          console.log('[RemindersStore] Reminders for lead', leadId, ':', updatedReminders.filter(r => r.leadId === leadId));
        }
        return {
          reminders: updatedReminders,
        };
      });
      
      return newReminder;
    } catch (error) {
      console.error('[RemindersStore] Error adding reminder:', error);
      throw error;
    }
  },

  // Toggle reminder completion
  toggleComplete: async (reminderId: string) => {
    try {
      const updatedReminder = await toggleReminderCompletion(reminderId);
      
      // Update local state
      set((state) => ({
        reminders: state.reminders.map((r) =>
          r.id === reminderId ? updatedReminder : r
        ),
      }));
    } catch (error) {
      console.error('Error toggling reminder:', error);
      throw error;
    }
  },

  // Update a reminder
  updateReminder: async (reminderId: string, updates: Partial<Omit<LeadReminder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => {
    try {
      const updatedReminder = await updateLeadReminder(reminderId, updates);
      
      // Update local state
      set((state) => ({
        reminders: state.reminders.map((r) =>
          r.id === reminderId ? updatedReminder : r
        ),
      }));
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw error;
    }
  },

  // Delete a reminder
  deleteReminder: async (reminderId: string) => {
    try {
      await deleteLeadReminder(reminderId);
      
      // Remove from local state
      set((state) => ({
        reminders: state.reminders.filter((r) => r.id !== reminderId),
      }));
    } catch (error) {
      console.error('Error deleting reminder:', error);
      throw error;
    }
  },

  // Clear all reminders (e.g., on logout)
  clearReminders: () => {
    set({ reminders: [], lastFetch: null });
  },
}));

// Selectors for better performance
export const useAllReminders = () => useRemindersStore((state) => state.reminders);
export const useRemindersLoading = () => useRemindersStore((state) => state.loading);

// Use a custom hook with useMemo to prevent infinite loops
export const useLeadReminders = (leadId: string) => {
  const allReminders = useRemindersStore((state) => state.reminders);
  return useMemo(
    () => allReminders.filter((r) => r.leadId === leadId),
    [allReminders, leadId]
  );
};

export const useActiveReminders = () => {
  const allReminders = useRemindersStore((state) => state.reminders);
  return useMemo(
    () => allReminders.filter((r) => !r.completed),
    [allReminders]
  );
};
