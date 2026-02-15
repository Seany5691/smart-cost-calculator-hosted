'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/auth-simple';

/**
 * AuthProvider - Centralized Authentication Hydration
 * 
 * This component is responsible for:
 * 1. Hydrating auth state from localStorage/cookies on app load
 * 2. Setting up periodic token refresh checks
 * 3. Providing a single source of truth for auth initialization
 * 
 * IMPORTANT: This should be the ONLY place where hydrate() is called.
 * Individual pages should NOT call hydrate() themselves.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((state) => state.hydrate);
  const checkTokenExpiration = useAuthStore((state) => state.checkTokenExpiration);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isInitialized, setIsInitialized] = useState(false);

  // Hydrate auth state on mount
  useEffect(() => {
    console.log('[AuthProvider] Initializing authentication...');
    hydrate();
    setIsInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set up periodic token refresh check (every 5 minutes)
  useEffect(() => {
    if (!isAuthenticated || !isInitialized) return;

    console.log('[AuthProvider] Setting up token refresh monitor...');

    const checkInterval = setInterval(async () => {
      const needsRefresh = checkTokenExpiration();
      
      if (needsRefresh) {
        console.log('[AuthProvider] Token near expiration, refreshing...');
        const success = await refreshToken();
        
        if (success) {
          console.log('[AuthProvider] Token refreshed successfully');
        } else {
          console.warn('[AuthProvider] Token refresh failed');
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
      console.log('[AuthProvider] Cleaning up token refresh monitor');
      clearInterval(checkInterval);
    };
  }, [isAuthenticated, isInitialized, checkTokenExpiration, refreshToken]);

  return <>{children}</>;
}

