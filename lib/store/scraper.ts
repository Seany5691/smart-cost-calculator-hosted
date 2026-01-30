import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
    console.error('[SCRAPER] Error reading auth token from localStorage:', error);
  }
  return null;
}

export interface Business {
  name: string;
  phone: string;
  provider: string;
  town: string;
  industry: string;
  address?: string;
  website?: string;
  rating?: number;
  reviews?: number;
}

export interface ScrapingConfig {
  simultaneousTowns: number;
  simultaneousIndustries: number;
  simultaneousLookups: number;
  retryAttempts: number;
  retryDelay: number;
  browserHeadless: boolean;
  lookupBatchSize: number;
  outputFolder: string;
}

export interface ProgressState {
  totalTowns: number;
  completedTowns: number;
  totalIndustries: number;
  completedIndustries: number;
  totalBusinesses: number;
  startTime: number;
  townCompletionTimes: number[];
  failedTowns?: string[]; // Phase 4: Track failed towns
  successfulTowns?: string[]; // Phase 4: Track successful towns
}

export interface LookupProgressState {
  isActive: boolean;
  completed: number;
  total: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
}

export interface LogEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
}

export type ScrapingStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'completed' | 'error';

interface ScraperState {
  // Scraping state
  status: ScrapingStatus;
  sessionId: string | null;
  
  // Configuration
  config: ScrapingConfig;
  towns: string[];
  industries: string[];
  
  // Progress tracking
  progress: ProgressState;
  lookupProgress: LookupProgressState;
  
  // Data
  businesses: Business[];
  logs: LogEntry[];
  
  // Actions
  setStatus: (status: ScrapingStatus) => void;
  setSessionId: (sessionId: string | null) => void;
  setConfig: (config: Partial<ScrapingConfig>) => void;
  setTowns: (towns: string[]) => void;
  setIndustries: (industries: string[]) => void;
  updateProgress: (progress: Partial<ProgressState>) => void;
  updateLookupProgress: (progress: Partial<LookupProgressState>) => void;
  addBusinesses: (businesses: Business[]) => void;
  addLog: (log: LogEntry) => void;
  clearAll: () => void;
  reset: () => void;
  
  // Session management actions
  startScraping: () => Promise<void>;
  stopScraping: () => Promise<void>;
}

const defaultConfig: ScrapingConfig = {
  simultaneousTowns: 2,
  simultaneousIndustries: 2,
  simultaneousLookups: 2,
  retryAttempts: 3,
  retryDelay: 2000,
  browserHeadless: true,
  lookupBatchSize: 5,
  outputFolder: 'output',
};

const defaultProgress: ProgressState = {
  totalTowns: 0,
  completedTowns: 0,
  totalIndustries: 0,
  completedIndustries: 0,
  totalBusinesses: 0,
  startTime: 0,
  townCompletionTimes: [],
};

const defaultLookupProgress: LookupProgressState = {
  isActive: false,
  completed: 0,
  total: 0,
  percentage: 0,
  currentBatch: 0,
  totalBatches: 0,
};

export const useScraperStore = create<ScraperState>()(
  persist(
    (set, get) => ({
      // Initial state
      status: 'idle',
      sessionId: null,
      config: defaultConfig,
      towns: [],
      industries: [],
      progress: defaultProgress,
      lookupProgress: defaultLookupProgress,
      businesses: [],
      logs: [],

      // Actions
      setStatus: (status) => set({ status }),
      
      setSessionId: (sessionId) => set({ sessionId }),
      
      setConfig: (configUpdate) =>
        set((state) => ({
          config: { ...state.config, ...configUpdate },
        })),
      
      setTowns: (towns) => set({ towns }),
      
      setIndustries: (industries) => set({ industries }),
      
      updateProgress: (progressUpdate) =>
        set((state) => ({
          progress: { ...state.progress, ...progressUpdate },
        })),
      
      updateLookupProgress: (lookupProgressUpdate) =>
        set((state) => ({
          lookupProgress: { ...state.lookupProgress, ...lookupProgressUpdate },
        })),
      
      addBusinesses: (newBusinesses) =>
        set((state) => {
          // Avoid duplicates by checking if businesses already exist
          const existingIds = new Set(state.businesses.map(b => `${b.name}-${b.phone}-${b.town}`));
          const uniqueBusinesses = newBusinesses.filter(b => !existingIds.has(`${b.name}-${b.phone}-${b.town}`));
          
          return {
            businesses: [...state.businesses, ...uniqueBusinesses],
          };
        }),
      
      addLog: (log) =>
        set((state) => ({
          logs: [...state.logs, log].slice(-300), // Keep last 300 logs
        })),
      
      clearAll: () => {
        set({
          businesses: [],
          logs: [],
          progress: defaultProgress,
          lookupProgress: defaultLookupProgress,
          status: 'idle',
          sessionId: null,
        });
      },
      
      reset: () => {
        set({
          status: 'idle',
          sessionId: null,
          config: defaultConfig,
          towns: [],
          industries: [],
          progress: defaultProgress,
          lookupProgress: defaultLookupProgress,
          businesses: [],
          logs: [],
        });
      },
      
      // Session management actions
      startScraping: async () => {
        const state = get();
        
        // Validate inputs
        if (state.towns.length === 0) {
          get().addLog({
            timestamp: new Date().toISOString(),
            message: 'Error: At least one town/business is required',
            level: 'error',
          });
          return;
        }
        
        // Industries are optional - if empty, will search for business names directly
        // No validation needed for industries
        
        try {
          set({ status: 'running' });
          
          const searchType = state.industries.length === 0 ? 'business search' : `${state.industries.length} industry(ies)`;
          get().addLog({
            timestamp: new Date().toISOString(),
            message: `Starting scraping for ${state.towns.length} town(s)/business(es) - ${searchType}`,
            level: 'info',
          });
          
          // Get auth token using helper function (same as leads store)
          const token = getAuthToken();
          console.log('[SCRAPER] Auth token retrieved:', token ? 'Token exists' : 'No token found');
          
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          };
          
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            console.log('[SCRAPER] Authorization header set');
          } else {
            console.warn('[SCRAPER] No auth token available - request will fail');
          }
          
          console.log('[SCRAPER] Sending request to /api/scraper/start');
          const response = await fetch('/api/scraper/start', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              towns: state.towns,
              industries: state.industries,
              config: state.config,
            }),
          });
          
          console.log('[SCRAPER] Response status:', response.status);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(errorData.error || `Failed to start scraping: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          set({ sessionId: data.sessionId });
          
          get().updateProgress({
            startTime: Date.now(),
            totalTowns: state.towns.length,
            totalIndustries: state.towns.length * state.industries.length,
          });
          
          get().addLog({
            timestamp: new Date().toISOString(),
            message: `Scraping session started with ID: ${data.sessionId}`,
            level: 'success',
          });
        } catch (error) {
          console.error('[SCRAPER] Error in startScraping:', error);
          set({ status: 'error' });
          get().addLog({
            timestamp: new Date().toISOString(),
            message: `Error starting scraping: ${error instanceof Error ? error.message : 'Unknown error'}`,
            level: 'error',
          });
        }
      },
      
      stopScraping: async () => {
        const state = get();
        
        if (!state.sessionId) {
          get().addLog({
            timestamp: new Date().toISOString(),
            message: 'Error: No active session to stop',
            level: 'error',
          });
          return;
        }
        
        try {
          // Get auth token using helper function (same as leads store)
          const token = getAuthToken();
          
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          };
          
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const response = await fetch('/api/scraper/stop', {
            method: 'POST',
            headers,
            body: JSON.stringify({ sessionId: state.sessionId }),
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(errorData.error || `Failed to stop scraping: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          set({ status: 'stopped' });
          
          get().addLog({
            timestamp: new Date().toISOString(),
            message: `Scraping stopped. Collected ${data.businessesCollected || state.businesses.length} businesses.`,
            level: 'info',
          });
        } catch (error) {
          get().addLog({
            timestamp: new Date().toISOString(),
            message: `Error stopping scraping: ${error instanceof Error ? error.message : 'Unknown error'}`,
            level: 'error',
          });
        }
      },
    }),
    {
      name: 'smart-scrape-state',
      partialize: (state) => ({
        config: state.config,
        towns: state.towns,
        industries: state.industries,
        businesses: state.businesses,
        logs: state.logs,
      }),
    }
  )
);
