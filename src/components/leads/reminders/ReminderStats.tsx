'use client';

import { useMemo } from 'react';
import { Bell, AlertCircle, CheckCircle, Clock, TrendingUp, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReminderStatsProps {
  reminders: any[];
}

export const ReminderStats = ({ reminders }: ReminderStatsProps) => {
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const active = reminders.filter(r => !r.completed);
    const completed = reminders.filter(r => r.completed);

    const overdue = active.filter(r => {
      const reminderDate = new Date(r.reminderDate);
      reminderDate.setHours(0, 0, 0, 0);
      return reminderDate < today;
    });

    const todayReminders = active.filter(r => {
      const reminderDate = new Date(r.reminderDate);
      reminderDate.setHours(0, 0, 0, 0);
      return reminderDate.getTime() === today.getTime();
    });

    const thisWeek = active.filter(r => {
      const reminderDate = new Date(r.reminderDate);
      reminderDate.setHours(0, 0, 0, 0);
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return reminderDate >= today && reminderDate <= weekFromNow;
    });

    // By type
    const byType = active.reduce((acc, r) => {
      acc[r.reminderType] = (acc[r.reminderType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // By priority
    const byPriority = {
      high: active.filter(r => r.priority === 'high').length,
      medium: active.filter(r => r.priority === 'medium').length,
      low: active.filter(r => r.priority === 'low').length,
    };

    // Completion rate
    const completionRate = reminders.length > 0 
      ? Math.round((completed.length / reminders.length) * 100)
      : 0;

    return {
      total: reminders.length,
      active: active.length,
      completed: completed.length,
      overdue: overdue.length,
      today: todayReminders.length,
      thisWeek: thisWeek.length,
      byType,
      byPriority,
      completionRate,
    };
  }, [reminders]);

  const statCards = [
    {
      label: 'Total Reminders',
      value: stats.total,
      icon: Bell,
      color: 'from-blue-500 to-cyan-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Overdue',
      value: stats.overdue,
      icon: AlertCircle,
      color: 'from-red-500 to-pink-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
      highlight: stats.overdue > 0,
    },
    {
      label: 'Today',
      value: stats.today,
      icon: Calendar,
      color: 'from-green-500 to-emerald-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
      highlight: stats.today > 0,
    },
    {
      label: 'This Week',
      value: stats.thisWeek,
      icon: Clock,
      color: 'from-purple-500 to-indigo-500',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'from-teal-500 to-cyan-500',
      textColor: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
    {
      label: 'Completion Rate',
      value: `${stats.completionRate}%`,
      icon: TrendingUp,
      color: 'from-orange-500 to-yellow-500',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={cn(
                'glass-card p-4 transition-all duration-300 hover:scale-105',
                stat.highlight && 'ring-2 ring-red-500 animate-pulse'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                  <Icon className={cn('w-5 h-5', stat.textColor)} />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
              <div className="text-xs text-gray-600 font-medium">
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Type */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Bell className="w-5 h-5 mr-2 text-blue-600" />
            By Type
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.byType).map(([type, count]) => {
              const typeIcons: Record<string, string> = {
                call: '📞',
                email: '📧',
                meeting: '📅',
                task: '📝',
                followup: '🔔',
                quote: '💰',
                document: '📄',
              };
              const percentage = stats.active > 0 ? Math.round((count / stats.active) * 100) : 0;
              
              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{typeIcons[type] || '📝'}</span>
                    <span className="text-sm font-medium text-gray-700 capitalize">{type}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-8 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
            {Object.keys(stats.byType).length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No active reminders</p>
            )}
          </div>
        </div>

        {/* By Priority */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-orange-600" />
            By Priority
          </h3>
          <div className="space-y-3">
            {[
              { key: 'high', label: 'High Priority', color: 'bg-red-600', icon: '🔴' },
              { key: 'medium', label: 'Medium Priority', color: 'bg-yellow-600', icon: '🟡' },
              { key: 'low', label: 'Low Priority', color: 'bg-green-600', icon: '🟢' },
            ].map(({ key, label, color, icon }) => {
              const count = stats.byPriority[key as keyof typeof stats.byPriority];
              const percentage = stats.active > 0 ? Math.round((count / stats.active) * 100) : 0;
              
              return (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{icon}</span>
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className={cn('h-2 rounded-full transition-all duration-300', color)}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-8 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
