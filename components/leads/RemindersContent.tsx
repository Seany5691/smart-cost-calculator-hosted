'use client';

/**
 * RemindersContent Component
 * 
 * Displays all reminders from all leads with filtering and grouping capabilities.
 * 
 * Features:
 * - Statistics dashboard
 * - Advanced filters (type, priority, status, date range)
 * - Group reminders by date
 * - Create reminder button
 * - Auto-refresh every 30 seconds
 * - Empty state
 * - Responsive design
 * 
 * Validates: Requirements 13.1-13.19
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRemindersStore } from '@/lib/store/reminders';
import { useLeadsStore } from '@/lib/store/leads';
import { Bell, Calendar, Loader2, Plus, RefreshCw, List, CalendarDays, CheckSquare } from 'lucide-react';
import type { LeadReminder } from '@/lib/leads/types';
import ReminderCard from '@/components/leads/ReminderCard';
import ReminderStats from '@/components/leads/ReminderStats';
import ReminderFilters, { FilterState } from '@/components/leads/ReminderFilters';
import ReminderCalendar from '@/components/leads/ReminderCalendar';
import CreateReminderModal from '@/components/leads/CreateReminderModal';
import ReminderBulkActions from '@/components/leads/ReminderBulkActions';

interface GroupedReminders {
  overdue: LeadReminder[];
  today: LeadReminder[];
  tomorrow: LeadReminder[];
  thisWeek: LeadReminder[];
  nextWeek: LeadReminder[];
  later: LeadReminder[];
}

export default function RemindersContent() {
  const { reminders, loading, fetchAllReminders, refreshReminders } = useRemindersStore();
  const { leads, fetchLeads } = useLeadsStore();
  
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    priority: 'all',
    status: 'all',
    dateRange: 'all',
  });
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'type'>('date');
  const [isTyping, setIsTyping] = useState(false);

  // Fetch reminders and leads on mount
  useEffect(() => {
    fetchAllReminders();
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Auto-refresh every 30 seconds - but pause when modal is open or user is typing
  useEffect(() => {
    // Don't auto-refresh if modal is open or user is typing to prevent interrupting user input
    if (showCreateModal || isTyping) {
      return;
    }

    const interval = setInterval(() => {
      // Call refreshReminders without causing re-renders
      refreshReminders();
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreateModal, isTyping]); // Re-run when modal state or typing state changes

  // Handle filter changes - wrapped in useCallback for stability
  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    
    // Fetch with new filters
    fetchAllReminders(
      newFilters.status !== 'all' ? newFilters.status : undefined,
      newFilters.dateFrom,
      newFilters.dateTo,
      newFilters.type !== 'all' ? newFilters.type : undefined,
      newFilters.priority !== 'all' ? newFilters.priority : undefined
    );
  }, [fetchAllReminders]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshReminders();
    setTimeout(() => setRefreshing(false), 500);
  };

  // Handle bulk selection toggle
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Handle bulk action complete
  const handleBulkActionComplete = () => {
    refreshReminders();
  };

  // Helper function to get lead name by ID
  const getLeadName = (leadId: string | null): string => {
    if (!leadId) return 'Standalone Reminder';
    const lead = leads.find(l => l.id === leadId);
    return lead?.name || 'Unknown Lead';
  };

  // Helper function to get lead status by ID
  const getLeadStatus = (leadId: string | null): string => {
    if (!leadId) return 'new';
    const lead = leads.find(l => l.id === leadId);
    return lead?.status || 'new';
  };

  // Extended type for reminders with joined lead data
  type ReminderWithLeadData = LeadReminder & {
    lead_name?: string;
    lead_contact_person?: string;
    lead_town?: string;
    lead_phone?: string;
  };

  // Helper function to get lead data by ID
  const getLeadData = (reminder: LeadReminder) => {
    const reminderWithData = reminder as ReminderWithLeadData;
    
    // First check if lead data is already in the reminder object (from API)
    if (reminderWithData.lead_name) {
      return {
        name: reminderWithData.lead_name,
        contact_person: reminderWithData.lead_contact_person,
        town: reminderWithData.lead_town,
        phone: reminderWithData.lead_phone
      };
    }
    
    // Fallback to leads store
    if (!reminder.lead_id) return undefined;
    const lead = leads.find(l => l.id === reminder.lead_id);
    if (!lead) return undefined;
    return {
      name: lead.name,
      contact_person: lead.contact_person,
      town: lead.town,
      phone: lead.phone
    };
  };

  // Group filtered reminders
  const displayGroups = useMemo((): GroupedReminders => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const twoWeeks = new Date(today);
    twoWeeks.setDate(twoWeeks.getDate() + 14);

    const groups: GroupedReminders = {
      overdue: [],
      today: [],
      tomorrow: [],
      thisWeek: [],
      nextWeek: [],
      later: []
    };

    reminders.forEach(reminder => {
      // Skip completed reminders unless status filter is 'completed'
      if ((reminder.completed || reminder.status === 'completed') && filters.status !== 'completed') {
        return;
      }

      const reminderDate = reminder.reminder_date ? new Date(reminder.reminder_date) : new Date(reminder.reminder_date || '');
      const reminderDateOnly = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate());

      if (reminderDateOnly < today) {
        groups.overdue.push(reminder);
      } else if (reminderDateOnly.getTime() === today.getTime()) {
        groups.today.push(reminder);
      } else if (reminderDateOnly.getTime() === tomorrow.getTime()) {
        groups.tomorrow.push(reminder);
      } else if (reminderDateOnly < nextWeek) {
        groups.thisWeek.push(reminder);
      } else if (reminderDateOnly < twoWeeks) {
        groups.nextWeek.push(reminder);
      } else {
        groups.later.push(reminder);
      }
    });

    // Sort each group by date and time (earliest first)
    Object.keys(groups).forEach(key => {
      groups[key as keyof GroupedReminders].sort((a, b) => {
        const timeA = a.reminder_time || '00:00';
        const timeB = b.reminder_time || '00:00';
        const dateA = new Date(`${a.reminder_date}T${timeA}`);
        const dateB = new Date(`${b.reminder_date}T${timeB}`);
        return dateA.getTime() - dateB.getTime();
      });
    });

    return groups;
  }, [reminders, filters.status]);

  const totalReminders = Object.values(displayGroups).reduce((sum, group) => sum + group.length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-white/60">Loading reminders...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Reminders</h2>
          <p className="text-white/60 mt-1">
            Manage all your lead reminders and follow-ups
          </p>
        </div>
      </div>

      {/* Statistics */}
      <ReminderStats reminders={reminders} />

      {/* View Mode Toggle */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-1 bg-white/10 border-2 border-white/20 rounded-xl p-1.5 shadow-lg">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              viewMode === 'list'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <List className="w-5 h-5" />
            <span>List View</span>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              viewMode === 'calendar'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <CalendarDays className="w-5 h-5" />
            <span>Calendar View</span>
          </button>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center gap-3 flex-wrap">
        <ReminderFilters onFilterChange={handleFilterChange} />
        
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm">Refresh</span>
        </button>

        <button
          onClick={() => {
            setBulkSelectMode(!bulkSelectMode);
            setSelectedIds([]);
          }}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
            bulkSelectMode
              ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span className="text-sm">{bulkSelectMode ? 'Cancel Select' : 'Select Multiple'}</span>
        </button>

        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'priority' | 'type')}
            className="appearance-none px-4 py-2 pr-10 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-sm cursor-pointer transition-colors focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="date" className="bg-gray-800">Sort by Date</option>
            <option value="priority" className="bg-gray-800">Sort by Priority</option>
            <option value="type" className="bg-gray-800">Sort by Type</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl ml-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Create Reminder</span>
        </button>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <ReminderCalendar
          reminders={reminders}
          onDateClick={(date, dateReminders) => {
            // Could open a modal showing reminders for that date
            console.log('Date clicked:', date, dateReminders);
          }}
        />
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {/* Empty State */}
          {totalReminders === 0 && (
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl p-12 text-center">
              <Bell className="w-16 h-16 text-white/40 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                No reminders found
              </h3>
              <p className="text-white/60">
                {filters.type !== 'all' || filters.priority !== 'all' || filters.status !== 'all' || filters.dateRange !== 'all'
                  ? 'Try adjusting your filters to see more reminders'
                  : 'Create reminders from lead details to stay on top of follow-ups'}
              </p>
            </div>
          )}

          {/* Grouped Reminders */}
          {totalReminders > 0 && (
            <div className="space-y-6">
              {/* Overdue */}
              {displayGroups.overdue.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-5 h-5 text-red-400" />
                    <h3 className="text-lg font-semibold text-white">
                      Overdue ({displayGroups.overdue.length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {displayGroups.overdue.map(reminder => (
                      <ReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        leadName={getLeadName(reminder.lead_id)}
                        leadStatus={getLeadStatus(reminder.lead_id)}
                        leadData={getLeadData(reminder)}
                        isSelected={selectedIds.includes(reminder.id)}
                        onToggleSelect={bulkSelectMode ? handleToggleSelect : undefined}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Today */}
              {displayGroups.today.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-lg font-semibold text-white">
                      Today ({displayGroups.today.length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {displayGroups.today.map(reminder => (
                      <ReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        leadName={getLeadName(reminder.lead_id)}
                        leadStatus={getLeadStatus(reminder.lead_id)}
                        leadData={getLeadData(reminder)}
                        isSelected={selectedIds.includes(reminder.id)}
                        onToggleSelect={bulkSelectMode ? handleToggleSelect : undefined}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Tomorrow */}
              {displayGroups.tomorrow.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">
                      Tomorrow ({displayGroups.tomorrow.length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {displayGroups.tomorrow.map(reminder => (
                      <ReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        leadName={getLeadName(reminder.lead_id)}
                        leadStatus={getLeadStatus(reminder.lead_id)}
                        leadData={getLeadData(reminder)}
                        isSelected={selectedIds.includes(reminder.id)}
                        onToggleSelect={bulkSelectMode ? handleToggleSelect : undefined}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* This Week */}
              {displayGroups.thisWeek.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">
                      This Week ({displayGroups.thisWeek.length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {displayGroups.thisWeek.map(reminder => (
                      <ReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        leadName={getLeadName(reminder.lead_id)}
                        leadStatus={getLeadStatus(reminder.lead_id)}
                        leadData={getLeadData(reminder)}
                        isSelected={selectedIds.includes(reminder.id)}
                        onToggleSelect={bulkSelectMode ? handleToggleSelect : undefined}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Next Week */}
              {displayGroups.nextWeek.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-5 h-5 text-green-400" />
                    <h3 className="text-lg font-semibold text-white">
                      Next Week ({displayGroups.nextWeek.length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {displayGroups.nextWeek.map(reminder => (
                      <ReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        leadName={getLeadName(reminder.lead_id)}
                        leadStatus={getLeadStatus(reminder.lead_id)}
                        leadData={getLeadData(reminder)}
                        isSelected={selectedIds.includes(reminder.id)}
                        onToggleSelect={bulkSelectMode ? handleToggleSelect : undefined}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Later */}
              {displayGroups.later.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <h3 className="text-lg font-semibold text-white">
                      Later ({displayGroups.later.length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {displayGroups.later.map(reminder => (
                      <ReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        leadName={getLeadName(reminder.lead_id)}
                        leadStatus={getLeadStatus(reminder.lead_id)}
                        leadData={getLeadData(reminder)}
                        isSelected={selectedIds.includes(reminder.id)}
                        onToggleSelect={bulkSelectMode ? handleToggleSelect : undefined}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Create Reminder Modal */}
      <CreateReminderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Bulk Actions */}
      {bulkSelectMode && (
        <ReminderBulkActions
          selectedIds={selectedIds}
          onClearSelection={() => {
            setSelectedIds([]);
            setBulkSelectMode(false);
          }}
          onActionComplete={handleBulkActionComplete}
        />
      )}
    </div>
  );
}
