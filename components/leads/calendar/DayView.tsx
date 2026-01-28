'use client';

import { Clock, MapPin, User, Phone, Edit2, Trash2 } from 'lucide-react';
import type { LeadReminder, Lead } from '@/lib/leads/types';
import { getReminderTypeIcon, getReminderTypeLabel, getReminderPriorityLabel, formatReminderTime } from '@/lib/leads/types';

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
  creator_username: string;
  is_owner: boolean;
  can_edit?: boolean;
}

interface DayViewProps {
  currentDate: Date;
  reminders: LeadReminder[];
  events: CalendarEvent[];
  leads: Lead[];
  onLeadClick: (leadId: string) => void;
  onEventEdit: (event: CalendarEvent) => void;
  onEventDelete: (eventId: string) => void;
  deletingEventId: string | null;
}

export default function DayView({ 
  currentDate, reminders, events, leads, onLeadClick, 
  onEventEdit, onEventDelete, deletingEventId 
}: DayViewProps) {
  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  
  const dayReminders = reminders.filter(r => {
    if (!r.reminder_date) return false;
    return r.reminder_date.split('T')[0] === dateStr;
  }).sort((a, b) => {
    const timeA = a.reminder_time || '00:00';
    const timeB = b.reminder_time || '00:00';
    return timeA.localeCompare(timeB);
  });

  const dayEvents = events.filter(e => {
    if (!e.event_date) return false;
    return e.event_date.split('T')[0] === dateStr;
  }).sort((a, b) => {
    const timeA = a.event_time || '00:00';
    const timeB = b.event_time || '00:00';
    return timeA.localeCompare(timeB);
  });

  const getLeadData = (leadId: string) => {
    return leads.find(l => l.id === leadId);
  };

  const eventTypeIcons: Record<string, string> = {
    event: '📅',
    appointment: '🗓️',
    meeting: '🤝',
    deadline: '⏰',
    reminder: '🔔',
    other: '📌'
  };

  return (
    <div className="space-y-4">
      {/* Day header */}
      <div className="text-center pb-4 border-b border-emerald-500/20">
        <div className="text-3xl font-bold text-white mb-1">
          {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
        </div>
        <div className="text-xl text-emerald-300">
          {currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
        <div className="text-sm text-emerald-200 mt-2">
          {dayEvents.length} events, {dayReminders.length} reminders
        </div>
      </div>

      {/* Timeline view */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
        {/* Calendar Events */}
        {dayEvents.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
              📅 Calendar Events ({dayEvents.length})
            </h4>
            <div className="space-y-3">
              {dayEvents.map(event => (
                <div
                  key={event.id}
                  className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{eventTypeIcons[event.event_type] || '📅'}</span>
                      <div>
                        <div className="font-semibold text-white text-lg">{event.title}</div>
                        <div className="flex items-center gap-2 mt-1">
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
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {event.description && (
                    <p className="text-sm text-blue-200 mb-3">{event.description}</p>
                  )}

                  {/* Details */}
                  <div className="space-y-2 text-sm text-blue-300 mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        {event.is_all_day ? 'All day event' : 
                          event.event_time ? new Date(`2000-01-01T${event.event_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 
                          'No time set'}
                      </span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.creator_username && (
                      <div className="flex items-center gap-2 text-xs text-blue-400">
                        <User className="w-4 h-4" />
                        <span>Created by {event.creator_username}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {(event.is_owner || event.can_edit) && (
                    <div className="flex items-center gap-2 pt-3 border-t border-blue-500/20">
                      <button
                        onClick={() => onEventEdit(event)}
                        className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/15 border border-emerald-500/30 rounded-lg text-white text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => onEventDelete(event.id)}
                        disabled={deletingEventId === event.id}
                        className="flex-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{deletingEventId === event.id ? 'Deleting...' : 'Delete'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reminders */}
        {dayReminders.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-emerald-300 mb-3 flex items-center gap-2">
              🔔 Lead Reminders ({dayReminders.length})
            </h4>
            <div className="space-y-3">
              {dayReminders.map(reminder => {
                const leadData = getLeadData(reminder.lead_id || '');
                const isCompleted = reminder.completed || reminder.status === 'completed';
                
                return (
                  <button
                    key={reminder.id}
                    onClick={() => reminder.lead_id && onLeadClick(reminder.lead_id)}
                    className={`
                      w-full text-left p-4 bg-white/10 hover:bg-white/15 border border-emerald-500/30 rounded-lg 
                      transition-colors
                      ${isCompleted ? 'opacity-60' : ''}
                    `}
                  >
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl">{getReminderTypeIcon(reminder.reminder_type)}</span>
                      <div className="flex-1">
                        <div className={`font-semibold text-white text-lg mb-1 ${isCompleted ? 'line-through' : ''}`}>
                          {reminder.message || reminder.title || reminder.description || 'No message'}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
                            {getReminderPriorityLabel(reminder.priority)}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
                            {getReminderTypeLabel(reminder.reminder_type)}
                          </span>
                          {isCompleted && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                              ✅ Completed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-2 text-sm text-emerald-300 mb-3">
                      <Clock className="w-4 h-4" />
                      <span>{formatReminderTime(reminder.reminder_time || null, reminder.is_all_day)}</span>
                    </div>

                    {/* Lead Details */}
                    {leadData && (
                      <div className="space-y-2 text-sm text-emerald-200 pt-3 border-t border-emerald-500/20">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
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
                            <MapPin className="w-4 h-4" />
                            <span>{leadData.town}</span>
                          </div>
                        )}
                        {leadData.phone && (
                          <div className="flex items-center gap-2 text-emerald-300">
                            <Phone className="w-4 h-4" />
                            <span>{leadData.phone}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {dayReminders.length === 0 && dayEvents.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📅</div>
            <div className="text-lg font-semibold text-white mb-2">No items for this day</div>
            <div className="text-sm text-emerald-300">
              Add events or reminders to see them here
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
