/**
 * Centralized API Client with Authentication and Error Handling
 * 
 * This module provides a wrapper around fetch that:
 * - Automatically includes authentication tokens
 * - Handles 401 errors by logging out the user
 * - Provides consistent error handling
 * - Supports token refresh
 */

import { useAuthStore } from '@/lib/store/auth-simple';

/**
 * Get the current auth token from the store
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return useAuthStore.getState().token;
}

/**
 * Check if token is close to expiration (within 5 minutes)
 */
function isTokenNearExpiration(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = payload.exp * 1000;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    return (expiresAt - now) < fiveMinutes;
  } catch {
    return false;
  }
}

/**
 * Attempt to refresh the token
 */
async function refreshToken(currentToken: string): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data.success && data.token) {
      // Update the store with new token
      const authStore = useAuthStore.getState();
      const newState = {
        token: data.token,
        user: data.user,
        isAuthenticated: true,
      };
      
      useAuthStore.setState(newState);
      
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth-storage', JSON.stringify(newState));
        
        // Update cookie
        const expires = new Date();
        expires.setHours(expires.getHours() + 24);
        const isProduction = window.location.protocol === 'https:';
        const secureFlag = isProduction ? '; Secure' : '';
        document.cookie = `auth-token=${data.token}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secureFlag}`;
      }
      
      return data.token;
    }
    
    return null;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

/**
 * Handle 401 Unauthorized errors by logging out the user
 */
function handle401Error() {
  if (typeof window === 'undefined') return;
  
  // Clear auth state
  useAuthStore.getState().logout();
  
  // Redirect to login with expired message
  window.location.href = '/login?expired=true';
}

/**
 * Authenticated fetch wrapper
 * 
 * Automatically includes authentication token and handles common errors.
 * 
 * @param url - API endpoint URL
 * @param options - Fetch options
 * @returns Promise<Response>
 * 
 * @example
 * ```typescript
 * const response = await authenticatedFetch('/api/leads', {
 *   method: 'GET',
 * });
 * const data = await response.json();
 * ```
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let token = getAuthToken();
  
  if (!token) {
    throw new Error('No authentication token available');
  }
  
  // Check if token needs refresh
  if (isTokenNearExpiration(token)) {
    console.log('[API Client] Token near expiration, attempting refresh...');
    const newToken = await refreshToken(token);
    if (newToken) {
      token = newToken;
      console.log('[API Client] Token refreshed successfully');
    } else {
      console.warn('[API Client] Token refresh failed, using existing token');
    }
  }
  
  // Merge headers with authentication
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
  };
  
  // Make the request
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  // Handle 401 Unauthorized
  if (response.status === 401) {
    console.error('[API Client] 401 Unauthorized - logging out user');
    handle401Error();
    throw new Error('Session expired. Please log in again.');
  }
  
  return response;
}

/**
 * Authenticated fetch with JSON response
 * 
 * Convenience wrapper that automatically parses JSON responses.
 * 
 * @param url - API endpoint URL
 * @param options - Fetch options
 * @returns Promise<T> - Parsed JSON response
 * 
 * @example
 * ```typescript
 * const leads = await authenticatedFetchJSON<Lead[]>('/api/leads');
 * ```
 */
export async function authenticatedFetchJSON<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await authenticatedFetch(url, options);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      error: { message: 'Request failed' } 
    }));
    throw new Error(error.error?.message || `Request failed with status ${response.status}`);
  }
  
  return response.json();
}

/**
 * Check if the current token is valid
 * 
 * @returns Promise<boolean>
 */
export async function isTokenValid(): Promise<boolean> {
  const token = getAuthToken();
  
  if (!token) {
    return false;
  }
  
  try {
    const response = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get time until token expiration in milliseconds
 * 
 * @returns number | null - Milliseconds until expiration, or null if no token
 */
export function getTokenTimeRemaining(): number | null {
  const token = getAuthToken();
  
  if (!token) {
    return null;
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = payload.exp * 1000;
    const now = Date.now();
    
    return Math.max(0, expiresAt - now);
  } catch {
    return null;
  }
}
