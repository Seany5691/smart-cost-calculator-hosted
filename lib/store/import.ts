/**
 * Zustand Store for Import Sessions Management
 * 
 * Manages global state for import sessions including:
 * - Import sessions data
 * - Loading and error states
 * - Fetching import history
 * 
 * Validates: Requirements 29.1-29.22
 */

import { create } from 'zustand';
import type { ImportSession, ImportSourceType, ImportStatus } from '@/lib/leads/types';

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
    console.error('[IMPORT] Error reading auth token from localStorage:', error);
  }
  return null;
}

interface ImportState {
  // State
  importSessions: ImportSession[];
  loading: boolean;
  error: string | null;

  // Basic Actions
  setImportSessions: (sessions: ImportSession[]) => void;
  addImportSession: (session: ImportSession) => void;
  
  // Loading and Error Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Async Actions
  fetchImportSessions: (sourceType?: ImportSourceType, status?: ImportStatus, limit?: number) => Promise<void>;
  
  // Utility Actions
  reset: () => void;
}

const initialState = {
  importSessions: [],
  loading: false,
  error: null
};

export const useImportStore = create<ImportState>((set, get) => ({
  ...initialState,

  // =====================================================
  // Basic Actions
  // =====================================================

  setImportSessions: (sessions) => set({ importSessions: sessions }),

  addImportSession: (session) =>
    set((state) => ({
      importSessions: [session, ...state.importSessions]
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
   * Fetch import sessions with optional filters
   */
  fetchImportSessions: async (sourceType?: ImportSourceType, status?: ImportStatus, limit = 50) => {
    set({ loading: true, error: null });
    try {
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (sourceType) {
        params.append('source_type', sourceType);
      }
      if (status) {
        params.append('status', status);
      }
      if (limit) {
        params.append('limit', limit.toString());
      }

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/leads/import/sessions?${params.toString()}`, { headers });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch import sessions');
      }

      const data = await response.json();
      
      set({
        importSessions: data.sessions || data.data || [],
        loading: false,
        error: null
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch import sessions';
      set({ error: errorMessage, loading: false });
      console.error('Error fetching import sessions:', error);
    }
  },

  // =====================================================
  // Utility Actions
  // =====================================================

  reset: () => set(initialState)
}));
