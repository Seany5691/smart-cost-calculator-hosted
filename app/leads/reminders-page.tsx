'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/lib/store/auth-simple';
import { useRemindersStore } from '@/lib/store/reminders';
import { Bell, Calendar as CalendarIcon, Plus, Filter, Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import AdvancedCalendar from '@/components/leads/AdvancedCalendar';
import LeadDetailsModal from '@/components/leads/LeadDetailsModal';
import EditReminderModal from '@/components/leads/EditReminderModal';
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

interface GroupedCalendarEvent extends CalendarEvent {
  end_date?: string; // For multi-day events
  event_ids?: string[]; // IDs of all events in the group
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
  const [selectedReminders, setSelectedReminders] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<'all' | 'today' | 'tomorrow' | '2days' | '3days' | 'week' | 'nextweek' | 'month' | 'nextmonth'>('all');
  const [editingReminder, setEditingReminder] = useState<LeadReminder | null>(null);

  // Helper function to parse date strings in LOCAL timezone (not UTC)
  const parseLocalDate = (dateStr: string): Date => {
    const dateOnly = dateStr.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

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
      let url = '/api/reminders?includeCompleted=true';
      if (userId) {
        url += `&user_id=${userId}`;
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

  // Memoize categorizeEvents to prevent infinite loops
  const categorizeEvents = useCallback((events: CalendarEvent[]): CategorizedEvents => {
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
  }, []);

  // Memoize categorizeReminders to prevent infinite loops
  const categorizeReminders = useCallback((allReminders: LeadReminder[]): CategorizedReminders => {
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
  }, []);

  const fetchReminders = useCallback(async () => {
    try {
      await fetchAllReminders();
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchAllReminders]);

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
  }, [token, selectedCalendarUserId, categorizeEvents]);

  // Initial data load - only run once on mount
  useEffect(() => {
    if (!token) return;
    
    let isMounted = true;
    
    const loadData = async () => {
      try {
        await fetchAllReminders();
        
        if (isMounted) {
          // Fetch leads and shared calendars in parallel
          await Promise.all([
            fetchLeads(),
            fetchSharedCalendars()
          ]);
        }
      } catch (error) {
        console.error('Error fetching reminders:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [token]); // Only depend on token, not the callback functions

  // Fetch reminders for selected calendar when it changes
  useEffect(() => {
    if (!token) return;
    
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        // Fetch reminders
        let url = '/api/reminders?includeCompleted=true';
        if (selectedCalendarUserId) {
          url += `&user_id=${selectedCalendarUserId}`;
        }

        const remindersResponse = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (remindersResponse.ok && isMounted) {
          const remindersData = await remindersResponse.json();
          setSharedCalendarReminders(remindersData.reminders || []);
        }

        // Fetch events
        const today = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 90);

        const startDateStr = today.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        let eventsUrl = `/api/calendar/events?start_date=${startDateStr}&end_date=${endDateStr}`;
        if (selectedCalendarUserId) {
          eventsUrl += `&user_id=${selectedCalendarUserId}`;
        }

        const eventsResponse = await fetch(eventsUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (eventsResponse.ok && isMounted) {
          const eventsData = await eventsResponse.json();
          const events = eventsData.events || [];
          const categorized = categorizeEvents(events);
          setCalendarEvents(categorized);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [selectedCalendarUserId, token]); // Removed categorizeEvents from dependencies

  // Update local reminders when store reminders or shared calendar reminders change
  // Memoize the categorized reminders to prevent unnecessary recalculations
  const categorizedReminders = useMemo(() => {
    const remindersToUse = selectedCalendarUserId ? sharedCalendarReminders : storeReminders;
    
    if (remindersToUse.length >= 0) {
      return categorizeReminders(remindersToUse);
    }
    return null;
  }, [storeReminders, sharedCalendarReminders, selectedCalendarUserId, categorizeReminders]);

  // Update state only when categorized reminders change
  useEffect(() => {
    if (categorizedReminders) {
      setReminders(categorizedReminders);
    }
  }, [categorizedReminders]);

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

  const handleToggleSelect = (reminderId: string) => {
    setSelectedReminders(prev => 
      prev.includes(reminderId) 
        ? prev.filter(id => id !== reminderId)
        : [...prev, reminderId]
    );
  };

  const handleSelectAll = () => {
    const allReminderIds = combinedItems
      .filter(item => item.type === 'reminder')
      .map(item => (item.data as Reminder).id);
    
    if (selectedReminders.length === allReminderIds.length) {
      setSelectedReminders([]);
    } else {
      setSelectedReminders(allReminderIds);
    }
  };

  const handleBulkComplete = async (completed: boolean) => {
    if (selectedReminders.length === 0) return;
    
    try {
      const allReminders = combinedItems
        .filter(item => item.type === 'reminder')
        .map(item => item.data as Reminder);
      
      await Promise.all(
        selectedReminders.map(async (reminderId) => {
          const reminder = allReminders.find(r => r.id === reminderId);
          if (!reminder) return;
          
          const response = await fetch(`/api/leads/${reminder.lead_id}/reminders/${reminderId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ 
              completed,
              status: completed ? 'completed' : 'pending'
            })
          });

          if (!response.ok) {
            throw new Error('Failed to update reminder');
          }
        })
      );

      setSelectedReminders([]);
      fetchReminders();
    } catch (error) {
      console.error('Error updating reminders:', error);
      alert('Failed to update some reminders. Please try again.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedReminders.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedReminders.length} reminder(s)?`)) return;
    
    try {
      const allReminders = combinedItems
        .filter(item => item.type === 'reminder')
        .map(item => item.data as Reminder);
      
      await Promise.all(
        selectedReminders.map(async (reminderId) => {
          const reminder = allReminders.find(r => r.id === reminderId);
          if (!reminder) return;
          
          const response = await fetch(`/api/leads/${reminder.lead_id}/reminders/${reminderId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });

          if (!response.ok) {
            throw new Error('Failed to delete reminder');
          }
        })
      );

      setSelectedReminders([]);
      fetchReminders();
    } catch (error) {
      console.error('Error deleting reminders:', error);
      alert('Failed to delete some reminders. Please try again.');
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

    // Apply time range filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const getEndDate = () => {
      const end = new Date(today);
      switch (timeRange) {
        case 'today':
          return today;
        case 'tomorrow':
          end.setDate(end.getDate() + 1);
          return end;
        case '2days':
          end.setDate(end.getDate() + 2);
          return end;
        case '3days':
          end.setDate(end.getDate() + 3);
          return end;
        case 'week':
          // This week = remaining days until Sunday
          const daysUntilSunday = 7 - today.getDay();
          end.setDate(end.getDate() + daysUntilSunday);
          return end;
        case 'nextweek':
          // Next week = next 7 days from today
          end.setDate(end.getDate() + 7);
          return end;
        case 'month':
          // This month = remaining days in current month
          end.setMonth(end.getMonth() + 1, 0); // Last day of current month
          return end;
        case 'nextmonth':
          // Next month = 30 days from today
          end.setDate(end.getDate() + 30);
          return end;
        default:
          return null;
      }
    };

    const endDate = getEndDate();
    
    let filteredReminders = reminders;
    if (timeRange !== 'all' && endDate) {
      filteredReminders = reminders.filter(r => {
        const reminderDate = new Date(r.due_date);
        reminderDate.setHours(0, 0, 0, 0);
        return reminderDate >= today && reminderDate <= endDate;
      });
    }

    let filteredEvents = events;
    if (timeRange !== 'all' && endDate) {
      filteredEvents = events.filter(e => {
        const eventDate = parseLocalDate(e.event_date);
        return eventDate >= today && eventDate <= endDate;
      });
    }

    // Group multi-day events
    const groupedEvents = new Map<string, GroupedCalendarEvent>();
    
    filteredEvents.forEach(event => {
      // Filter out past events
      const eventDate = parseLocalDate(event.event_date);
      const eventDateTime = new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate()
      );
      
      // Skip events that are in the past
      if (eventDateTime < today) return;
      
      // Create a unique key for grouping multi-day events
      const groupKey = `${event.title}|${event.description}|${event.event_time}|${event.event_type}|${event.priority}|${event.location}|${event.created_by}`;
      
      if (groupedEvents.has(groupKey)) {
        const existing = groupedEvents.get(groupKey)!;
        const existingDate = parseLocalDate(existing.event_date);
        const currentDate = parseLocalDate(event.event_date);
        
        // Update start date if this event is earlier
        if (currentDate < existingDate) {
          existing.event_date = event.event_date;
          existing.id = event.id;
        }
        
        // Update end date if this event is later
        const existingEndDate = existing.end_date ? parseLocalDate(existing.end_date) : existingDate;
        if (currentDate > existingEndDate) {
          existing.end_date = event.event_date;
        }
        
        // Add event ID to the group
        if (!existing.event_ids) {
          existing.event_ids = [existing.id];
        }
        existing.event_ids.push(event.id);
      } else {
        // First occurrence of this event
        groupedEvents.set(groupKey, {
          ...event,
          event_ids: [event.id]
        });
      }
    });

    // Combine and sort by date
    const combined: Array<{type: 'reminder' | 'event', data: Reminder | GroupedCalendarEvent}> = [
      ...filteredReminders.map(r => ({ type: 'reminder' as const, data: r })),
      ...Array.from(groupedEvents.values()).map(e => ({ type: 'event' as const, data: e }))
    ];

    combined.sort((a, b) => {
      const dateA = a.type === 'reminder' 
        ? new Date((a.data as Reminder).due_date)
        : new Date((a.data as GroupedCalendarEvent).event_date);
      const dateB = b.type === 'reminder'
        ? new Date((b.data as Reminder).due_date)
        : new Date((b.data as GroupedCalendarEvent).event_date);
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

  const combinedItems = useMemo(() => getCombinedItems(), [reminders, calendarEvents, showType, filterType, filterPriority, filterStatus, timeRange]);
  const totalEvents = calendarEvents ? 
    calendarEvents.overdue.length + calendarEvents.today.length + calendarEvents.tomorrow.length + 
    calendarEvents.upcoming.length + calendarEvents.future.length : 0;

  if (loading || storeLoading) {
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
      <div className="flex justify-center gap-3 mb-6">
        <button
          onClick={() => setActiveTab('list')}
          className={`
            px-8 py-4 rounded-xl font-semibold text-lg transition-all flex items-center gap-3 shadow-lg
            ${activeTab === 'list'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white scale-105'
              : 'bg-white/10 text-emerald-200 hover:bg-white/20 hover:scale-102'
            }
          `}
        >
          <Bell className="w-6 h-6" />
          List View
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`
            px-8 py-4 rounded-xl font-semibold text-lg transition-all flex items-center gap-3 shadow-lg
            ${activeTab === 'calendar'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white scale-105'
              : 'bg-white/10 text-emerald-200 hover:bg-white/20 hover:scale-102'
            }
          `}
        >
          <CalendarIcon className="w-6 h-6" />
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 mb-6">
              <div className="glass-card p-3 md:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-red-400" />
                  <div className="text-xs md:text-sm text-gray-400">Overdue</div>
                </div>
                <div className="text-xl md:text-2xl font-bold text-white">
                  {reminders.overdue.length + calendarEvents.overdue.length}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {reminders.overdue.length}r, {calendarEvents.overdue.length}e
                </div>
              </div>
              <div className="glass-card p-3 md:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                  <div className="text-xs md:text-sm text-gray-400">Today</div>
                </div>
                <div className="text-xl md:text-2xl font-bold text-white">
                  {reminders.today.length + calendarEvents.today.length}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {reminders.today.length}r, {calendarEvents.today.length}e
                </div>
              </div>
              <div className="glass-card p-3 md:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
                  <div className="text-xs md:text-sm text-gray-400">Upcoming</div>
                </div>
                <div className="text-xl md:text-2xl font-bold text-white">
                  {reminders.tomorrow.length + reminders.upcoming.length + reminders.future.length +
                   calendarEvents.tomorrow.length + calendarEvents.upcoming.length + calendarEvents.future.length}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Future items
                </div>
              </div>
              <div className="glass-card p-3 md:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
                  <div className="text-xs md:text-sm text-gray-400">Completed</div>
                </div>
                <div className="text-xl md:text-2xl font-bold text-white">{reminders.completed.length}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Reminders
                </div>
              </div>
              <div className="glass-card p-3 md:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                  <div className="text-xs md:text-sm text-gray-400">Events</div>
                </div>
                <div className="text-xl md:text-2xl font-bold text-white">{totalEvents}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Calendar
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="glass-card p-4 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-emerald-400" />
              <span className="text-white font-medium">Filters</span>
            </div>
            
            {/* Mobile: Stack vertically */}
            <div className="flex flex-col gap-3 md:hidden">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <label className="text-sm font-medium text-emerald-200 whitespace-nowrap">Show:</label>
                <select
                  value={showType}
                  onChange={(e) => setShowType(e.target.value as any)}
                  className="flex-1 min-w-0 px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="all">All Items</option>
                  <option value="reminders">Reminders Only</option>
                  <option value="events">Events Only</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <label className="text-sm font-medium text-emerald-200 whitespace-nowrap">Status:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="flex-1 min-w-0 px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <label className="text-sm font-medium text-emerald-200 whitespace-nowrap">Type:</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
              
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <label className="text-sm font-medium text-emerald-200 whitespace-nowrap">Priority:</label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            
            {/* Desktop: Horizontal layout */}
            <div className="hidden md:flex md:flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <label className="text-sm font-medium text-emerald-200 whitespace-nowrap">Show:</label>
                <select
                  value={showType}
                  onChange={(e) => setShowType(e.target.value as any)}
                  className="px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="all">All Items</option>
                  <option value="reminders">Reminders Only</option>
                  <option value="events">Events Only</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <label className="text-sm font-medium text-emerald-200 whitespace-nowrap">Status:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <label className="text-sm font-medium text-emerald-200 whitespace-nowrap">Type:</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
              
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <label className="text-sm font-medium text-emerald-200 whitespace-nowrap">Priority:</label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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

          {/* Time Range Selector */}
          <div className="glass-card p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-emerald-400" />
              <span className="text-white font-medium">Time Range</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
              {[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: 'tomorrow', label: 'Tomorrow' },
                { value: '2days', label: '2 Days' },
                { value: '3days', label: '3 Days' },
                { value: 'week', label: 'This Week' },
                { value: 'nextweek', label: 'Next 7' },
                { value: 'month', label: 'This Month' },
                { value: 'nextmonth', label: 'Next 30' }
              ].map(range => (
                <button
                  key={range.value}
                  onClick={() => setTimeRange(range.value as any)}
                  className={`
                    px-3 py-2 rounded-lg font-medium transition-all text-sm
                    ${timeRange === range.value
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                      : 'bg-white/10 text-emerald-200 hover:bg-white/20'
                    }
                  `}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedReminders.length > 0 && (
            <div className="glass-card p-4 mb-6 border-2 border-emerald-500/50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="text-white font-medium">
                    {selectedReminders.length} reminder(s) selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleBulkComplete(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark Complete
                  </button>
                  <button
                    onClick={() => handleBulkComplete(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    Mark Incomplete
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-2"
                  >
                    <Bell className="w-4 h-4" />
                    Delete
                  </button>
                  <button
                    onClick={() => setSelectedReminders([])}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>
          )}

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
            <>
              {/* Select All Header */}
              {showType !== 'events' && (
                <div className="glass-card p-3 mb-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedReminders.length === combinedItems.filter(i => i.type === 'reminder').length && selectedReminders.length > 0}
                    onChange={handleSelectAll}
                    className="w-5 h-5 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900 cursor-pointer"
                  />
                  <span className="text-white font-medium">Select All Reminders</span>
                </div>
              )}
              
              <div className="space-y-3">
              {combinedItems.map((item) => {
            // Render calendar event
            if (item.type === 'event') {
              const event = item.data as GroupedCalendarEvent;
              const eventTypeIcons: Record<string, string> = {
                event: '📅',
                appointment: '🗓️',
                meeting: '🤝',
                deadline: '⏰',
                reminder: '🔔',
                other: '📌'
              };

              // Format date display for single or multi-day events
              const formatEventDate = () => {
                const startDate = parseLocalDate(event.event_date);
                
                if (event.end_date && event.end_date !== event.event_date) {
                  // Multi-day event
                  const endDate = parseLocalDate(event.end_date);
                  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
                  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
                  const startDay = startDate.getDate();
                  const endDay = endDate.getDate();
                  
                  // Same month: "Jan 28 - 31"
                  if (startMonth === endMonth) {
                    return `${startMonth} ${startDay} - ${endDay}`;
                  }
                  // Different months: "Jan 28 - Feb 2"
                  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
                } else {
                  // Single-day event
                  return startDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  });
                }
              };

              return (
                <div key={`event-${event.id}`} className="glass-card p-4 border-l-4 border-blue-500">
                  <div className="flex items-start gap-3">
                    {/* Type Icon */}
                    <div className="flex-shrink-0 text-2xl" title={event.event_type}>
                      {eventTypeIcons[event.event_type] || '📅'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <h3 className="text-lg font-semibold text-white mb-2">{event.title}</h3>

                      {/* Badges Row */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                          event.priority === 'urgent' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          event.priority === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                          event.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          'bg-green-500/20 text-green-400 border-green-500/30'
                        }`}>
                          {event.priority.toUpperCase()}
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

                      {/* Description */}
                      {event.description && (
                        <p className="text-sm text-gray-400 mb-3">{event.description}</p>
                      )}

                      {/* Date, Time, Location */}
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          📅 {formatEventDate()}
                        </span>
                        <span className="flex items-center gap-1">
                          🕐 {event.is_all_day ? 'All day' : 
                            event.event_time ? new Date(`2000-01-01T${event.event_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 
                            'No time set'}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            📍 {event.location}
                          </span>
                        )}
                      </div>

                      {/* Creator */}
                      {event.creator_username && (
                        <p className="text-xs text-gray-500 mt-2">
                          Created by: {event.creator_username}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // Render reminder
            const reminder = item.data as Reminder;
            const isSelected = selectedReminders.includes(reminder.id);
            
            // Get the full reminder object to access additional fields
            const fullReminder = (selectedCalendarUserId ? sharedCalendarReminders : storeReminders).find(r => r.id === reminder.id);
            
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
            
            // Format reminder date and time
            const formatReminderDateTime = () => {
              const date = new Date(reminder.due_date);
              const dateStr = date.toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              });
              
              if (fullReminder?.is_all_day) {
                return `${dateStr} (All Day)`;
              }
              
              if (fullReminder?.reminder_time) {
                const timeStr = fullReminder.reminder_time.includes('T') 
                  ? fullReminder.reminder_time.split('T')[1].substring(0, 5)
                  : fullReminder.reminder_time.substring(0, 5);
                const [hours, minutes] = timeStr.split(':').map(Number);
                const isPM = hours >= 12;
                const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
                const time12 = `${hours12}:${minutes.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
                return `${dateStr} at ${time12}`;
              }
              
              return dateStr;
            };
            
            return (
              <div 
                key={`reminder-${reminder.id}`} 
                className={`glass-card p-4 md:p-5 border-l-4 transition-all ${
                  reminder.completed 
                    ? 'border-green-500 bg-green-500/5 opacity-75' 
                    : 'border-emerald-500 hover:bg-white/5 cursor-pointer'
                } ${isSelected ? 'ring-2 ring-emerald-500' : ''}`}
              >
                <div className="flex flex-col md:flex-row items-start gap-3 md:gap-4">
                  {/* Mobile: Checkbox and Icon Row */}
                  <div className="flex items-start gap-3 md:gap-4 w-full md:w-auto">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(reminder.id);
                      }}
                      className="mt-1 w-5 h-5 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900 cursor-pointer flex-shrink-0"
                    />

                    {/* Type Icon */}
                    <div 
                      className="flex-shrink-0 text-2xl md:text-3xl cursor-pointer" 
                      title={reminder.reminder_type}
                      onClick={handleReminderClick}
                    >
                      {reminder.reminder_type === 'callback' ? '📞' :
                       reminder.reminder_type === 'follow_up' ? '📧' :
                       reminder.reminder_type === 'meeting' ? '🤝' :
                       reminder.reminder_type === 'email' ? '✉️' : '🔔'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0" onClick={handleReminderClick}>
                      {/* Title */}
                      <h3 className={`text-lg md:text-xl font-semibold text-white mb-2 md:mb-3 ${reminder.completed ? 'line-through' : ''}`}>
                        {reminder.title}
                      </h3>

                      {/* Badges Row */}
                      <div className="flex items-center gap-2 mb-3 md:mb-4 flex-wrap">
                        {getCategoryBadge(reminder)}
                        <span className={`px-2 md:px-3 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(reminder.priority)}`}>
                          {reminder.priority.toUpperCase()}
                        </span>
                        <span className="px-2 md:px-3 py-1 text-xs font-semibold rounded-full bg-emerald-900/50 text-emerald-300 border border-emerald-500/50">
                          🔔 Reminder
                        </span>
                        {reminder.completed && (
                          <span className="px-2 md:px-3 py-1 text-xs font-semibold rounded-full bg-green-900/50 text-green-300 border border-green-500/50">
                            ✅ Completed
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {reminder.description && (
                        <p className={`text-sm md:text-base text-gray-300 mb-3 md:mb-4 ${reminder.completed ? 'line-through' : ''}`}>
                          {reminder.description}
                        </p>
                      )}

                      {/* Lead Info */}
                      {reminder.lead_name && (
                        <div className="mb-3 md:mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                          <p className="text-xs md:text-sm text-gray-400 mb-1">Lead Information</p>
                          <p className="text-sm md:text-base text-white font-medium">
                            {reminder.lead_name}
                            {reminder.lead_phone && <span className="text-gray-400 ml-2">• {reminder.lead_phone}</span>}
                          </p>
                        </div>
                      )}

                      {/* Detailed Information Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 text-sm">
                        {/* Reminder Date & Time */}
                        <div className="flex items-start gap-2 p-2 md:p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                          <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-blue-300 font-medium mb-1 text-xs md:text-sm">Reminder Date & Time</p>
                            <p className="text-white text-xs md:text-sm">{formatReminderDateTime()}</p>
                          </div>
                        </div>

                        {/* Type */}
                        <div className="flex items-start gap-2 p-2 md:p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                          <Bell className="w-4 h-4 md:w-5 md:h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-purple-300 font-medium mb-1 text-xs md:text-sm">Type</p>
                            <p className="text-white capitalize text-xs md:text-sm">{reminder.reminder_type.replace('_', ' ')}</p>
                          </div>
                        </div>

                        {/* Created Date */}
                        <div className="flex items-start gap-2 p-2 md:p-3 bg-gray-500/10 rounded-lg border border-gray-500/20">
                          <Clock className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-gray-300 font-medium mb-1 text-xs md:text-sm">Created</p>
                            <p className="text-white text-xs md:text-sm">
                              {new Date(reminder.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })} at {new Date(reminder.created_at).toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Created By */}
                        {fullReminder?.username && (
                          <div className="flex items-start gap-2 p-2 md:p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                            <Bell className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-emerald-300 font-medium mb-1 text-xs md:text-sm">Created By</p>
                              <p className="text-white text-xs md:text-sm">{fullReminder.username || fullReminder.user_name}</p>
                            </div>
                          </div>
                        )}

                        {/* Completed Date */}
                        {reminder.completed_at && (
                          <div className="flex items-start gap-2 p-2 md:p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-green-300 font-medium mb-1 text-xs md:text-sm">Completed</p>
                              <p className="text-white text-xs md:text-sm">
                                {new Date(reminder.completed_at).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })} at {new Date(reminder.completed_at).toLocaleTimeString('en-US', { 
                                  hour: 'numeric', 
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons - Desktop: Side, Mobile: Bottom */}
                  <div className="flex md:flex-col gap-2 w-full md:w-auto md:flex-shrink-0 mt-3 md:mt-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        if (fullReminder) {
                          setEditingReminder(fullReminder);
                        }
                      }}
                      className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-white/10 hover:bg-white/20 border border-blue-500/30 hover:border-blue-500/50 text-blue-300 hover:text-blue-200 rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2 md:min-w-[120px] backdrop-blur-sm"
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    {reminder.completed ? (
                      <button
                        onClick={() => handleCompleteReminder(reminder.id, reminder.lead_id)}
                        className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-white/10 hover:bg-white/20 border border-blue-500/30 hover:border-blue-500/50 text-blue-300 hover:text-blue-200 rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2 md:min-w-[120px] backdrop-blur-sm"
                      >
                        <Clock className="w-4 h-4" />
                        <span className="hidden sm:inline">Reopen</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCompleteReminder(reminder.id, reminder.lead_id)}
                        className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-white/10 hover:bg-white/20 border border-green-500/30 hover:border-green-500/50 text-green-300 hover:text-green-200 rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2 md:min-w-[120px] backdrop-blur-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Complete</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteReminder(reminder.id, reminder.lead_id)}
                      className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-white/10 hover:bg-white/20 border border-red-500/30 hover:border-red-500/50 text-red-300 hover:text-red-200 rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2 md:min-w-[120px] backdrop-blur-sm"
                    >
                      <Bell className="w-4 h-4" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
              </div>
            </>
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

    {/* Edit Reminder Modal */}
    {editingReminder && (
      <EditReminderModal
        isOpen={!!editingReminder}
        onClose={() => {
          setEditingReminder(null);
          // Refresh reminders after edit
          if (selectedCalendarUserId) {
            fetchRemindersForCalendar(selectedCalendarUserId);
          } else {
            fetchReminders();
          }
        }}
        reminder={editingReminder}
      />
    )}
    </>
  );
}
