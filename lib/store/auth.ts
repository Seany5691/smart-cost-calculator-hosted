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
      const stored = localStorage.getItem('auth-storage');
      if (stored) {
        const data = JSON.parse(stored);
        set({
          user: data.user || null,
          token: data.token || null,
          isAuthenticated: data.isAuthenticated || false,
        });
      }
    } catch (error) {
      console.error('Failed to hydrate auth state:', error);
    }
  },

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });

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
        throw new Error(data.error?.message || 'Login failed');
      }

      // Store token and user
      const newState = {
        token: data.token,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
      
      set(newState);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth-storage', JSON.stringify({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
        }));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An error occurred';
      set({
        isLoading: false,
        error: errorMessage,
        isAuthenticated: false,
        user: null,
        token: null,
      });
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
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage');
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
