import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, User } from '@/lib/types';

const DEFAULT_ADMIN: User = {
  id: '550e8400-e29b-41d4-a716-446655440000', // Proper UUID format
  username: 'Camryn',
  password: 'Elliot6242!',
  role: 'admin',
  name: 'Camryn Admin',
  email: 'camryn@company.com',
  isActive: true,
  requiresPasswordChange: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};

const SAMPLE_USERS: User[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001', // Proper UUID format
    username: 'john',
    password: 'password123',
    role: 'manager',
    name: 'John Manager',
    email: 'john@company.com',
    isActive: true,
    requiresPasswordChange: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002', // Proper UUID format
    username: 'jane',
    password: 'password123',
    role: 'user',
    name: 'Jane User',
    email: 'jane@company.com',
    isActive: true,
    requiresPasswordChange: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

// Global storage key for cross-browser user synchronization
const GLOBAL_USERS_KEY = 'smart-cost-calculator-global-users';

// Enhanced validation function for user data
const validateUserData = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;
  
  // Check if users array exists and is valid
  if (!data.users || !Array.isArray(data.users)) return false;
  
  // Validate each user object
  for (const user of data.users) {
    if (!user || typeof user !== 'object') return false;
    
    // Check required user properties
    const requiredProps = ['id', 'username', 'password', 'role', 'name', 'email', 'isActive'];
    for (const prop of requiredProps) {
      if (!user.hasOwnProperty(prop)) return false;
    }
    
    // Validate role
    if (!['admin', 'manager', 'user'].includes(user.role)) return false;
    
    // Validate email format (basic check)
    if (typeof user.email !== 'string' || !user.email.includes('@')) return false;
  }
  
  return true;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      users: [DEFAULT_ADMIN, ...SAMPLE_USERS],

      login: async (username: string, password: string) => {
        let { users } = get();
        let user = users.find(u => u.username === username && u.password === password && u.isActive);
        
        // If user not found locally, try to load from Supabase
        if (!user) {
          try {
            await get().initializeUsers();
            users = get().users;
            user = users.find(u => u.username === username && u.password === password && u.isActive);
          } catch (error) {
            console.error('Error loading users from Supabase during login:', error);
          }
        }
        
        if (user) {
          set({ isAuthenticated: true, user });
          return true;
        }
        return false;
      },

      logout: () => {
        set({ isAuthenticated: false, user: null });
      },

      checkAuth: () => {
        const { isAuthenticated } = get();
        return isAuthenticated;
      },

      addUser: async (user: User) => {
        try {
          // Save to Supabase
          const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
          });
          
          if (!response.ok) {
            throw new Error('Failed to save user to Supabase');
          }
          
          const result = await response.json();
          
          // Update local state
          set((state) => ({
            users: [...state.users, result.data]
          }));
          
          // Sync to global storage for backward compatibility
          get().syncUsersToGlobalStorage();
        } catch (error) {
          console.error('Error adding user:', error);
          throw error;
        }
      },

      updateUser: async (id: string, updates: Partial<User>) => {
        try {
          // Save to Supabase
          const response = await fetch('/api/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, updates })
          });
          
          if (!response.ok) {
            throw new Error('Failed to update user in Supabase');
          }
          
          const result = await response.json();
          
          // Update local state
          set((state) => ({
            users: state.users.map(user => 
              user.id === id ? { ...user, ...updates } : user
            )
          }));
          
          // Sync to global storage for backward compatibility
          get().syncUsersToGlobalStorage();
        } catch (error) {
          console.error('Error updating user:', error);
          throw error;
        }
      },

      deleteUser: async (id: string) => {
        try {
          // Save to Supabase
          const response = await fetch('/api/users', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
          });
          
          if (!response.ok) {
            throw new Error('Failed to delete user from Supabase');
          }
          
          // Update local state
          set((state) => ({
            users: state.users.filter(user => user.id !== id)
          }));
          
          // Sync to global storage for backward compatibility
          get().syncUsersToGlobalStorage();
        } catch (error) {
          console.error('Error deleting user:', error);
          throw error;
        }
      },

      changePassword: async (userId: string, newPassword: string) => {
        try {
          // Update in Supabase
          await fetch('/api/users', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: userId,
              updates: {
                password: newPassword,
                requiresPasswordChange: false,
                updatedAt: new Date().toISOString()
              }
            })
          });

          // Update local state
          set((state) => ({
            users: state.users.map(user => 
              user.id === userId 
                ? { ...user, password: newPassword, requiresPasswordChange: false, updatedAt: new Date() }
                : user
            ),
            user: state.user?.id === userId 
              ? { ...state.user, password: newPassword, requiresPasswordChange: false, updatedAt: new Date() }
              : state.user
          }));
          
          // Sync to global storage immediately
          get().syncUsersToGlobalStorage();
        } catch (error) {
          console.error('Error changing password:', error);
          throw error;
        }
      },

      resetPassword: async (userId: string, newPassword: string) => {
        try {
          // Update in Supabase
          await fetch('/api/users', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: userId,
              updates: {
                password: newPassword,
                requiresPasswordChange: true,
                updatedAt: new Date().toISOString()
              }
            })
          });

          // Update local state
          set((state) => ({
            users: state.users.map(user => 
              user.id === userId 
                ? { ...user, password: newPassword, requiresPasswordChange: true, updatedAt: new Date() }
                : user
            )
          }));
          
          // Sync to global storage immediately
          get().syncUsersToGlobalStorage();
        } catch (error) {
          console.error('Error resetting password:', error);
          throw error;
        }
      },

      syncUsersToGlobalStorage: () => {
        if (typeof window !== 'undefined') {
          try {
            const state = get();
            const globalData = {
              users: state.users,
              lastUpdated: new Date().toISOString(),
              version: '1.0'
            };
            
            // Validate data before saving
            if (validateUserData(globalData)) {
              localStorage.setItem(GLOBAL_USERS_KEY, JSON.stringify(globalData));
            } else {
              console.error('Invalid user data, not syncing to global storage');
            }
          } catch (error) {
            console.error('Error syncing users to global storage:', error);
          }
        }
      },

      loadUsersFromGlobalStorage: () => {
        if (typeof window !== 'undefined') {
          try {
            const globalData = localStorage.getItem(GLOBAL_USERS_KEY);
            if (globalData) {
              const parsed = JSON.parse(globalData);
              
              // Validate the loaded data
              if (validateUserData(parsed)) {
                set({ users: parsed.users });
                return true;
              } else {
                console.warn('Invalid user data in global storage, using defaults');
                return false;
              }
            }
          } catch (error) {
            console.error('Error loading users from global storage:', error);
          }
        }
        return false;
      },

      initializeUsers: async () => {
        try {
          // Try to load from Supabase first
          const response = await fetch('/api/users');
          if (response.ok) {
            const users = await response.json();
            set({ users });
            return;
          }
        } catch (error) {
          console.error('Error loading users from Supabase:', error);
        }
        
        // Fallback to global storage
        const globalLoaded = get().loadUsersFromGlobalStorage();
        if (!globalLoaded) {
          // If no global data, sync current users to global storage
          get().syncUsersToGlobalStorage();
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        users: state.users
      }),
    }
  )
);

// Optimized selectors for better performance
// Use simple property access to avoid creating new objects on every render
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useAuthStatus = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthUsers = () => useAuthStore((state) => state.users);

// Individual action selectors to avoid object creation
export const useAuthLogin = () => useAuthStore((state) => state.login);
export const useAuthLogout = () => useAuthStore((state) => state.logout);
export const useAuthCheckAuth = () => useAuthStore((state) => state.checkAuth);
export const useAuthAddUser = () => useAuthStore((state) => state.addUser);
export const useAuthUpdateUser = () => useAuthStore((state) => state.updateUser);
export const useAuthDeleteUser = () => useAuthStore((state) => state.deleteUser);
export const useAuthChangePassword = () => useAuthStore((state) => state.changePassword);
export const useAuthResetPassword = () => useAuthStore((state) => state.resetPassword);
export const useAuthInitializeUsers = () => useAuthStore((state) => state.initializeUsers); 