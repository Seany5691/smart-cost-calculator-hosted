'use client';

import { useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  Circle, 
  Trash2, 
  Edit2,
  Phone,
  MapPin,
  Repeat,
  AlertCircle,
  Bell
} from 'lucide-react';
import type { LeadReminder } from '@/lib/leads/supabaseNotesReminders';
import type { Lead, Route } from '@/lib/leads/types';
import { 
  getReminderTypeIcon, 
  getReminderTypeLabel,
  formatReminderTime 
} from '@/lib/leads/supabaseNotesReminders';
import { useRemindersStore } from '@/store/reminders';
import { cn } from '@/lib/utils';

interface RemindersListProps {
  reminders: LeadReminder[];
  leads: Lead[];
  routes: Route[];
}

export const RemindersList = ({ reminders, leads, routes }: RemindersListProps) => {
  const { toggleComplete, deleteReminder } = useRemindersStore();

  // Group reminders by date category
  const groupedReminders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const groups: Record<string, LeadReminder[]> = {
      overdue: [],
      today: [],
      tomorrow: [],
      thisWeek: [],
      nextWeek: [],
      later: [],
    };

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()));

    const endOfNextWeek = new Date(endOfWeek);
    endOfNextWeek.setDate(endOfNextWeek.getDate() + 7);

    reminders.forEach(reminder => {
      const reminderDate = new Date(reminder.reminderDate);
      reminderDate.setHours(0, 0, 0, 0);
      const reminderTime = reminderDate.getTime();

      if (reminderTime < today.getTime()) {
        groups.overdue.push(reminder);
      } else if (reminderTime === today.getTime()) {
        groups.today.push(reminder);
      } else if (reminderTime === tomorrow.getTime()) {
        groups.tomorrow.push(reminder);
      } else if (reminderTime <= endOfWeek.getTime()) {
        groups.thisWeek.push(reminder);
      } else if (reminderTime <= endOfNextWeek.getTime()) {
        groups.nextWeek.push(reminder);
      } else {
        groups.later.push(reminder);
      }
    });

    // Sort each group by priority then time
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        // Priority sort
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Time sort
        if (a.reminderTime && b.reminderTime) {
          return a.reminderTime.localeCompare(b.reminderTime);
        }
        return 0;
      });
    });

    return groups;
  }, [reminders]);

  const getGroupInfo = (groupKey: string) => {
    const info: Record<string, { title: string; icon: any; color: string }> = {
      overdue: { title: 'Overdue', icon: AlertCircle, color: 'text-red-700 bg-red-50 border-red-300' },
      today: { title: 'Today', icon: Bell, color: 'text-green-700 bg-green-50 border-green-300' },
      tomorrow: { title: 'Tomorrow', icon: Calendar, color: 'text-blue-700 bg-blue-50 border-blue-300' },
      thisWeek: { title: 'This Week', icon: Clock, color: 'text-purple-700 bg-purple-50 border-purple-300' },
      nextWeek: { title: 'Next Week', icon: Calendar, color: 'text-indigo-700 bg-indigo-50 border-indigo-300' },
      later: { title: 'Later', icon: Calendar, color: 'text-gray-700 bg-gray-50 border-gray-300' },
    };
    return info[groupKey] || info.later;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    return `${weekday}, ${day}/${month}/${year}`;
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      high: 'bg-red-100 text-red-700 border-red-300',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      low: 'bg-green-100 text-green-700 border-green-300',
    };
    const labels = { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' };
    return (
      <span className={cn('px-2 py-0.5 text-xs font-semibold rounded-full border', styles[priority as keyof typeof styles])}>
        {labels[priority as keyof typeof labels]}
      </span>
    );
  };

  const handleToggle = async (reminderId: string) => {
    try {
      await toggleComplete(reminderId);
    } catch (error) {
      console.error('Error toggling reminder:', error);
    }
  };

  const handleDelete = async (reminderId: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return;
    try {
      await deleteReminder(reminderId);
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  const getLead = (leadId: string | null) => {
    if (!leadId) return null;
    return leads.find(l => l.id === leadId);
  };

  const getRoute = (routeId: string | null) => {
    if (!routeId) return null;
    return routes.find(r => r.id === routeId);
  };

  if (reminders.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reminders</h3>
        <p className="text-gray-600">Create your first reminder to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedReminders).map(([groupKey, groupReminders]) => {
        if (groupReminders.length === 0) return null;

        const groupInfo = getGroupInfo(groupKey);
        const GroupIcon = groupInfo.icon;

        return (
          <div key={groupKey} className="space-y-3">
            {/* Group Header */}
            <div className="flex items-center space-x-3 sticky top-0 bg-white/95 backdrop-blur-sm py-2 z-10">
              <GroupIcon className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                {groupInfo.title}
              </h3>
              <span className="px-3 py-1 text-sm font-medium bg-gray-200 text-gray-700 rounded-full">
                {groupReminders.length}
              </span>
            </div>

            {/* Reminders in Group */}
            <div className="space-y-3">
              {groupReminders.map(reminder => {
                const lead = getLead(reminder.leadId || null);
                const route = getRoute(reminder.routeId || null);

                return (
                  <div
                    key={reminder.id}
                    className={cn(
                      'glass-card p-4 border-l-4 transition-all',
                      reminder.completed && 'opacity-60',
                      groupInfo.color
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggle(reminder.id)}
                        className="mt-1 flex-shrink-0 hover:scale-110 transition-transform"
                      >
                        {reminder.completed ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-400" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Type, Priority, Recurring */}
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                          <span className="text-xl">{getReminderTypeIcon(reminder.reminderType)}</span>
                          <span className="text-sm font-medium text-gray-700">
                            {getReminderTypeLabel(reminder.reminderType)}
                          </span>
                          {getPriorityBadge(reminder.priority)}
                          {reminder.isRecurring && (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 border border-purple-300 flex items-center">
                              <Repeat className="w-3 h-3 mr-1" />
                              Recurring
                            </span>
                          )}
                        </div>

                        {/* Title/Note */}
                        <h4 className={cn(
                          'text-base font-semibold mb-2',
                          reminder.completed ? 'line-through text-gray-500' : 'text-gray-900'
                        )}>
                          {reminder.title || reminder.note}
                        </h4>

                        {/* Date and Time */}
                        <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600 mb-2">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(reminder.reminderDate)}</span>
                          </div>
                          {!reminder.isAllDay && reminder.reminderTime && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatReminderTime(reminder.reminderTime, reminder.isAllDay)}</span>
                            </div>
                          )}
                        </div>

                        {/* Lead/Route Info */}
                        {lead && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                            <Phone className="w-4 h-4" />
                            <span className="font-medium">{lead.name}</span>
                            {lead.phone && (
                              <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                                {lead.phone}
                              </a>
                            )}
                          </div>
                        )}
                        {route && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span className="font-medium">{route.name}</span>
                            <span className="text-gray-500">({route.stop_count} stops)</span>
                          </div>
                        )}
                        {reminder.description && (
                          <p className="text-sm text-gray-600 mt-2">{reminder.description}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col space-y-2 flex-shrink-0">
                        <button
                          onClick={() => handleDelete(reminder.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
