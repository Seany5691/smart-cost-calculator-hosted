import { create } from 'zustand';

export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'manager' | 'user';
  name: string;
  email: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  hydrate: () => {
    if (typeof window === 'undefined') return;
    
    try {
      // Try to get token from cookie first (more reliable for server-side auth)
      const cookieToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1];
      
      // Try localStorage as fallback
      const stored = localStorage.getItem('auth-storage');
      
      if (cookieToken) {
        // IMMEDIATELY restore state from localStorage if available
        // This prevents redirect flashing while we validate the token
        if (stored) {
          try {
            const data = JSON.parse(stored);
            if (data.user && data.token === cookieToken) {
              // Immediately set the state to prevent redirects
              set({
                user: data.user,
                token: cookieToken,
                isAuthenticated: true,
              });
            }
          } catch (e) {
            console.error('Failed to parse stored auth data:', e);
          }
        }
        
        // Then verify the token is still valid in the background
        fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${cookieToken}`
          }
        })
        .then(res => {
          if (!res.ok) {
            throw new Error('Token validation failed');
          }
          return res.json();
        })
        .then(data => {
          if (data.user) {
            set({
              user: data.user,
              token: cookieToken,
              isAuthenticated: true,
            });
            // Sync to localStorage
            localStorage.setItem('auth-storage', JSON.stringify({
              user: data.user,
              token: cookieToken,
              isAuthenticated: true,
            }));
          } else {
            // Invalid response, clear auth
            set({
              user: null,
              token: null,
              isAuthenticated: false,
            });
            localStorage.removeItem('auth-storage');
            document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          }
        })
        .catch(err => {
          console.error('Token validation failed:', err);
          // Token is invalid, clear everything
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
          localStorage.removeItem('auth-storage');
          document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        });
      } else if (stored) {
        // No cookie but have localStorage - restore from localStorage IMMEDIATELY
        const data = JSON.parse(stored);
        
        if (data.token && data.user) {
          // Immediately set the state to prevent redirects
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
          });
          
          // Then verify the token is still valid in the background
          fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${data.token}`
            }
          })
          .then(res => {
            if (!res.ok) {
              throw new Error('Token validation failed');
            }
            return res.json();
          })
          .then(apiData => {
            if (apiData.user) {
              set({
                user: apiData.user,
                token: data.token,
                isAuthenticated: true,
              });
              
              // Re-set cookie from localStorage
              const expires = new Date();
              expires.setHours(expires.getHours() + 24);
              const isProduction = window.location.protocol === 'https:';
              const secureFlag = isProduction ? '; Secure' : '';
              document.cookie = `auth-token=${data.token}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secureFlag}`;
            } else {
              // Invalid response, clear auth
              set({
                user: null,
                token: null,
                isAuthenticated: false,
              });
              localStorage.removeItem('auth-storage');
            }
          })
          .catch(err => {
            console.error('Token validation failed:', err);
            // Token is invalid, clear everything
            set({
              user: null,
              token: null,
              isAuthenticated: false,
            });
            localStorage.removeItem('auth-storage');
          });
        }
      }
    } catch (error) {
      console.error('Failed to hydrate auth state:', error);
      // On error, clear auth state to be safe
      set({
        user: null,
        token: null,
        isAuthenticated: false,
      });
    }
  },
              expires.setHours(expires.getHours() + 24);
              const isProduction = window.location.protocol === 'https:';
              const secureFlag = isProduction ? '; Secure' : '';
              document.cookie = `auth-token=${data.token}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secureFlag}`;
            } else {
              // Invalid response, clear auth
              set({
                user: null,
                token: null,
                isAuthenticated: false,
              });
              localStorage.removeItem('auth-storage');
            }
          })
          .catch(err => {
            console.error('Token validation failed:', err);
            // Token is invalid, clear everything
            set({
              user: null,
              token: null,
              isAuthenticated: false,
            });
            localStorage.removeItem('auth-storage');
          });
        }
      }
    } catch (error) {
      console.error('Failed to hydrate auth state:', error);
      // On error, clear auth state to be safe
      set({
        user: null,
        token: null,
        isAuthenticated: false,
      });
    }
  },

  login: async (username: string, password: string) => {
    // CRITICAL: Clear any existing auth data BEFORE attempting login
    // This prevents stale data from causing false authentication
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-storage');
      document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
    
    // Reset state to unauthenticated
    set({ 
      isLoading: true, 
      error: null,
      isAuthenticated: false,
      user: null,
      token: null,
    });

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle error - check if error is an object with message or a string
        const errorMessage = typeof data.error === 'string' 
          ? data.error 
          : data.error?.message || 'Invalid username or password';
        set({
          isLoading: false,
          error: errorMessage,
          isAuthenticated: false,
          user: null,
          token: null,
        });
        throw new Error(errorMessage);
      }

      // Validate response has required data
      if (!data.success || !data.token || !data.user) {
        const errorMessage = 'Invalid response from server';
        set({
          isLoading: false,
          error: errorMessage,
          isAuthenticated: false,
          user: null,
          token: null,
        });
        throw new Error(errorMessage);
      }

      // Store token and user ONLY on successful login
      const newState = {
        token: data.token,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
      
      set(newState);
      
      // Save to localStorage AND cookie for reliability
      if (typeof window !== 'undefined') {
        const authData = {
          user: data.user,
          token: data.token,
          isAuthenticated: true,
        };
        
        localStorage.setItem('auth-storage', JSON.stringify(authData));
        
        // Also set cookie (expires in 24 hours)
        const expires = new Date();
        expires.setHours(expires.getHours() + 24);
        
        // Only use Secure flag in production (HTTPS), not on localhost (HTTP)
        const isProduction = window.location.protocol === 'https:';
        const secureFlag = isProduction ? '; Secure' : '';
        document.cookie = `auth-token=${data.token}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secureFlag}`;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An error occurred during login';
      
      // Ensure state is completely cleared on error
      set({
        isLoading: false,
        error: errorMessage,
        isAuthenticated: false,
        user: null,
        token: null,
      });
      
      // Ensure storage is cleared
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage');
        document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }
      
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });

    try {
      const token = get().token;

      // Call logout endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Clear state
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      
      // Clear localStorage AND cookie
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage');
        // Clear cookie
        document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Clear state anyway
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage');
        document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }
    }
  },

  clearError: () => {
    set({ error: null });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));
