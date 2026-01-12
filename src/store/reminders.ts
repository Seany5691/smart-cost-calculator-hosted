import { create } from 'zustand';
import { useMemo } from 'react';

export interface LeadReminder {
  id: string;
  leadId: string | null;
  userId: string;
  reminderDate: string;
  note: string;
  completed: boolean;
  reminderTime?: string | null;
  isAllDay?: boolean;
  reminderType?: any;
  priority?: any;
  routeId?: string | null;
  title?: string | null;
  description?: string | null;
  isRecurring?: boolean;
  recurrencePattern?: any;
  createdAt: string;
  updatedAt: string;
}

interface RemindersState {
  reminders: LeadReminder[];
  loading: boolean;
  lastFetch: number | null;

  fetchAllReminders: (userId: string, force?: boolean) => Promise<void>;
  fetchLeadReminders: (leadId: string) => Promise<LeadReminder[]>;
  addReminder: (
    leadId: string | null,
    userId: string,
    reminderDate: string,
    note: string,
    options?: any
  ) => Promise<LeadReminder>;
  toggleComplete: (reminderId: string) => Promise<void>;
  updateReminder: (
    reminderId: string,
    updates: Partial<Omit<LeadReminder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ) => Promise<void>;
  deleteReminder: (reminderId: string) => Promise<void>;
  clearReminders: () => void;
}

const STORAGE_KEY = 'smart_cost_calculator_reminders_v1';

function safeReadAll(): LeadReminder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as LeadReminder[];
  } catch {
    return [];
  }
}

function safeWriteAll(reminders: LeadReminder[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  } catch {
    // ignore
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return `rem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export const useRemindersStore = create<RemindersState>((set, get) => ({
  reminders: [],
  loading: false,
  lastFetch: null,

  fetchAllReminders: async (userId: string, force = false) => {
    const { lastFetch } = get();
    const now = Date.now();

    if (!force && lastFetch && now - lastFetch < 10000) {
      return;
    }

    set({ loading: true });
    try {
      const all = safeReadAll();
      const reminders = all.filter((r) => r.userId === userId);
      set({ reminders, lastFetch: now, loading: false });
    } catch (error) {
      console.error('Error fetching reminders:', error);
      set({ loading: false });
    }
  },

  fetchLeadReminders: async (leadId: string) => {
    try {
      const all = safeReadAll();
      return all.filter((r) => r.leadId === leadId);
    } catch (error) {
      console.error('Error fetching lead reminders:', error);
      return [];
    }
  },

  addReminder: async (leadId, userId, reminderDate, note, options) => {
    try {
      const nowIso = new Date().toISOString();
      const newReminder: LeadReminder = {
        id: newId(),
        leadId: leadId ?? null,
        userId,
        reminderDate,
        note,
        completed: false,
        reminderTime: options?.reminderTime ?? null,
        isAllDay: options?.isAllDay ?? false,
        reminderType: options?.reminderType,
        priority: options?.priority,
        routeId: options?.routeId ?? null,
        title: options?.title ?? null,
        description: options?.description ?? null,
        isRecurring: options?.isRecurring ?? false,
        recurrencePattern: options?.recurrencePattern,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const existing = safeReadAll();
      const updatedAll = [...existing, newReminder];
      safeWriteAll(updatedAll);

      set((state) => ({
        reminders: [...state.reminders, newReminder],
      }));

      return newReminder;
    } catch (error) {
      console.error('[RemindersStore] Error adding reminder:', error);
      throw error;
    }
  },

  toggleComplete: async (reminderId: string) => {
    try {
      const all = safeReadAll();
      const nowIso = new Date().toISOString();
      const updatedAll = all.map((r) =>
        r.id === reminderId ? { ...r, completed: !r.completed, updatedAt: nowIso } : r
      );
      safeWriteAll(updatedAll);

      set((state) => ({
        reminders: state.reminders.map((r) =>
          r.id === reminderId ? { ...r, completed: !r.completed, updatedAt: nowIso } : r
        ),
      }));
    } catch (error) {
      console.error('Error toggling reminder:', error);
      throw error;
    }
  },

  updateReminder: async (reminderId, updates) => {
    try {
      const all = safeReadAll();
      const nowIso = new Date().toISOString();
      const updatedAll = all.map((r) => (r.id === reminderId ? { ...r, ...updates, updatedAt: nowIso } : r));
      safeWriteAll(updatedAll);

      set((state) => ({
        reminders: state.reminders.map((r) => (r.id === reminderId ? { ...r, ...updates, updatedAt: nowIso } : r)),
      }));
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw error;
    }
  },

  deleteReminder: async (reminderId: string) => {
    try {
      const all = safeReadAll();
      const updatedAll = all.filter((r) => r.id !== reminderId);
      safeWriteAll(updatedAll);

      set((state) => ({
        reminders: state.reminders.filter((r) => r.id !== reminderId),
      }));
    } catch (error) {
      console.error('Error deleting reminder:', error);
      throw error;
    }
  },

  clearReminders: () => {
    set({ reminders: [], lastFetch: null });
  },
}));

export const useAllReminders = () => useRemindersStore((state) => state.reminders);
export const useRemindersLoading = () => useRemindersStore((state) => state.loading);

export const useLeadReminders = (leadId: string) => {
  const allReminders = useRemindersStore((state) => state.reminders);
  return useMemo(() => allReminders.filter((r) => r.leadId === leadId), [allReminders, leadId]);
};

export const useActiveReminders = () => {
  const allReminders = useRemindersStore((state) => state.reminders);
  return useMemo(() => allReminders.filter((r) => !r.completed), [allReminders]);
};
