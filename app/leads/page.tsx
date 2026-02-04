'use client';

import { useEffect, useState, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-simple';
import { useLeadsStore } from '@/lib/store/leads';
import { Loader2 } from 'lucide-react';

// Tab configuration with labels
// Requirements: 1.1, 1.6
const TABS = [
  { index: 0, id: 'dashboard', name: 'Dashboard', shortName: 'Dashboard' },
  { index: 1, id: 'main-sheet', name: 'Main Sheet', shortName: 'Main' },
  { index: 2, id: 'leads', name: 'Leads', shortName: 'Leads' },
  { index: 3, id: 'working', name: 'Working On', shortName: 'Working' },
  { index: 4, id: 'proposal', name: 'Proposal', shortName: 'Proposal' },
  { index: 5, id: 'later', name: 'Later Stage', shortName: 'Later' },
  { index: 6, id: 'bad', name: 'Bad Leads', shortName: 'Bad' },
  { index: 7, id: 'signed', name: 'Signed', shortName: 'Signed' },
  { index: 8, id: 'routes', name: 'Routes', shortName: 'Routes' },
  { index: 9, id: 'reminders', name: 'Reminders', shortName: 'Reminders' },
] as const;

type TabId = typeof TABS[number]['id'];

// Lazy load tab content components
// Requirement: 1.12 - Lazy load tab content using React Suspense
const DashboardContent = lazy(() => import('./dashboard-content').catch(() => ({ default: () => <PlaceholderContent name="Dashboard" /> })));
const MainSheetContent = lazy(() => import('./status-pages/main-sheet').catch(() => ({ default: () => <PlaceholderContent name="Main Sheet" /> })));
const LeadsContent = lazy(() => import('./status-pages/leads').catch(() => ({ default: () => <PlaceholderContent name="Leads" /> })));
const WorkingContent = lazy(() => import('./status-pages/working').catch(() => ({ default: () => <PlaceholderContent name="Working On" /> })));
const ProposalContent = lazy(() => import('./status-pages/proposal').catch(() => ({ default: () => <PlaceholderContent name="Proposal" /> })));
const LaterContent = lazy(() => import('./status-pages/later').catch(() => ({ default: () => <PlaceholderContent name="Later Stage" /> })));
const BadContent = lazy(() => import('./status-pages/bad').catch(() => ({ default: () => <PlaceholderContent name="Bad Leads" /> })));
const SignedContent = lazy(() => import('./status-pages/signed').catch(() => ({ default: () => <PlaceholderContent name="Signed" /> })));
const RoutesContent = lazy(() => import('./routes-page').catch(() => ({ default: () => <PlaceholderContent name="Routes" /> })));
const RemindersContent = lazy(() => import('@/components/leads/RemindersContent').catch(() => ({ default: () => <PlaceholderContent name="Reminders" /> })));


// Placeholder component for tabs that don't have content yet
function PlaceholderContent({ name }: { name: string }) {
  return (
    <div className="text-white text-center py-12">
      <p className="text-xl mb-4">{name}</p>
      <p className="text-gray-400">Content for this tab will be loaded here</p>
    </div>
  );
}

// Loading component for Suspense fallback
// Requirement: 1.13 - Display loading spinner with descriptive text
function TabLoadingFallback({ tabName }: { tabName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
      <p className="text-white text-lg">Loading {tabName}...</p>
    </div>
  );
}

export default function LeadsPage() {
  const router = useRouter();
  const { user, token, isAuthenticated } = useAuthStore();
  const { fetchAllLeadsForStats, allLeads } = useLeadsStore();
  
  // Initialize activeTab from URL parameter or default to 'dashboard'
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as TabId;
      if (tab && TABS.some(t => t.id === tab)) {
        return tab;
      }
    }
    return 'dashboard';
  });
  
  // Add a refresh key that changes when tab changes to force component remount
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState({
    totalLeads: 0,
    newCount: 0,
    leadsCount: 0,
    workingCount: 0,
    proposalCount: 0,
    laterCount: 0,
    badCount: 0,
    signedCount: 0,
    routesCount: 0
  });

  // Hydrate auth store and mount
  useEffect(() => {
    useAuthStore.getState().hydrate();
    setMounted(true);
  }, []);

  // Listen for custom tab change events from dashboard
  useEffect(() => {
    const handleTabChangeEvent = (event: CustomEvent) => {
      const tab = event.detail.tab as TabId;
      if (tab && TABS.some(t => t.id === tab)) {
        setActiveTab(tab);
        setRefreshKey(prev => prev + 1);
      }
    };

    window.addEventListener('tabchange', handleTabChangeEvent as EventListener);
    return () => {
      window.removeEventListener('tabchange', handleTabChangeEvent as EventListener);
    };
  }, []);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as TabId;
      if (tab && TABS.some(t => t.id === tab)) {
        setActiveTab(tab);
        setRefreshKey(prev => prev + 1);
      } else {
        setActiveTab('dashboard');
        setRefreshKey(prev => prev + 1);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    // Only redirect after component is mounted and auth is loaded
    if (mounted) {
      const { user } = useAuthStore.getState();
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user && !['admin', 'manager', 'user', 'telesales'].includes(user.role)) {
        // All roles can access leads
        router.push('/');
      }
    }
  }, [mounted, isAuthenticated, router]);

  // Requirement: 2.2 - Fetch all leads for dashboard statistics on mount
  useEffect(() => {
    if (mounted && isAuthenticated) {
      fetchAllLeadsForStats();
    }
  }, [mounted, isAuthenticated, fetchAllLeadsForStats]);

  // Requirement: 2.3 - Calculate statistics from allLeads (not filtered)
  // Update stats whenever allLeads changes
  useEffect(() => {
    if (allLeads && allLeads.length > 0) {
      const newStats = {
        totalLeads: allLeads.length,
        newCount: allLeads.filter(lead => lead.status === 'new').length,
        leadsCount: allLeads.filter(lead => lead.status === 'leads').length,
        workingCount: allLeads.filter(lead => lead.status === 'working').length,
        proposalCount: allLeads.filter(lead => lead.status === 'proposal').length,
        laterCount: allLeads.filter(lead => lead.status === 'later').length,
        badCount: allLeads.filter(lead => lead.status === 'bad').length,
        signedCount: allLeads.filter(lead => lead.status === 'signed').length,
        routesCount: 0 // Will be fetched from routes API in future tasks
      };
      
      // Debug logging to verify counts
      console.log('📊 Dashboard Stats Breakdown:');
      console.log('  Total Leads:', newStats.totalLeads);
      console.log('  New (Main Sheet):', newStats.newCount);
      console.log('  Leads (Ready to work on):', newStats.leadsCount);
      console.log('  Working On:', newStats.workingCount);
      console.log('  Later Stage:', newStats.laterCount);
      console.log('  Bad Leads:', newStats.badCount);
      console.log('  Signed:', newStats.signedCount);
      
      // Show sample leads for each status
      console.log('\n📋 Sample Leads by Status:');
      console.log('  Leads status:', allLeads.filter(l => l.status === 'leads').slice(0, 3).map(l => ({ id: l.id, name: l.name, status: l.status })));
      console.log('  Working status:', allLeads.filter(l => l.status === 'working').slice(0, 3).map(l => ({ id: l.id, name: l.name, status: l.status })));
      
      setStats(newStats);
    }
  }, [allLeads]);

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900">
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
          <div className="text-white text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  // Requirement: 1.2 - Tab click handler with URL sync
  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    // Increment refresh key to force component remount
    setRefreshKey(prev => prev + 1);
    // Update URL without page reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabId);
      window.history.pushState({}, '', url.toString());
    }
  };

  // Get current tab info
  const currentTab = TABS.find(t => t.id === activeTab) || TABS[0];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Requirement: 1.11 - Animated background with gradient blobs */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900">
        {/* Animated gradient blobs */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-teal-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen py-6 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Requirement: 1.7 - Glassmorphism tab bar */}
          <div className="sticky top-4 z-10 glass-card p-2">
            {/* Requirement: 1.8, 1.9, 1.10 - Responsive tabs with horizontal scroll on mobile */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide touch-pan-x justify-between">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    flex-1 min-w-[100px] px-4 py-3 rounded-2xl font-medium transition-all duration-300
                    flex items-center gap-2 justify-center whitespace-nowrap
                    ${
                      activeTab === tab.id
                        ? // Requirement: 1.3 - Active tab styling with gradient and scale
                          'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg scale-105 relative'
                        : 'bg-white/10 text-white hover:bg-white/20 hover:scale-102'
                    }
                  `}
                >
                  {/* Requirement: 1.3 - Animated indicator for active tab */}
                  {activeTab === tab.id && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-white rounded-full"></div>
                  )}
                  {/* Requirement: 1.9, 1.10 - Show abbreviated names on mobile, full on desktop */}
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="sm:hidden">{tab.shortName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content Area */}
          {/* Requirement: 1.7 - Glassmorphism content card */}
          <div className="glass-card p-6 min-h-[600px]">
            {/* Requirement: 1.12, 1.13 - Lazy load with Suspense and loading states */}
            <Suspense key={`${activeTab}-${refreshKey}`} fallback={<TabLoadingFallback tabName={currentTab.name} />}>
              {activeTab === 'dashboard' && <DashboardContent stats={stats} />}
              {activeTab === 'main-sheet' && <MainSheetContent key={refreshKey} />}
              {activeTab === 'leads' && <LeadsContent key={refreshKey} />}
              {activeTab === 'working' && <WorkingContent key={refreshKey} />}
              {activeTab === 'proposal' && <ProposalContent key={refreshKey} />}
              {activeTab === 'later' && <LaterContent key={refreshKey} />}
              {activeTab === 'bad' && <BadContent key={refreshKey} />}
              {activeTab === 'signed' && <SignedContent key={refreshKey} />}
              {activeTab === 'routes' && <RoutesContent key={refreshKey} />}
              {activeTab === 'reminders' && <RemindersContent key={refreshKey} />}
            </Suspense>
          </div>
        </div>
      </div>

      {/* Add custom animations to tailwind */}
      <style jsx global>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scale-102 {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
}

