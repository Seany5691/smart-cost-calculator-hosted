'use client';

import { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  Circle,
  Trash2,
  AlertCircle,
  Phone,
  MapPin
} from 'lucide-react';
import type { Lead, Route } from '@/lib/leads/types';
import { useRemindersStore } from '@/store/reminders';
import { cn } from '@/lib/utils';

interface ReminderCalendarProps {
  reminders: any[];
  leads: Lead[];
  routes: Route[];
}

type ViewMode = 'month' | 'week' | 'day';

// Helper functions for PostgreSQL reminders
const getReminderTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    call: '📞',
    email: '📧',
    meeting: '📅',
    task: '📝',
    followup: '🔔',
    quote: '💰',
    document: '📄',
  };
  return icons[type] || '📝';
};

const getReminderTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    call: 'Phone Call',
    email: 'Email',
    meeting: 'Meeting',
    task: 'Task',
    followup: 'Follow-up',
    quote: 'Quote',
    document: 'Document',
  };
  return labels[type] || 'Task';
};

const formatReminderTime = (time: string, isAllDay: boolean) => {
  if (isAllDay) return 'All day';
  return time;
};

export const ReminderCalendar = ({ reminders, leads, routes }: ReminderCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { toggleComplete, deleteReminder } = useRemindersStore();

  // Get reminders for a specific date
  const getRemindersForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return reminders.filter(r => {
      const reminderDateStr = new Date(r.reminderDate).toISOString().split('T')[0];
      return reminderDateStr === dateStr;
    }).sort((a, b) => {
      // Sort by priority then time
      const priorityOrder = { high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      if (a.reminderTime && b.reminderTime) {
        return a.reminderTime.localeCompare(b.reminderTime);
      }
      return 0;
    });
  };

  // Navigation
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get calendar title
  const getCalendarTitle = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const weekStart = getWeekStart(currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  // Helper functions
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toISOString().split('T')[0] === date2.toISOString().split('T')[0];
  };

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  const getLead = (leadId: string | null) => {
    if (!leadId) return null;
    return leads.find(l => l.id === leadId);
  };

  const getRoute = (routeId: string | null) => {
    if (!routeId) return null;
    return routes.find(r => r.id === routeId);
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

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'bg-red-100 border-red-300 text-red-700',
      medium: 'bg-yellow-100 border-yellow-300 text-yellow-700',
      low: 'bg-green-100 border-green-300 text-green-700',
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  // Render Month View
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDay = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {days.map((day, index) => {
          const dayReminders = getRemindersForDate(day);
          const isCurrentMonth = day.getMonth() === month;
          const isTodayDate = isToday(day);
          const hasOverdue = dayReminders.some(r => !r.completed && new Date(r.reminderDate) < new Date());
          
          return (
            <div
              key={index}
              onClick={() => setSelectedDate(day)}
              className={cn(
                'min-h-[100px] p-2 border rounded-lg cursor-pointer transition-all hover:shadow-md',
                isCurrentMonth ? 'bg-white' : 'bg-gray-50',
                isTodayDate && 'ring-2 ring-blue-500 bg-blue-50',
                selectedDate && isSameDay(day, selectedDate) && 'ring-2 ring-purple-500',
                hasOverdue && 'ring-2 ring-red-500'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  'text-sm font-semibold',
                  isCurrentMonth ? 'text-gray-900' : 'text-gray-400',
                  isTodayDate && 'text-blue-600'
                )}>
                  {day.getDate()}
                </span>
                {dayReminders.length > 0 && (
                  <span className="text-xs bg-purple-600 text-white rounded-full px-1.5 py-0.5">
                    {dayReminders.length}
                  </span>
                )}
              </div>
              
              <div className="space-y-1">
                {dayReminders.slice(0, 3).map(reminder => (
                  <div
                    key={reminder.id}
                    className={cn(
                      'text-xs p-1 rounded border truncate',
                      getPriorityColor(reminder.priority),
                      reminder.completed && 'opacity-50 line-through'
                    )}
                    title={reminder.note}
                  >
                    <span className="mr-1">{getReminderTypeIcon(reminder.reminderType)}</span>
                    {reminder.reminderTime && !reminder.isAllDay && (
                      <span className="font-semibold">{reminder.reminderTime} </span>
                    )}
                    {reminder.note.substring(0, 15)}
                  </div>
                ))}
                {dayReminders.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{dayReminders.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Week View
  const renderWeekView = () => {
    const weekStart = getWeekStart(currentDate);
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      days.push(day);
    }

    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          const dayReminders = getRemindersForDate(day);
          const isTodayDate = isToday(day);
          
          return (
            <div key={index} className="space-y-2">
              {/* Day header */}
              <div className={cn(
                'text-center p-2 rounded-lg',
                isTodayDate ? 'bg-blue-500 text-white' : 'bg-gray-100'
              )}>
                <div className="text-xs font-medium">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="text-lg font-bold">
                  {day.getDate()}
                </div>
              </div>
              
              {/* Reminders */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {dayReminders.map(reminder => {
                  const lead = getLead(reminder.leadId);
                  
                  return (
                    <div
                      key={reminder.id}
                      className={cn(
                        'p-2 rounded-lg border-l-4 text-xs',
                        getPriorityColor(reminder.priority),
                        reminder.completed && 'opacity-50'
                      )}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <button
                          onClick={() => handleToggle(reminder.id)}
                          className="flex-shrink-0"
                        >
                          {reminder.completed ? (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          ) : (
                            <Circle className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(reminder.id)}
                          className="flex-shrink-0 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <span>{getReminderTypeIcon(reminder.reminderType)}</span>
                          {!reminder.isAllDay && reminder.reminderTime && (
                            <span className="font-bold">{reminder.reminderTime}</span>
                          )}
                        </div>
                        <div className={cn(
                          'font-medium',
                          reminder.completed && 'line-through'
                        )}>
                          {reminder.note}
                        </div>
                        {lead && (
                          <div className="text-gray-600 truncate">
                            {lead.name}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {dayReminders.length === 0 && (
                  <div className="text-center text-gray-400 py-4 text-xs">
                    No reminders
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Day View
  const renderDayView = () => {
    const dayReminders = getRemindersForDate(currentDate);
    
    // Group by hour
    const hourlyReminders: Record<string, LeadReminder[]> = {};
    const allDayReminders: LeadReminder[] = [];
    
    dayReminders.forEach(reminder => {
      if (reminder.isAllDay || !reminder.reminderTime) {
        allDayReminders.push(reminder);
      } else {
        const hour = reminder.reminderTime.split(':')[0];
        if (!hourlyReminders[hour]) {
          hourlyReminders[hour] = [];
        }
        hourlyReminders[hour].push(reminder);
      }
    });

    return (
      <div className="space-y-4">
        {/* All-day reminders */}
        {allDayReminders.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">All Day</h3>
            <div className="space-y-2">
              {allDayReminders.map(reminder => renderReminderCard(reminder))}
            </div>
          </div>
        )}

        {/* Hourly schedule */}
        <div className="space-y-2">
          {Array.from({ length: 24 }, (_, i) => i).map(hour => {
            const hourStr = hour.toString().padStart(2, '0');
            const hourReminders = hourlyReminders[hourStr] || [];
            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            const period = hour < 12 ? 'AM' : 'PM';
            
            return (
              <div key={hour} className="flex gap-4">
                <div className="w-20 text-right text-sm font-medium text-gray-600 pt-2">
                  {displayHour}:00 {period}
                </div>
                <div className="flex-1 border-l-2 border-gray-200 pl-4 min-h-[60px]">
                  {hourReminders.length > 0 ? (
                    <div className="space-y-2">
                      {hourReminders.map(reminder => renderReminderCard(reminder))}
                    </div>
                  ) : (
                    <div className="h-full" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderReminderCard = (reminder: LeadReminder) => {
    const lead = getLead(reminder.leadId);
    const route = getRoute(reminder.routeId);
    
    return (
      <div
        key={reminder.id}
        className={cn(
          'p-3 rounded-lg border-l-4',
          getPriorityColor(reminder.priority),
          reminder.completed && 'opacity-60'
        )}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={() => handleToggle(reminder.id)}
            className="flex-shrink-0 mt-1"
          >
            {reminder.completed ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{getReminderTypeIcon(reminder.reminderType)}</span>
              <span className="text-xs font-medium text-gray-600">
                {getReminderTypeLabel(reminder.reminderType)}
              </span>
              {!reminder.isAllDay && reminder.reminderTime && (
                <span className="text-sm font-bold">
                  {formatReminderTime(reminder.reminderTime, reminder.isAllDay)}
                </span>
              )}
            </div>
            
            <h4 className={cn(
              'font-semibold text-gray-900 mb-1',
              reminder.completed && 'line-through'
            )}>
              {reminder.title || reminder.note}
            </h4>
            
            {lead && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-3 h-3" />
                <span>{lead.name}</span>
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                    {lead.phone}
                  </a>
                )}
              </div>
            )}
            
            {route && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-3 h-3" />
                <span>{route.name}</span>
              </div>
            )}
          </div>
          
          <button
            onClick={() => handleDelete(reminder.id)}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* View Mode Selector */}
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-all',
                viewMode === 'month'
                  ? 'bg-white shadow-md text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-all',
                viewMode === 'week'
                  ? 'bg-white shadow-md text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-all',
                viewMode === 'day'
                  ? 'bg-white shadow-md text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Day
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center space-x-4">
            <button
              onClick={goToPrevious}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Today
            </button>
            
            <button
              onClick={goToNext}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Current Period */}
          <div className="text-lg font-semibold text-gray-900">
            {getCalendarTitle()}
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="glass-card p-4">
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </div>

      {/* Selected Date Details (for month view) */}
      {viewMode === 'month' && selectedDate && (
        <div className="glass-card p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </h3>
          <div className="space-y-2">
            {getRemindersForDate(selectedDate).map(reminder => renderReminderCard(reminder))}
            {getRemindersForDate(selectedDate).length === 0 && (
              <p className="text-gray-500 text-center py-8">No reminders for this date</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
