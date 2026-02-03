'use client';

import { useState } from 'react';
import { ReminderType, ReminderPriority, ReminderStatus } from '@/lib/leads/types';
import { Filter, X } from 'lucide-react';

interface ReminderFiltersProps {
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  type: ReminderType | 'all';
  priority: ReminderPriority | 'all';
  status: ReminderStatus | 'all';
  dateRange: 'all' | 'today' | 'tomorrow' | 'week' | 'custom';
  dateFrom?: string;
  dateTo?: string;
}

export default function ReminderFilters({ onFilterChange }: ReminderFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    priority: 'all',
    status: 'all',
    dateRange: 'all',
  });

  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    
    // Auto-calculate date range
    if (key === 'dateRange' && value !== 'custom') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      switch (value) {
        case 'today':
          newFilters.dateFrom = today.toISOString().split('T')[0];
          newFilters.dateTo = today.toISOString().split('T')[0];
          break;
        case 'tomorrow':
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          newFilters.dateFrom = tomorrow.toISOString().split('T')[0];
          newFilters.dateTo = tomorrow.toISOString().split('T')[0];
          break;
        case 'week':
          const nextWeek = new Date(today);
          nextWeek.setDate(nextWeek.getDate() + 7);
          newFilters.dateFrom = today.toISOString().split('T')[0];
          newFilters.dateTo = nextWeek.toISOString().split('T')[0];
          break;
        case 'all':
          delete newFilters.dateFrom;
          delete newFilters.dateTo;
          break;
      }
    }
    
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters: FilterState = {
      type: 'all',
      priority: 'all',
      status: 'all',
      dateRange: 'all',
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const hasActiveFilters = filters.type !== 'all' || filters.priority !== 'all' || 
                          filters.status !== 'all' || filters.dateRange !== 'all';

  return (
    <div className="relative">
      {/* Filter Toggle Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm">Filters</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
              Active
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Filter Panel - Absolutely positioned dropdown */}
      {showFilters && (
        <>
          {/* Backdrop to close dropdown */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowFilters(false)}
          />
          {/* Dropdown panel */}
          <div className="absolute left-0 top-full mt-2 w-80 bg-slate-800/95 backdrop-blur-xl border border-white/20 rounded-xl p-6 space-y-4 shadow-2xl z-50">
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Type</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="call">📞 Phone Call</option>
                <option value="email">📧 Email</option>
                <option value="meeting">📅 Meeting</option>
                <option value="task">📝 Task</option>
                <option value="followup">🔔 Follow-up</option>
                <option value="quote">💰 Quote</option>
                <option value="document">📄 Document</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="all">All Priorities</option>
                <option value="high">🔴 High Priority</option>
                <option value="medium">🟡 Medium Priority</option>
                <option value="low">🟢 Low Priority</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="pending">⏳ Pending</option>
                <option value="completed">✅ Completed</option>
                <option value="snoozed">💤 Snoozed</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="week">This Week</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Range */}
            {filters.dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">From</label>
                  <input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">To</label>
                  <input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
