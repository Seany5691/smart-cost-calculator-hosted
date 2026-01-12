'use client';

import { useEffect, useState } from 'react';
import { useOfflineStore } from '@/store/offline';
import { useAuthStore } from '@/store/auth';
import { useConfigStore } from '@/store/config';
import Navigation from './Navigation';
import OfflineAlert from './OfflineAlert';
import PasswordChangeModal from '../auth/PasswordChangeModal';
import { ToastProvider } from '@/components/ui/Toast';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { setOnlineStatus } = useOfflineStore();
  const { user } = useAuthStore();
  const { loadFromAPI, refreshFromDatabase } = useConfigStore();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial status
    setOnlineStatus(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus]);

  // Initialize config store and users on app load
  useEffect(() => {
    const initializeApp = async () => {
      // First, migrate any old auth data with invalid user IDs
      const { initializeAuth } = useAuthStore.getState();
      initializeAuth();
      
      await loadFromAPI();
      const { initializeUsers } = useAuthStore.getState();
      await initializeUsers();
    };
    initializeApp();
  }, [loadFromAPI]);

  // REMOVED: Auto-refresh was causing issues when editing in admin panel
  // Config data will now only refresh:
  // 1. On initial app load
  // 2. After saving changes in admin panel
  // 3. When manually requested by user
  // This prevents losing unsaved changes during editing

  // Show password change modal if user requires password change
  useEffect(() => {
    if (user?.requiresPasswordChange) {
      setShowPasswordModal(true);
    }
  }, [user?.requiresPasswordChange]);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <a href="#main-content" className="skip-to-main">
          Skip to main content
        </a>
        <OfflineAlert />
        <Navigation />
        <main id="main-content" className="pt-16" tabIndex={-1}>
          {children}
        </main>
        <PasswordChangeModal 
          isOpen={showPasswordModal} 
          onClose={() => setShowPasswordModal(false)} 
        />
      </div>
    </ToastProvider>
  );
} 