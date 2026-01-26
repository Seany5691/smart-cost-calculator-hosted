/**
 * Zustand Store for Routes Management
 * 
 * Manages global state for routes including:
 * - Routes data
 * - Loading and error states
 * - Route generation
 * - CRUD operations
 * 
 * Validates: Requirements 29.1-29.22
 */

import { create } from 'zustand';
import type { Route, RouteStatus, Lead, CreateRouteRequest } from '@/lib/leads/types';

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
    console.error('[ROUTES] Error reading auth token from localStorage:', error);
  }
  return null;
}

interface RoutesState {
  // State
  routes: Route[];
  loading: boolean;
  error: string | null;

  // Basic Actions
  setRoutes: (routes: Route[]) => void;
  addRoute: (route: Route) => void;
  removeRoute: (id: string) => void;
  updateRoute: (id: string, updates: Partial<Route>) => void;
  
  // Loading and Error Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Async Actions
  fetchRoutes: (status?: RouteStatus) => Promise<void>;
  generateRouteFromLeads: (startingPoint: string, leads: Lead[]) => Promise<Route>;
  deleteRoute: (id: string) => Promise<void>;
  getRouteStats: () => Promise<{ total: number; active: number; completed: number }>;
  
  // Utility Actions
  reset: () => void;
}

const initialState = {
  routes: [],
  loading: false,
  error: null
};

export const useRoutesStore = create<RoutesState>((set, get) => ({
  ...initialState,

  // =====================================================
  // Basic Actions
  // =====================================================

  setRoutes: (routes) => set({ routes }),

  addRoute: (route) =>
    set((state) => ({
      routes: [route, ...state.routes]
    })),

  removeRoute: (id) =>
    set((state) => ({
      routes: state.routes.filter((route) => route.id !== id)
    })),

  updateRoute: (id, updates) =>
    set((state) => ({
      routes: state.routes.map((route) =>
        route.id === id ? { ...route, ...updates } : route
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
   * Fetch routes with optional status filter
   */
  fetchRoutes: async (status?: RouteStatus) => {
    set({ loading: true, error: null });
    try {
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (status) {
        params.append('status', status);
      }

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/leads/routes?${params.toString()}`, { headers });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch routes');
      }

      const data = await response.json();
      
      set({
        routes: data.routes || data.data || [],
        loading: false,
        error: null
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch routes';
      set({ error: errorMessage, loading: false });
      console.error('Error fetching routes:', error);
    }
  },

  /**
   * Generate a route from selected leads
   */
  generateRouteFromLeads: async (startingPoint: string, leads: Lead[]) => {
    set({ loading: true, error: null });
    try {
      const token = getAuthToken();
      const requestData: CreateRouteRequest = {
        starting_point: startingPoint,
        lead_ids: leads.map(lead => lead.id)
      };

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/leads/routes', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate route');
      }

      const newRoute = await response.json();
      
      // Add the new route to state
      set((state) => ({
        routes: [newRoute, ...state.routes],
        loading: false,
        error: null
      }));

      return newRoute;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate route';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * Delete a route
   */
  deleteRoute: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/leads/routes/${id}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete route');
      }

      // Remove from state
      set((state) => ({
        routes: state.routes.filter((route) => route.id !== id),
        loading: false,
        error: null
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete route';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * Get route statistics
   */
  getRouteStats: async () => {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/leads/routes/stats', { headers });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch route stats');
      }

      const stats = await response.json();
      return stats;
    } catch (error) {
      console.error('Error fetching route stats:', error);
      // Return default stats on error
      return { total: 0, active: 0, completed: 0 };
    }
  },

  // =====================================================
  // Utility Actions
  // =====================================================

  reset: () => set(initialState)
}));
