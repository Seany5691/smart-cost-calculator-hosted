/**
 * Zustand Store for Reminders Management
 * 
 * Manages global state for reminders including:
 * - Reminders data
 * - Loading and error states
 * - CRUD operations
 * 
 * Validates: Requirements 29.1-29.22
 */

import { create } from 'zustand';
import type { LeadReminder, ReminderStatus, CreateReminderRequest, UpdateReminderRequest } from '@/lib/leads/types';

// Helper function to get auth token directly from localStorage
// This bypasses Zustand hydration timing issues
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const data = JSON.parse(stored);
      return data.token || null;
    }
  } catch (error) {
    console.error('[REMINDERS] Error reading auth token from localStorage:', error);
  }
  return null;
}

interface RemindersState {
  // State
  reminders: LeadReminder[];
  loading: boolean;
  error: string | null;

  // Basic Actions
  setReminders: (reminders: LeadReminder[]) => void;
  addReminder: (reminder: LeadReminder) => void;
  removeReminder: (id: string) => void;
  updateReminderInState: (id: string, updates: Partial<LeadReminder>) => void;
  toggleComplete: (id: string) => void;
  
  // Loading and Error Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Async Actions
  fetchAllReminders: (status?: ReminderStatus, dateFrom?: string, dateTo?: string, type?: string, priority?: string) => Promise<void>;
  createReminder: (leadId: string, data: CreateReminderRequest) => Promise<LeadReminder>;
  updateReminder: (leadId: string, reminderId: string, data: UpdateReminderRequest) => Promise<void>;
  deleteReminder: (leadId: string, reminderId: string) => Promise<void>;
  refreshReminders: () => Promise<void>;
  
  // Utility Actions
  reset: () => void;
}

const initialState = {
  reminders: [],
  loading: false,
  error: null
};

export const useRemindersStore = create<RemindersState>((set, get) => ({
  ...initialState,

  // =====================================================
  // Basic Actions
  // =====================================================

  setReminders: (reminders) => set({ reminders }),

  addReminder: (reminder) =>
    set((state) => ({
      reminders: [reminder, ...state.reminders]
    })),

  removeReminder: (id) =>
    set((state) => ({
      reminders: state.reminders.filter((reminder) => reminder.id !== id)
    })),

  updateReminderInState: (id, updates) =>
    set((state) => ({
      reminders: state.reminders.map((reminder) =>
        reminder.id === id ? { ...reminder, ...updates } : reminder
      )
    })),

  toggleComplete: (id) =>
    set((state) => ({
      reminders: state.reminders.map((reminder) =>
        reminder.id === id 
          ? { ...reminder, completed: !reminder.completed, status: !reminder.completed ? 'completed' : 'pending' } 
          : reminder
      )
    })),

  // =====================================================
  // Loading and Error Actions
  // =====================================================

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  // =====================================================
  // Async Actions
  // =====================================================

  /**
   * Fetch all reminders for the current user with optional filters
   */
  fetchAllReminders: async (status?: ReminderStatus, dateFrom?: string, dateTo?: string, type?: string, priority?: string) => {
    set({ loading: true, error: null });
    try {
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (status) {
        params.append('status', status);
      }
      if (dateFrom) {
        params.append('date_from', dateFrom);
      }
      if (dateTo) {
        params.append('date_to', dateTo);
      }
      if (type) {
        params.append('type', type);
      }
      if (priority) {
        params.append('priority', priority);
      }

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/reminders?${params.toString()}`, { headers });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch reminders');
      }

      const data = await response.json();
      
      set({
        reminders: data.reminders || data.data || [],
        loading: false,
        error: null
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch reminders';
      set({ error: errorMessage, loading: false });
      console.error('Error fetching reminders:', error);
    }
  },

  /**
   * Create a new reminder (for a lead or standalone)
   */
  createReminder: async (leadId: string, data: CreateReminderRequest) => {
    set({ loading: true, error: null });
    try {
      const token = getAuthToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Use different endpoint based on whether it's a lead reminder or standalone
      const endpoint = leadId && leadId !== '' 
        ? `/api/leads/${leadId}/reminders`
        : `/api/reminders`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create reminder');
      }

      const newReminder = await response.json();
      
      // Add the new reminder to state
      set((state) => ({
        reminders: [newReminder, ...state.reminders],
        loading: false,
        error: null
      }));

      return newReminder;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create reminder';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * Update a reminder
   */
  updateReminder: async (leadId: string, reminderId: string, data: UpdateReminderRequest) => {
    set({ loading: true, error: null });
    try {
      const token = getAuthToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/leads/${leadId}/reminders/${reminderId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update reminder');
      }

      const updatedReminder = await response.json();
      
      // Update in state
      set((state) => ({
        reminders: state.reminders.map((reminder) =>
          reminder.id === reminderId ? { ...reminder, ...updatedReminder } : reminder
        ),
        loading: false,
        error: null
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update reminder';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * Delete a reminder
   */
  deleteReminder: async (leadId: string, reminderId: string) => {
    set({ loading: true, error: null });
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/leads/${leadId}/reminders/${reminderId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete reminder');
      }

      // Remove from state
      set((state) => ({
        reminders: state.reminders.filter((reminder) => reminder.id !== reminderId),
        loading: false,
        error: null
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete reminder';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * Refresh reminders - re-fetch with current filters
   */
  refreshReminders: async () => {
    const { fetchAllReminders } = get();
    await fetchAllReminders();
  },

  // =====================================================
  // Utility Actions
  // =====================================================

  reset: () => set(initialState)
}));
