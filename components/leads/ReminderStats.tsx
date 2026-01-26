'use client';

import { LeadReminder } from '@/lib/leads/types';
import { Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ReminderStatsProps {
  reminders: LeadReminder[];
}

export default function ReminderStats({ reminders }: ReminderStatsProps) {
  // Calculate statistics
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const stats = {
    total: reminders.length,
    overdue: reminders.filter(r => {
      if (r.completed || r.status === 'completed') return false;
      const dueDate = r.reminder_date ? new Date(r.reminder_date) : new Date(r.reminder_date || '');
      return dueDate < today;
    }).length,
    today: reminders.filter(r => {
      if (r.completed || r.status === 'completed') return false;
      const dueDate = r.reminder_date ? new Date(r.reminder_date) : new Date(r.reminder_date || '');
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      return dueDateOnly.getTime() === today.getTime();
    }).length,
    upcoming: reminders.filter(r => {
      if (r.completed || r.status === 'completed') return false;
      const dueDate = r.reminder_date ? new Date(r.reminder_date) : new Date(r.reminder_date || '');
      return dueDate > today;
    }).length,
    completed: reminders.filter(r => r.completed || r.status === 'completed').length,
    highPriority: reminders.filter(r => r.priority === 'high' && !r.completed && r.status !== 'completed').length,
  };

  const statisticCards = [
    { 
      count: stats.total, 
      label: 'Total', 
      description: 'All reminders',
      gradient: 'from-blue-500 to-cyan-500',
      icon: <Calendar className="w-5 h-5" />
    },
    { 
      count: stats.overdue, 
      label: 'Overdue', 
      description: 'Past due date',
      gradient: 'from-red-500 to-rose-500',
      icon: <AlertCircle className="w-5 h-5" />
    },
    { 
      count: stats.today, 
      label: 'Today', 
      description: 'Due today',
      gradient: 'from-yellow-500 to-orange-500',
      icon: <Clock className="w-5 h-5" />
    },
    { 
      count: stats.upcoming, 
      label: 'Upcoming', 
      description: 'Future reminders',
      gradient: 'from-green-500 to-emerald-500',
      icon: <Calendar className="w-5 h-5" />
    },
    { 
      count: stats.completed, 
      label: 'Completed', 
      description: 'Finished tasks',
      gradient: 'from-gray-500 to-slate-500',
      icon: <CheckCircle2 className="w-5 h-5" />
    },
    { 
      count: stats.highPriority, 
      label: 'High Priority', 
      description: 'Urgent items',
      gradient: 'from-orange-500 to-red-500',
      icon: <AlertCircle className="w-5 h-5" />
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {statisticCards.map((card, index) => (
        <div
          key={index}
          className="group relative overflow-hidden glass-card p-4 text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl"
        >
          {/* Content */}
          <div className="relative z-10">
            <div className={`text-3xl font-bold mb-1 bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
              {card.count}
            </div>
            <div className="text-sm font-semibold mb-1">{card.label}</div>
            <div className="text-xs text-emerald-200/80">{card.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
