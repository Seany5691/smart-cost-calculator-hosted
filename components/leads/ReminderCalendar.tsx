'use client';

/**
 * ReminderCalendar Component
 * 
 * Full calendar view for reminders with month/week/day views.
 * 
 * Features:
 * - Month/Week/Day view toggle
 * - Calendar grid with dates
 * - Navigation controls (Previous/Next/Today)
 * - Display reminders on calendar dates
 * - Visual indicators for reminder count
 * - Color coding by priority
 * - Click date to see reminders
 * - Responsive design
 */

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import type { LeadReminder } from '@/lib/leads/types';
import { getReminderTypeIcon, getReminderPriorityColor } from '@/lib/leads/types';

interface ReminderCalendarProps {
  reminders: LeadReminder[];
  onDateClick?: (date: Date, reminders: LeadReminder[]) => void;
}

type ViewMode = 'month' | 'week' | 'day';

export default function ReminderCalendar({ reminders, onDateClick }: ReminderCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // Navigation functions
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

  // Get calendar dates for month view
  const getMonthDates = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    const dates: Date[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }, [currentDate]);

  // Get calendar dates for week view
  const getWeekDates = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  }, [currentDate]);

  // Get reminders for a specific date
  const getRemindersForDate = (date: Date): LeadReminder[] => {
    const dateStr = date.toISOString().split('T')[0];
    return reminders.filter(r => {
      const reminderDateStr = r.reminder_date ? r.reminder_date.split('T')[0] : '';
      return reminderDateStr === dateStr;
    });
  };

  // Check if date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Check if date is in current month
  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth();
  };

  // Format header text
  const getHeaderText = (): string => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const weekDates = getWeekDates;
      const start = weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const end = weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${start} - ${end}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  // Render month view
  const renderMonthView = () => {
    const dates = getMonthDates;
    const weeks: Date[][] = [];
    
    for (let i = 0; i < dates.length; i += 7) {
      weeks.push(dates.slice(i, i + 7));
    }

    return (
      <div className="space-y-2">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-white/60 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="space-y-2">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-2">
              {week.map((date, dayIndex) => {
                const dateReminders = getRemindersForDate(date);
                const today = isToday(date);
                const currentMonth = isCurrentMonth(date);

                return (
                  <button
                    key={dayIndex}
                    onClick={() => onDateClick?.(date, dateReminders)}
                    className={`
                      min-h-[100px] p-2 rounded-lg border transition-all relative
                      ${today ? 'ring-2 ring-emerald-400 bg-white/5 border-emerald-500/30' : 'bg-white/5 border-white/10'}
                      ${!currentMonth ? 'opacity-40' : ''}
                      hover:bg-white/10 hover:border-emerald-500/30
                      ${dateReminders.length > 0 ? 'cursor-pointer' : ''}
                    `}
                  >
                    <div className="text-left h-full flex flex-col">
                      {/* Date number with indicator dots */}
                      <div className="flex items-center justify-between mb-2">
                        <div className={`text-sm font-semibold ${today ? 'text-emerald-400' : 'text-white'}`}>
                          {date.getDate()}
                        </div>
                        {dateReminders.length > 0 && (
                          <div className="flex items-center gap-1">
                            {/* Status indicator */}
                            <div className={`w-2 h-2 rounded-full ${
                              date < new Date(new Date().setHours(0, 0, 0, 0)) ? 'bg-red-500' :
                              isToday(date) ? 'bg-blue-500' :
                              'bg-green-500'
                            }`} />
                            {/* Count badge */}
                            <span className="text-[10px] font-bold bg-emerald-500 text-white rounded-full px-1.5 py-0.5">
                              {dateReminders.length}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Reminder previews */}
                      {dateReminders.length > 0 && (
                        <div className="space-y-1 flex-1 overflow-hidden">
                          {dateReminders.slice(0, 3).map(reminder => (
                            <div
                              key={reminder.id}
                              className={`text-xs px-1.5 py-0.5 rounded truncate ${
                                reminder.priority === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                reminder.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                'bg-green-500/20 text-green-400 border border-green-500/30'
                              }`}
                              title={reminder.message || reminder.title || ''}
                            >
                              <span className="mr-1">{getReminderTypeIcon(reminder.reminder_type)}</span>
                              {reminder.message?.slice(0, 12) || reminder.title?.slice(0, 12) || 'Reminder'}
                            </div>
                          ))}
                          {dateReminders.length > 3 && (
                            <div className="text-xs text-emerald-300 font-medium">
                              +{dateReminders.length - 3} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const dates = getWeekDates;

    return (
      <div className="space-y-2">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2">
          {dates.map((date, index) => {
            const today = isToday(date);
            return (
              <div
                key={index}
                className={`text-center py-2 rounded-lg ${today ? 'bg-blue-500/20' : ''}`}
              >
                <div className="text-xs text-white/60">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-lg font-bold ${today ? 'text-blue-400' : 'text-white'}`}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Reminders grid */}
        <div className="grid grid-cols-7 gap-2">
          {dates.map((date, index) => {
            const dateReminders = getRemindersForDate(date);
            const today = isToday(date);

            return (
              <button
                key={index}
                onClick={() => onDateClick?.(date, dateReminders)}
                className={`
                  min-h-[200px] p-3 rounded-lg border transition-all
                  ${today ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-white/10'}
                  hover:bg-white/10 hover:border-white/20
                `}
              >
                <div className="space-y-2">
                  {dateReminders.map(reminder => (
                    <div
                      key={reminder.id}
                      className={`text-xs p-2 rounded ${
                        reminder.priority === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        reminder.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                        'bg-green-500/20 text-green-400 border border-green-500/30'
                      }`}
                    >
                      <div className="font-medium mb-1">
                        {getReminderTypeIcon(reminder.reminder_type)} {reminder.reminder_time || 'All Day'}
                      </div>
                      <div className="truncate">{reminder.message || reminder.title}</div>
                    </div>
                  ))}
                  {dateReminders.length === 0 && (
                    <div className="text-xs text-white/40 text-center py-4">
                      No reminders
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const dateReminders = getRemindersForDate(currentDate);
    const today = isToday(currentDate);

    return (
      <div className="space-y-4">
        <div className={`text-center py-6 rounded-lg ${today ? 'bg-blue-500/20' : 'bg-white/5'}`}>
          <div className="text-sm text-white/60 mb-2">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </div>
          <div className={`text-4xl font-bold ${today ? 'text-blue-400' : 'text-white'}`}>
            {currentDate.getDate()}
          </div>
          <div className="text-sm text-white/60 mt-2">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
        </div>

        <div className="space-y-3">
          {dateReminders.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No reminders for this day</p>
            </div>
          ) : (
            dateReminders.map(reminder => (
              <div
                key={reminder.id}
                className={`p-4 rounded-lg border ${
                  reminder.priority === 'high' ? 'bg-red-500/10 border-red-500/30' :
                  reminder.priority === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30' :
                  'bg-green-500/10 border-green-500/30'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getReminderTypeIcon(reminder.reminder_type)}</span>
                    <div>
                      <div className="font-medium text-white">{reminder.title || reminder.message}</div>
                      <div className="text-sm text-white/60">{reminder.reminder_time || 'All Day'}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    reminder.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                    reminder.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {reminder.priority}
                  </span>
                </div>
                {reminder.description && (
                  <p className="text-sm text-white/70 mt-2">{reminder.description}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevious}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors text-sm font-medium"
          >
            Today
          </button>
          <button
            onClick={goToNext}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <h3 className="text-lg font-semibold text-white">{getHeaderText()}</h3>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'month'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'week'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'day'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
            }`}
          >
            Day
          </button>
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
        
        {/* Legend */}
        {viewMode === 'month' && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex items-center justify-center gap-6 text-xs text-emerald-200">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Past</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Today</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Future</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
