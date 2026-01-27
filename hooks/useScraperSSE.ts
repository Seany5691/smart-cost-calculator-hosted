/**
 * useScraperSSE - Hook to connect to scraper SSE endpoint and receive real-time updates
 * Includes automatic retry logic with exponential backoff
 */

import { useEffect, useRef } from 'react';
import { useScraperStore } from '@/lib/store/scraper';

export function useScraperSSE(sessionId: string | null, enabled: boolean = true) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { setStatus, updateProgress, updateLookupProgress, addBusinesses, addLog } = useScraperStore();

  useEffect(() => {
    if (!enabled || !sessionId) {
      return;
    }

    const MAX_RETRIES = 5;
    const RETRY_DELAYS = [500, 1000, 2000, 3000, 5000]; // Progressive backoff in ms

    const connect = () => {
      const attemptNumber = retryCountRef.current + 1;
      console.log(`[SSE] Connecting to session: ${sessionId} (attempt ${attemptNumber})`);

      // Create EventSource connection
      const eventSource = new EventSource(`/api/scraper/status/${sessionId}/stream`);
      eventSourceRef.current = eventSource;

      // Handle messages
      eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Reset retry count on successful message
          retryCountRef.current = 0;
          
          switch (message.type) {
            case 'connected':
              console.log('[SSE] Connected to scraper stream');
              addLog({
                timestamp: new Date().toISOString(),
                message: 'Connected to scraper stream',
                level: 'info',
              });
              break;

            case 'progress':
              console.log('[SSE] Progress update:', message.data);
              updateProgress({
                completedTowns: message.data.completedTowns,
                totalTowns: message.data.totalTowns,
                totalBusinesses: message.data.businessesScraped,
              });
              break;

            case 'business':
              // NEW - Phase 2: Real-time business display
              console.log('[SSE] New business scraped:', message.data);
              addBusinesses([message.data]);
              break;

            case 'town-complete':
              // NEW - Phase 2: Town completion notification
              console.log('[SSE] Town completed:', message.data);
              addLog({
                timestamp: new Date().toISOString(),
                message: `✅ ${message.data.town} completed: ${message.data.businessCount} businesses (${Math.round(message.data.duration / 1000)}s)`,
                level: 'success',
              });
              break;

            case 'lookup-progress':
              // NEW - Phase 2: Provider lookup progress
              console.log('[SSE] Lookup progress:', message.data);
              updateLookupProgress({
                isActive: true,
                completed: message.data.completed,
                total: message.data.total,
                percentage: message.data.percentage,
                currentBatch: message.data.currentBatch,
                totalBatches: message.data.totalBatches,
              });
              addLog({
                timestamp: new Date().toISOString(),
                message: `🔍 Provider lookups: ${message.data.completed}/${message.data.total} (${message.data.percentage}%)`,
                level: 'info',
              });
              break;

            case 'providers-updated':
              // NEW - Provider fix: Update businesses with provider data
              console.log('[SSE] Providers updated:', message.data);
              if (message.data.businesses && Array.isArray(message.data.businesses)) {
                // Replace all businesses with updated ones (includes providers)
                useScraperStore.getState().clearAll();
                addBusinesses(message.data.businesses);
              }
              
              // Deactivate lookup progress
              updateLookupProgress({ isActive: false });
              
              addLog({
                timestamp: new Date().toISOString(),
                message: `✅ Provider lookups completed! ${message.data.updatedCount} phone numbers identified`,
                level: 'success',
              });
              break;

            case 'complete':
              console.log('[SSE] Scraping complete:', message.data);
              setStatus('completed');
              
              // Deactivate lookup progress
              updateLookupProgress({ isActive: false });
              
              // Add businesses to store (if not already added via real-time updates)
              if (message.data.businesses && Array.isArray(message.data.businesses)) {
                addBusinesses(message.data.businesses);
              }
              
              addLog({
                timestamp: new Date().toISOString(),
                message: `Scraping completed! Collected ${message.data.businesses?.length || 0} businesses`,
                level: 'success',
              });
              
              // Close connection after completion
              eventSource.close();
              break;

            case 'log':
              console.log('[SSE] Log:', message.data);
              addLog({
                timestamp: new Date().toISOString(),
                message: message.data.message || message.data,
                level: message.data.level || 'info',
              });
              break;

            case 'error':
              console.error('[SSE] Error:', message.data);
              setStatus('error');
              addLog({
                timestamp: new Date().toISOString(),
                message: `Error: ${message.data.message || message.data}`,
                level: 'error',
              });
              break;

            default:
              console.log('[SSE] Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('[SSE] Error parsing message:', error);
        }
      };

      // Handle errors with retry logic
      eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', error);
        eventSource.close();
        
        // Attempt retry if under max retries
        if (retryCountRef.current < MAX_RETRIES) {
          const delay = RETRY_DELAYS[retryCountRef.current] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
          console.log(`[SSE] Retrying in ${delay}ms...`);
          
          addLog({
            timestamp: new Date().toISOString(),
            message: `Connection lost. Retrying in ${delay / 1000}s... (attempt ${retryCountRef.current + 1}/${MAX_RETRIES})`,
            level: 'warning',
          });
          
          retryTimeoutRef.current = setTimeout(() => {
            retryCountRef.current++;
            connect();
          }, delay);
        } else {
          console.error('[SSE] Max retries reached. Giving up.');
          addLog({
            timestamp: new Date().toISOString(),
            message: 'Failed to connect to scraper stream after multiple attempts. Please refresh the page.',
            level: 'error',
          });
        }
      };
    };

    // Initial connection
    connect();

    // Cleanup on unmount
    return () => {
      console.log('[SSE] Closing connection');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      retryCountRef.current = 0;
    };
  }, [sessionId, enabled, setStatus, updateProgress, addBusinesses, addLog]);

  return {
    disconnect: () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      retryCountRef.current = 0;
    },
  };
}
