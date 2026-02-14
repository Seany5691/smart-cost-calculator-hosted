'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store/auth-simple';
import { useRemindersStore } from '@/lib/store/reminders';
import { Bell, Calendar as CalendarIcon, Plus, Filter, Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import AdvancedCalendar from '@/components/leads/AdvancedCalendar';
import LeadDetailsModal from '@/components/leads/LeadDetailsModal';
import type { LeadReminder, Lead } from '@/lib/leads/types';

interface Reminder {
  id: string;
  lead_id: string;
  reminder_type: string;
  priority: string;
  due_date: string;
  title: string;
  description?: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
  lead_name?: string;
  lead_phone?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  is_all_day: boolean;
  event_type: string;
  priority: string;
  location: string | null;
  created_by: string;
  creator_username: string;
  is_owner: boolean;
  created_at: string;
}

interface CategorizedReminders {
  overdue: Reminder[];
  today: Reminder[];
  tomorrow: Reminder[];
  upcoming: Reminder[];
  future: Reminder[];
  completed: Reminder[];
}

interface CategorizedEvents {
  overdue: CalendarEvent[];
  today: CalendarEvent[];
  tomorrow: CalendarEvent[];
  upcoming: CalendarEvent[];
  future: CalendarEvent[];
}

export default function RemindersPage() {
  const { token } = useAuthStore();
  const { reminders: storeReminders, fetchAllReminders, loading: storeLoading } = useRemindersStore();
  const [reminders, setReminders] = useState<CategorizedReminders | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CategorizedEvents | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'active' | 'completed' | 'all'>('active');
  const [showType, setShowType] = useState<'all' | 'reminders' | 'events'>('all');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedCalendarUserId, setSelectedCalendarUserId] = useState<string | null>(null);
  const [selectedCalendarOwnerName, setSelectedCalendarOwnerName] = useState<string | null>(null);
  const [sharedCalendars, setSharedCalendars] = useState<any[]>([]);
  const [sharedCalendarReminders, setSharedCalendarReminders] = useState<LeadReminder[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');

  const fetchLeads = useCallback(async () => {
    try {
      const response = await fetch('/api/leads', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  }, [token]);

  const fetchSharedCalendars = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/shared-with-me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSharedCalendars(data.shared_calendars || []);
      }
    } catch (error) {
      console.error('Error fetching shared calendars:', error);
    }
  }, [token]);

  const fetchRemindersForCalendar = useCallback(async (userId?: string | null) => {
    try {
      let url = '/api/reminders';
      if (userId) {
        url += `?user_id=${userId}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSharedCalendarReminders(data.reminders || []);
      }
    } catch (error) {
      console.error('Error fetching reminders for calendar:', error);
    }
  }, [token]);

  const fetchReminders = useCallback(async () => {
    try {
      await fetchAllReminders();
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchAllReminders]); // Need fetchAllReminders here, but we'll handle it differently

  const fetchCalendarEventsData = useCallback(async () => {
    try {
      // Fetch events for the next 90 days
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 90);

      const startDateStr = today.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      let url = `/api/calendar/events?start_date=${startDateStr}&end_date=${endDateStr}`;
      if (selectedCalendarUserId) {
        url += `&user_id=${selectedCalendarUserId}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const events = data.events || [];
        
        // Categorize events
        const categorized = categorizeEvents(events);
        setCalendarEvents(categorized);
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    }
  }, [token, selectedCalendarUserId]);

  useEffect(() => {
    if (token) {
      // Call functions directly instead of through callbacks to avoid dependency issues
      const loadData = async () => {
        try {
          await fetchAllReminders();
        } catch (error) {
          console.error('Error fetching reminders:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadData();
      fetchCalendarEventsData();
      fetchLeads();
      fetchSharedCalendars();
    }
  }, [token, fetchAllReminders]); // Include fetchAllReminders but it's stable from the store

  // Fetch reminders for selected calendar when it changes
  useEffect(() => {
    if (token) {
      fetchRemindersForCalendar(selectedCalendarUserId);
      fetchCalendarEventsData();
    }
  }, [selectedCalendarUserId, token]); // Removed fetchRemindersForCalendar to prevent infinite loop

  // Update local reminders when store reminders or shared calendar reminders change
  // Use useMemo to prevent unnecessary recalculations
  useEffect(() => {
    // Use shared calendar reminders if a calendar is selected, otherwise use store reminders
    const remindersToUse = selectedCalendarUserId ? sharedCalendarReminders : storeReminders;
    
    if (remindersToUse.length >= 0) { // Changed from > 0 to >= 0 to handle empty state
      const categorized = categorizeReminders(remindersToUse);
      setReminders(categorized);
    }
  }, [storeReminders, sharedCalendarReminders, selectedCalendarUserId]);

  const categorizeEvents = (events: CalendarEvent[]): CategorizedEvents => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const categorized: CategorizedEvents = {
      overdue: [],
      today: [],
      tomorrow: [],
      upcoming: [],
      future: []
    };

    events.forEach(event => {
      const eventDate = new Date(event.event_date);
      eventDate.setHours(0, 0, 0, 0);

      if (eventDate < today) {
        categorized.overdue.push(event);
      } else if (eventDate.getTime() === today.getTime()) {
        categorized.today.push(event);
      } else if (eventDate.getTime() === tomorrow.getTime()) {
        categorized.tomorrow.push(event);
      } else if (eventDate < nextWeek) {
        categorized.upcoming.push(event);
      } else {
        categorized.future.push(event);
      }
    });

    return categorized;
  };

  const categorizeReminders = (allReminders: LeadReminder[]): CategorizedReminders => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const categorized: CategorizedReminders = {
      overdue: [],
      today: [],
      tomorrow: [],
      upcoming: [],
      future: [],
      completed: []
    };

    allReminders.forEach(reminder => {
      // Convert to Reminder format for display
      // Note: lead_name and lead_phone may be added by API when joining with leads table
      const displayReminder: Reminder = {
        id: reminder.id,
        lead_id: reminder.lead_id || '',
        reminder_type: reminder.reminder_type,
        priority: reminder.priority,
        due_date: reminder.reminder_date,
        title: reminder.title || reminder.message || '',
        description: reminder.description || '',
        completed: reminder.completed || reminder.status === 'completed',
        created_at: reminder.created_at,
        lead_name: (reminder as any).lead_name,
        lead_phone: (reminder as any).lead_phone
      };

      if (displayReminder.completed) {
        categorized.completed.push(displayReminder);
        return;
      }

      const reminderDate = new Date(reminder.reminder_date);
      reminderDate.setHours(0, 0, 0, 0);

      if (reminderDate < today) {
        categorized.overdue.push(displayReminder);
      } else if (reminderDate.getTime() === today.getTime()) {
        categorized.today.push(displayReminder);
      } else if (reminderDate.getTime() === tomorrow.getTime()) {
        categorized.tomorrow.push(displayReminder);
      } else if (reminderDate < nextWeek) {
        categorized.upcoming.push(displayReminder);
      } else {
        categorized.future.push(displayReminder);
      }
    });

    return categorized;
  };

  const handleCompleteReminder = async (reminderId: string, leadId: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/reminders/${reminderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ completed: true })
      });

      if (response.ok) {
        fetchReminders();
      }
    } catch (error) {
      console.error('Error completing reminder:', error);
    }
  };

  const handleDeleteReminder = async (reminderId: string, leadId: string) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) return;

    try {
      const response = await fetch(`/api/leads/${leadId}/reminders/${reminderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        fetchReminders();
      }
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  const getFilteredReminders = () => {
    if (!reminders) return [];

    let allReminders: Reminder[] = [];
    
    if (filterStatus === 'active') {
      allReminders = [
        ...reminders.overdue,
        ...reminders.today,
        ...reminders.tomorrow,
        ...reminders.upcoming,
        ...reminders.future
      ];
    } else if (filterStatus === 'completed') {
      allReminders = reminders.completed;
    } else {
      allReminders = [
        ...reminders.overdue,
        ...reminders.today,
        ...reminders.tomorrow,
        ...reminders.upcoming,
        ...reminders.future,
        ...reminders.completed
      ];
    }

    // Apply type filter
    if (filterType !== 'all') {
      allReminders = allReminders.filter(r => r.reminder_type === filterType);
    }

    // Apply priority filter
    if (filterPriority !== 'all') {
      allReminders = allReminders.filter(r => r.priority === filterPriority);
    }

    return allReminders;
  };

  const getFilteredEvents = () => {
    if (!calendarEvents) return [];

    let allEvents: CalendarEvent[] = [];
    
    // Calendar events don't have completed status, so only show active ones
    if (filterStatus === 'completed') {
      return [];
    }

    allEvents = [
      ...calendarEvents.overdue,
      ...calendarEvents.today,
      ...calendarEvents.tomorrow,
      ...calendarEvents.upcoming,
      ...calendarEvents.future
    ];

    // Apply priority filter
    if (filterPriority !== 'all') {
      allEvents = allEvents.filter(e => e.priority === filterPriority);
    }

    return allEvents;
  };

  const getCombinedItems = () => {
    const reminders = showType === 'events' ? [] : getFilteredReminders();
    const events = showType === 'reminders' ? [] : getFilteredEvents();

    // Combine and sort by date
    const combined: Array<{type: 'reminder' | 'event', data: Reminder | CalendarEvent}> = [
      ...reminders.map(r => ({ type: 'reminder' as const, data: r })),
      ...events.map(e => ({ type: 'event' as const, data: e }))
    ];

    combined.sort((a, b) => {
      const dateA = a.type === 'reminder' 
        ? new Date((a.data as Reminder).due_date)
        : new Date((a.data as CalendarEvent).event_date);
      const dateB = b.type === 'reminder'
        ? new Date((b.data as Reminder).due_date)
        : new Date((b.data as CalendarEvent).event_date);
      return dateA.getTime() - dateB.getTime();
    });

    return combined;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-900/30 border-red-500/50';
      case 'high': return 'text-orange-400 bg-orange-900/30 border-orange-500/50';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/50';
      case 'low': return 'text-green-400 bg-green-900/30 border-green-500/50';
      default: return 'text-gray-400 bg-gray-900/30 border-gray-500/50';
    }
  };

  const getCategoryBadge = (reminder: Reminder) => {
    if (reminder.completed) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-900/50 text-green-300 border border-green-500/50">Completed</span>;
    }

    const dueDate = new Date(reminder.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

    if (dueDateOnly < today) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-900/50 text-red-300 border border-red-500/50">Overdue</span>;
    } else if (dueDateOnly.getTime() === today.getTime()) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-900/50 text-blue-300 border border-blue-500/50">Today</span>;
    } else if (dueDateOnly.getTime() === new Date(today.getTime() + 86400000).getTime()) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-900/50 text-purple-300 border border-purple-500/50">Tomorrow</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-900/50 text-gray-300 border border-gray-500/50">Upcoming</span>;
    }
  };

  const getEventCategoryBadge = (event: CalendarEvent) => {
    const eventDate = new Date(event.event_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    if (eventDateOnly < today) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-900/50 text-red-300 border border-red-500/50">Overdue</span>;
    } else if (eventDateOnly.getTime() === today.getTime()) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-900/50 text-blue-300 border border-blue-500/50">Today</span>;
    } else if (eventDateOnly.getTime() === new Date(today.getTime() + 86400000).getTime()) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-900/50 text-purple-300 border border-purple-500/50">Tomorrow</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-900/50 text-gray-300 border border-gray-500/50">Upcoming</span>;
    }
  };

  const combinedItems = getCombinedItems();
  const totalEvents = calendarEvents ? 
    calendarEvents.overdue.length + calendarEvents.today.length + calendarEvents.tomorrow.length + 
    calendarEvents.upcoming.length + calendarEvents.future.length : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="ml-3 text-gray-300">Loading reminders...</span>
      </div>
    );
  }

  return (
    <>
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Reminders & Events</h2>
        <p className="text-gray-300">
          Manage all your lead reminders and calendar events
        </p>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('list')}
          className={`
            px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2
            ${activeTab === 'list'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
              : 'bg-white/10 text-emerald-200 hover:bg-white/20'
            }
          `}
        >
          <Bell className="w-5 h-5" />
          List View
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`
            px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2
            ${activeTab === 'calendar'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
              : 'bg-white/10 text-emerald-200 hover:bg-white/20'
            }
          `}
        >
          <CalendarIcon className="w-5 h-5" />
          Calendar View
        </button>
      </div>

      {/* Shared Calendar Selector - At page level, above both calendar and list */}
      {sharedCalendars.length > 0 && (
        <div className="glass-card p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-emerald-400" />
              <span className="text-white font-medium">
                {selectedCalendarOwnerName 
                  ? `Viewing ${selectedCalendarOwnerName}'s Calendar`
                  : 'Viewing My Calendar'
                }
              </span>
            </div>
            <select
              value={selectedCalendarUserId || ''}
              onChange={(e) => {
                const userId = e.target.value || null;
                setSelectedCalendarUserId(userId);
                if (userId) {
                  const sharedCal = sharedCalendars.find(cal => cal.owner_user_id === userId);
                  setSelectedCalendarOwnerName(sharedCal?.owner_name || sharedCal?.owner_username || null);
                } else {
                  setSelectedCalendarOwnerName(null);
                }
              }}
              className="px-4 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 cursor-pointer hover:bg-white/15 transition-colors"
            >
              <option value="">📅 My Calendar</option>
              {sharedCalendars.map(cal => (
                <option key={cal.id} value={cal.owner_user_id}>
                  📅 {cal.owner_name || cal.owner_username}'s Calendar
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Calendar View */}
      {activeTab === 'calendar' && (
        <div className="glass-card p-6 mb-6">
          <h3 className="text-xl font-semibold text-white mb-4">Calendar View</h3>
          
          <AdvancedCalendar 
            reminders={selectedCalendarUserId ? sharedCalendarReminders : storeReminders}
            leads={leads}
            selectedCalendarUserId={selectedCalendarUserId}
            hideCalendarSelector={true}
            onLeadClick={(leadId) => {
              // Find the lead and open modal
              const lead = leads.find(l => l.id === leadId);
              if (lead) {
                setSelectedLead(lead);
              }
            }}
            onReminderUpdate={() => {
              // Refresh reminders when one is updated
              if (selectedCalendarUserId) {
                fetchRemindersForCalendar(selectedCalendarUserId);
              } else {
                fetchReminders();
              }
              fetchCalendarEventsData();
            }}
          />
        </div>
      )}

      {/* List View */}
      {activeTab === 'list' && (
        <>
          {/* Stats */}
          {reminders && calendarEvents && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <div className="text-sm text-gray-400">Overdue</div>
                </div>
                <div className="text-2xl font-bold text-white">
                  {reminders.overdue.length + calendarEvents.overdue.length}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {reminders.overdue.length} reminders, {calendarEvents.overdue.length} events
                </div>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <div className="text-sm text-gray-400">Today</div>
                </div>
                <div className="text-2xl font-bold text-white">
                  {reminders.today.length + calendarEvents.today.length}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {reminders.today.length} reminders, {calendarEvents.today.length} events
                </div>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="w-5 h-5 text-purple-400" />
                  <div className="text-sm text-gray-400">Upcoming</div>
                </div>
                <div className="text-2xl font-bold text-white">
                  {reminders.tomorrow.length + reminders.upcoming.length + reminders.future.length +
                   calendarEvents.tomorrow.length + calendarEvents.upcoming.length + calendarEvents.future.length}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Combined future items
                </div>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <div className="text-sm text-gray-400">Completed</div>
                </div>
                <div className="text-2xl font-bold text-white">{reminders.completed.length}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Reminders only
                </div>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="w-5 h-5 text-emerald-400" />
                  <div className="text-sm text-gray-400">Events</div>
                </div>
                <div className="text-2xl font-bold text-white">{totalEvents}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Calendar events
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="glass-card p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="text-white font-medium">Filters</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Show</label>
                <select
                  value={showType}
                  onChange={(e) => setShowType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="all">All Items</option>
                  <option value="reminders">Reminders Only</option>
                  <option value="events">Events Only</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  disabled={showType === 'events'}
                >
                  <option value="all">All Types</option>
                  <option value="callback">Callback</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="meeting">Meeting</option>
                  <option value="email">Email</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Priority</label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Reminders and Events List */}
          {combinedItems.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No items found</h3>
              <p className="text-gray-400">
                {filterStatus !== 'all' || filterType !== 'all' || filterPriority !== 'all' || showType !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create reminders from the lead details page or add calendar events'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {combinedItems.map((item) => {
            // Render calendar event
            if (item.type === 'event') {
              const event = item.data as CalendarEvent;
              const eventTypeIcons: Record<string, string> = {
                event: '📅',
                appointment: '🗓️',
                meeting: '🤝',
                deadline: '⏰',
                reminder: '🔔',
                other: '📌'
              };

              return (
                <div key={`event-${event.id}`} className="glass-card p-4 border-l-4 border-blue-500">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{eventTypeIcons[event.event_type] || '📅'}</span>
                        <h3 className="text-lg font-semibold text-white">{event.title}</h3>
                        {getEventCategoryBadge(event)}
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(event.priority)}`}>
                          {event.priority}
                        </span>
                        {!event.is_owner && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-900/50 text-purple-300 border border-purple-500/50">
                            Shared
                          </span>
                        )}
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-900/50 text-blue-300 border border-blue-500/50">
                          📅 Event
                        </span>
                      </div>
                      {event.description && (
                        <p className="text-sm text-gray-400 mb-2">{event.description}</p>
                      )}
                      {event.location && (
                        <p className="text-sm text-gray-500 mb-2">
                          📍 {event.location}
                        </p>
                      )}
                      {event.creator_username && (
                        <p className="text-sm text-gray-500">
                          Created by: {event.creator_username}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>📅 {new Date(event.event_date).toLocaleDateString()}</span>
                    <span>
                      🕐 {event.is_all_day ? 'All day' : 
                        event.event_time ? new Date(`2000-01-01T${event.event_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 
                        'No time set'}
                    </span>
                    <span>🏷️ {event.event_type}</span>
                    <span>Created {new Date(event.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            }

            // Render reminder
            const reminder = item.data as Reminder;
            
            // Handler to open lead modal
            const handleReminderClick = () => {
              if (!reminder.lead_id) return;
              
              console.log('[Reminders] Reminder clicked, lead_id:', reminder.lead_id);
              console.log('[Reminders] leads count:', leads.length);
              
              const lead = leads.find(l => l.id === reminder.lead_id);
              console.log('[Reminders] Found lead:', lead ? lead.name : 'NOT FOUND');
              
              if (lead) {
                setSelectedLead(lead);
              } else {
                console.error('[Reminders] Lead not found! Fetching directly...');
                // Try to fetch the lead directly
                const fetchLead = async () => {
                  try {
                    const response = await fetch(`/api/leads/${reminder.lead_id}`, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    if (response.ok) {
                      const fetchedLead = await response.json();
                      console.log('[Reminders] Fetched lead directly:', fetchedLead);
                      setSelectedLead(fetchedLead);
                    } else {
                      console.error('[Reminders] Failed to fetch lead:', response.status);
                    }
                  } catch (error) {
                    console.error('[Reminders] Error fetching lead:', error);
                  }
                };
                fetchLead();
              }
            };
            
            return (
              <div 
                key={`reminder-${reminder.id}`} 
                className="glass-card p-4 border-l-4 border-emerald-500 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={handleReminderClick}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">{reminder.title}</h3>
                      {getCategoryBadge(reminder)}
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(reminder.priority)}`}>
                        {reminder.priority}
                      </span>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-900/50 text-emerald-300 border border-emerald-500/50">
                        🔔 Reminder
                      </span>
                    </div>
                    {reminder.description && (
                      <p className="text-sm text-gray-400 mb-2">{reminder.description}</p>
                    )}
                    {reminder.lead_name && (
                      <p className="text-sm text-gray-500">
                        Lead: {reminder.lead_name}
                        {reminder.lead_phone && ` (${reminder.lead_phone})`}
                      </p>
                    )}
                  </div>
                  {!reminder.completed && (
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleCompleteReminder(reminder.id, reminder.lead_id)}
                        className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Complete
                      </button>
                      <button
                        onClick={() => handleDeleteReminder(reminder.id, reminder.lead_id)}
                        className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>📅 {new Date(reminder.due_date).toLocaleDateString()}</span>
                  <span>🏷️ {reminder.reminder_type}</span>
                  <span>🕐 Created {new Date(reminder.created_at).toLocaleDateString()}</span>
                  {reminder.completed_at && (
                    <span>✅ Completed {new Date(reminder.completed_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}
    </div>

    {/* Lead Details Modal */}
    {selectedLead && (
      <LeadDetailsModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdate={() => {
          // Refresh data when lead is updated
          fetchReminders();
          fetchCalendarEventsData();
        }}
      />
    )}
    </>
  );
}
