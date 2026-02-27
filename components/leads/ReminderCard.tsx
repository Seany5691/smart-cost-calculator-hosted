'use client';

import { Calendar as CalendarIcon, Bell, Clock, CheckCircle, Plus } from 'lucide-react';
import type { LeadReminder } from '@/lib/leads/types';

interface ReminderCardProps {
  reminder: LeadReminder | {
    id: string;
    lead_id: string;
    reminder_type: string;
    priority: string;
    due_date: string;
    title: string;
    description?: string;
    completed: boolean;
    completed_at?: string;
    created_at: string;
    lead_name?: string;
    lead_phone?: string;
  };
  fullReminder?: LeadReminder;
  isSelected: boolean;
  onToggleSelect?: (id: string) => void;
  onEdit: () => void;
  onComplete: () => void;
  onDelete: () => void;
  onClick: () => void;
  formatReminderDateTime: () => string;
  getCategoryBadge: (reminder: any) => JSX.Element;
  getPriorityColor: (priority: string) => string;
}

export default function ReminderCard({
  reminder,
  fullReminder,
  isSelected,
  onToggleSelect,
  onEdit,
  onComplete,
  onDelete,
  onClick,
  formatReminderDateTime,
  getCategoryBadge,
  getPriorityColor
}: ReminderCardProps) {
  // Get the title from either title or message field
  const displayTitle = ('title' in reminder ? reminder.title : null) || 
                       ('message' in reminder ? reminder.message : null) || 
                       'Reminder';
  
  return (
    <div 
      className={`
        group relative overflow-hidden rounded-2xl transition-all duration-300
        ${reminder.completed 
          ? 'bg-gradient-to-br from-green-900/20 to-emerald-900/10 opacity-70 hover:opacity-85' 
          : 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:from-slate-800/70 hover:to-slate-900/70'
        }
        ${isSelected ? 'ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/20' : 'shadow-lg hover:shadow-xl'}
        backdrop-blur-sm border border-white/10 hover:border-white/20
        cursor-pointer hover:scale-[1.01]
      `}
      onClick={onClick}
    >
      {/* Gradient accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${
        reminder.completed ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
        getCategoryBadge(reminder).props.className.includes('red') ? 'bg-gradient-to-r from-red-500 to-orange-500' :
        getCategoryBadge(reminder).props.className.includes('blue') ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
        getCategoryBadge(reminder).props.className.includes('purple') ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
        'bg-gradient-to-r from-emerald-500 to-teal-500'
      }`} />

      <div className="p-4 md:p-6">
        {/* Header Row */}
        <div className="flex items-start gap-3 md:gap-4 mb-4">
          {/* Checkbox */}
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect(reminder.id);
              }}
              className="mt-1.5 w-5 h-5 rounded-md border-2 border-emerald-500/50 bg-slate-800/50 text-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer transition-all hover:border-emerald-400"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {/* Icon & Title Section */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 mb-3">
              {/* Type Icon with gradient background */}
              <div className={`
                flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center text-2xl md:text-3xl
                ${reminder.completed 
                  ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20' 
                  : 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20'
                }
                shadow-inner
              `}>
                {reminder.reminder_type === 'callback' ? '📞' :
                 reminder.reminder_type === 'follow_up' ? '📧' :
                 reminder.reminder_type === 'meeting' ? '🤝' :
                 reminder.reminder_type === 'email' ? '✉️' : '🔔'}
              </div>

              {/* Title & Badges */}
              <div className="flex-1 min-w-0">
                <h3 className={`text-lg md:text-xl font-bold text-white mb-2 leading-tight ${reminder.completed ? 'line-through opacity-70' : ''}`}>
                  {displayTitle}
                </h3>
                
                {/* Compact Badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {getCategoryBadge(reminder)}
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${getPriorityColor(reminder.priority)} shadow-sm`}>
                    {reminder.priority.toUpperCase()}
                  </span>
                  {reminder.completed && (
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-green-500/20 text-green-300 border border-green-500/30 shadow-sm">
                      ✓ Done
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {reminder.description && (
              <p className={`text-sm md:text-base text-gray-300 mb-4 leading-relaxed ${reminder.completed ? 'line-through opacity-60' : ''}`}>
                {reminder.description}
              </p>
            )}

            {/* Lead Info - Elegant card */}
            {'lead_name' in reminder && reminder.lead_name && (
              <div className="mb-4 p-3 md:p-4 bg-gradient-to-r from-white/5 to-white/10 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">Lead</p>
                </div>
                <p className="text-base md:text-lg text-white font-semibold">
                  {reminder.lead_name}
                </p>
                {'lead_phone' in reminder && reminder.lead_phone && (
                  <p className="text-sm text-gray-400 mt-1">📞 {reminder.lead_phone}</p>
                )}
              </div>
            )}

            {/* Info Pills - Flowing layout */}
            <div className="flex flex-wrap gap-2 mb-4">
              {/* Date & Time Pill */}
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <CalendarIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="text-sm text-white font-medium">{formatReminderDateTime()}</span>
              </div>

              {/* Type Pill */}
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <Bell className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span className="text-sm text-white font-medium capitalize">{reminder.reminder_type.replace('_', ' ')}</span>
              </div>

              {/* Created By Pill */}
              {fullReminder?.username && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <span className="text-sm text-emerald-300 font-medium">👤 {fullReminder.username || fullReminder.user_name}</span>
                </div>
              )}
            </div>

            {/* Metadata - Subtle text */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Created {new Date(reminder.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              {'completed_at' in reminder && reminder.completed_at && (
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Completed {new Date(reminder.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons - Modern design */}
        <div className="flex gap-2 pt-4 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onEdit}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 border border-blue-500/30 hover:border-blue-400/50 text-blue-300 hover:text-blue-200 rounded-xl transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow-md min-h-[44px]"
          >
            <Plus className="w-4 h-4 rotate-45" />
            <span>Edit</span>
          </button>
          {reminder.completed ? (
            <button
              onClick={onComplete}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 hover:from-blue-500/30 hover:to-indigo-500/30 border border-blue-500/30 hover:border-blue-400/50 text-blue-300 hover:text-blue-200 rounded-xl transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow-md min-h-[44px]"
            >
              <Clock className="w-4 h-4" />
              <span>Reopen</span>
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 border border-green-500/30 hover:border-green-400/50 text-green-300 hover:text-green-200 rounded-xl transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow-md min-h-[44px]"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Complete</span>
            </button>
          )}
          <button
            onClick={onDelete}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500/20 to-pink-500/20 hover:from-red-500/30 hover:to-pink-500/30 border border-red-500/30 hover:border-red-400/50 text-red-300 hover:text-red-200 rounded-xl transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow-md min-h-[44px]"
          >
            <Bell className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
}
