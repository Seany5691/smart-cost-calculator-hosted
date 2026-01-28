'use client';

import { Clock, MapPin, User, Phone } from 'lucide-react';
import type { LeadReminder, Lead } from '@/lib/leads/types';
import { getReminderTypeIcon, getReminderPriorityLabel, formatReminderTime } from '@/lib/leads/types';

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

interface WeekViewProps {
  currentDate: Date;
  reminders: LeadReminder[];
  events: CalendarEvent[];
  leads: Lead[];
  onLeadClick: (leadId: string) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export default function WeekView({ currentDate, reminders, events, leads, onLeadClick, onEventClick }: WeekViewProps) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Get week dates
  const dayOfWeek = currentDate.getDay();
  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentDate);
    date.setDate(currentDate.getDate() - dayOfWeek + i);
    weekDates.push(date);
  }

  const getItemsForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    const dateReminders = reminders.filter(r => {
      if (!r.reminder_date) return false;
      return r.reminder_date.split('T')[0] === dateStr;
    }).sort((a, b) => {
      const timeA = a.reminder_time || '00:00';
      const timeB = b.reminder_time || '00:00';
      return timeA.localeCompare(timeB);
    });

    const dateEvents = events.filter(e => {
      if (!e.event_date) return false;
      return e.event_date.split('T')[0] === dateStr;
    }).sort((a, b) => {
      const timeA = a.event_time || '00:00';
      const timeB = b.event_time || '00:00';
      return timeA.localeCompare(timeB);
    });

    return { reminders: dateReminders, events: dateEvents };
  };

  const getLeadData = (leadId: string) => {
    return leads.find(l => l.id === leadId);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="grid grid-cols-7 gap-2">
      {weekDates.map((date, index) => {
        const { reminders: dayReminders, events: dayEvents } = getItemsForDate(date);
        const isToday = date.getTime() === today.getTime();
        const isPast = date.getTime() < today.getTime();
        
        return (
          <div
            key={index}
            className={`
              rounded-lg border p-3 min-h-[300px]
              ${isToday ? 'border-emerald-500 bg-emerald-500/5' : 'border-emerald-500/20 bg-white/5'}
              ${isPast ? 'opacity-70' : ''}
            `}
          >
            {/* Day header */}
            <div className="mb-3 pb-2 border-b border-emerald-500/20">
              <div className="text-xs text-emerald-300">{dayNames[date.getDay()]}</div>
              <div className={`text-lg font-bold ${isToday ? 'text-emerald-400' : 'text-white'}`}>
                {date.getDate()}
              </div>
              <div className="text-xs text-emerald-200">
                {date.toLocaleDateString('en-US', { month: 'short' })}
              </div>
            </div>

            {/* Items list */}
            <div className="space-y-2 overflow-y-auto max-h-[400px] custom-scrollbar">
              {/* Calendar Events */}
              {dayEvents.map(event => (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="w-full text-left p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition-colors"
                >
                  <div className="flex items-start gap-2 mb-1">
                    <span className="text-sm">📅</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{event.title}</div>
                      <div className="text-xs text-blue-300 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {event.is_all_day ? 'All day' : 
                          event.event_time ? new Date(`2000-01-01T${event.event_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 
                          'No time'}
                      </div>
                      {event.location && (
                        <div className="text-xs text-blue-300 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}

              {/* Reminders */}
              {dayReminders.map(reminder => {
                const leadData = getLeadData(reminder.lead_id || '');
                const isCompleted = reminder.completed || reminder.status === 'completed';
                
                return (
                  <button
                    key={reminder.id}
                    onClick={() => reminder.lead_id && onLeadClick(reminder.lead_id)}
                    className={`
                      w-full text-left p-2 bg-white/10 border border-emerald-500/30 rounded-lg 
                      hover:bg-white/15 transition-colors
                      ${isCompleted ? 'opacity-60' : ''}
                    `}
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <span className="text-sm">{getReminderTypeIcon(reminder.reminder_type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold text-white truncate ${isCompleted ? 'line-through' : ''}`}>
                          {reminder.message || reminder.title || 'No message'}
                        </div>
                        <div className="text-xs text-emerald-300 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {formatReminderTime(reminder.reminder_time || null, reminder.is_all_day)}
                        </div>
                        {leadData && (
                          <div className="text-xs text-emerald-200 mt-1 truncate">
                            <User className="w-3 h-3 inline mr-1" />
                            {leadData.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Empty state */}
              {dayReminders.length === 0 && dayEvents.length === 0 && (
                <div className="text-center py-4 text-emerald-300/50 text-xs">
                  No items
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
