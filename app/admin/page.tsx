'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-simple';
import { useRouter } from 'next/navigation';
import HardwareConfig from '@/components/admin/HardwareConfig';
import ConnectivityConfig from '@/components/admin/ConnectivityConfig';
import LicensingConfig from '@/components/admin/LicensingConfig';
import FactorsConfig from '@/components/admin/FactorsConfig';
import ScalesConfig from '@/components/admin/ScalesConfig';
import UserManagement from '@/components/admin/UserManagement';

type TabType = 'hardware' | 'connectivity' | 'licensing' | 'factors' | 'scales' | 'users';

export default function AdminPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  
  // Initialize activeTab from URL parameter or default to 'hardware'
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as TabType;
      const validTabs: TabType[] = ['hardware', 'connectivity', 'licensing', 'factors', 'scales', 'users'];
      if (tab && validTabs.includes(tab)) {
        return tab;
      }
    }
    return 'hardware';
  });
  
  const [mounted, setMounted] = useState(false);

  // Wait for auth hydration (handled by AuthProvider)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as TabType;
      const validTabs: TabType[] = ['hardware', 'connectivity', 'licensing', 'factors', 'scales', 'users'];
      if (tab && validTabs.includes(tab)) {
        setActiveTab(tab);
      } else {
        setActiveTab('hardware');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (mounted && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/');
    }
  }, [mounted, isAuthenticated, user, router]);

  if (!mounted || !isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'hardware', label: 'Hardware' },
    { id: 'connectivity', label: 'Connectivity' },
    { id: 'licensing', label: 'Licensing' },
    { id: 'factors', label: 'Factors' },
    { id: 'scales', label: 'Scales' },
    { id: 'users', label: 'Users' },
  ];

  // Handle tab change with URL update
  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    // Update URL without page reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabId);
      window.history.pushState({}, '', url.toString());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Admin Console</h1>
          <p className="text-slate-300">Manage pricing, configurations, and users</p>
        </div>

        {/* Tabs */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 shadow-xl mb-6">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  px-6 py-4 font-medium transition-all whitespace-nowrap
                  ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white border-b-2 border-purple-400'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 shadow-xl p-6">
          {activeTab === 'hardware' && <HardwareConfig />}
          {activeTab === 'connectivity' && <ConnectivityConfig />}
          {activeTab === 'licensing' && <LicensingConfig />}
          {activeTab === 'factors' && <FactorsConfig />}
          {activeTab === 'scales' && <ScalesConfig />}
          {activeTab === 'users' && <UserManagement />}
        </div>
      </div>
    </div>
  );
}
