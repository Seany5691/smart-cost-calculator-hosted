'use client';

/**
 * Callback Calendar Component
 * 
 * Displays a monthly calendar highlighting dates with reminders
 * 
 * Requirements: 33.1-33.20
 */

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, User, MapPin, Phone, Clock, Plus, Calendar as CalendarIcon, Edit2, Trash2 } from 'lucide-react';
import type { LeadReminder, Lead } from '@/lib/leads/types';
import { getReminderTypeIcon, getReminderTypeLabel, getReminderPriorityLabel, formatReminderTime } from '@/lib/leads/types';
import ShareCalendarModal from '@/components/leads/ShareCalendarModal';
import AddCalendarEventModal from '@/components/leads/AddCalendarEventModal';
import EditCalendarEventModal from '@/components/leads/EditCalendarEventModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast/useToast';

interface CallbackCalendarProps {
  reminders: LeadReminder[];
  leads: Lead[];
  onLeadClick: (leadId: string) => void;
  onCalendarChange?: (userId: string | null, ownerName: string | null) => void;
}

interface CalendarDate {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  reminders: LeadReminder[];
  events: CalendarEvent[];
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

export default function CallbackCalendar({ reminders, leads, onLeadClick, onCalendarChange }: CallbackCalendarProps) {
  const [mounted, setMounted] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
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
  const [canAddToSelectedCalendar, setCanAddToSelectedCalendar] = useState(true); // Default true for own calendar
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    fetchSharedCalendars();
    return () => setMounted(false);
  }, []);

  // Update add permission when selected calendar changes
  useEffect(() => {
    if (!selectedCalendarUserId) {
      // Viewing own calendar - can always add
      setCanAddToSelectedCalendar(true);
      if (onCalendarChange) {
        onCalendarChange(null, null);
      }
    } else {
      // Viewing shared calendar - check permission
      const sharedCal = sharedCalendars.find(cal => cal.owner_user_id === selectedCalendarUserId);
      setCanAddToSelectedCalendar(sharedCal?.can_add_events || false);
      if (onCalendarChange) {
        const ownerName = sharedCal?.owner_name || sharedCal?.owner_username || 'Unknown';
        onCalendarChange(selectedCalendarUserId, ownerName);
      }
    }
  }, [selectedCalendarUserId, sharedCalendars, onCalendarChange]);

  // Fetch calendars shared with me
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
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSharedCalendars(data.shared_calendars || []);
      }
    } catch (err) {
      console.error('Error fetching shared calendars:', err);
    }
  };

  // Fetch calendar events
  useEffect(() => {
    fetchCalendarEvents();
  }, [currentMonth, selectedCalendarUserId]); // Re-fetch when calendar selection changes

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

      // Get first and last day of current month
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];

      // Build URL with optional user_id filter for viewing shared calendars
      let url = `/api/calendar/events?start_date=${startDate}&end_date=${endDate}`;
      if (selectedCalendarUserId) {
        url += `&user_id=${selectedCalendarUserId}`;
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
    } finally {
      setLoadingEvents(false);
    }
  };

  // Delete calendar event
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

      if (!authToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/calendar/events/${eventToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        await fetchCalendarEvents(); // Refresh calendar
        handleClosePopover();
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

  // Get lead data for a reminder
  const getLeadData = (leadId: string) => {
    return leads.find(l => l.id === leadId);
  };

  // Day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate calendar dates for current month
  const calendarDates = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const lastDate = lastDay.getDate();
    
    // Previous month's last days
    const prevMonthLastDay = new Date(year, month, 0);
    const prevMonthLastDate = prevMonthLastDay.getDate();
    
    const dates: CalendarDate[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Add previous month's trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDate - i);
      dates.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        reminders: [],
        events: []
      });
    }
    
    // Add current month's days
    for (let day = 1; day <= lastDate; day++) {
      const date = new Date(year, month, day);
      // FIX: Create date string without timezone conversion
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = date.getTime() === today.getTime();
      
      // FIX #6: Find reminders on this date - ensure proper date comparison
      // FILTER BY SELECTED CALENDAR: Only show reminders for the selected calendar owner
      const dateReminders = reminders.filter(reminder => {
        if (!reminder.reminder_date) return false;
        // Parse the reminder date properly to avoid timezone issues
        const reminderDateStr = reminder.reminder_date.split('T')[0];
        if (reminderDateStr !== dateStr) return false;
        
        // Filter by calendar selection
        if (selectedCalendarUserId) {
          // Viewing shared calendar - only show that user's reminders
          return reminder.user_id === selectedCalendarUserId;
        } else {
          // Viewing own calendar - only show own reminders
          // Assuming reminders passed in are already filtered to current user
          return true;
        }
      });

      // Find calendar events on this date
      const dateEvents = calendarEvents.filter(event => {
        if (!event.event_date) return false;
        const eventDateStr = event.event_date.split('T')[0];
        return eventDateStr === dateStr;
      });
      
      dates.push({
        date,
        isCurrentMonth: true,
        isToday,
        reminders: dateReminders,
        events: dateEvents
      });
    }
    
    // Add next month's leading days to complete the grid (6 rows x 7 days = 42 cells)
    const remainingCells = 42 - dates.length;
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(year, month + 1, day);
      dates.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        reminders: [],
        events: []
      });
    }
    
    return dates;
  }, [currentMonth, reminders, calendarEvents, selectedCalendarUserId]);

  // Navigate to previous month
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  // Navigate to next month
  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Handle date click
  const handleDateClick = (calendarDate: CalendarDate) => {
    if (calendarDate.reminders.length > 0 || calendarDate.events.length > 0) {
      setSelectedDate(calendarDate.date);
      setShowPopover(true);
    }
  };

  // Close popover
  const handleClosePopover = () => {
    setShowPopover(false);
    setSelectedDate(null);
  };

  // Get reminders for selected date
  const selectedDateReminders = useMemo(() => {
    if (!selectedDate) return [];
    // FIX: Create date string without timezone conversion
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const day = selectedDate.getDate();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return reminders.filter(reminder => {
      if (!reminder.reminder_date) return false;
      const reminderDateStr = reminder.reminder_date.split('T')[0];
      if (reminderDateStr !== dateStr) return false;
      
      // Filter by calendar selection
      if (selectedCalendarUserId) {
        // Viewing shared calendar - only show that user's reminders
        return reminder.user_id === selectedCalendarUserId;
      } else {
        // Viewing own calendar - only show own reminders
        return true;
      }
    });
  }, [selectedDate, reminders, selectedCalendarUserId]);

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    // FIX: Create date string without timezone conversion
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const day = selectedDate.getDate();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return calendarEvents.filter(event => {
      if (!event.event_date) return false;
      const eventDateStr = event.event_date.split('T')[0];
      return eventDateStr === dateStr;
    });
  }, [selectedDate, calendarEvents]);

  // Get color for date based on reminder/event status
  const getDateIndicators = (calendarDate: CalendarDate) => {
    const hasItems = calendarDate.reminders.length > 0 || calendarDate.events.length > 0;
    if (!hasItems) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateTime = calendarDate.date.getTime();
    const todayTime = today.getTime();
    
    // Determine status color
    let statusColor = '';
    if (dateTime < todayTime) {
      statusColor = 'bg-red-500';
    } else if (dateTime === todayTime) {
      statusColor = 'bg-blue-500';
    } else {
      statusColor = 'bg-green-500';
    }
    
    return {
      statusColor,
      reminderCount: calendarDate.reminders.length,
      eventCount: calendarDate.events.length,
      totalCount: calendarDate.reminders.length + calendarDate.events.length
    };
  };

  return (
    <div className="relative">
      {/* Redesigned Header with Glassmorphic Styling */}
      <div className="space-y-3 mb-4">
        {/* Calendar Selector - Top (if shared calendars exist) */}
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
        
        {/* Month Navigation - Middle */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-emerald-300" />
          </button>
          
          <h3 className="text-lg font-semibold text-white">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-emerald-300" />
          </button>
        </div>
        
        {/* Action Buttons - Bottom (Glassmorphic) */}
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

      {/* Day names row */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div
            key={day}
            className="text-center text-xs sm:text-sm font-semibold text-emerald-200 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid (6 rows x 7 columns) - scrollable on mobile */}
      <div className="overflow-x-auto -mx-2 px-2 lg:mx-0 lg:px-0">
        <div className="grid grid-cols-7 gap-1 min-w-[280px]">
          {calendarDates.map((calendarDate, index) => {
            const hasItems = calendarDate.reminders.length > 0 || calendarDate.events.length > 0;
            const indicators = getDateIndicators(calendarDate);
            
            return (
              <button
                key={index}
                onClick={() => handleDateClick(calendarDate)}
                disabled={!hasItems}
                className={`
                  relative aspect-square p-1 sm:p-2 rounded-lg text-xs sm:text-sm
                  transition-all duration-200 min-w-[44px] min-h-[44px]
                  ${calendarDate.isCurrentMonth ? 'text-white' : 'text-emerald-400/50'}
                  ${calendarDate.isToday ? 'ring-2 ring-emerald-400' : ''}
                  ${hasItems ? 'bg-white/5 hover:bg-white/10 cursor-pointer border border-emerald-500/20 hover:border-emerald-500/40' : 'hover:bg-white/5'}
                  ${!hasItems && !calendarDate.isCurrentMonth ? 'opacity-50' : ''}
                `}
                title={hasItems ? `${indicators?.totalCount} item(s)` : ''}
              >
                <div className="flex flex-col items-center justify-center h-full relative">
                  {/* Date Number - Always visible */}
                  <span className="font-semibold text-base">{calendarDate.date.getDate()}</span>
                  
                  {/* Indicators */}
                  {indicators && (
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                      {/* Status indicator dot */}
                      <div className={`w-1.5 h-1.5 rounded-full ${indicators.statusColor}`} />
                      
                      {/* Event indicator (if has events) */}
                      {indicators.eventCount > 0 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      )}
                      
                      {/* Reminder indicator (if has reminders) */}
                      {indicators.reminderCount > 0 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                      )}
                    </div>
                  )}
                  
                  {/* Count badge for multiple items */}
                  {indicators && indicators.totalCount > 1 && (
                    <div className="absolute top-0.5 right-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {indicators.totalCount}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Popover with reminder details */}
      {showPopover && selectedDate && mounted && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden border border-emerald-500/30">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
              <h3 className="text-lg font-semibold text-white">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
              <button
                onClick={handleClosePopover}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-emerald-200" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar space-y-4">
              {/* Calendar Events Section */}
              {selectedDateEvents.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-emerald-300 mb-3 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Calendar Events ({selectedDateEvents.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedDateEvents.map(event => {
                      const eventTypeIcons: Record<string, string> = {
                        event: '📅',
                        appointment: '🗓️',
                        meeting: '🤝',
                        deadline: '⏰',
                        reminder: '🔔',
                        other: '📌'
                      };

                      return (
                        <div
                          key={event.id}
                          className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg"
                        >
                          {/* Type and Priority */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl" title={event.event_type}>
                              {eventTypeIcons[event.event_type] || '📅'}
                            </span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              event.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                              event.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {event.priority.toUpperCase()}
                            </span>
                            {!event.is_owner && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                                Shared
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <div className="font-semibold text-white mb-2">
                            {event.title}
                          </div>

                          {/* Description */}
                          {event.description && (
                            <p className="text-sm text-emerald-200 mb-2">
                              {event.description}
                            </p>
                          )}

                          {/* Time and Location */}
                          <div className="space-y-1 text-sm text-emerald-300 mb-3">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5" />
                              <span>
                                {event.is_all_day ? 'All day' : 
                                  event.event_time ? new Date(`2000-01-01T${event.event_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 
                                  'No time set'}
                              </span>
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>{event.location}</span>
                              </div>
                            )}
                            {event.creator_username && (
                              <div className="flex items-center gap-2 text-xs text-emerald-400">
                                <User className="w-3.5 h-3.5" />
                                <span>Created by {event.creator_username}</span>
                              </div>
                            )}
                          </div>

                          {/* Edit/Delete Buttons - Show if user is owner OR has edit permission */}
                          {(event.is_owner || event.can_edit) && (
                            <div className="flex items-center gap-2 pt-2 border-t border-blue-500/20">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvent(event);
                                  setShowEditEventModal(true);
                                }}
                                className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/15 border border-emerald-500/30 rounded-lg text-white text-sm transition-colors flex items-center justify-center gap-2"
                                title="Edit event"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEvent(event.id);
                                }}
                                disabled={deletingEventId === event.id}
                                className="flex-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                title="Delete event"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{deletingEventId === event.id ? 'Deleting...' : 'Delete'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reminders Section */}
              {selectedDateReminders.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-emerald-300 mb-3">
                    Lead Reminders ({selectedDateReminders.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedDateReminders.map(reminder => {
                const leadData = getLeadData(reminder.lead_id || '');
                const isCompleted = reminder.completed || reminder.status === 'completed';
                
                return (
                  <button
                    key={reminder.id}
                    onClick={() => {
                      if (reminder.lead_id) {
                        onLeadClick(reminder.lead_id);
                      }
                      handleClosePopover();
                    }}
                    className="w-full text-left p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    {/* Type and Priority */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl" title={getReminderTypeLabel(reminder.reminder_type)}>
                        {getReminderTypeIcon(reminder.reminder_type)}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
                        {getReminderPriorityLabel(reminder.priority)}
                      </span>
                      {isCompleted && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                          ✅ Completed
                        </span>
                      )}
                      {reminder.username && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                          👤 {reminder.username || reminder.user_name}
                        </span>
                      )}
                    </div>

                    {/* Message */}
                    <div className={`font-semibold text-white mb-2 ${isCompleted ? 'line-through opacity-60' : ''}`}>
                      {reminder.message || reminder.title || reminder.description || 'No message'}
                    </div>

                    {/* Lead Details */}
                    {leadData && (
                      <div className="space-y-1 text-sm text-emerald-200">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5" />
                          <span className="font-medium">{leadData.name}</span>
                        </div>
                        {leadData.contact_person && (
                          <div className="flex items-center gap-2 text-emerald-300">
                            <span className="text-xs">Contact:</span>
                            <span>{leadData.contact_person}</span>
                          </div>
                        )}
                        {leadData.town && (
                          <div className="flex items-center gap-2 text-emerald-300">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{leadData.town}</span>
                          </div>
                        )}
                        {leadData.phone && (
                          <div className="flex items-center gap-2 text-emerald-300">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{leadData.phone}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Time */}
                    <div className="flex items-center gap-2 mt-2 text-xs text-emerald-300">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatReminderTime(reminder.reminder_time || null, reminder.is_all_day)}</span>
                    </div>
                  </button>
                );
              })}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {selectedDateReminders.length === 0 && selectedDateEvents.length === 0 && (
                <div className="text-center py-8 text-emerald-300/70">
                  No reminders or events for this date
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Legend */}
      <div className="mt-4 space-y-2">
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

      {/* Share Calendar Modal */}
      <ShareCalendarModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onSuccess={() => {
          // Refresh shared calendars list
          fetchSharedCalendars();
        }}
      />

      {/* Add Calendar Event Modal */}
      <AddCalendarEventModal
        isOpen={showAddEventModal}
        onClose={() => setShowAddEventModal(false)}
        preselectedDate={selectedDateForEvent}
        onSuccess={() => {
          // Refresh calendar events
          fetchCalendarEvents();
        }}
      />

      {/* Edit Calendar Event Modal */}
      <EditCalendarEventModal
        isOpen={showEditEventModal}
        onClose={() => {
          setShowEditEventModal(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        onSuccess={() => {
          // Refresh calendar events
          fetchCalendarEvents();
          handleClosePopover();
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
