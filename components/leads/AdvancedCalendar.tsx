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
  onReminderUpdate?: () => void;
  selectedCalendarUserId?: string | null;
  hideCalendarSelector?: boolean;
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

export default function AdvancedCalendar({ reminders, leads, onLeadClick, onReminderUpdate, selectedCalendarUserId: externalSelectedCalendarUserId, hideCalendarSelector = false }: AdvancedCalendarProps) {
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
  const [internalSelectedCalendarUserId, setInternalSelectedCalendarUserId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [canAddToSelectedCalendar, setCanAddToSelectedCalendar] = useState(true);
  const { toast } = useToast();

  // Use external selectedCalendarUserId if provided, otherwise use internal state
  const selectedCalendarUserId = externalSelectedCalendarUserId !== undefined 
    ? externalSelectedCalendarUserId 
    : internalSelectedCalendarUserId;

  // Helper function to parse date strings in LOCAL timezone (not UTC)
  const parseLocalDate = (dateStr: string): Date => {
    const dateOnly = dateStr.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Get lead data for a reminder
  const getLeadData = (leadId: string) => {
    return leads.find(l => l.id === leadId);
  };

  // Get items for a specific date
  const getItemsForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // Filter reminders by date AND calendar selection
    const dateReminders = reminders.filter(r => {
      if (!r.reminder_date) return false;
      if (r.reminder_date.split('T')[0] !== dateStr) return false;
      
      // Filter by calendar selection
      if (selectedCalendarUserId) {
        // Viewing shared calendar - only show that user's reminders
        return r.user_id === selectedCalendarUserId;
      } else {
        // Viewing own calendar - only show own reminders
        return true;
      }
    });

    const dateEvents = calendarEvents.filter(e => {
      if (!e.event_date) return false;
      return e.event_date.split('T')[0] === dateStr;
    });

    return { reminders: dateReminders, events: dateEvents };
  };

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
        {/* Calendar Selector - Only show if not hidden by parent */}
        {!hideCalendarSelector && sharedCalendars.length > 0 && (
          <div className="flex justify-center">
            <select
              value={selectedCalendarUserId || ''}
              onChange={(e) => setInternalSelectedCalendarUserId(e.target.value || null)}
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
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-4">
          {/* View Mode Buttons - Mobile Optimized */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <button
              onClick={() => setViewMode('month')}
              className={`flex-1 md:flex-none px-2 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 ${
                viewMode === 'month'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                  : 'bg-white/10 text-emerald-200 hover:bg-white/20'
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
              <span className="text-[10px] md:text-sm">Month</span>
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex-1 md:flex-none px-2 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 ${
                viewMode === 'week'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                  : 'bg-white/10 text-emerald-200 hover:bg-white/20'
              }`}
            >
              <Columns className="w-4 h-4" />
              <span className="text-[10px] md:text-sm">Week</span>
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`flex-1 md:flex-none px-2 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 ${
                viewMode === 'day'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                  : 'bg-white/10 text-emerald-200 hover:bg-white/20'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="text-[10px] md:text-sm">Day</span>
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-2">
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
          <h3 className="text-lg md:text-xl font-semibold text-white">
            {getDateRangeText()}
          </h3>
        </div>

        {/* Action Buttons - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2">
          <button
            onClick={() => {
              setSelectedDateForEvent(undefined);
              setShowAddEventModal(true);
            }}
            disabled={!canAddToSelectedCalendar}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-emerald-500/30 rounded-lg text-white text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={canAddToSelectedCalendar ? "Add a calendar event" : "You don't have permission to add events to this calendar"}
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
          
          <button
            onClick={() => setShowShareModal(true)}
            disabled={selectedCalendarUserId !== null}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-emerald-500/30 rounded-lg text-white text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
              onDateClick={(date) => {
                setSelectedDate(date);
                setShowPopover(true);
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

      {/* Date Details Popover (Month View Only) */}
      {mounted && showPopover && selectedDate && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={() => setShowPopover(false)}
        >
          <div 
            className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-emerald-500/30"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </h3>
                <p className="text-sm text-emerald-200 mt-1">
                  {getItemsForDate(selectedDate).reminders.length} reminder(s), {getItemsForDate(selectedDate).events.length} event(s)
                </p>
              </div>
              <button
                onClick={() => setShowPopover(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-emerald-200" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)] custom-scrollbar">
              <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: rgba(255, 255, 255, 0.05);
                  border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: rgba(16, 185, 129, 0.3);
                  border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: rgba(16, 185, 129, 0.5);
                }
              `}</style>

              {/* Calendar Events */}
              {getItemsForDate(selectedDate).events.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-blue-400" />
                    Calendar Events
                  </h4>
                  <div className="space-y-3">
                    {getItemsForDate(selectedDate).events.map((event) => (
                      <div
                        key={event.id}
                        className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-semibold text-white mb-1">{event.title}</h5>
                            {event.description && (
                              <p className="text-sm text-blue-200 mb-2">{event.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-blue-300">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {event.is_all_day ? 'All Day' : event.event_time || 'No time'}
                              </span>
                              {event.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {event.location}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {event.creator_username}
                              </span>
                            </div>
                          </div>
                          {event.can_edit && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setSelectedEvent(event);
                                  setShowEditEventModal(true);
                                }}
                                className="p-2 text-blue-300 hover:bg-blue-500/20 rounded-lg transition-colors"
                                title="Edit event"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteEvent(event.id)}
                                disabled={deletingEventId === event.id}
                                className="p-2 text-red-300 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                                title="Delete event"
                              >
                                {deletingEventId === event.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-300 border-t-transparent" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reminders */}
              {getItemsForDate(selectedDate).reminders.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-400" />
                    Reminders
                  </h4>
                  <div className="space-y-3">
                    {getItemsForDate(selectedDate).reminders.map((reminder) => {
                      const lead = reminder.lead_id ? getLeadData(reminder.lead_id) : null;
                      const reminderIcon = getReminderTypeIcon(reminder.reminder_type);
                      const priorityColor = getReminderPriorityColor(reminder.priority);
                      
                      return (
                        <div
                          key={reminder.id}
                          className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/20 transition-colors cursor-pointer"
                          onClick={() => reminder.lead_id && onLeadClick(reminder.lead_id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${priorityColor.replace('text-', 'bg-')}/20 text-xl`}>
                              {reminderIcon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-semibold text-white mb-1">{reminder.title}</h5>
                              {lead && (
                                <p className="text-sm text-yellow-200 mb-2 flex items-center gap-2">
                                  <User className="w-3 h-3" />
                                  {lead.name}
                                </p>
                              )}
                              {reminder.description && (
                                <p className="text-sm text-yellow-200 mb-2">{reminder.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-3 text-xs text-yellow-300">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatReminderTime(reminder.reminder_time, reminder.is_all_day)}
                                </span>
                                <span className="px-2 py-0.5 bg-yellow-500/20 rounded">
                                  {getReminderTypeLabel(reminder.reminder_type)}
                                </span>
                                <span className={`px-2 py-0.5 rounded ${priorityColor.replace('text-', 'bg-')}/20 ${priorityColor}`}>
                                  {getReminderPriorityLabel(reminder.priority)}
                                </span>
                                {reminder.username && (
                                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                                    👤 {reminder.username || reminder.user_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {getItemsForDate(selectedDate).reminders.length === 0 && 
               getItemsForDate(selectedDate).events.length === 0 && (
                <div className="text-center py-12">
                  <CalendarIcon className="w-12 h-12 text-emerald-400/50 mx-auto mb-3" />
                  <p className="text-emerald-200">No reminders or events for this date</p>
                  <button
                    onClick={() => {
                      setSelectedDateForEvent(selectedDate);
                      setShowPopover(false);
                      setShowAddEventModal(true);
                    }}
                    className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Event
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

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
