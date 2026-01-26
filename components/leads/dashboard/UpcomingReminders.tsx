'use client';

/**
 * Upcoming Reminders Component
 * 
 * Displays upcoming reminders for selected time range
 * 
 * Requirements: 34.1-34.20
 */

import { useState, useMemo } from 'react';
import { Clock, CheckCircle, AlertCircle, ChevronRight, User, MapPin, Phone } from 'lucide-react';
import type { LeadReminder, Lead, ReminderPriority } from '@/lib/leads/types';
import { getReminderTypeIcon, getReminderTypeLabel, getReminderPriorityColor, getReminderPriorityLabel, formatReminderTime } from '@/lib/leads/types';

interface UpcomingRemindersProps {
  reminders: LeadReminder[];
  leads: Lead[];
  onLeadClick: (leadId: string) => void;
}

type TimeRange = 'all' | 'today' | 'tomorrow' | 'week' | 'next7';

export default function UpcomingReminders({ reminders, leads, onLeadClick }: UpcomingRemindersProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('all');

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

  // Filter and sort reminders based on selected time range
  const filteredReminders = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    // Filter by time range
    let filtered = reminders.filter(reminder => {
      // For 'all', show all reminders
      if (selectedRange === 'all') {
        return true;
      }
      
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
          return reminderDateTime >= today && reminderDateTime < weekEnd;
        case 'next7':
          return reminderDateTime >= today && reminderDateTime < weekEnd;
        default:
          return true;
      }
    });
    
    // Sort by date and time (earliest first)
    filtered.sort((a, b) => {
      const dateA = new Date(`${a.reminder_date}T${a.reminder_time}`);
      const dateB = new Date(`${b.reminder_date}T${b.reminder_time}`);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Limit to 10 reminders
    return filtered.slice(0, 10);
  }, [reminders, selectedRange]);

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

      {/* Reminders list */}
      {filteredReminders.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-emerald-200">No reminders for this time range</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReminders.map(reminder => {
            const status = getReminderStatus(reminder);
            const colors = getColorClasses(reminder, status);
            const isCompleted = reminder.status === 'completed' || reminder.completed;
            const leadData = getLeadData(reminder);
            const priorityClasses = getPriorityClasses(reminder.priority);
            
            return (
              <button
                key={reminder.id}
                onClick={() => onLeadClick(reminder.lead_id || '')}
                className={`
                  w-full text-left p-4 rounded-xl border-2 transition-all
                  hover:scale-102 hover:shadow-md min-h-[44px]
                  ${colors.border} ${colors.bg}
                  ${isCompleted ? 'opacity-60' : ''}
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Type Icon */}
                  <div className="flex-shrink-0 mt-1 text-2xl" title={getReminderTypeLabel(reminder.reminder_type)}>
                    {getReminderTypeIcon(reminder.reminder_type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
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
                  </div>

                  {/* Arrow */}
                  <ChevronRight className={`w-5 h-5 flex-shrink-0 ${colors.text}`} />
                </div>
              </button>
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
