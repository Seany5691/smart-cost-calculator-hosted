import { create } from 'zustand';
import { 
  Lead, 
  LeadStatus, 
  LeadFormData, 
  LeadSearchFilters,
  LeadBulkActionResult,
  PROVIDER_PRIORITY
} from '@/lib/leads/types';
import { useAuthStore } from '@/store/auth';
import { getLeadsAdapter, initializeLeadsAdapter } from '@/lib/leads/leadsAdapter';

interface LeadsState {
  leads: Lead[]; // Filtered leads for current view
  allLeads: Lead[]; // All leads for dashboard stats (unfiltered)
  workingLeads: Lead[];
  selectedLeads: string[];
  isLoading: boolean;
  error: string | null;
  realtimeSubscription: any;
  
  // Actions
  fetchLeads: (filters?: LeadSearchFilters) => Promise<void>;
  fetchAllLeadsForStats: () => Promise<void>; // New method for dashboard
  fetchLeadsByStatus: (status: LeadStatus) => Promise<void>;
  createLead: (leadData: LeadFormData) => Promise<Lead>;
  updateLead: (leadId: string, updates: Partial<Lead>) => Promise<Lead>;
  deleteLead: (leadId: string) => Promise<void>;
  bulkUpdateLeads: (leadIds: string[], updates: Partial<Lead>) => Promise<LeadBulkActionResult>;
  changeLeadStatus: (leadId: string, status: LeadStatus, additionalData?: any) => Promise<void>;
  selectLead: (leadId: string) => void;
  deselectLead: (leadId: string) => void;
  clearSelection: () => void;
  searchLeads: (filters: LeadSearchFilters) => Promise<void>;
  renumberLeads: (status: LeadStatus) => Promise<void>;
  sortLeads: (leads: Lead[]) => Lead[];
  getUniqueListNames: () => Promise<string[]>;
  deleteList: (listName: string) => Promise<{ deletedCount: number }>;
  subscribeToLeads: () => void;
  unsubscribeFromLeads: () => void;
}

export const useLeadsStore = create<LeadsState>((set, get) => ({
  leads: [],
  allLeads: [], // Initialize allLeads array
  workingLeads: [],
  selectedLeads: [],
  isLoading: false,
  error: null,
  realtimeSubscription: null,

  // Fetch all leads with optional filters
  fetchLeads: async (filters?: LeadSearchFilters) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Initialize adapter if needed
      await initializeLeadsAdapter();
      const adapter = getLeadsAdapter();
      if (!adapter) {
        throw new Error('Database adapter not available');
      }

      // Get leads from database
      const leads = await adapter.getLeads(user.id, filters);

      // Sort leads by provider priority and number
      const sortedLeads = get().sortLeads(leads);
      
      set({ 
        leads: sortedLeads, 
        isLoading: false 
      });

      // Also refresh allLeads in the background for accurate dashboard stats
      // This runs asynchronously without blocking the UI
      get().fetchAllLeadsForStats();
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to fetch leads', 
        isLoading: false 
      });
      throw error;
    }
  },

  // Fetch ALL leads without filters for dashboard stats
  fetchAllLeadsForStats: async () => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Initialize adapter if needed
      await initializeLeadsAdapter();
      const adapter = getLeadsAdapter();
      if (!adapter) {
        throw new Error('Database adapter not available');
      }

      // Get ALL leads without any filters
      const allLeads = await adapter.getLeads(user.id, {});
      const sortedAllLeads = get().sortLeads(allLeads);
      
      console.log('[Leads Store] fetchAllLeadsForStats: Updated allLeads with', sortedAllLeads.length, 'leads');
      
      set({ allLeads: sortedAllLeads });
    } catch (error: any) {
      console.error('Failed to fetch all leads for stats:', error);
      // Don't throw - this is a background operation for stats
    }
  },

  // Fetch leads by specific status
  fetchLeadsByStatus: async (status: LeadStatus) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Initialize adapter if needed
      await initializeLeadsAdapter();
      const leads = await getLeadsAdapter().getLeadsByStatus(user.id, status);
      const sortedLeads = get().sortLeads(leads);
      
      set({ 
        leads: sortedLeads, 
        isLoading: false 
      });

      console.log('[Leads Store] fetchLeadsByStatus: Fetched', sortedLeads.length, 'leads with status:', status);

      // Also refresh allLeads in the background for accurate dashboard stats
      // This runs asynchronously without blocking the UI
      get().fetchAllLeadsForStats();
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to fetch leads by status', 
        isLoading: false 
      });
      throw error;
    }
  },

  // Create a new lead
  createLead: async (leadData: LeadFormData) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Initialize adapter if needed
      await initializeLeadsAdapter();

      const newLead: Partial<Lead> = {
        maps_address: leadData.maps_address,
        name: leadData.name,
        phone: leadData.phone || null,
        provider: leadData.provider || null,
        address: leadData.address || null,
        type_of_business: leadData.type_of_business || null,
        status: leadData.status || 'new',
        notes: leadData.notes || null,
        date_to_call_back: leadData.date_to_call_back || null,
        coordinates: null,
        background_color: null,
        import_session_id: null,
      };

      // Create in database
      const createdLead = await getLeadsAdapter().createLead(user.id, newLead);

      // Add to local state
      const currentLeads = get().leads;
      const updatedLeads = get().sortLeads([...currentLeads, createdLead]);
      
      // Also update allLeads for dashboard stats
      const currentAllLeads = get().allLeads;
      const updatedAllLeads = get().sortLeads([...currentAllLeads, createdLead]);
      
      set({ 
        leads: updatedLeads,
        allLeads: updatedAllLeads,
        isLoading: false 
      });

      return createdLead;
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to create lead', 
        isLoading: false 
      });
      throw error;
    }
  },

  // Update an existing lead
  updateLead: async (leadId: string, updates: Partial<Lead>) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Initialize adapter if needed
      await initializeLeadsAdapter();

      // Update in database
      const updatedLead = await getLeadsAdapter().updateLead(user.id, leadId, updates);

      // Update local state
      const currentLeads = get().leads;
      const updatedLeads = currentLeads.map(lead => 
        lead.id === leadId ? updatedLead : lead
      );
      const sortedLeads = get().sortLeads(updatedLeads);
      
      // Also update allLeads for dashboard stats
      const currentAllLeads = get().allLeads;
      const updatedAllLeads = currentAllLeads.map(lead => 
        lead.id === leadId ? updatedLead : lead
      );
      const sortedAllLeads = get().sortLeads(updatedAllLeads);
      
      set({ 
        leads: sortedLeads,
        allLeads: sortedAllLeads,
        isLoading: false 
      });

      return updatedLead;
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to update lead', 
        isLoading: false 
      });
      throw error;
    }
  },

  // Delete a lead
  deleteLead: async (leadId: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Initialize adapter if needed
      await initializeLeadsAdapter();

      // Delete from database
      await getLeadsAdapter().deleteLead(user.id, leadId);

      // Remove from local state
      const currentLeads = get().leads;
      const updatedLeads = currentLeads.filter(lead => lead.id !== leadId);
      
      // Also remove from allLeads for dashboard stats
      const currentAllLeads = get().allLeads;
      const updatedAllLeads = currentAllLeads.filter(lead => lead.id !== leadId);
      
      set({ 
        leads: updatedLeads,
        allLeads: updatedAllLeads,
        selectedLeads: get().selectedLeads.filter(id => id !== leadId),
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to delete lead', 
        isLoading: false 
      });
      throw error;
    }
  },

  // Bulk update multiple leads
  bulkUpdateLeads: async (leadIds: string[], updates: Partial<Lead>) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Initialize adapter if needed
      await initializeLeadsAdapter();

      // Bulk update in database
      const results = await getLeadsAdapter().bulkUpdateLeads(user.id, leadIds, updates);

      // Refresh leads after bulk update
      await get().fetchLeads();
      
      set({ isLoading: false });
      return results;
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to bulk update leads', 
        isLoading: false 
      });
      throw error;
    }
  },

  // Change lead status with automatic renumbering
  changeLeadStatus: async (leadId: string, status: LeadStatus, additionalData?: any) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // If moving to "later" status, ensure date_to_call_back is set
      if (status === 'later' && !additionalData?.date_to_call_back) {
        throw new Error('Date to call back is required for Later Stage status');
      }

      // Initialize adapter if needed
      await initializeLeadsAdapter();

      // Change status in database (handles renumbering automatically)
      await getLeadsAdapter().changeLeadStatus(user.id, leadId, status, additionalData);

      // Refresh leads
      await get().fetchLeads();
      
      set({ isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to change lead status', 
        isLoading: false 
      });
      throw error;
    }
  },

  // Select a lead for bulk actions
  selectLead: (leadId: string) => {
    const currentSelection = get().selectedLeads;
    if (!currentSelection.includes(leadId)) {
      set({ selectedLeads: [...currentSelection, leadId] });
    }
  },

  // Deselect a lead
  deselectLead: (leadId: string) => {
    const currentSelection = get().selectedLeads;
    set({ selectedLeads: currentSelection.filter(id => id !== leadId) });
  },

  // Clear all selections
  clearSelection: () => {
    set({ selectedLeads: [] });
  },

  // Search leads with filters
  searchLeads: async (filters: LeadSearchFilters) => {
    // Just use fetchLeads with filters
    await get().fetchLeads(filters);
  },

  // Renumber leads in a specific status category
  renumberLeads: async (status: LeadStatus) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Initialize adapter if needed
      await initializeLeadsAdapter();

      // Renumber in database
      await getLeadsAdapter().renumberLeads(user.id, status);
      
      // Refresh leads after renumbering
      await get().fetchLeads();
      
      set({ isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to renumber leads', 
        isLoading: false 
      });
      throw error;
    }
  },

  // Sort leads by provider priority and number
  sortLeads: (leads: Lead[]) => {
    return [...leads].sort((a, b) => {
      // First sort by provider priority (Telkom first)
      const providerA = a.provider || 'Other';
      const providerB = b.provider || 'Other';
      const priorityA = PROVIDER_PRIORITY[providerA] || PROVIDER_PRIORITY['Other'];
      const priorityB = PROVIDER_PRIORITY[providerB] || PROVIDER_PRIORITY['Other'];
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Then sort by number
      return a.number - b.number;
    });
  },

  // Get all unique list names from leads
  getUniqueListNames: async () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      return [];
    }
    
    // Initialize adapter if needed
    await initializeLeadsAdapter();
    return await getLeadsAdapter().getUniqueListNames(user.id);
  },

  // Delete an entire list
  deleteList: async (listName: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Initialize adapter if needed
      await initializeLeadsAdapter();

      // Delete the list from database
      const result = await getLeadsAdapter().deleteList(user.id, listName);

      // Refresh leads after deletion
      await get().fetchLeads();
      
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to delete list', 
        isLoading: false 
      });
      throw error;
    }
  },

  // Subscribe to real-time lead updates (no-op for localStorage)
  subscribeToLeads: () => {
    // No-op for localStorage implementation
    // Real-time updates will be handled by the main app when integrated
  },

  // Unsubscribe from real-time updates (no-op for localStorage)
  unsubscribeFromLeads: () => {
    // No-op for localStorage implementation
  }
}));

// Convenience selectors
export const useLeads = () => useLeadsStore((state) => state.leads);
export const useWorkingLeads = () => useLeadsStore((state) => state.workingLeads);
export const useSelectedLeads = () => useLeadsStore((state) => state.selectedLeads);
export const useLeadsLoading = () => useLeadsStore((state) => state.isLoading);
export const useLeadsError = () => useLeadsStore((state) => state.error);
