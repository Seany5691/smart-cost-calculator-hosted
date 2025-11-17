'use client';

import { useEffect, useState, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FileUp, 
  Users, 
  MapPin, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useLeadsStore } from '@/store/leads/leads';
import { useRoutesStore } from '@/store/leads/routes';
import { useImportStore } from '@/store/leads/import';
import { useAuthStore } from '@/store/auth';
import { useRemindersStore } from '@/store/reminders';
import { CallbackCalendar } from '@/components/leads/dashboard/CallbackCalendar';
import { UpcomingReminders } from '@/components/leads/dashboard/UpcomingReminders';

// Lazy load page components
const MainSheetPageContent = lazy(() => import('@/app/leads/status-pages/page'));
const LeadsPageContent = lazy(() => import('@/app/leads/status-pages/status/leads/page'));
const WorkingPageContent = lazy(() => import('@/app/leads/status-pages/status/working/page'));
const LaterPageContent = lazy(() => import('@/app/leads/status-pages/status/later/page'));
const BadPageContent = lazy(() => import('@/app/leads/status-pages/status/bad/page'));
const SignedPageContent = lazy(() => import('@/app/leads/status-pages/status/signed/page'));
const RoutesPageContent = lazy(() => import('@/app/leads/routes-pages/page'));
const RemindersPageContent = lazy(() => import('@/app/leads/reminders-page/page'));

export default function LeadsManagerPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { leads, allLeads, fetchLeads, fetchAllLeadsForStats, isLoading: leadsLoading } = useLeadsStore();
  const { routes, fetchRoutes, getRouteStats } = useRoutesStore();
  const { sessions, fetchImportSessions } = useImportStore();
  const { fetchAllReminders } = useRemindersStore();
  
  // Start with default tab to avoid hydration mismatch
  const [tabIndex, setTabIndex] = useState(0);
  
  // Read tab from URL after mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) {
        const tabNum = parseInt(tab, 10);
        if (!isNaN(tabNum) && tabNum >= 0 && tabNum <= 7) {
          setTabIndex(tabNum);
        }
      }
    }
  }, []);
  
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeLeads: 0,
    workingLeads: 0,
    laterStageLeads: 0,
    signedLeads: 0,
    badLeads: 0,
    totalRoutes: 0,
    recentImports: 0
  });

  // Fetch ALL leads for dashboard stats (separate from filtered leads)
  useEffect(() => {
    if (user) {
      // Fetch all leads for accurate dashboard stats
      fetchAllLeadsForStats();
      fetchRoutes();
      fetchImportSessions();
      fetchAllReminders(user.id); // Initialize reminders store
    }
  }, [user, fetchAllLeadsForStats, fetchRoutes, fetchImportSessions, fetchAllReminders]);

  useEffect(() => {
    // Calculate statistics from ALL leads (not filtered by current tab)
    // Use allLeads array which is never filtered, ensuring stats are always accurate
    const totalLeads = allLeads.length;
    const activeLeads = allLeads.filter(l => l.status === 'leads').length;
    const workingLeads = allLeads.filter(l => l.status === 'working').length;
    const laterStageLeads = allLeads.filter(l => l.status === 'later').length;
    const signedLeads = allLeads.filter(l => l.status === 'signed').length;
    const badLeads = allLeads.filter(l => l.status === 'bad').length;
    const routeStats = getRouteStats();
    const recentImports = sessions.filter(s => {
      const sessionDate = new Date(s.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return sessionDate >= weekAgo;
    }).length;

    // Debug logging to verify stats are calculated from all leads
    console.log('[Dashboard Stats] Calculating from allLeads:', {
      totalLeads,
      activeLeads,
      workingLeads,
      laterStageLeads,
      signedLeads,
      badLeads,
      allLeadsCount: allLeads.length
    });

    setStats({
      totalLeads,
      activeLeads,
      workingLeads,
      laterStageLeads,
      signedLeads,
      badLeads,
      totalRoutes: routeStats.total,
      recentImports
    });
  }, [allLeads, routes, sessions, getRouteStats]);

  // Get recent activity (last 5 imports or routes)
  const recentActivity = [
    ...sessions.slice(0, 3).map(s => ({
      type: 'import' as const,
      title: `Imported ${s.imported_records} leads`,
      subtitle: s.source_type === 'scraper' ? 'From scraper' : 'From Excel',
      timestamp: new Date(s.created_at),
      status: s.status
    })),
    ...routes.slice(0, 2).map(r => ({
      type: 'route' as const,
      title: r.name,
      subtitle: `${r.stop_count} stops`,
      timestamp: new Date(r.created_at),
      status: 'completed' as const
    }))
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5);

  const quickActions = [
    {
      title: 'Import Leads',
      description: 'Import from scraper or Excel',
      icon: FileUp,
      onClick: () => {
        setTabIndex(1); // Navigate to Main Sheet tab
        // Trigger import modal after a short delay to ensure tab is loaded
        setTimeout(() => {
          const importButton = document.querySelector('[data-import-button]') as HTMLButtonElement;
          if (importButton) importButton.click();
        }, 100);
      },
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Main Sheet',
      description: 'View all your leads',
      icon: Users,
      onClick: () => setTabIndex(1),
      color: 'from-gray-500 to-slate-500'
    },
    {
      title: 'Leads',
      description: 'Active lead pipeline',
      icon: Users,
      onClick: () => setTabIndex(2),
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Working On',
      description: 'Leads in progress',
      icon: TrendingUp,
      onClick: () => setTabIndex(3),
      color: 'from-yellow-500 to-orange-500'
    },
    {
      title: 'Later Stage',
      description: 'Scheduled callbacks',
      icon: Clock,
      onClick: () => setTabIndex(4),
      color: 'from-indigo-500 to-purple-500'
    },
    {
      title: 'Routes',
      description: 'Field visit planning',
      icon: MapPin,
      onClick: () => setTabIndex(7),
      color: 'from-green-500 to-emerald-500'
    }
  ];

  const tabs = [
    { name: 'Dashboard', icon: '📊' },
    { name: 'Main Sheet', icon: '📋' },
    { name: 'Leads', icon: '📝' },
    { name: 'Working On', icon: '👥' },
    { name: 'Later Stage', icon: '⏰' },
    { name: 'Bad Leads', icon: '❌' },
    { name: 'Signed', icon: '🏆' },
    { name: 'Routes', icon: '🗺️' },
    { name: 'Reminders', icon: '🔔' },
  ];

  const handleTabChange = (index: number) => {
    setTabIndex(index);
    // Update URL without page reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', index.toString());
      window.history.pushState({}, '', url.toString());
    }
  };

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50"></div>
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" style={{ animationDelay: '4s' }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-white/50 to-transparent"></div>
      </div>

      {/* Fixed Tabs and Navigation Container - Glassmorphism */}
      <div className="flex-shrink-0 bg-white/80 backdrop-blur-xl shadow-2xl border-b border-white/20 z-40 relative">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none"></div>
        
        {/* Tabs with Glassmorphism - Mobile Responsive */}
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 relative">
          <div className="flex items-center justify-between border-b border-white/20">
            <div className="flex overflow-x-auto overflow-y-visible scrollbar-hide flex-1">
              {tabs.map((tab, index) => {
                const isCurrent = index === tabIndex;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleTabChange(index)}
                    className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-5 py-3 sm:py-3.5 font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-500 border-b-3 relative group cursor-pointer touch-manipulation flex-shrink-0 ${
                      isCurrent
                        ? 'text-blue-600 border-blue-600 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 backdrop-blur-sm shadow-lg sm:transform sm:scale-110'
                        : 'text-gray-600 border-transparent hover:text-blue-600 hover:bg-white/40 hover:backdrop-blur-sm sm:hover:transform sm:hover:scale-105'
                    }`}
                  >
                    <span className={`text-lg sm:text-xl transition-all duration-300 ${
                      isCurrent ? 'scale-125 animate-bounce-subtle' : ''
                    }`}>
                      {tab.icon}
                    </span>
                    <span className="hidden md:inline">{tab.name}</span>
                    <span className="md:hidden text-[10px] sm:text-xs font-bold">{tab.name.split(' ')[0]}</span>
                    
                    {/* Active Indicator */}
                    {isCurrent && (
                      <>
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse shadow-glow-md pointer-events-none"></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-t-xl animate-pulse pointer-events-none"></div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area with Glassmorphism */}
      <div className="flex-1 relative overflow-y-auto">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="relative bg-white/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 overflow-hidden">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none"></div>
            <div className="p-4 sm:p-6 lg:p-8 relative z-10">
              {/* Section transition wrapper */}
              <div className="animate-fade-in-up">
                {tabIndex === 0 && (
                  <div>
                    {/* Dashboard Content - Mobile Optimized */}
                    <div className="mb-6 sm:mb-8">
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                        Leads Manager Dashboard
                      </h1>
                      <p className="text-sm sm:text-base lg:text-lg text-gray-600">
                        Welcome back! Here's your lead management overview.
                      </p>
                    </div>

                    {/* Statistics Grid - Mobile Optimized */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                      {/* Total Leads */}
                      <div className="glass-card p-4 sm:p-6 hover:scale-105 transition-transform duration-200 touch-manipulation">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </div>
                          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.totalLeads}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">Total Leads</p>
                        <div className="mt-2 sm:mt-3 text-xs text-gray-500">
                          {stats.activeLeads} active
                        </div>
                      </div>

                      {/* Working Leads */}
                      <div className="glass-card p-4 sm:p-6 hover:scale-105 transition-transform duration-200 touch-manipulation">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </div>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.workingLeads}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">Working On</p>
                        <div className="mt-2 sm:mt-3 text-xs text-gray-500">
                          {stats.laterStageLeads} in later stage
                        </div>
                      </div>

                      {/* Signed Leads */}
                      <div className="glass-card p-4 sm:p-6 hover:scale-105 transition-transform duration-200 touch-manipulation">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <div className="p-2 sm:p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
                            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </div>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.signedLeads}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">Signed</p>
                        <div className="mt-2 sm:mt-3 text-xs text-gray-500">
                          {stats.badLeads} bad leads
                        </div>
                      </div>

                      {/* Routes Generated */}
                      <div className="glass-card p-4 sm:p-6 hover:scale-105 transition-transform duration-200 touch-manipulation">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <div className="p-2 sm:p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
                            <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </div>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.totalRoutes}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">Routes Generated</p>
                        <div className="mt-2 sm:mt-3 text-xs text-gray-500">
                          {stats.recentImports} recent imports
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions - Mobile Optimized */}
                    <div className="glass-card p-4 sm:p-6 mb-6 sm:mb-8">
                      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">Quick Actions</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {quickActions.map((action) => (
                          <button
                            key={action.title}
                            onClick={action.onClick}
                            className="group relative overflow-hidden rounded-xl p-4 sm:p-6 bg-white border border-gray-200 hover:border-transparent hover:shadow-xl transition-all duration-300 text-left touch-manipulation active:scale-95"
                          >
                            <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                            <div className="relative">
                              <div className={`inline-flex p-2 sm:p-3 rounded-lg bg-gradient-to-br ${action.color} mb-3 sm:mb-4`}>
                                <action.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                              </div>
                              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 group-hover:text-gray-700">
                                {action.title}
                              </h3>
                              <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                                {action.description}
                              </p>
                              <div className="flex items-center text-xs sm:text-sm font-medium text-gray-900 group-hover:text-blue-600">
                                Get started
                                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Calendar and Upcoming Events - Mobile Optimized */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                      {/* Calendar */}
                      <CallbackCalendar 
                        leads={allLeads.filter(l => l.date_to_call_back)} 
                        onLeadClick={(lead) => {
                          // Navigate to the appropriate tab based on lead status
                          const tabMap: Record<string, number> = {
                            'new': 1,
                            'leads': 2,
                            'working': 3,
                            'later': 4,
                            'bad': 5,
                            'signed': 6
                          };
                          setTabIndex(tabMap[lead.status] || 0);
                        }}
                      />

                      {/* Upcoming Reminders */}
                      <UpcomingReminders 
                        leads={allLeads}
                        onLeadClick={(lead) => {
                          // Navigate to the appropriate tab based on lead status
                          const tabMap: Record<string, number> = {
                            'new': 1,
                            'leads': 2,
                            'working': 3,
                            'later': 4,
                            'bad': 5,
                            'signed': 6
                          };
                          setTabIndex(tabMap[lead.status] || 0);
                        }}
                        daysAhead={30}
                      />
                    </div>

                    {/* Recent Activity - Mobile Optimized */}
                    <div className="glass-card p-4 sm:p-6">
                      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">Recent Activity</h2>
                      
                      {recentActivity.length === 0 ? (
                        <div className="text-center py-12">
                          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600 mb-4">No recent activity</p>
                          <button
                            onClick={() => setTabIndex(1)}
                            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-shadow"
                          >
                            <FileUp className="w-4 h-4 mr-2" />
                            Import Your First Leads
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3 sm:space-y-4">
                          {recentActivity.map((activity, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 sm:p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                            >
                              <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                                <div className={`p-2 rounded-lg flex-shrink-0 ${
                                  activity.type === 'import' 
                                    ? 'bg-blue-100' 
                                    : 'bg-green-100'
                                }`}>
                                  {activity.type === 'import' ? (
                                    <FileUp className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                      activity.status === 'completed' ? 'text-blue-600' : 'text-gray-400'
                                    }`} />
                                  ) : (
                                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm sm:text-base text-gray-900 truncate">{activity.title}</h4>
                                  <p className="text-xs sm:text-sm text-gray-600 truncate">{activity.subtitle}</p>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-2">
                                <p className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                                  {activity.timestamp.toLocaleDateString()}
                                </p>
                                <p className="text-xs text-gray-400 whitespace-nowrap">
                                  {activity.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {tabIndex === 1 && (
                  <Suspense fallback={
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="ml-3 text-gray-600">Loading main sheet...</span>
                    </div>
                  }>
                    <MainSheetPageContent />
                  </Suspense>
                )}
                
                {tabIndex === 2 && (
                  <Suspense fallback={
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="ml-3 text-gray-600">Loading leads...</span>
                    </div>
                  }>
                    <LeadsPageContent />
                  </Suspense>
                )}
                
                {tabIndex === 3 && (
                  <Suspense fallback={
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="ml-3 text-gray-600">Loading working leads...</span>
                    </div>
                  }>
                    <WorkingPageContent />
                  </Suspense>
                )}
                
                {tabIndex === 4 && (
                  <Suspense fallback={
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="ml-3 text-gray-600">Loading later stage leads...</span>
                    </div>
                  }>
                    <LaterPageContent />
                  </Suspense>
                )}
                
                {tabIndex === 5 && (
                  <Suspense fallback={
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="ml-3 text-gray-600">Loading bad leads...</span>
                    </div>
                  }>
                    <BadPageContent />
                  </Suspense>
                )}
                
                {tabIndex === 6 && (
                  <Suspense fallback={
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="ml-3 text-gray-600">Loading signed leads...</span>
                    </div>
                  }>
                    <SignedPageContent />
                  </Suspense>
                )}
                
                {tabIndex === 7 && (
                  <Suspense fallback={
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="ml-3 text-gray-600">Loading routes...</span>
                    </div>
                  }>
                    <RoutesPageContent />
                  </Suspense>
                )}
                
                {tabIndex === 8 && (
                  <Suspense fallback={
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="ml-3 text-gray-600">Loading reminders...</span>
                    </div>
                  }>
                    <RemindersPageContent />
                  </Suspense>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
