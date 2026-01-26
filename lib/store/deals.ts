/**
 * Zustand Store for Deals Management
 * 
 * Manages global state for deals including:
 * - Deals list data with pagination
 * - Current deal and costings data
 * - Filter/sort/search state
 * - Loading and error states
 * - Actions for fetching deals, opening deals, and generating costings
 * 
 * Follows the pattern established by the Leads store
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCalculatorStore } from './calculator';
import { useRouter } from 'next/navigation';

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
    console.error('[DEALS] Error reading auth token from localStorage:', error);
  }
  return null;
}

// =====================================================
// Types
// =====================================================

export interface Deal {
  id: string;
  user_id: string;
  username: string;
  user_role: 'admin' | 'manager' | 'user';
  customer_name: string;
  deal_name: string;
  created_at: string;
  updated_at: string;
  totals_data: {
    totalPayout: number;
    totalMRC: number;
  };
}

export interface DealFull {
  id: string;
  user_id: string;
  username: string;
  user_role: 'admin' | 'manager' | 'user';
  customer_name: string;
  deal_name: string;
  deal_details: any;
  sections_data: any;
  totals_data: any;
  factors_data: any;
  scales_data: any;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CostingItem {
  name: string;
  quantity: number;
  actualCost: number;
  repCost: number;
  profit: number;
}

export interface CostingSection {
  items: CostingItem[];
  totalActual: number;
  totalRep: number;
  totalProfit: number;
}

export interface Costings {
  dealId: string;
  customerName: string;
  dealName: string;
  createdBy: string;
  userRole: string;
  term: number;
  escalation: number;
  
  hardware: CostingSection;
  connectivity: CostingSection;
  licensing: CostingSection;
  
  totals: {
    hardwareTotal: { actual: number; rep: number; };
    installationTotal: { actual: number; rep: number; };
    connectivityTotal: { actual: number; rep: number; };
    licensingTotal: { actual: number; rep: number; };
    settlement: { actual: number; rep: number; };
    financeFee: { actual: number; rep: number; };
    factor: { actual: number; rep: number; }; // Added factor row
    totalPayout: { actual: number; rep: number; };
    hardwareRental: { actual: number; rep: number; };
    totalMRC: { actual: number; rep: number; };
  };
  
  grossProfit: {
    actualGP: number;
    repGP: number;
    difference: number;
  };
  
  termAnalysis: {
    term: number;
    connectivityOverTerm: { actual: number; rep: number; };
    licensingOverTerm: { actual: number; rep: number; };
    totalRecurringOverTerm: { actual: number; rep: number; };
    gpOverTerm: number;
  };
}

export type SortBy = 'created_at' | 'customer_name' | 'total_payout' | 'total_mrc';
export type SortOrder = 'asc' | 'desc';

// =====================================================
// State Interface
// =====================================================

interface DealsState {
  // Data
  deals: Deal[];
  currentDeal: DealFull | null;
  costings: Costings | null;
  
  // Filters
  searchQuery: string;
  sortBy: SortBy;
  sortOrder: SortOrder;
  selectedUserId: string | null; // Admin only
  
  // Pagination
  currentPage: number;
  limit: number;
  totalPages: number;
  totalDeals: number;
  
  // Loading states
  isLoading: boolean;
  isCostingsLoading: boolean;
  error: string | null;
  
  // Actions - Data Management
  setDeals: (deals: Deal[]) => void;
  setCurrentDeal: (deal: DealFull | null) => void;
  setCostings: (costings: Costings | null) => void;
  
  // Actions - Filters
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: SortBy) => void;
  setSortOrder: (order: SortOrder) => void;
  setSelectedUserId: (userId: string | null) => void;
  clearFilters: () => void;
  
  // Actions - Pagination
  setCurrentPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setPagination: (page: number, totalPages: number, totalDeals: number) => void;
  
  // Actions - Loading and Error
  setLoading: (loading: boolean) => void;
  setCostingsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Actions - Async Operations
  fetchDeals: () => Promise<void>;
  fetchDeal: (id: string) => Promise<DealFull>;
  fetchCostings: (id: string) => Promise<Costings>;
  openDeal: (id: string) => Promise<void>;
  deleteDeal: (id: string) => Promise<void>;
  
  // Actions - Utility
  reset: () => void;
}

// =====================================================
// Initial State
// =====================================================

const initialState = {
  deals: [],
  currentDeal: null,
  costings: null,
  searchQuery: '',
  sortBy: 'created_at' as SortBy,
  sortOrder: 'desc' as SortOrder,
  selectedUserId: null,
  currentPage: 1,
  limit: 20,
  totalPages: 1,
  totalDeals: 0,
  isLoading: false,
  isCostingsLoading: false,
  error: null,
};

// =====================================================
// Store Implementation
// =====================================================

export const useDealsStore = create<DealsState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // =====================================================
      // Data Management Actions
      // =====================================================

      setDeals: (deals) => set({ deals }),

      setCurrentDeal: (deal) => set({ currentDeal: deal }),

      setCostings: (costings) => set({ costings }),

      // =====================================================
      // Filter Actions
      // =====================================================

      setSearchQuery: (query) => {
        set({ searchQuery: query, currentPage: 1 }); // Reset to first page on search
      },

      setSortBy: (sortBy) => {
        set({ sortBy, currentPage: 1 }); // Reset to first page on sort change
      },

      setSortOrder: (order) => {
        set({ sortOrder: order, currentPage: 1 }); // Reset to first page on sort order change
      },

      setSelectedUserId: (userId) => {
        set({ selectedUserId: userId, currentPage: 1 }); // Reset to first page on user filter change
      },

      clearFilters: () => {
        set({
          searchQuery: '',
          sortBy: 'created_at',
          sortOrder: 'desc',
          selectedUserId: null,
          currentPage: 1,
        });
      },

      // =====================================================
      // Pagination Actions
      // =====================================================

      setCurrentPage: (page) => set({ currentPage: page }),

      setLimit: (limit) => set({ limit, currentPage: 1 }), // Reset to first page on limit change

      setPagination: (page, totalPages, totalDeals) =>
        set({ currentPage: page, totalPages, totalDeals }),

      // =====================================================
      // Loading and Error Actions
      // =====================================================

      setLoading: (loading) => set({ isLoading: loading }),

      setCostingsLoading: (loading) => set({ isCostingsLoading: loading }),

      setError: (error) => set({ error }),

      // =====================================================
      // Async Actions
      // =====================================================

      /**
       * Fetch deals with pagination, sorting, and filtering
       * Implements requirements AC-3.1 through AC-3.5
       */
      fetchDeals: async () => {
        set({ isLoading: true, error: null });
        try {
          const token = getAuthToken();
          if (!token) {
            throw new Error('Not authenticated');
          }

          const state = get();
          const params = new URLSearchParams();
          
          // Pagination
          params.append('page', state.currentPage.toString());
          params.append('limit', state.limit.toString());
          
          // Sorting
          params.append('sortBy', state.sortBy);
          params.append('sortOrder', state.sortOrder);
          
          // Search
          if (state.searchQuery) {
            params.append('search', state.searchQuery);
          }
          
          // User filter (admin only)
          if (state.selectedUserId) {
            params.append('userId', state.selectedUserId);
          }

          const response = await fetch(`/api/deals?${params.toString()}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch deals');
          }

          const data = await response.json();
          
          set({
            deals: data.deals || [],
            totalDeals: data.pagination?.total || 0,
            totalPages: data.pagination?.totalPages || 1,
            currentPage: data.pagination?.page || state.currentPage,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch deals';
          set({ error: errorMessage, isLoading: false });
          console.error('[DEALS] Error fetching deals:', error);
          throw error;
        }
      },

      /**
       * Fetch a single deal by ID
       * Implements requirement AC-5.3
       */
      fetchDeal: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const token = getAuthToken();
          if (!token) {
            throw new Error('Not authenticated');
          }

          const response = await fetch(`/api/deals/${id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 404) {
              throw new Error('Deal not found or you don\'t have permission to view it');
            } else if (response.status === 403) {
              throw new Error('Access denied');
            }
            throw new Error(errorData.error || 'Failed to fetch deal');
          }

          const deal = await response.json();
          
          set({
            currentDeal: deal,
            isLoading: false,
            error: null,
          });
          
          return deal;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch deal';
          set({ error: errorMessage, isLoading: false });
          console.error('[DEALS] Error fetching deal:', error);
          throw error;
        }
      },

      /**
       * Fetch cost breakdown for a deal (admin only)
       * Implements requirements AC-6.1 through AC-9.6
       */
      fetchCostings: async (id: string) => {
        set({ isCostingsLoading: true, error: null });
        try {
          const token = getAuthToken();
          if (!token) {
            throw new Error('Not authenticated');
          }

          const response = await fetch(`/api/deals/${id}/costings`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 403) {
              throw new Error('Only administrators can generate cost breakdowns');
            } else if (response.status === 404) {
              throw new Error('Deal not found');
            }
            throw new Error(errorData.error || 'Failed to generate cost breakdown');
          }

          const costings = await response.json();
          
          set({
            costings,
            isCostingsLoading: false,
            error: null,
          });
          
          return costings;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to generate cost breakdown';
          set({ error: errorMessage, isCostingsLoading: false });
          console.error('[DEALS] Error fetching costings:', error);
          throw error;
        }
      },

      /**
       * Open a deal in the calculator
       * Implements requirements AC-5.1 through AC-5.6
       */
      openDeal: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          // Fetch the complete deal data
          const deal = await get().fetchDeal(id);
          
          // Load the deal into the calculator store
          await useCalculatorStore.getState().loadDeal(id);
          
          set({
            isLoading: false,
            error: null,
          });
          
          // Navigation will be handled by the component calling this action
          console.log('[DEALS] Deal loaded into calculator:', id);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to open deal';
          set({ error: errorMessage, isLoading: false });
          console.error('[DEALS] Error opening deal:', error);
          throw error;
        }
      },

      /**
       * Delete a deal
       * - Admins can delete any deal
       * - Users can only delete their own deals
       * Authorization is handled by the backend
       */
      deleteDeal: async (id: string) => {
        try {
          const token = getAuthToken();
          if (!token) {
            throw new Error('Not authenticated');
          }

          const response = await fetch(`/api/calculator/deals/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 403) {
              throw new Error('You do not have permission to delete this deal');
            } else if (response.status === 404) {
              throw new Error('Deal not found');
            }
            throw new Error(errorData.error || 'Failed to delete deal');
          }

          // Remove the deal from the local state
          set((state) => ({
            deals: state.deals.filter((deal) => deal.id !== id),
            totalDeals: state.totalDeals - 1,
          }));
          
          console.log('[DEALS] Deal deleted successfully:', id);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete deal';
          console.error('[DEALS] Error deleting deal:', error);
          throw error;
        }
      },

      // =====================================================
      // Utility Actions
      // =====================================================

      reset: () => set(initialState),
    }),
    {
      name: 'deals-storage',
      // Only persist filter preferences, not the actual data
      partialize: (state) => ({
        searchQuery: state.searchQuery,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        selectedUserId: state.selectedUserId,
        currentPage: state.currentPage,
        limit: state.limit,
      }),
    }
  )
);
