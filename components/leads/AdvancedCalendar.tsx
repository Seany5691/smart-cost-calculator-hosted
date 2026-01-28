'use client';

/**
 * Advanced Calendar Component for Reminders Tab
 * 
 * Features:
 * - Month, Week, and Day views
 * - Shows reminders and calendar events
 * - More detailed than dashboard calendar
 * - Full list view in week/day modes
 */

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  ChevronLeft, ChevronRight, X, User, MapPin, Phone, Clock, Plus, 
  Calendar as CalendarIcon, Edit2, Trash2, List, Grid3x3, Columns 
} from 'lucide-react';
import type { LeadReminder, Lead } from '@/lib/leads/types';
import { 
  getReminderTypeIcon, getReminderTypeLabel, getReminderPriorityLabel, 
  formatReminderTime, getReminderPriorityColor 
} from '@/lib/leads/types';
import ShareCalendarModal from '@/components/leads/ShareCalendarModal';
import AddCalendarEventModal from '@/components/leads/AddCalendarEventModal';
import EditCalendarEventModal from '@/components/leads/EditCalendarEventModal';
import MonthView from '@/components/leads/calendar/MonthView';
import WeekView from '@/components/leads/calendar/WeekView';
import DayView from '@/components/leads/calendar/DayView';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast/useToast';

type ViewMode = 'month' | 'week' | 'day';

interface AdvancedCalendarProps {
  reminders: LeadReminder[];
  leads: Lead[];
  onLeadClick: (leadId: string) => void;
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
  can_edit?: boolean;
  can_add?: boolean;
}

export default function AdvancedCalendar({ reminders, leads, onLeadClick }: AdvancedCalendarProps) {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [selectedDateForEvent, setSelectedDateForEvent] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [sharedCalendars, setSharedCalendars] = useState<any[]>([]);
  const [selectedCalendarUserId, setSelectedCalendarUserId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [canAddToSelectedCalendar, setCanAddToSelectedCalendar] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    fetchSharedCalendars();
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!selectedCalendarUserId) {
      setCanAddToSelectedCalendar(true);
    } else {
      const sharedCal = sharedCalendars.find(cal => cal.owner_user_id === selectedCalendarUserId);
      setCanAddToSelectedCalendar(sharedCal?.can_add_events || false);
    }
  }, [selectedCalendarUserId, sharedCalendars]);

  useEffect(() => {
    fetchCalendarEvents();
  }, [currentDate, selectedCalendarUserId, viewMode]);

  const fetchSharedCalendars = async () => {
    try {
      const token = localStorage.getItem('auth-storage');
      let authToken = null;
      if (token) {
        const data = JSON.parse(token);
        authToken = data.state?.token || data.token;
      }
      if (!authToken) return;

      const response = await fetch('/api/calendar/shared-with-me', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSharedCalendars(data.shared_calendars || []);
      }
    } catch (err) {
      console.error('Error fetching shared calendars:', err);
    }
  };

  const fetchCalendarEvents = async () => {
    setLoadingEvents(true);
    try {
      const token = localStorage.getItem('auth-storage');
      let authToken = null;
      if (token) {
        const data = JSON.parse(token);
        authToken = data.state?.token || data.token;
      }
      if (!authToken) return;

      // Get date range based on view mode
      let startDate, endDate;
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const day = currentDate.getDate();

      if (viewMode === 'month') {
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0);
      } else if (viewMode === 'week') {
        const dayOfWeek = currentDate.getDay();
        startDate = new Date(year, month, day - dayOfWeek);
        endDate = new Date(year, month, day + (6 - dayOfWeek));
      } else { // day
        startDate = new Date(year, month, day);
        endDate = new Date(year, month, day);
      }

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      let url = `/api/calendar/events?start_date=${startDateStr}&end_date=${endDateStr}`;
      if (selectedCalendarUserId) {
        url += `&user_id=${selectedCalendarUserId}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCalendarEvents(data.events || []);
      }
    } catch (err) {
      console.error('Error fetching calendar events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    setEventToDelete(eventId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    
    setDeletingEventId(eventToDelete);
    try {
      const token = localStorage.getItem('auth-storage');
      let authToken = null;
      if (token) {
        const data = JSON.parse(token);
        authToken = data.state?.token || data.token;
      }
      if (!authToken) throw new Error('Not authenticated');

      const response = await fetch(`/api/calendar/events/${eventToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        await fetchCalendarEvents();
        setShowPopover(false);
        toast.success('Event deleted successfully', {
          section: 'leads'
        });
      } else {
        throw new Error('Failed to delete event');
      }
    } catch (err) {
      console.error('Error deleting event:', err);
      toast.error('Failed to delete event', {
        message: 'Please try again',
        section: 'leads'
      });
    } finally {
      setDeletingEventId(null);
      setEventToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const getLeadData = (leadId: string) => {
    return leads.find(l => l.id === leadId);
  };

  // Navigation functions
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000));
    } else {
      setCurrentDate(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000));
    } else {
      setCurrentDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Get items for a specific date
  const getItemsForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    const dateReminders = reminders.filter(reminder => {
      if (!reminder.reminder_date) return false;
      const reminderDateStr = reminder.reminder_date.split('T')[0];
      return reminderDateStr === dateStr;
    });

    const dateEvents = calendarEvents.filter(event => {
      if (!event.event_date) return false;
      const eventDateStr = event.event_date.split('T')[0];
      return eventDateStr === dateStr;
    });

    return { reminders: dateReminders, events: dateEvents };
  };

  // Get formatted date range for header
  const getDateRangeText = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const dayOfWeek = currentDate.getDay();
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - dayOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  return (
    <div className="relative">
      {/* Header */}
      <div className="space-y-4 mb-6">
        {/* Calendar Selector */}
        {sharedCalendars.length > 0 && (
          <div className="flex justify-center">
            <select
              value={selectedCalendarUserId || ''}
              onChange={(e) => setSelectedCalendarUserId(e.target.value || null)}
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
        )}

        {/* View Mode Selector and Navigation */}
        <div className="flex items-center justify-between gap-4">
          {/* View Mode Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                viewMode === 'month'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                  : 'bg-white/10 text-emerald-200 hover:bg-white/20'
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                viewMode === 'week'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                  : 'bg-white/10 text-emerald-200 hover:bg-white/20'
              }`}
            >
              <Columns className="w-4 h-4" />
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                viewMode === 'day'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                  : 'bg-white/10 text-emerald-200 hover:bg-white/20'
              }`}
            >
              <List className="w-4 h-4" />
              Day
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5 text-emerald-300" />
            </button>
            
            <button
              onClick={handleToday}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-emerald-500/30 rounded-lg text-white text-sm transition-colors"
            >
              Today
            </button>
            
            <button
              onClick={handleNext}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5 text-emerald-300" />
            </button>
          </div>
        </div>

        {/* Date Range Display */}
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white">
            {getDateRangeText()}
          </h3>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => {
              setSelectedDateForEvent(undefined);
              setShowAddEventModal(true);
            }}
            disabled={!canAddToSelectedCalendar}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-emerald-500/30 rounded-lg text-white text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={canAddToSelectedCalendar ? "Add a calendar event" : "You don't have permission to add events to this calendar"}
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
          
          <button
            onClick={() => setShowShareModal(true)}
            disabled={selectedCalendarUserId !== null}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-emerald-500/30 rounded-lg text-white text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={selectedCalendarUserId ? "Can only share your own calendar" : "Share your calendar with other users"}
          >
            <User className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Calendar Views */}
      {loadingEvents ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          <span className="ml-3 text-emerald-300">Loading...</span>
        </div>
      ) : (
        <div>
          {viewMode === 'month' && (
            <MonthView
              currentDate={currentDate}
              reminders={reminders}
              events={calendarEvents}
              onDateClick={(date) => {
                setSelectedDate(date);
                setShowPopover(true);
              }}
            />
          )}
          
          {viewMode === 'week' && (
            <WeekView
              currentDate={currentDate}
              reminders={reminders}
              events={calendarEvents}
              leads={leads}
              onLeadClick={onLeadClick}
              onEventClick={(event) => {
                setSelectedEvent(event);
                setShowEditEventModal(true);
              }}
            />
          )}
          
          {viewMode === 'day' && (
            <DayView
              currentDate={currentDate}
              reminders={reminders}
              events={calendarEvents}
              leads={leads}
              onLeadClick={onLeadClick}
              onEventEdit={(event) => {
                setSelectedEvent(event);
                setShowEditEventModal(true);
              }}
              onEventDelete={handleDeleteEvent}
              deletingEventId={deletingEventId}
            />
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-center gap-4 text-xs text-emerald-200">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Past</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Today</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Future</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 text-xs text-emerald-200">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span>Events</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span>Reminders</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ShareCalendarModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onSuccess={() => fetchSharedCalendars()}
      />

      <AddCalendarEventModal
        isOpen={showAddEventModal}
        onClose={() => setShowAddEventModal(false)}
        preselectedDate={selectedDateForEvent}
        onSuccess={() => fetchCalendarEvents()}
      />

      <EditCalendarEventModal
        isOpen={showEditEventModal}
        onClose={() => {
          setShowEditEventModal(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        onSuccess={() => {
          fetchCalendarEvents();
          setShowPopover(false);
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setEventToDelete(null);
        }}
        onConfirm={confirmDeleteEvent}
        title="Delete Calendar Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
