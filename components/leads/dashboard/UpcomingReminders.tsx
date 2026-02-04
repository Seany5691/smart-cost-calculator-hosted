'use client';

/**
 * Upcoming Reminders Component
 * 
 * Displays upcoming reminders for selected time range
 * 
 * Requirements: 34.1-34.20
 */

import { useState, useMemo } from 'react';
import { Clock, CheckCircle, AlertCircle, ChevronRight, User, MapPin, Phone, Square, CheckSquare } from 'lucide-react';
import type { LeadReminder, Lead, ReminderPriority } from '@/lib/leads/types';
import { getReminderTypeIcon, getReminderTypeLabel, getReminderPriorityColor, getReminderPriorityLabel, formatReminderTime } from '@/lib/leads/types';

interface UpcomingRemindersProps {
  reminders: LeadReminder[];
  leads: Lead[];
  onLeadClick: (leadId: string) => void;
  onReminderUpdate?: () => void;
  calendarEvents?: CalendarEvent[];
  selectedCalendarUserId?: string | null;
  selectedCalendarOwnerName?: string | null;
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

interface GroupedCalendarEvent extends CalendarEvent {
  end_date?: string; // For multi-day events
  event_ids?: string[]; // IDs of all events in the group
}

type TimeRange = 'all' | 'today' | 'tomorrow' | 'week' | 'next7';

export default function UpcomingReminders({ reminders, leads, onLeadClick, onReminderUpdate, calendarEvents = [], selectedCalendarUserId, selectedCalendarOwnerName }: UpcomingRemindersProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('all');
  const [updatingReminders, setUpdatingReminders] = useState<Set<string>>(new Set());

  // Helper function to parse date strings in LOCAL timezone (not UTC)
  // This prevents timezone conversion issues where "2026-02-04" becomes "2026-02-04 02:00 SAST"
  const parseLocalDate = (dateStr: string): Date => {
    const dateOnly = dateStr.split('T')[0]; // Get just the date part
    const [year, month, day] = dateOnly.split('-').map(Number);
    // Create date in local timezone (month is 0-indexed)
    return new Date(year, month - 1, day);
  };

  // Helper function to format date in local timezone
  const formatLocalDate = (dateStr: string): string => {
    const date = parseLocalDate(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Extended type for reminders with joined lead data
  type ReminderWithLeadData = LeadReminder & {
    lead_name?: string;
    lead_contact_person?: string;
    lead_town?: string;
    lead_phone?: string;
  };

  // Get lead data for a reminder
  const getLeadData = (reminder: LeadReminder) => {
    const reminderWithData = reminder as ReminderWithLeadData;
    
    // First check if lead data is already in the reminder object (from API)
    if (reminderWithData.lead_name) {
      return {
        name: reminderWithData.lead_name,
        contact_person: reminderWithData.lead_contact_person,
        town: reminderWithData.lead_town,
        phone: reminderWithData.lead_phone
      };
    }
    
    // Fallback to leads array
    if (!reminder.lead_id) return undefined;
    return leads.find(l => l.id === reminder.lead_id);
  };

  // Filter and sort reminders AND events based on selected time range
  // FIX #5: "This Week" vs "7 Days" logic
  const filteredItems = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // "This Week" = Remaining days in current week (today through Sunday)
    const currentDayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    const daysUntilSunday = 7 - currentDayOfWeek; // Days remaining in week including today
    const thisWeekEnd = new Date(today);
    thisWeekEnd.setDate(thisWeekEnd.getDate() + daysUntilSunday);
    
    // "7 Days" = Next consecutive 7 days from today
    const next7DaysEnd = new Date(today);
    next7DaysEnd.setDate(next7DaysEnd.getDate() + 7);
    
    // Filter reminders using local date parsing
    let filteredReminders = reminders.filter(reminder => {
      if (selectedRange === 'all') return true;
      
      // Parse reminder date in LOCAL timezone
      const reminderDate = parseLocalDate(reminder.reminder_date);
      const reminderDateTime = new Date(
        reminderDate.getFullYear(),
        reminderDate.getMonth(),
        reminderDate.getDate()
      );
      
      switch (selectedRange) {
        case 'today':
          return reminderDateTime.getTime() === today.getTime();
        case 'tomorrow':
          return reminderDateTime.getTime() === tomorrow.getTime();
        case 'week':
          return reminderDateTime >= today && reminderDateTime < thisWeekEnd;
        case 'next7':
          return reminderDateTime >= today && reminderDateTime < next7DaysEnd;
        default:
          return true;
      }
    });

    // Group multi-day events and filter out past events
    const groupedEvents = new Map<string, GroupedCalendarEvent>();
    
    calendarEvents.forEach(event => {
      // When viewing a shared calendar, show only that user's events
      // When viewing own calendar, show only own events (not shared events from others)
      if (selectedCalendarUserId) {
        // Viewing shared calendar - only show events created by that user
        if (event.created_by !== selectedCalendarUserId) return;
      } else {
        // Viewing own calendar - only show events where user is the owner
        if (!event.is_owner) return;
      }
      
      // Filter out past events (events where the date has passed)
      // Parse event date in LOCAL timezone
      const eventDate = parseLocalDate(event.event_date);
      const eventDateTime = new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate()
      );
      
      // Skip events that are in the past
      if (eventDateTime < today) return;
      
      // Create a unique key for grouping multi-day events
      // Events with same title, description, time, type, priority, location, and creator are considered part of same multi-day event
      const groupKey = `${event.title}|${event.description}|${event.event_time}|${event.event_type}|${event.priority}|${event.location}|${event.created_by}`;
      
      if (groupedEvents.has(groupKey)) {
        const existing = groupedEvents.get(groupKey)!;
        const existingDate = parseLocalDate(existing.event_date);
        const currentDate = parseLocalDate(event.event_date);
        
        // Update start date if this event is earlier
        if (currentDate < existingDate) {
          existing.event_date = event.event_date;
          existing.id = event.id; // Use the earliest event's ID as primary
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

    // Convert grouped events to array and apply time range filter
    let filteredEvents = Array.from(groupedEvents.values()).filter(event => {
      if (selectedRange === 'all') return true;
      
      // Parse event date in LOCAL timezone
      const eventDate = parseLocalDate(event.event_date);
      const eventDateTime = new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate()
      );
      
      // For multi-day events, check if the range overlaps with the selected range
      if (event.end_date) {
        const endDate = parseLocalDate(event.end_date);
        const endDateTime = new Date(
          endDate.getFullYear(),
          endDate.getMonth(),
          endDate.getDate()
        );
        
        switch (selectedRange) {
          case 'today':
            return eventDateTime <= today && endDateTime >= today;
          case 'tomorrow':
            return eventDateTime <= tomorrow && endDateTime >= tomorrow;
          case 'week':
            return eventDateTime < thisWeekEnd && endDateTime >= today;
          case 'next7':
            return eventDateTime < next7DaysEnd && endDateTime >= today;
          default:
            return true;
        }
      }
      
      // Single-day event filtering
      switch (selectedRange) {
        case 'today':
          return eventDateTime.getTime() === today.getTime();
        case 'tomorrow':
          return eventDateTime.getTime() === tomorrow.getTime();
        case 'week':
          return eventDateTime >= today && eventDateTime < thisWeekEnd;
        case 'next7':
          return eventDateTime >= today && eventDateTime < next7DaysEnd;
        default:
          return true;
      }
    });
    
    // Combine and sort by date/time (earliest first)
    const combined: Array<{type: 'reminder' | 'event', data: LeadReminder | GroupedCalendarEvent}> = [
      ...filteredReminders.map(r => ({ type: 'reminder' as const, data: r })),
      ...filteredEvents.map(e => ({ type: 'event' as const, data: e }))
    ];

    combined.sort((a, b) => {
      const dateA = a.type === 'reminder' 
        ? new Date(`${(a.data as LeadReminder).reminder_date}T${(a.data as LeadReminder).reminder_time}`)
        : new Date(`${(a.data as GroupedCalendarEvent).event_date}T${(a.data as GroupedCalendarEvent).event_time || '00:00'}`);
      const dateB = b.type === 'reminder'
        ? new Date(`${(b.data as LeadReminder).reminder_date}T${(b.data as LeadReminder).reminder_time}`)
        : new Date(`${(b.data as GroupedCalendarEvent).event_date}T${(b.data as GroupedCalendarEvent).event_time || '00:00'}`);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Limit to 10 items
    return combined.slice(0, 10);
  }, [reminders, calendarEvents, selectedRange]);

  // Check if reminder is overdue or today
  const getReminderStatus = (reminder: LeadReminder) => {
    const now = new Date();
    
    // Parse reminder date in LOCAL timezone
    const reminderDate = parseLocalDate(reminder.reminder_date);
    
    // Parse time if provided
    let reminderDateTime = reminderDate;
    if (reminder.reminder_time) {
      const timeOnly = reminder.reminder_time.split('T')[1] || reminder.reminder_time;
      const [hours, minutes, seconds] = timeOnly.split(':').map(Number);
      reminderDateTime = new Date(
        reminderDate.getFullYear(),
        reminderDate.getMonth(),
        reminderDate.getDate(),
        hours || 0,
        minutes || 0,
        seconds || 0
      );
    }
    
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const reminderDateOnly = new Date(
      reminderDate.getFullYear(),
      reminderDate.getMonth(),
      reminderDate.getDate()
    );
    
    if (reminderDateTime < now) {
      return 'overdue';
    } else if (reminderDateOnly.getTime() === today.getTime()) {
      return 'today';
    } else {
      return 'future';
    }
  };

  // Get color classes based on status and priority
  const getColorClasses = (reminder: LeadReminder, status: string) => {
    if (reminder.completed || reminder.status === 'completed') {
      return {
        border: 'border-green-500/30',
        bg: 'bg-green-500/10',
        text: 'text-white'
      };
    }

    switch (status) {
      case 'overdue':
        return {
          border: 'border-red-500/30',
          bg: 'bg-red-500/10',
          text: 'text-white'
        };
      case 'today':
        return {
          border: 'border-yellow-500/30',
          bg: 'bg-yellow-500/10',
          text: 'text-white'
        };
      default:
        return {
          border: 'border-blue-500/30',
          bg: 'bg-blue-500/10',
          text: 'text-white'
        };
    }
  };

  // Get priority color classes
  const getPriorityClasses = (priority: string) => {
    const color = getReminderPriorityColor(priority as ReminderPriority);
    const classes = {
      red: 'bg-red-500/20 text-red-400 border-red-500/30',
      yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      green: 'bg-green-500/20 text-green-400 border-green-500/30',
      gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return classes[color as keyof typeof classes] || classes.gray;
  };

  // Toggle reminder completion
  const handleToggleComplete = async (reminder: LeadReminder, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the lead click
    
    const reminderId = reminder.id;
    if (updatingReminders.has(reminderId)) return; // Prevent double-clicks
    
    setUpdatingReminders(prev => new Set(prev).add(reminderId));
    
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

      const newCompletedStatus = !reminder.completed;
      const newStatus = newCompletedStatus ? 'completed' : 'pending';

      // Determine the correct endpoint
      const endpoint = reminder.lead_id 
        ? `/api/leads/${reminder.lead_id}/reminders/${reminderId}`
        : `/api/reminders/${reminderId}`;

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          completed: newCompletedStatus,
          status: newStatus
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update reminder');
      }

      // Trigger refresh
      if (onReminderUpdate) {
        onReminderUpdate();
      }
    } catch (error) {
      console.error('Error toggling reminder completion:', error);
      alert('Failed to update reminder. Please try again.');
    } finally {
      setUpdatingReminders(prev => {
        const newSet = new Set(prev);
        newSet.delete(reminderId);
        return newSet;
      });
    }
  };

  // Format relative time
  const formatRelativeTime = (dateStr: string, timeStr: string) => {
    if (!dateStr) return '';
    
    try {
      // Parse the date in LOCAL timezone (not UTC) to avoid timezone conversion issues
      // Database stores dates as DATE type (no timezone), so we need to interpret them as local dates
      const dateOnly = dateStr.split('T')[0]; // Get just the date part if it's ISO format
      const [year, month, day] = dateOnly.split('-').map(Number);
      
      // Create date in local timezone by using Date constructor with year, month, day
      // Month is 0-indexed in JavaScript
      const reminderDate = new Date(year, month - 1, day);
      
      // Parse time if provided
      let reminderDateTime = reminderDate;
      if (timeStr) {
        const timeOnly = timeStr.split('T')[1] || timeStr; // Get just time part
        const [hours, minutes, seconds] = timeOnly.split(':').map(Number);
        reminderDateTime = new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0);
      }
      
      // Check if date is valid
      if (isNaN(reminderDateTime.getTime())) {
        return '';
      }
      
      const now = new Date();
      
      // For day calculations, compare dates at midnight in local timezone
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const reminderDateOnly = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate());
      
      // Calculate day difference based on calendar days, not 24-hour periods
      const diffMs = reminderDateOnly.getTime() - today.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      
      // For same-day reminders, show hours/minutes
      if (diffDays === 0) {
        const timeDiffMs = reminderDateTime.getTime() - now.getTime();
        if (timeDiffMs < 0) {
          return 'Overdue';
        } else if (timeDiffMs < 60 * 60 * 1000) { // Less than 1 hour
          const diffMins = Math.floor(timeDiffMs / (1000 * 60));
          return `In ${diffMins} min${diffMins !== 1 ? 's' : ''}`;
        } else {
          const diffHours = Math.floor(timeDiffMs / (1000 * 60 * 60));
          return `In ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
        }
      } else if (diffDays < 0) {
        return 'Overdue';
      } else if (diffDays === 1) {
        return 'Tomorrow';
      } else {
        return `In ${diffDays} day${diffDays > 1 ? 's' : ''}`;
      }
    } catch (error) {
      console.error('Error formatting relative time:', error);
      return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Time range selector */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedRange('all')}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all
            ${selectedRange === 'all'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
              : 'bg-white/10 text-emerald-200 hover:bg-white/20'
            }
          `}
        >
          All Time
        </button>
        <button
          onClick={() => setSelectedRange('today')}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all
            ${selectedRange === 'today'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
              : 'bg-white/10 text-emerald-200 hover:bg-white/20'
            }
          `}
        >
          Today
        </button>
        <button
          onClick={() => setSelectedRange('tomorrow')}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all
            ${selectedRange === 'tomorrow'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
              : 'bg-white/10 text-emerald-200 hover:bg-white/20'
            }
          `}
        >
          Tomorrow
        </button>
        <button
          onClick={() => setSelectedRange('week')}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all
            ${selectedRange === 'week'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
              : 'bg-white/10 text-emerald-200 hover:bg-white/20'
            }
          `}
        >
          This Week
        </button>
        <button
          onClick={() => setSelectedRange('next7')}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all
            ${selectedRange === 'next7'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
              : 'bg-white/10 text-emerald-200 hover:bg-white/20'
            }
          `}
        >
          Next 7 Days
        </button>
      </div>

      {/* Reminders and Events list */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-emerald-200">No reminders or events for this time range</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-emerald-500/50 scrollbar-track-white/10 hover:scrollbar-thumb-emerald-500/70">
          {filteredItems.map(item => {
            // Handle calendar events
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
                <div
                  key={`event-${event.id}`}
                  className="w-full p-4 rounded-xl border-2 transition-all min-h-[44px] border-blue-500/30 bg-blue-500/10"
                >
                  <div className="flex items-start gap-3">
                    {/* Type Icon */}
                    <div className="flex-shrink-0 mt-1 text-2xl" title={event.event_type}>
                      {eventTypeIcons[event.event_type] || '📅'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header with Priority */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                          event.priority === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          event.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          'bg-green-500/20 text-green-400 border-green-500/30'
                        }`}>
                          {event.priority.toUpperCase()}
                        </span>
                        {!event.is_owner && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full border bg-purple-500/20 text-purple-400 border-purple-500/30">
                            Shared
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <div className="font-semibold text-white mb-2 truncate">
                        {event.title}
                      </div>

                      {/* Description */}
                      {event.description && (
                        <p className="text-sm text-white/90 mb-2 truncate">
                          {event.description}
                        </p>
                      )}

                      {/* Date and time */}
                      <div className="flex items-center gap-3 text-sm text-white/80 flex-wrap">
                        <span>
                          {formatEventDate()}
                        </span>
                        <span>
                          {event.is_all_day ? 'All day' : 
                            event.event_time ? new Date(`2000-01-01T${event.event_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 
                            'No time set'}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // Handle reminders
            const reminder = item.data as LeadReminder;
            const status = getReminderStatus(reminder);
            const colors = getColorClasses(reminder, status);
            const isCompleted = reminder.status === 'completed' || reminder.completed;
            const leadData = getLeadData(reminder);
            const priorityClasses = getPriorityClasses(reminder.priority);
            const isUpdating = updatingReminders.has(reminder.id);
            
            return (
              <div
                key={`reminder-${reminder.id}`}
                className={`
                  w-full p-4 rounded-xl border-2 transition-all
                  min-h-[44px]
                  ${colors.border} ${colors.bg}
                  ${isCompleted ? 'opacity-60' : ''}
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={(e) => handleToggleComplete(reminder, e)}
                    disabled={isUpdating}
                    className="flex-shrink-0 mt-1 p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                    title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    {isCompleted ? (
                      <CheckSquare className="w-6 h-6 text-green-400" />
                    ) : (
                      <Square className="w-6 h-6 text-white/70" />
                    )}
                  </button>

                  {/* Type Icon */}
                  <div className="flex-shrink-0 mt-1 text-2xl" title={getReminderTypeLabel(reminder.reminder_type)}>
                    {getReminderTypeIcon(reminder.reminder_type)}
                  </div>

                  {/* Content - Clickable */}
                  <button
                    onClick={() => onLeadClick(reminder.lead_id || '')}
                    className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                  >
                    {/* Header with Priority */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${priorityClasses}`}>
                        {getReminderPriorityLabel(reminder.priority)}
                      </span>
                      {isCompleted && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full border bg-green-500/20 text-green-400 border-green-500/30">
                          ✅ Completed
                        </span>
                      )}
                      {status === 'overdue' && !isCompleted && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full border bg-red-500/20 text-red-400 border-red-500/30">
                          🔴 Overdue
                        </span>
                      )}
                    </div>

                    {/* Message */}
                    <div className={`font-semibold ${colors.text} mb-2 truncate ${isCompleted ? 'line-through' : ''}`}>
                      {reminder.message || reminder.title || reminder.description || 'No message'}
                    </div>

                    {/* Lead Details */}
                    {leadData && (
                      <div className="space-y-1 mb-2 text-sm">
                        <div className="flex items-center gap-2 text-white truncate">
                          <User className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="font-medium truncate">{leadData.name}</span>
                        </div>
                        {leadData.contact_person && (
                          <div className="flex items-center gap-2 text-white/90 truncate">
                            <span className="text-xs flex-shrink-0">Contact:</span>
                            <span className="truncate">{leadData.contact_person}</span>
                          </div>
                        )}
                        {leadData.town && (
                          <div className="flex items-center gap-2 text-white/90 truncate">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{leadData.town}</span>
                          </div>
                        )}
                        {leadData.phone && (
                          <div className="flex items-center gap-2 text-white/90 truncate">
                            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{leadData.phone}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Date and time */}
                    <div className="flex items-center gap-3 text-sm text-white/80 flex-wrap">
                      <span>
                        {formatLocalDate(reminder.reminder_date || '')}
                      </span>
                      <span>
                        {formatReminderTime(reminder.reminder_time || null, reminder.is_all_day)}
                      </span>
                      <span className="font-semibold text-white">
                        {formatRelativeTime(reminder.reminder_date || '', reminder.reminder_time || '')}
                      </span>
                    </div>
                  </button>

                  {/* Arrow */}
                  <button
                    onClick={() => onLeadClick(reminder.lead_id || '')}
                    className="flex-shrink-0 hover:opacity-80 transition-opacity"
                  >
                    <ChevronRight className={`w-5 h-5 ${colors.text}`} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* View All link if there are more reminders */}
          {reminders.length > 10 && (
            <button
              onClick={() => {
                // Navigate to Reminders tab
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', 'reminders');
                  window.history.pushState({}, '', url.toString());
                  // Dispatch custom event instead of reload
                  window.dispatchEvent(new CustomEvent('tabchange', { detail: { tab: 'reminders' } }));
                }
              }}
              className="w-full py-3 text-center text-emerald-300 hover:text-emerald-200 font-semibold hover:bg-white/10 rounded-lg transition-colors min-h-[44px]"
            >
              View All Reminders →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
