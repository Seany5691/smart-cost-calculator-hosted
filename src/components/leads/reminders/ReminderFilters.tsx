'use client';

import { Filter, X } from 'lucide-react';
import type { ReminderType, ReminderPriority } from '@/lib/leads/supabaseNotesReminders';

interface ReminderFiltersProps {
  filterType: ReminderType | 'all';
  filterPriority: ReminderPriority | 'all';
  filterStatus: 'active' | 'completed' | 'all';
  filterDateRange: 'today' | 'week' | 'month' | 'all';
  onTypeChange: (type: ReminderType | 'all') => void;
  onPriorityChange: (priority: ReminderPriority | 'all') => void;
  onStatusChange: (status: 'active' | 'completed' | 'all') => void;
  onDateRangeChange: (range: 'today' | 'week' | 'month' | 'all') => void;
}

export const ReminderFilters = ({
  filterType,
  filterPriority,
  filterStatus,
  filterDateRange,
  onTypeChange,
  onPriorityChange,
  onStatusChange,
  onDateRangeChange,
}: ReminderFiltersProps) => {
  const hasActiveFilters = 
    filterType !== 'all' || 
    filterPriority !== 'all' || 
    filterStatus !== 'active' || 
    filterDateRange !== 'all';

  const clearFilters = () => {
    onTypeChange('all');
    onPriorityChange('all');
    onStatusChange('active');
    onDateRangeChange('all');
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Filter className="w-4 h-4" />
        <span className="font-medium">Filters:</span>
      </div>

      {/* Type Filter */}
      <select
        value={filterType}
        onChange={(e) => onTypeChange(e.target.value as ReminderType | 'all')}
        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
      >
        <option value="all">All Types</option>
        <option value="call">📞 Calls</option>
        <option value="email">📧 Emails</option>
        <option value="meeting">📅 Meetings</option>
        <option value="task">📝 Tasks</option>
        <option value="followup">🔔 Follow-ups</option>
        <option value="quote">💰 Quotes</option>
        <option value="document">📄 Documents</option>
      </select>

      {/* Priority Filter */}
      <select
        value={filterPriority}
        onChange={(e) => onPriorityChange(e.target.value as ReminderPriority | 'all')}
        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
      >
        <option value="all">All Priorities</option>
        <option value="high">🔴 High</option>
        <option value="medium">🟡 Medium</option>
        <option value="low">🟢 Low</option>
      </select>

      {/* Status Filter */}
      <select
        value={filterStatus}
        onChange={(e) => onStatusChange(e.target.value as 'active' | 'completed' | 'all')}
        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
      >
        <option value="active">Active Only</option>
        <option value="completed">Completed Only</option>
        <option value="all">All Status</option>
      </select>

      {/* Date Range Filter */}
      <select
        value={filterDateRange}
        onChange={(e) => onDateRangeChange(e.target.value as 'today' | 'week' | 'month' | 'all')}
        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
      >
        <option value="all">All Dates</option>
        <option value="today">Today</option>
        <option value="week">This Week</option>
        <option value="month">This Month</option>
      </select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
          <span>Clear</span>
        </button>
      )}
    </div>
  );
};
