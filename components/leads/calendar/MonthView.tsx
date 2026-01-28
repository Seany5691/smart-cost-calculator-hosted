'use client';

import type { LeadReminder } from '@/lib/leads/types';

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  is_all_day: boolean;
  event_type: string;
  priority: string;
}

interface CalendarDate {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  reminders: LeadReminder[];
  events: CalendarEvent[];
}

interface MonthViewProps {
  currentDate: Date;
  reminders: LeadReminder[];
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
}

export default function MonthView({ currentDate, reminders, events, onDateClick }: MonthViewProps) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate calendar dates
  const calendarDates: CalendarDate[] = [];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay();
  const lastDay = new Date(year, month + 1, 0);
  const lastDate = lastDay.getDate();
  const prevMonthLastDay = new Date(year, month, 0);
  const prevMonthLastDate = prevMonthLastDay.getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Previous month trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonthLastDate - i);
    calendarDates.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      reminders: [],
      events: []
    });
  }

  // Current month days
  for (let day = 1; day <= lastDate; day++) {
    const date = new Date(year, month, day);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const dateReminders = reminders.filter(r => {
      if (!r.reminder_date) return false;
      return r.reminder_date.split('T')[0] === dateStr;
    });

    const dateEvents = events.filter(e => {
      if (!e.event_date) return false;
      return e.event_date.split('T')[0] === dateStr;
    });

    calendarDates.push({
      date,
      isCurrentMonth: true,
      isToday: date.getTime() === today.getTime(),
      reminders: dateReminders,
      events: dateEvents
    });
  }

  // Next month leading days
  const remainingCells = 42 - calendarDates.length;
  for (let day = 1; day <= remainingCells; day++) {
    const date = new Date(year, month + 1, day);
    calendarDates.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      reminders: [],
      events: []
    });
  }

  const getDateIndicators = (calendarDate: CalendarDate) => {
    const hasItems = calendarDate.reminders.length > 0 || calendarDate.events.length > 0;
    if (!hasItems) return null;
    
    const dateTime = calendarDate.date.getTime();
    const todayTime = today.getTime();
    
    let statusColor = '';
    if (dateTime < todayTime) {
      statusColor = 'bg-red-500';
    } else if (dateTime === todayTime) {
      statusColor = 'bg-blue-500';
    } else {
      statusColor = 'bg-green-500';
    }
    
    return {
      statusColor,
      reminderCount: calendarDate.reminders.length,
      eventCount: calendarDate.events.length,
      totalCount: calendarDate.reminders.length + calendarDate.events.length
    };
  };

  return (
    <div>
      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-sm font-semibold text-emerald-200 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDates.map((calendarDate, index) => {
          const hasItems = calendarDate.reminders.length > 0 || calendarDate.events.length > 0;
          const indicators = getDateIndicators(calendarDate);
          
          return (
            <button
              key={index}
              onClick={() => hasItems && onDateClick(calendarDate.date)}
              disabled={!hasItems}
              className={`
                relative aspect-square p-2 rounded-lg text-sm
                transition-all duration-200 min-h-[60px]
                ${calendarDate.isCurrentMonth ? 'text-white' : 'text-emerald-400/50'}
                ${calendarDate.isToday ? 'ring-2 ring-emerald-400' : ''}
                ${hasItems ? 'bg-white/5 hover:bg-white/10 cursor-pointer border border-emerald-500/20 hover:border-emerald-500/40' : 'hover:bg-white/5'}
                ${!hasItems && !calendarDate.isCurrentMonth ? 'opacity-50' : ''}
              `}
            >
              <div className="flex flex-col h-full">
                <span className="font-semibold text-base mb-1">{calendarDate.date.getDate()}</span>
                
                {indicators && (
                  <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                    {indicators.totalCount > 0 && (
                      <div className="text-[10px] text-emerald-300">
                        {indicators.eventCount > 0 && <div>📅 {indicators.eventCount}</div>}
                        {indicators.reminderCount > 0 && <div>🔔 {indicators.reminderCount}</div>}
                      </div>
                    )}
                  </div>
                )}
                
                {indicators && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${indicators.statusColor}`} />
                    {indicators.eventCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                    {indicators.reminderCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
                  </div>
                )}
                
                {indicators && indicators.totalCount > 1 && (
                  <div className="absolute top-1 right-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {indicators.totalCount}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
