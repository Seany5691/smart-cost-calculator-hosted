'use client';

import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Phone, MapPin, CheckCircle, Circle } from 'lucide-react';
import { Lead } from '@/lib/leads/types';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useRemindersStore, useAllReminders } from '@/store/reminders';

interface CallbackCalendarProps {
  leads: Lead[];
  onLeadClick?: (lead: Lead) => void;
}

export const CallbackCalendar = ({ leads, onLeadClick }: CallbackCalendarProps) => {
  const user = useAuthStore((state) => state.user);
  const reminders = useAllReminders();
  const { fetchAllReminders, toggleComplete } = useRemindersStore();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Load reminders from PostgreSQL
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

  // Get reminders grouped by date
  const remindersByDate = useMemo(() => {
    const grouped: Record<string, Array<any & { lead?: Lead }>> = {};
    
    reminders.forEach(reminder => {
      const lead = leads.find(l => l.id === reminder.leadId);
      if (lead && !reminder.completed) {
        const dateKey = new Date(reminder.reminderDate).toDateString();
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push({ ...reminder, lead });
      }
    });
    
    return grouped;
  }, [reminders, leads]);

  // Get calendar days based on view
  const calendarDays = useMemo(() => {
    if (view === 'day') {
      return [new Date(currentDate)];
    }
    
    if (view === 'week') {
      const days: Date[] = [];
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      
      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(day.getDate() + i);
        days.push(day);
      }
      return days;
    }
    
    // Month view
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: Date[] = [];
    const current = new Date(startDate);
    
    while (days.length < 42) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentDate, view]);

  const getDateStatus = (date: Date) => {
    const dateKey = date.toDateString();
    const reminders = remindersByDate[dateKey] || [];
    
    if (reminders.length === 0) return null;
    
    const dateTime = date.getTime();
    const todayTime = today.getTime();
    
    if (dateTime < todayTime) return 'overdue';
    if (dateTime === todayTime) return 'today';
    if (dateTime <= todayTime + 2 * 24 * 60 * 60 * 1000) return 'upcoming';
    return 'future';
  };

  const handleToggleReminder = async (reminderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleComplete(reminderId);
    } catch (error) {
      console.error('Error toggling reminder:', error);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'today': return 'bg-green-500 text-white';
      case 'upcoming': return 'bg-blue-500 text-white';
      case 'overdue': return 'bg-red-500 text-white';
      case 'future': return 'bg-gray-400 text-white';
      default: return '';
    }
  };

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (view === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <CalendarIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-semibold text-gray-900">Reminders Calendar</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setView('month')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
              view === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            Month
          </button>
          <button
            onClick={() => setView('week')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
              view === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            Week
          </button>
          <button
            onClick={() => setView('day')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
              view === 'day'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            Day
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrev}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center space-x-3">
          <h3 className="text-xl font-bold text-gray-900">
            {view === 'day' 
              ? currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
              : view === 'week'
              ? `Week of ${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            }
          </h3>
          <button
            onClick={handleToday}
            className="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>
        
        <button
          onClick={handleNext}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      {view === 'day' ? (
        /* Day View - Detailed List */
        <div className="space-y-3">
          {calendarDays.map((date) => {
            const dateKey = date.toDateString();
            const reminders = remindersByDate[dateKey] || [];

            return (
              <div key={dateKey}>
                {reminders.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No reminders for this day</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reminders.map((reminder) => {
                      const lead = reminder.lead!;
                      return (
                        <div
                          key={reminder.id}
                          className="p-4 bg-white border-2 border-blue-200 rounded-lg hover:shadow-md transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={(e) => handleToggleReminder(reminder.id, e)}
                              className="mt-1 flex-shrink-0"
                            >
                              {reminder.completed ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <Circle className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                            <div className="flex-1">
                              <h4
                                onClick={() => onLeadClick?.(lead)}
                                className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                              >
                                {lead.name}
                              </h4>
                              <p className="text-sm text-gray-700 mt-1">📝 {reminder.note}</p>
                              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                                {lead.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    <a href={`tel:${lead.phone}`} className="hover:text-blue-600">
                                      {lead.phone}
                                    </a>
                                  </div>
                                )}
                                {lead.type_of_business && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    <span>{lead.type_of_business}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Month/Week View - Grid */
        <div className={cn('grid gap-2', view === 'week' ? 'grid-cols-7' : 'grid-cols-7')}>
          {/* Day Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarDays.map((date, index) => {
            const dateKey = date.toDateString();
            const reminders = remindersByDate[dateKey] || [];
            const status = getDateStatus(date);
            const statusColor = getStatusColor(status);

            return (
              <div
                key={index}
                className={cn(
                  'min-h-[80px] p-2 border border-gray-200 rounded-lg transition-all',
                  view === 'month' && !isCurrentMonth(date) && 'bg-gray-50 opacity-50',
                  isToday(date) && 'ring-2 ring-blue-500',
                  reminders.length > 0 && 'cursor-pointer hover:shadow-md'
                )}
                onClick={() => reminders.length > 0 && onLeadClick?.(reminders[0].lead!)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    'text-sm font-medium',
                    isToday(date) ? 'text-blue-600 font-bold' : 'text-gray-700'
                  )}>
                    {date.getDate()}
                  </span>
                  {reminders.length > 0 && (
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full font-medium',
                      statusColor
                    )}>
                      {reminders.length}
                    </span>
                  )}
                </div>
                
                {reminders.length > 0 && (
                  <div className="space-y-1">
                    {reminders.slice(0, 2).map(reminder => (
                      <div
                        key={reminder.id}
                        className="text-xs p-1 bg-white rounded border border-gray-200 truncate"
                        title={`${reminder.lead?.name} - ${reminder.note}`}
                      >
                        {reminder.lead?.name}
                      </div>
                    ))}
                    {reminders.length > 2 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{reminders.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-sm text-gray-600">Today</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-sm text-gray-600">Upcoming (2 days)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-sm text-gray-600">Overdue</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
          <span className="text-sm text-gray-600">Future</span>
        </div>
      </div>
    </div>
  );
};
