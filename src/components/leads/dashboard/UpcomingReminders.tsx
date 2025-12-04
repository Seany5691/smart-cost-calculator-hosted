'use client';

import { useState, useMemo, useEffect } from 'react';
import { Calendar, Clock, Phone, MapPin, CheckCircle, Circle, Trash2, Bell, AlertCircle, Filter, RefreshCw } from 'lucide-react';
import { Lead } from '@/lib/leads/types';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useRemindersStore, useAllReminders, useRemindersLoading } from '@/store/reminders';
import type { LeadReminder } from '@/lib/leads/supabaseNotesReminders';

interface ReminderWithLead extends LeadReminder {
  lead?: Lead;
}

interface UpcomingRemindersProps {
  leads: Lead[];
  onLeadClick?: (lead: Lead) => void;
  daysAhead?: number; // Set to 0 or negative to show all reminders
}

export const UpcomingReminders = ({ leads, onLeadClick, daysAhead = 30 }: UpcomingRemindersProps) => {
  const user = useAuthStore((state) => state.user);
  const reminders = useAllReminders();
  const loading = useRemindersLoading();
  const { fetchAllReminders, toggleComplete, deleteReminder } = useRemindersStore();
  
  const [showCompleted, setShowCompleted] = useState(false);
  const [filterGroup, setFilterGroup] = useState<string>('all');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Load reminders from Supabase
  useEffect(() => {
    if (user) {
      fetchAllReminders(user.id);
    }
  }, [user]);

  // Auto-refresh every 30 seconds to catch new reminders
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      fetchAllReminders(user.id, true);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  // Combine reminders with lead data
  const remindersWithLeads = useMemo(() => {
    return reminders
      .map(reminder => ({
        ...reminder,
        lead: leads.find(l => l.id === reminder.leadId)
      }))
      .filter(r => r.lead) // Only show reminders for existing leads
      .sort((a, b) => new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime());
  }, [reminders, leads]);

  // Group reminders by time period
  const groupedReminders = useMemo(() => {
    const groups: Record<string, ReminderWithLead[]> = {
      overdue: [],
      today: [],
      tomorrow: [],
      thisWeek: [],
      nextWeek: [],
      later: []
    };

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()));

    const endOfNextWeek = new Date(endOfWeek);
    endOfNextWeek.setDate(endOfNextWeek.getDate() + 7);

    const maxDate = daysAhead > 0 ? new Date(today) : null;
    if (maxDate) {
      maxDate.setDate(maxDate.getDate() + daysAhead);
    }

    remindersWithLeads.forEach(reminder => {
      if (!showCompleted && reminder.completed) return;
      
      const reminderDate = new Date(reminder.reminderDate);
      reminderDate.setHours(0, 0, 0, 0);
      const reminderTime = reminderDate.getTime();

      if (maxDate && reminderTime > maxDate.getTime()) return;

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

    return groups;
  }, [remindersWithLeads, showCompleted, daysAhead]);

  const filteredGroups = useMemo(() => {
    if (filterGroup === 'all') return groupedReminders;
    return { [filterGroup]: groupedReminders[filterGroup] };
  }, [groupedReminders, filterGroup]);

  const totalReminders = Object.values(groupedReminders).reduce((sum, group) => sum + group.length, 0);
  const overdueCount = groupedReminders.overdue.length;
  const todayCount = groupedReminders.today.length;

  const handleToggleComplete = async (reminderId: string) => {
    try {
      await toggleComplete(reminderId);
    } catch (error) {
      console.error('Error toggling reminder:', error);
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return;
    
    try {
      await deleteReminder(reminderId);
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  const getStatusColor = (groupKey: string) => {
    switch (groupKey) {
      case 'overdue': return 'text-red-700 bg-red-50 border-red-300';
      case 'today': return 'text-green-700 bg-green-50 border-green-300';
      case 'tomorrow': return 'text-blue-700 bg-blue-50 border-blue-300';
      case 'thisWeek': return 'text-purple-700 bg-purple-50 border-purple-300';
      case 'nextWeek': return 'text-orange-700 bg-orange-50 border-orange-300';
      default: return 'text-gray-700 bg-gray-50 border-gray-300';
    }
  };

  const getGroupTitle = (groupKey: string) => {
    switch (groupKey) {
      case 'overdue': return 'Overdue';
      case 'today': return 'Today';
      case 'tomorrow': return 'Tomorrow';
      case 'thisWeek': return 'This Week';
      case 'nextWeek': return 'Next Week';
      default: return 'Later';
    }
  };

  const getGroupIcon = (groupKey: string) => {
    switch (groupKey) {
      case 'overdue': return AlertCircle;
      case 'today': return Bell;
      default: return Clock;
    }
  };

  const formatReminderDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    return `${weekday}, ${day}/${month}/${year}`;
  };

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Upcoming Reminders</h2>
            <p className="text-sm text-gray-600">Your complete reminder diary</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => user && fetchAllReminders(user.id, true)}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh reminders"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{totalReminders}</div>
            <div className="text-xs text-gray-600">Active</div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {(overdueCount > 0 || todayCount > 0) && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-gradient-to-r from-red-50 to-green-50 rounded-lg border border-gray-200">
          {overdueCount > 0 && (
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">
                {overdueCount} Overdue
              </span>
            </div>
          )}
          {todayCount > 0 && (
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                {todayCount} Today
              </span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Reminders</option>
            <option value="overdue">Overdue Only</option>
            <option value="today">Today Only</option>
            <option value="tomorrow">Tomorrow Only</option>
            <option value="thisWeek">This Week</option>
            <option value="nextWeek">Next Week</option>
          </select>
        </div>
        
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <span className="text-sm text-gray-700">Show completed</span>
        </label>
      </div>

      {/* Reminders List */}
      {totalReminders === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No active reminders</p>
          <p className="text-sm text-gray-500 mt-1">Add reminders to leads to see them here</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
          {Object.entries(filteredGroups).map(([groupKey, groupReminders]) => {
            if (groupReminders.length === 0) return null;

            const GroupIcon = getGroupIcon(groupKey);

            return (
              <div key={groupKey}>
                <div className="flex items-center space-x-2 mb-3 sticky top-0 bg-white py-2 z-10">
                  <GroupIcon className="w-4 h-4 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    {getGroupTitle(groupKey)}
                  </h3>
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">
                    {groupReminders.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {groupReminders.map(reminder => {
                    const lead = reminder.lead!;
                    
                    return (
                      <div
                        key={reminder.id}
                        className={cn(
                          'p-4 border-2 rounded-lg transition-all',
                          getStatusColor(groupKey),
                          reminder.completed && 'opacity-60'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button
                            onClick={() => handleToggleComplete(reminder.id)}
                            className="mt-1 flex-shrink-0 hover:scale-110 transition-transform"
                            aria-label={reminder.completed ? 'Mark as incomplete' : 'Mark as complete'}
                          >
                            {reminder.completed ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-400" />
                            )}
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {/* Lead Name */}
                            <div className="flex items-center space-x-2 mb-1">
                              <h4
                                onClick={() => onLeadClick?.(lead)}
                                className={cn(
                                  'font-semibold text-gray-900 cursor-pointer hover:text-purple-600 transition-colors',
                                  reminder.completed && 'line-through'
                                )}
                              >
                                {lead.name}
                              </h4>
                              {lead.provider && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-white rounded-full">
                                  {lead.provider}
                                </span>
                              )}
                            </div>

                            {/* Reminder Note */}
                            <p className={cn(
                              'text-sm font-medium text-gray-800 mb-2',
                              reminder.completed && 'line-through'
                            )}>
                              📝 {reminder.note}
                            </p>

                            {/* Date and Details */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span className={reminder.completed ? 'line-through' : ''}>
                                  {formatReminderDate(reminder.reminderDate)}
                                </span>
                              </div>
                              {lead.phone && (
                                <div className="flex items-center space-x-1">
                                  <Phone className="w-3 h-3" />
                                  <a
                                    href={`tel:${lead.phone}`}
                                    className="hover:text-purple-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {lead.phone}
                                  </a>
                                </div>
                              )}
                              {lead.type_of_business && (
                                <div className="flex items-center space-x-1">
                                  <MapPin className="w-3 h-3" />
                                  <span className="truncate">{lead.type_of_business}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteReminder(reminder.id)}
                            className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            aria-label="Delete reminder"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
