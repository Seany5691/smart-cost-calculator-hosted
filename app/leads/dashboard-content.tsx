'use client';

/**
 * Dashboard Content Component
 * 
 * Displays overview statistics, calendar, reminders, quick actions, and recent activity
 * 
 * Requirements: 2.1-2.19, 9.1-9.5
 * 
 * Version: 2.0 - Fixed cache issue
 */

import { useEffect, useState } from 'react';
import { 
  Calendar as CalendarIcon,
  Bell,
  Database,
  MapPin
} from 'lucide-react';
import { useLeadsStore } from '@/lib/store/leads';
import { useRoutesStore } from '@/lib/store/routes';
import { useRemindersStore } from '@/lib/store/reminders';
import { useImportStore } from '@/lib/store/import';
import CallbackCalendar from '@/components/leads/dashboard/CallbackCalendar';
import UpcomingReminders from '@/components/leads/dashboard/UpcomingReminders';

interface DashboardStats {
  totalLeads: number;
  newCount: number;
  leadsCount: number;
  workingCount: number;
  laterCount: number;
  badCount: number;
  signedCount: number;
  routesCount: number;
}

interface DashboardContentProps {
  stats: DashboardStats;
}

export default function DashboardContent({ stats }: DashboardContentProps) {
  const { allLeads } = useLeadsStore();
  const { routes, fetchRoutes } = useRoutesStore();
  const { reminders, fetchAllReminders } = useRemindersStore();
  const { importSessions, fetchImportSessions } = useImportStore();
  const [routesCount, setRoutesCount] = useState(0);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [selectedCalendarUserId, setSelectedCalendarUserId] = useState<string | null>(null);
  const [selectedCalendarOwnerName, setSelectedCalendarOwnerName] = useState<string | null>(null);
  const [sharedCalendarReminders, setSharedCalendarReminders] = useState<any[]>([]);

  // Fetch calendar events
  const fetchCalendarEvents = async (userId?: string | null) => {
    try {
      const token = localStorage.getItem('auth-storage');
      let authToken = null;
      if (token) {
        const data = JSON.parse(token);
        authToken = data.state?.token || data.token;
      }

      if (!authToken) return;

      // Get events for the next 30 days
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const startDateStr = today.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      let url = `/api/calendar/events?start_date=${startDateStr}&end_date=${endDateStr}`;
      if (userId) {
        url += `&user_id=${userId}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCalendarEvents(data.events || []);
      }
    } catch (err) {
      console.error('Error fetching calendar events:', err);
    }
  };

  // Fetch reminders for selected calendar
  const fetchRemindersForCalendar = async (userId?: string | null) => {
    try {
      const token = localStorage.getItem('auth-storage');
      let authToken = null;
      if (token) {
        const data = JSON.parse(token);
        authToken = data.state?.token || data.token;
      }

      if (!authToken) return;

      let url = '/api/reminders';
      if (userId) {
        url += `?user_id=${userId}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSharedCalendarReminders(data.reminders || []);
      }
    } catch (err) {
      console.error('Error fetching reminders for calendar:', err);
    }
  };

  // Fetch routes and reminders on mount
  useEffect(() => {
    fetchRoutes();
    fetchAllReminders();
    fetchImportSessions(undefined, undefined, 5); // Fetch last 5 imports
    fetchCalendarEvents();
    fetchRemindersForCalendar();
  }, [fetchRoutes, fetchAllReminders, fetchImportSessions]);

  // Re-fetch when selected calendar changes
  useEffect(() => {
    fetchCalendarEvents(selectedCalendarUserId);
    fetchRemindersForCalendar(selectedCalendarUserId);
  }, [selectedCalendarUserId]);

  // Update routes count when routes change
  useEffect(() => {
    setRoutesCount(routes.length);
  }, [routes]);

  // Requirement: 2.4 - Navigate to corresponding tab when statistic card is clicked
  const handleStatClick = (tab: string) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.pushState({}, '', url.toString());
      // Dispatch a custom event to notify the parent component of tab change
      window.dispatchEvent(new CustomEvent('tabchange', { detail: { tab } }));
    }
  };

  // Requirement: 2.12 - Handle quick action clicks - REMOVED, stats cards now handle navigation
  // Stats cards are clickable and navigate directly to tabs

  // Requirement: 2.5 - Statistic cards with counts, descriptions, and arrow icons
  // All cards are clickable and navigate to their respective tabs
  const statisticCards = [
    { 
      count: stats.leadsCount, 
      label: 'Leads', 
      description: 'Ready to work on',
      tab: 'leads',
      gradient: 'from-emerald-500 to-teal-500'
    },
    { 
      count: stats.workingCount, 
      label: 'Working On', 
      description: 'In progress',
      tab: 'working',
      gradient: 'from-blue-500 to-cyan-500'
    },
    { 
      count: stats.laterCount, 
      label: 'Later Stage', 
      description: 'Scheduled callbacks',
      tab: 'later',
      gradient: 'from-purple-500 to-pink-500'
    },
    { 
      count: stats.badCount, 
      label: 'Bad Leads', 
      description: 'Not viable',
      tab: 'bad',
      gradient: 'from-red-500 to-rose-500'
    },
    { 
      count: stats.signedCount, 
      label: 'Signed', 
      description: 'Successfully converted',
      tab: 'signed',
      gradient: 'from-green-500 to-emerald-500'
    },
    { 
      count: routesCount, 
      label: 'Routes', 
      description: 'Generated routes',
      tab: 'routes',
      gradient: 'from-teal-500 to-cyan-500'
    },
  ];

  // Requirement: 2.13-2.16 - Recent activity (last 5 imports and routes)
  const recentActivity = [
    ...importSessions.slice(0, 5).map(session => ({
      type: 'import' as const,
      title: `Imported ${session.imported_records} leads`,
      subtitle: `List: ${session.list_name}`,
      timestamp: new Date(session.created_at),
      status: session.status,
      icon: Database
    })),
    ...routes.slice(0, 5).map(route => ({
      type: 'route' as const,
      title: route.name,
      subtitle: `${route.stop_count} stops`,
      timestamp: new Date(route.created_at),
      status: route.status,
      icon: MapPin
    }))
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Requirement: 2.1 - Welcome message and heading */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Leads Manager Dashboard
        </h1>
        <p className="text-emerald-200">
          Welcome back! Here's an overview of your leads pipeline.
        </p>
      </div>

      {/* Requirement: 2.3-2.6 - Statistics Grid with 6 clickable cards in a single horizontal line */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statisticCards.map((card, index) => (
          <button
            key={index}
            onClick={() => handleStatClick(card.tab)}
            className="group relative overflow-hidden glass-card p-4 text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer"
          >
            {/* Content */}
            <div className="relative z-10">
              <div className={`text-3xl font-bold mb-1 bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
                {card.count}
              </div>
              <div className="text-sm font-semibold mb-1">{card.label}</div>
              <div className="text-xs text-emerald-200/80">{card.description}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Calendar and Reminders side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requirement: 2.7-2.9 - Callback Calendar */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-emerald-400" />
            Reminders Calendar
          </h2>
          <CallbackCalendar 
            reminders={selectedCalendarUserId ? sharedCalendarReminders : reminders}
            leads={allLeads}
            onLeadClick={(leadId) => {
              // Find the lead and navigate to its status tab
              const lead = allLeads.find(l => l.id === leadId);
              if (lead) {
                handleStatClick(lead.status);
              }
            }}
            onCalendarChange={(userId, ownerName) => {
              setSelectedCalendarUserId(userId);
              setSelectedCalendarOwnerName(ownerName);
            }}
          />
        </div>

        {/* Requirement: 2.9 - Upcoming Reminders */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-400" />
            {selectedCalendarOwnerName 
              ? `${selectedCalendarOwnerName}'s Upcoming Reminders`
              : 'Upcoming Reminders'
            }
          </h2>
          <UpcomingReminders 
            reminders={selectedCalendarUserId ? sharedCalendarReminders : reminders}
            leads={allLeads}
            calendarEvents={calendarEvents}
            selectedCalendarUserId={selectedCalendarUserId}
            selectedCalendarOwnerName={selectedCalendarOwnerName}
            onLeadClick={(leadId) => {
              // Find the lead and navigate to its status tab
              const lead = allLeads.find(l => l.id === leadId);
              if (lead) {
                handleStatClick(lead.status);
              }
            }}
            onReminderUpdate={() => {
              // Refresh reminders when a reminder is updated
              if (selectedCalendarUserId) {
                fetchRemindersForCalendar(selectedCalendarUserId);
              } else {
                fetchAllReminders();
              }
              fetchCalendarEvents(selectedCalendarUserId);
            }}
          />
        </div>
      </div>

      {/* Requirement: 2.10-2.13 - Quick Actions Grid - REMOVED per user request */}

      {/* Requirement: 2.13-2.16 - Recent Activity List */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Recent Activity</h2>
        
        {recentActivity.length === 0 ? (
          // Requirement: 2.15 - Empty state with "Import Your First Leads" button
          <div className="text-center py-12">
            <Database className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <p className="text-emerald-200 mb-4">No recent activity yet</p>
            <button
              onClick={() => handleStatClick('main-sheet')}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:scale-105 transition-transform"
            >
              Import Your First Leads
            </button>
          </div>
        ) : (
          // Requirement: 2.16 - Display activity items with icon, title, subtitle, date, time
          <div className="space-y-3">
            {recentActivity.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                >
                  <div className={`
                    p-3 rounded-xl
                    ${activity.type === 'import' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-teal-500/20 text-teal-300'}
                  `}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white">{activity.title}</div>
                    <div className="text-sm text-emerald-200">{activity.subtitle}</div>
                  </div>
                  <div className="text-right text-sm text-emerald-200">
                    <div>{activity.timestamp.toLocaleDateString()}</div>
                    <div>{activity.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
