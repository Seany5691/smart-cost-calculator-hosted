/**
 * useAutoExport - Hook to automatically export results when scraping completes
 */

import { useEffect, useRef } from 'react';
import { Business, ScrapingStatus } from '@/lib/store/scraper';

// Helper function to get auth token directly from localStorage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const data = JSON.parse(stored);
      return data.token || null;
    }
  } catch (error) {
    console.error('[AutoExport] Error reading auth token from localStorage:', error);
  }
  return null;
}

export function useAutoExport(
  status: ScrapingStatus,
  businesses: Business[],
  enabled: boolean = true
) {
  const previousStatusRef = useRef<ScrapingStatus>('idle');
  const hasExportedRef = useRef(false);

  useEffect(() => {
    // Check if scraping just completed
    const wasRunning = previousStatusRef.current === 'running';
    const isNowCompleted = status === 'completed' || status === 'stopped';
    
    if (enabled && wasRunning && isNowCompleted && !hasExportedRef.current && businesses.length > 0) {
      // Auto-export
      (async () => {
        try {
          console.log('[AutoExport] Exporting businesses...');
          
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          const filename = `businesses_${timestamp}.xlsx`;

          // Get auth token
          const token = getAuthToken();
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          };
          
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            console.log('[AutoExport] Authorization header set');
          } else {
            console.warn('[AutoExport] No auth token available');
          }

          const response = await fetch('/api/scraper/export', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              businesses,
              filename,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Export failed: ${response.status} ${errorText}`);
          }

          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          console.log(`[AutoExport] ✅ Success! Exported ${businesses.length} businesses to ${filename}`);
          hasExportedRef.current = true;
        } catch (error) {
          console.error('[AutoExport] ❌ Error:', error);
        }
      })();
    }

    // Reset export flag when starting new scrape
    if (status === 'running' && previousStatusRef.current !== 'running') {
      hasExportedRef.current = false;
    }

    previousStatusRef.current = status;
  }, [status, businesses, enabled]);
}
