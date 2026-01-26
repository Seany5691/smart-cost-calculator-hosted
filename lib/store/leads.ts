/**
 * Zustand Store for Leads Management
 * 
 * Manages global state for leads including:
 * - Leads data (filtered and unfiltered)
 * - Selection state
 * - Loading and error states
 * - CRUD operations
 * - List management
 * 
 * Validates: Requirements 29.1-29.22
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lead, LeadStatus, LeadFilters, UpdateLeadRequest } from '@/lib/leads/types';

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
    console.error('[LEADS] Error reading auth token from localStorage:', error);
  }
  return null;
}

interface LeadsState {
  // State
  leads: Lead[]; // Filtered leads for current view
  allLeads: Lead[]; // Unfiltered leads for stats (never filtered)
  selectedLeads: string[];
  filters: LeadFilters;
  currentPage: number;
  totalPages: number;
  total: number;
  loading: boolean;
  error: string | null;
  listNames: string[];

  // Basic CRUD Actions
  setLeads: (leads: Lead[]) => void;
  setAllLeads: (leads: Lead[]) => void;
  addLead: (lead: Lead) => void;
  removeLead: (id: string) => void;
  
  // Selection Actions
  selectLead: (id: string) => void;
  deselectLead: (id: string) => void;
  setSelectedLeads: (ids: string[]) => void;
  toggleLeadSelection: (id: string) => void;
  clearSelection: () => void;
  
  // Filter and Pagination Actions
  setFilters: (filters: Partial<LeadFilters>) => void;
  clearFilters: () => void;
  setCurrentPage: (page: number) => void;
  setPagination: (page: number, totalPages: number, total: number) => void;
  
  // Loading and Error Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // List Management Actions
  setListNames: (listNames: string[]) => void;
  
  // Async Actions
  fetchLeads: (filters?: LeadFilters, page?: number, limit?: number) => Promise<void>;
  fetchAllLeadsForStats: () => Promise<void>;
  updateLead: (id: string, updates: UpdateLeadRequest) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  changeLeadStatus: (id: string, status: LeadStatus, additionalData?: any) => Promise<void>;
  getUniqueListNames: () => Promise<void>;
  deleteList: (listName: string) => Promise<void>;
  
  // Utility Actions
  reset: () => void;
}

const initialState = {
  leads: [],
  allLeads: [],
  selectedLeads: [],
  filters: {},
  currentPage: 1,
  totalPages: 1,
  total: 0,
  loading: false,
  error: null,
  listNames: []
};

export const useLeadsStore = create<LeadsState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // =====================================================
      // Basic CRUD Actions
      // =====================================================

      setLeads: (leads) => set({ leads }),

      setAllLeads: (leads) => set({ allLeads: leads }),

      addLead: (lead) =>
        set((state) => ({
          leads: [lead, ...state.leads],
          allLeads: [lead, ...state.allLeads],
          total: state.total + 1
        })),

      removeLead: (id) =>
        set((state) => ({
          leads: state.leads.filter((lead) => lead.id !== id),
          allLeads: state.allLeads.filter((lead) => lead.id !== id),
          selectedLeads: state.selectedLeads.filter((leadId) => leadId !== id),
          total: state.total - 1
        })),

      // =====================================================
      // Selection Actions
      // =====================================================

      selectLead: (id) =>
        set((state) => ({
          selectedLeads: state.selectedLeads.includes(id)
            ? state.selectedLeads
            : [...state.selectedLeads, id]
        })),

      deselectLead: (id) =>
        set((state) => ({
          selectedLeads: state.selectedLeads.filter((leadId) => leadId !== id)
        })),

      setSelectedLeads: (ids) => set({ selectedLeads: ids }),

      toggleLeadSelection: (id) =>
        set((state) => ({
          selectedLeads: state.selectedLeads.includes(id)
            ? state.selectedLeads.filter((leadId) => leadId !== id)
            : [...state.selectedLeads, id]
        })),

      clearSelection: () => set({ selectedLeads: [] }),

      // =====================================================
      // Filter and Pagination Actions
      // =====================================================

      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
          currentPage: 1 // Reset to first page when filters change
        })),

      clearFilters: () => set({ filters: {}, currentPage: 1 }),

      setCurrentPage: (page) => set({ currentPage: page }),

      setPagination: (page, totalPages, total) =>
        set({ currentPage: page, totalPages, total }),

      // =====================================================
      // Loading and Error Actions
      // =====================================================

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      // =====================================================
      // List Management Actions
      // =====================================================

      setListNames: (listNames) => set({ listNames }),

      // =====================================================
      // Async Actions
      // =====================================================

      /**
       * Fetch leads with optional filters and pagination
       * Updates the 'leads' state (filtered)
       */
      fetchLeads: async (filters?: LeadFilters, page = 1, limit = 50) => {
        set({ loading: true, error: null });
        try {
          const token = getAuthToken();
          const params = new URLSearchParams();
          
          if (filters?.status && filters.status.length > 0) {
            params.append('status', filters.status.join(','));
          }
          if (filters?.provider && filters.provider.length > 0) {
            params.append('provider', filters.provider.join(','));
          }
          if (filters?.town && filters.town.length > 0) {
            params.append('town', filters.town.join(','));
          }
          if (filters?.list_name) {
            params.append('listName', filters.list_name);
          }
          if (filters?.search) {
            params.append('search', filters.search);
          }
          if (page) {
            params.append('page', page.toString());
          }
          if (limit) {
            params.append('limit', limit.toString());
          }

          const headers: HeadersInit = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(`/api/leads?${params.toString()}`, { headers });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch leads');
          }

          const data = await response.json();
          
          set({
            leads: data.data || data.leads || [],
            total: data.pagination?.total || data.total || 0,
            totalPages: data.pagination?.totalPages || data.totalPages || 1,
            currentPage: data.pagination?.page || page,
            loading: false,
            error: null
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch leads';
          set({ error: errorMessage, loading: false });
          console.error('Error fetching leads:', error);
        }
      },

      /**
       * Fetch all leads without filters for dashboard statistics
       * Updates the 'allLeads' state (unfiltered)
       */
      fetchAllLeadsForStats: async () => {
        try {
          const token = getAuthToken();
          const headers: HeadersInit = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch('/api/leads?all=true', { headers });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch all leads');
          }

          const data = await response.json();
          
          set({
            allLeads: data.data || data.leads || []
          });
        } catch (error) {
          console.error('Error fetching all leads for stats:', error);
          // Don't set error state for stats fetch to avoid disrupting UI
        }
      },

      /**
       * Update a lead
       */
      updateLead: async (id: string, updates: UpdateLeadRequest) => {
        set({ loading: true, error: null });
        try {
          const token = getAuthToken();
          const headers: HeadersInit = { 'Content-Type': 'application/json' };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(`/api/leads/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(updates)
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update lead');
          }

          const updatedLead = await response.json();
          
          // Update both leads and allLeads
          set((state) => ({
            leads: state.leads.map((lead) =>
              lead.id === id ? { ...lead, ...updatedLead } : lead
            ),
            allLeads: state.allLeads.map((lead) =>
              lead.id === id ? { ...lead, ...updatedLead } : lead
            ),
            loading: false,
            error: null
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update lead';
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      /**
       * Delete a lead
       */
      deleteLead: async (id: string) => {
        set({ loading: true, error: null });
        try {
          const token = getAuthToken();
          const headers: HeadersInit = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(`/api/leads/${id}`, {
            method: 'DELETE',
            headers
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete lead');
          }

          // Remove from both leads and allLeads
          set((state) => ({
            leads: state.leads.filter((lead) => lead.id !== id),
            allLeads: state.allLeads.filter((lead) => lead.id !== id),
            selectedLeads: state.selectedLeads.filter((leadId) => leadId !== id),
            total: state.total - 1,
            loading: false,
            error: null
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete lead';
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      /**
       * Change lead status with optional additional data
       */
      changeLeadStatus: async (id: string, status: LeadStatus, additionalData?: any) => {
        set({ loading: true, error: null });
        try {
          const token = getAuthToken();
          const updates: UpdateLeadRequest = {
            status,
            ...additionalData
          };

          const headers: HeadersInit = { 'Content-Type': 'application/json' };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(`/api/leads/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(updates)
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to change lead status');
          }

          const updatedLead = await response.json();
          
          // Update both leads and allLeads
          set((state) => ({
            leads: state.leads.map((lead) =>
              lead.id === id ? { ...lead, ...updatedLead } : lead
            ),
            allLeads: state.allLeads.map((lead) =>
              lead.id === id ? { ...lead, ...updatedLead } : lead
            ),
            loading: false,
            error: null
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to change lead status';
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      /**
       * Fetch unique list names
       */
      getUniqueListNames: async () => {
        try {
          const token = getAuthToken();
          const headers: HeadersInit = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch('/api/leads/lists', { headers });
          
          if (!response.ok) {
            throw new Error('Failed to fetch list names');
          }
          
          const data = await response.json();
          set({ listNames: data.listNames || [] });
        } catch (error) {
          console.error('Error fetching list names:', error);
          set({ error: 'Failed to fetch list names' });
        }
      },

      /**
       * Delete an entire list (all leads with that list_name)
       */
      deleteList: async (listName: string) => {
        set({ loading: true, error: null });
        try {
          const token = getAuthToken();
          const headers: HeadersInit = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(`/api/leads/lists/${encodeURIComponent(listName)}`, {
            method: 'DELETE',
            headers
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete list');
          }

          const data = await response.json();
          
          // Remove deleted leads from both leads and allLeads
          set((state) => ({
            leads: state.leads.filter(lead => lead.list_name !== listName),
            allLeads: state.allLeads.filter(lead => lead.list_name !== listName),
            listNames: state.listNames.filter(name => name !== listName),
            total: state.total - data.deletedCount,
            loading: false,
            error: null
          }));

          return data;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete list';
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      // =====================================================
      // Utility Actions
      // =====================================================

      reset: () => set(initialState)
    }),
    {
      name: 'leads-storage',
      partialize: (state) => ({
        filters: state.filters,
        currentPage: state.currentPage
      })
    }
  )
);
