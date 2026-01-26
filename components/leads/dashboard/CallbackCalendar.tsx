'use client';

/**
 * Callback Calendar Component
 * 
 * Displays a monthly calendar highlighting dates with reminders
 * 
 * Requirements: 33.1-33.20
 */

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, User, MapPin, Phone, Clock } from 'lucide-react';
import type { LeadReminder, Lead } from '@/lib/leads/types';
import { getReminderTypeIcon, getReminderTypeLabel, getReminderPriorityLabel, formatReminderTime } from '@/lib/leads/types';

interface CallbackCalendarProps {
  reminders: LeadReminder[];
  leads: Lead[];
  onLeadClick: (leadId: string) => void;
}

interface CalendarDate {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  reminders: LeadReminder[];
}

export default function CallbackCalendar({ reminders, leads, onLeadClick }: CallbackCalendarProps) {
  const [mounted, setMounted] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showPopover, setShowPopover] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Get lead data for a reminder
  const getLeadData = (leadId: string) => {
    return leads.find(l => l.id === leadId);
  };

  // Day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate calendar dates for current month
  const calendarDates = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const lastDate = lastDay.getDate();
    
    // Previous month's last days
    const prevMonthLastDay = new Date(year, month, 0);
    const prevMonthLastDate = prevMonthLastDay.getDate();
    
    const dates: CalendarDate[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Add previous month's trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDate - i);
      dates.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        reminders: []
      });
    }
    
    // Add current month's days
    for (let day = 1; day <= lastDate; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const isToday = date.getTime() === today.getTime();
      
      // Find reminders on this date
      const dateReminders = reminders.filter(reminder => {
        if (!reminder.reminder_date) return false;
        const reminderDate = new Date(reminder.reminder_date);
        return reminderDate.toISOString().split('T')[0] === dateStr;
      });
      
      dates.push({
        date,
        isCurrentMonth: true,
        isToday,
        reminders: dateReminders
      });
    }
    
    // Add next month's leading days to complete the grid (6 rows x 7 days = 42 cells)
    const remainingCells = 42 - dates.length;
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(year, month + 1, day);
      dates.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        reminders: []
      });
    }
    
    return dates;
  }, [currentMonth, reminders]);

  // Navigate to previous month
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  // Navigate to next month
  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Handle date click
  const handleDateClick = (calendarDate: CalendarDate) => {
    if (calendarDate.reminders.length > 0) {
      setSelectedDate(calendarDate.date);
      setShowPopover(true);
    }
  };

  // Close popover
  const handleClosePopover = () => {
    setShowPopover(false);
    setSelectedDate(null);
  };

  // Get reminders for selected date
  const selectedDateReminders = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.toISOString().split('T')[0];
    return reminders.filter(reminder => {
      if (!reminder.reminder_date) return false;
      const reminderDate = new Date(reminder.reminder_date);
      return reminderDate.toISOString().split('T')[0] === dateStr;
    });
  }, [selectedDate, reminders]);

  // Get color for date based on reminder status
  const getDateColor = (calendarDate: CalendarDate) => {
    if (calendarDate.reminders.length === 0) return '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateTime = calendarDate.date.getTime();
    const todayTime = today.getTime();
    
    // Requirement: 33.11 - Color coding: past (red), today (blue), future (green)
    if (dateTime < todayTime) {
      return 'bg-red-100 text-red-700 border-red-300';
    } else if (dateTime === todayTime) {
      return 'bg-blue-100 text-blue-700 border-blue-300';
    } else {
      return 'bg-green-100 text-green-700 border-green-300';
    }
  };

  return (
    <div className="relative">
      {/* Month/Year header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5 text-emerald-300" />
        </button>
        
        <h3 className="text-lg font-semibold text-white">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5 text-emerald-300" />
        </button>
      </div>

      {/* Day names row */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div
            key={day}
            className="text-center text-xs sm:text-sm font-semibold text-emerald-200 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid (6 rows x 7 columns) - scrollable on mobile */}
      <div className="overflow-x-auto -mx-2 px-2 lg:mx-0 lg:px-0">
        <div className="grid grid-cols-7 gap-1 min-w-[280px]">
          {calendarDates.map((calendarDate, index) => {
            const hasReminders = calendarDate.reminders.length > 0;
            const colorClass = getDateColor(calendarDate);
            
            return (
              <button
                key={index}
                onClick={() => handleDateClick(calendarDate)}
                disabled={!hasReminders}
                className={`
                  relative aspect-square p-1 sm:p-2 rounded-lg text-xs sm:text-sm
                  transition-all duration-200 min-w-[44px] min-h-[44px]
                  ${calendarDate.isCurrentMonth ? 'text-white' : 'text-emerald-400/50'}
                  ${calendarDate.isToday ? 'ring-2 ring-emerald-500' : ''}
                  ${hasReminders ? `${colorClass} cursor-pointer hover:scale-105 hover:shadow-md border-2` : 'hover:bg-white/5'}
                  ${!hasReminders && !calendarDate.isCurrentMonth ? 'opacity-50' : ''}
                `}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <span className="font-medium">{calendarDate.date.getDate()}</span>
                  {hasReminders && (
                    <span className="text-xs font-bold mt-1">
                      {calendarDate.reminders.length}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Popover with reminder details */}
      {showPopover && selectedDate && mounted && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden border border-emerald-500/30">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
              <h3 className="text-lg font-semibold text-white">
                Reminders for {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
              <button
                onClick={handleClosePopover}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-emerald-200" />
              </button>
            </div>

            {/* Reminder list */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar space-y-3">
              {selectedDateReminders.map(reminder => {
                const leadData = getLeadData(reminder.lead_id || '');
                const isCompleted = reminder.completed || reminder.status === 'completed';
                
                return (
                  <button
                    key={reminder.id}
                    onClick={() => {
                      if (reminder.lead_id) {
                        onLeadClick(reminder.lead_id);
                      }
                      handleClosePopover();
                    }}
                    className="w-full text-left p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    {/* Type and Priority */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl" title={getReminderTypeLabel(reminder.reminder_type)}>
                        {getReminderTypeIcon(reminder.reminder_type)}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
                        {getReminderPriorityLabel(reminder.priority)}
                      </span>
                      {isCompleted && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                          ✅ Completed
                        </span>
                      )}
                    </div>

                    {/* Message */}
                    <div className={`font-semibold text-white mb-2 ${isCompleted ? 'line-through opacity-60' : ''}`}>
                      {reminder.message || reminder.title || reminder.description || 'No message'}
                    </div>

                    {/* Lead Details */}
                    {leadData && (
                      <div className="space-y-1 text-sm text-emerald-200">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5" />
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
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{leadData.town}</span>
                          </div>
                        )}
                        {leadData.phone && (
                          <div className="flex items-center gap-2 text-emerald-300">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{leadData.phone}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Time */}
                    <div className="flex items-center gap-2 mt-2 text-xs text-emerald-300">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatReminderTime(reminder.reminder_time || null, reminder.is_all_day)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-emerald-200">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
          <span>Past</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
          <span>Future</span>
        </div>
      </div>
    </div>
  );
}
