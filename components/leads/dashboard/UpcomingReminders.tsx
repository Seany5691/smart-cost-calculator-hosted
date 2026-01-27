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
}

type TimeRange = 'all' | 'today' | 'tomorrow' | 'week' | 'next7';

export default function UpcomingReminders({ reminders, leads, onLeadClick, onReminderUpdate, calendarEvents = [] }: UpcomingRemindersProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('all');
  const [updatingReminders, setUpdatingReminders] = useState<Set<string>>(new Set());

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
    
    // Filter reminders
    let filteredReminders = reminders.filter(reminder => {
      if (selectedRange === 'all') return true;
      
      const reminderDate = new Date(reminder.reminder_date);
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

    // Filter calendar events
    let filteredEvents = calendarEvents.filter(event => {
      if (selectedRange === 'all') return true;
      
      const eventDate = new Date(event.event_date);
      const eventDateTime = new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate()
      );
      
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
    const combined: Array<{type: 'reminder' | 'event', data: LeadReminder | CalendarEvent}> = [
      ...filteredReminders.map(r => ({ type: 'reminder' as const, data: r })),
      ...filteredEvents.map(e => ({ type: 'event' as const, data: e }))
    ];

    combined.sort((a, b) => {
      const dateA = a.type === 'reminder' 
        ? new Date(`${(a.data as LeadReminder).reminder_date}T${(a.data as LeadReminder).reminder_time}`)
        : new Date(`${(a.data as CalendarEvent).event_date}T${(a.data as CalendarEvent).event_time || '00:00'}`);
      const dateB = b.type === 'reminder'
        ? new Date(`${(b.data as LeadReminder).reminder_date}T${(b.data as LeadReminder).reminder_time}`)
        : new Date(`${(b.data as CalendarEvent).event_date}T${(b.data as CalendarEvent).event_time || '00:00'}`);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Limit to 10 items
    return combined.slice(0, 10);
  }, [reminders, calendarEvents, selectedRange]);

  // Check if reminder is overdue or today
  const getReminderStatus = (reminder: LeadReminder) => {
    const now = new Date();
    const reminderDateTime = new Date(`${reminder.reminder_date}T${reminder.reminder_time}`);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const reminderDate = new Date(
      reminderDateTime.getFullYear(),
      reminderDateTime.getMonth(),
      reminderDateTime.getDate()
    );
    
    if (reminderDateTime < now) {
      return 'overdue';
    } else if (reminderDate.getTime() === today.getTime()) {
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
      // Parse the date properly
      const dateOnly = dateStr.split('T')[0]; // Get just the date part if it's ISO format
      const timeOnly = timeStr ? timeStr.split('T')[1] || timeStr : '00:00:00'; // Get just time part
      const reminderDateTime = new Date(`${dateOnly}T${timeOnly}`);
      
      // Check if date is valid
      if (isNaN(reminderDateTime.getTime())) {
        return '';
      }
      
      const now = new Date();
      const diffMs = reminderDateTime.getTime() - now.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffHours < 0) {
        return 'Overdue';
      } else if (diffHours < 1) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `In ${diffMins} min${diffMins !== 1 ? 's' : ''}`;
      } else if (diffHours < 24) {
        return `In ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
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
        <div className="space-y-3">
          {filteredItems.map(item => {
            // Handle calendar events
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
                          {new Date(event.event_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
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
                        {new Date(reminder.reminder_date || '').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
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
