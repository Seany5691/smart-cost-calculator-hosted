import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getAuthHeaders } from '@/lib/scraper/apiClient';
import type {
  Business,
  ScrapingConfig,
  ProgressState,
  LogEntry,
  ScrapingStatus,
  SessionSummary,
  StartScrapeResponse,
  StopScrapeResponse,
} from '@/lib/scraper/types';

interface ScraperState {
  // Scraping state
  status: ScrapingStatus;
  sessionId: string | null;
  eventSource: EventSource | null;
  
  // Polling state (replaces SSE for serverless)
  _pollingInterval: NodeJS.Timeout | null;
  _isPolling: boolean;
  
  // Configuration
  config: ScrapingConfig;
  towns: string[];
  industries: string[];
  
  // Progress tracking
  progress: ProgressState;
  
  // Data
  businesses: Business[];
  logs: LogEntry[];
  
  // Summary
  summary: SessionSummary | null;
  
  // Internal state for debouncing
  _pendingLogs: LogEntry[];
  _logFlushTimer: NodeJS.Timeout | null;
  
  // Actions
  setStatus: (status: ScrapingStatus) => void;
  setSessionId: (sessionId: string | null) => void;
  setConfig: (config: Partial<ScrapingConfig>) => void;
  setTowns: (towns: string[]) => void;
  setIndustries: (industries: string[]) => void;
  updateProgress: (progress: Partial<ProgressState>) => void;
  addBusinesses: (businesses: Business[]) => void;
  addLog: (log: LogEntry) => void;
  flushLogs: () => void;
  setSummary: (summary: SessionSummary) => void;
  clearAll: () => void;
  reset: () => void;
  
  // Session management actions
  startScraping: () => Promise<void>;
  stopScraping: () => Promise<void>;
  pauseScraping: () => Promise<void>;
  resumeScraping: () => Promise<void>;
  connectToSSE: (sessionId: string) => void;
  disconnectSSE: () => void;
  
  // Polling actions (new serverless approach)
  startPolling: (sessionId: string) => void;
  stopPolling: () => void;
  pollStatus: () => Promise<void>;
  processNextTown: () => Promise<void>;
}

const defaultConfig: ScrapingConfig = {
  simultaneousTowns: 2,
  simultaneousIndustries: 5,
  simultaneousLookups: 10,
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

export const useScraperStore = create<ScraperState>()(
  persist(
    (set, get) => ({
      // Initial state
      status: 'idle',
      sessionId: null,
      eventSource: null,
      _pollingInterval: null,
      _isPolling: false,
      config: defaultConfig,
      towns: [],
      industries: [],
      progress: defaultProgress,
      businesses: [],
      logs: [],
      summary: null,
      _pendingLogs: [],
      _logFlushTimer: null,

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
      
      addBusinesses: (newBusinesses) =>
        set((state) => ({
          businesses: [...state.businesses, ...newBusinesses],
        })),
      
      addLog: (log) => {
        const state = get();
        
        // Add log to pending queue
        const pendingLogs = [...state._pendingLogs, log];
        set({ _pendingLogs: pendingLogs });
        
        // Clear existing timer
        if (state._logFlushTimer) {
          clearTimeout(state._logFlushTimer);
        }
        
        // Set new timer to flush logs after 100ms
        const timer = setTimeout(() => {
          get().flushLogs();
        }, 100);
        
        set({ _logFlushTimer: timer });
      },
      
      flushLogs: () => {
        const state = get();
        
        if (state._pendingLogs.length === 0) return;
        
        // Batch update all pending logs
        set((state) => ({
          logs: [...state.logs, ...state._pendingLogs].slice(-300), // Keep last 300 logs
          _pendingLogs: [],
          _logFlushTimer: null,
        }));
      },
      
      setSummary: (summary) => set({ summary }),
      
      clearAll: () => {
        const state = get();
        
        // Clear any pending log timer
        if (state._logFlushTimer) {
          clearTimeout(state._logFlushTimer);
        }
        
        set({
          businesses: [],
          logs: [],
          progress: defaultProgress,
          summary: null,
          status: 'idle',
          sessionId: null,
          _pendingLogs: [],
          _logFlushTimer: null,
        });
      },
      
      reset: () => {
        const state = get();
        
        // Clear any pending log timer
        if (state._logFlushTimer) {
          clearTimeout(state._logFlushTimer);
        }
        
        set({
          status: 'idle',
          sessionId: null,
          config: defaultConfig,
          towns: [],
          industries: [],
          progress: defaultProgress,
          businesses: [],
          logs: [],
          summary: null,
          _pendingLogs: [],
          _logFlushTimer: null,
        });
      },
      
      // Session management actions
      startScraping: async () => {
        // Clear all previous data before starting new scrape
        get().clearAll();
        
        const state = get();
        
        // Validate inputs
        if (state.towns.length === 0) {
          get().addLog({
            timestamp: new Date().toISOString(),
            message: 'Error: At least one town is required',
            level: 'error',
          });
          return;
        }
        
        if (state.industries.length === 0) {
          get().addLog({
            timestamp: new Date().toISOString(),
            message: 'Error: At least one industry is required',
            level: 'error',
          });
          return;
        }
        
        try {
          // Set status to running
          set({ status: 'running' });
          
          // Add start log
          get().addLog({
            timestamp: new Date().toISOString(),
            message: `Starting scraping session for ${state.towns.length} town(s) and ${state.industries.length} industry(ies)`,
            level: 'info',
          });
          
          // Call API to start scraping
          const response = await fetch('/api/scrape/start', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              towns: state.towns,
              industries: state.industries,
              config: {
                simultaneousTowns: state.config.simultaneousTowns,
                simultaneousIndustries: state.config.simultaneousIndustries,
                simultaneousLookups: state.config.simultaneousLookups,
              },
            }),
          });
          
          if (!response.ok) {
            throw new Error(`Failed to start scraping: ${response.statusText}`);
          }
          
          const data: StartScrapeResponse = await response.json();
          
          // Set session ID and start polling (serverless-compatible)
          set({ sessionId: data.sessionId, status: 'running' });
          get().startPolling(data.sessionId);
          
          // Update progress with start time
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
          // Stop polling
          get().stopPolling();
          
          // Call API to stop scraping
          const response = await fetch(`/api/scrape/stop/${state.sessionId}`, {
            method: 'POST',
            headers: getAuthHeaders(),
          });
          
          if (!response.ok) {
            throw new Error(`Failed to stop scraping: ${response.statusText}`);
          }
          
          const data: StopScrapeResponse = await response.json();
          
          // Disconnect SSE (legacy)
          get().disconnectSSE();
          
          // Update status
          set({ status: 'stopped' });
          
          get().addLog({
            timestamp: new Date().toISOString(),
            message: `Scraping stopped. Collected ${data.businessesCollected} businesses.`,
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
      
      pauseScraping: async () => {
        const state = get();
        
        if (!state.sessionId) {
          get().addLog({
            timestamp: new Date().toISOString(),
            message: 'Error: No active session to pause',
            level: 'error',
          });
          return;
        }
        
        try {
          // Call API to pause scraping
          const response = await fetch(`/api/scrape/pause/${state.sessionId}`, {
            method: 'POST',
            headers: getAuthHeaders(),
          });
          
          if (!response.ok) {
            throw new Error(`Failed to pause scraping: ${response.statusText}`);
          }
          
          // Update status
          set({ status: 'paused' });
          
          get().addLog({
            timestamp: new Date().toISOString(),
            message: 'Scraping paused',
            level: 'info',
          });
        } catch (error) {
          get().addLog({
            timestamp: new Date().toISOString(),
            message: `Error pausing scraping: ${error instanceof Error ? error.message : 'Unknown error'}`,
            level: 'error',
          });
        }
      },
      
      resumeScraping: async () => {
        const state = get();
        
        if (!state.sessionId) {
          get().addLog({
            timestamp: new Date().toISOString(),
            message: 'Error: No active session to resume',
            level: 'error',
          });
          return;
        }
        
        try {
          // Call API to resume scraping
          const response = await fetch(`/api/scrape/resume/${state.sessionId}`, {
            method: 'POST',
            headers: getAuthHeaders(),
          });
          
          if (!response.ok) {
            throw new Error(`Failed to resume scraping: ${response.statusText}`);
          }
          
          // Update status
          set({ status: 'running' });
          
          get().addLog({
            timestamp: new Date().toISOString(),
            message: 'Scraping resumed',
            level: 'success',
          });
        } catch (error) {
          get().addLog({
            timestamp: new Date().toISOString(),
            message: `Error resuming scraping: ${error instanceof Error ? error.message : 'Unknown error'}`,
            level: 'error',
          });
        }
      },
      
      connectToSSE: (sessionId: string) => {
        // Disconnect existing connection if any
        get().disconnectSSE();
        
        // Get user data for authentication
        const { useAuthStore } = require('@/store/auth');
        const user = useAuthStore.getState().user;
        
        if (!user) {
          get().addLog({
            timestamp: new Date().toISOString(),
            message: 'Error: User not authenticated',
            level: 'error',
          });
          return;
        }
        
        // Encode user data as URL parameter for SSE (EventSource doesn't support headers)
        const userData = encodeURIComponent(JSON.stringify({
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          email: user.email
        }));
        
        // Create new EventSource connection with auth data in URL
        const eventSource = new EventSource(`/api/scrape/status/${sessionId}?userData=${userData}`);
        
        // Handle progress events
        eventSource.addEventListener('progress', (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Update progress state
            if (data.percentage !== undefined) {
              get().updateProgress({
                completedTowns: Math.floor((data.percentage / 100) * get().progress.totalTowns),
              });
            }
            
            if (data.businessesScraped !== undefined) {
              get().updateProgress({
                totalBusinesses: data.businessesScraped,
              });
            }
          } catch (error) {
            console.error('Error parsing progress event:', error);
          }
        });
        
        // Handle log events
        eventSource.addEventListener('log', (event) => {
          try {
            const data = JSON.parse(event.data);
            // The log is wrapped in a data object from the SSE route
            const logEntry: LogEntry = data.log || data;
            get().addLog(logEntry);
          } catch (error) {
            console.error('Error parsing log event:', error);
          }
        });
        
        // Handle complete events
        eventSource.addEventListener('complete', (event) => {
          console.log('[Client] Received complete event:', event);
          try {
            const data = JSON.parse(event.data);
            console.log('[Client] Parsed complete data:', data);
            console.log('[Client] Businesses in complete event:', data.businesses?.length || 0);
            
            // Add final businesses
            if (data.businesses && Array.isArray(data.businesses)) {
              console.log('[Client] Adding businesses to store');
              get().addBusinesses(data.businesses);
            }
            
            // Update status
            console.log('[Client] Setting status to completed');
            set({ status: 'completed' });
            
            // Disconnect SSE
            console.log('[Client] Disconnecting SSE');
            get().disconnectSSE();
            
            get().addLog({
              timestamp: new Date().toISOString(),
              message: `Scraping completed! Total businesses: ${get().businesses.length}`,
              level: 'success',
            });
            
            console.log('[Client] Complete event handled successfully');
          } catch (error) {
            console.error('Error parsing complete event:', error);
          }
        });
        
        // Handle error events (actual error messages from server)
        eventSource.addEventListener('error', (event) => {
          // Check if this is a message event with data
          if ((event as MessageEvent).data) {
            try {
              const data = JSON.parse((event as MessageEvent).data);
              
              get().addLog({
                timestamp: new Date().toISOString(),
                message: `Error: ${data.error || 'Unknown error occurred'}`,
                level: 'error',
              });
              
              // Only set error status for actual server errors, not connection issues
              set({ status: 'error' });
            } catch (error) {
              console.error('Error parsing error event:', error);
            }
          }
          // Don't handle connection errors here - they're handled in onerror
        });
        
        // Handle connection errors using onerror
        eventSource.onerror = (error) => {
          console.error('EventSource connection error:', error);
          
          // Check if the connection is closed (readyState === 2)
          if (eventSource.readyState === EventSource.CLOSED) {
            // Connection permanently closed
            console.error('SSE connection permanently closed');
            get().addLog({
              timestamp: new Date().toISOString(),
              message: 'Connection to server closed',
              level: 'error',
            });
            get().disconnectSSE();
          } else if (eventSource.readyState === EventSource.CONNECTING) {
            // EventSource is automatically reconnecting
            console.log('SSE reconnecting...');
            // Don't log every reconnection attempt to avoid spam
          }
        };
        
        // Store event source
        set({ eventSource });
      },
      
      disconnectSSE: () => {
        const state = get();
        
        // Flush any pending logs before disconnecting
        get().flushLogs();
        
        if (state.eventSource) {
          state.eventSource.close();
          set({ eventSource: null });
        }
      },

      // NEW: Polling-based approach for serverless
      startPolling: (sessionId: string) => {
        console.log('[Polling] Starting polling for session:', sessionId);
        
        // Stop any existing polling
        get().stopPolling();
        
        set({ _isPolling: true });
        
        // Start polling loop - only poll status, don't trigger processing
        const interval = setInterval(async () => {
          if (!get()._isPolling) {
            clearInterval(interval);
            return;
          }
          
          await get().pollStatus();
        }, 2000); // Poll every 2 seconds
        
        set({ _pollingInterval: interval });
        
        // Trigger the first processing immediately (only once)
        get().processNextTown();
      },

      stopPolling: () => {
        console.log('[Polling] Stopping polling');
        const state = get();
        
        if (state._pollingInterval) {
          clearInterval(state._pollingInterval);
        }
        
        set({ _pollingInterval: null, _isPolling: false });
      },

      pollStatus: async () => {
        const state = get();
        if (!state.sessionId) return;

        try {
          const response = await fetch(`/api/scrape/status-poll/${state.sessionId}`, {
            headers: getAuthHeaders(),
          });

          if (!response.ok) {
            console.error('[Polling] Status check failed:', response.status);
            return;
          }

          const data = await response.json();
          
          // Update state from PostgreSQL
          set({
            status: data.status,
            progress: data.progress,
            businesses: data.businesses,
            logs: data.logs,
          });

          // Stop polling if completed or stopped
          if (data.status === 'completed' || data.status === 'stopped' || data.status === 'error') {
            get().stopPolling();
            
            if (data.status === 'completed') {
              get().addLog({
                timestamp: new Date().toISOString(),
                message: `✅ Scraping completed! Total: ${data.businesses.length} businesses`,
                level: 'success',
              });
            }
          }
        } catch (error) {
          console.error('[Polling] Error polling status:', error);
        }
      },

      processNextTown: async () => {
        const state = get();
        if (!state.sessionId) return;
        if (state.status !== 'running' && state.status !== 'pending') return;

        try {
          console.log('[Processing] Calling /api/scrape/process for session:', state.sessionId);
          
          const response = await fetch('/api/scrape/process', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ sessionId: state.sessionId }),
          });

          if (!response.ok) {
            console.error('[Processing] Process failed:', response.status);
            return;
          }

          const data = await response.json();
          console.log('[Processing] Process response:', data);
          
          // If there's more work to do, trigger next processing
          if (data.hasMore && data.status === 'running') {
            console.log('[Processing] More work to do, triggering next town...');
            // Small delay before processing next town
            setTimeout(() => {
              get().processNextTown();
            }, 1000);
          } else if (data.status === 'completed') {
            console.log('[Processing] All towns completed!');
            // Immediately update status to completed
            set({ status: 'completed' });
            get().stopPolling();
          }
        } catch (error) {
          console.error('[Processing] Error processing:', error);
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
        summary: state.summary,
        // Exclude internal debouncing state from persistence
      }),
    }
  )
);
