'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/auth';
import { useRemindersStore, useAllReminders } from '@/store/reminders';
import { useLeadsStore } from '@/store/leads/leads';
import { useRoutesStore } from '@/store/leads/routes';
import { 
  Bell, 
  Calendar as CalendarIcon, 
  Plus, 
  Filter,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  List,
  Grid,
  RefreshCw
} from 'lucide-react';
import { ReminderCalendar } from '@/components/leads/reminders/ReminderCalendar';
import { CreateReminderModal } from '@/components/leads/reminders/CreateReminderModal';
import { RemindersList } from '@/components/leads/reminders/RemindersList';
import { ReminderFilters } from '@/components/leads/reminders/ReminderFilters';
import { ReminderStats } from '@/components/leads/reminders/ReminderStats';
import type { ReminderType, ReminderPriority } from '@/lib/leads/supabaseNotesReminders';

export default function RemindersPage() {
  const user = useAuthStore((state) => state.user);
  const reminders = useAllReminders();
  const { fetchAllReminders } = useRemindersStore();
  const { allLeads, fetchAllLeadsForStats } = useLeadsStore();
  const { routes, fetchRoutes } = useRoutesStore();
  
  const [view, setView] = useState<'calendar' | 'list'>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterType, setFilterType] = useState<ReminderType | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<ReminderPriority | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'active' | 'completed' | 'all'>('active');
  const [filterDateRange, setFilterDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [loading, setLoading] = useState(false);

  // Load data
  useEffect(() => {
    if (user) {
      fetchAllReminders(user.id);
      fetchAllLeadsForStats();
      fetchRoutes();
    }
  }, [user]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      fetchAllReminders(user.id, true);
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  // Filter reminders
  const filteredReminders = useMemo(() => {
    let filtered = [...reminders];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(r => r.reminderType === filterType);
    }

    // Filter by priority
    if (filterPriority !== 'all') {
      filtered = filtered.filter(r => r.priority === filterPriority);
    }

    // Filter by status
    if (filterStatus === 'active') {
      filtered = filtered.filter(r => !r.completed);
    } else if (filterStatus === 'completed') {
      filtered = filtered.filter(r => r.completed);
    }

    // Filter by date range
    if (filterDateRange !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(r => {
        const reminderDate = new Date(r.reminderDate);
        reminderDate.setHours(0, 0, 0, 0);
        
        if (filterDateRange === 'today') {
          return reminderDate.getTime() === today.getTime();
        } else if (filterDateRange === 'week') {
          const weekFromNow = new Date(today);
          weekFromNow.setDate(weekFromNow.getDate() + 7);
          return reminderDate >= today && reminderDate <= weekFromNow;
        } else if (filterDateRange === 'month') {
          const monthFromNow = new Date(today);
          monthFromNow.setMonth(monthFromNow.getMonth() + 1);
          return reminderDate >= today && reminderDate <= monthFromNow;
        }
        return true;
      });
    }

    return filtered;
  }, [reminders, filterType, filterPriority, filterStatus, filterDateRange]);

  const handleRefresh = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await fetchAllReminders(user.id, true);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Bell className="w-8 h-8 mr-3 text-purple-600" />
            Reminders & Calendar
          </h1>
          <p className="text-gray-600 mt-1">
            Manage all your reminders, callbacks, and scheduled tasks
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="btn btn-secondary flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Reminder
          </button>
        </div>
      </div>

      {/* Stats */}
      <ReminderStats reminders={reminders} />

      {/* View Toggle and Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* View Toggle */}
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('calendar')}
              className={`px-4 py-2 rounded-md transition-all ${
                view === 'calendar'
                  ? 'bg-white shadow-md text-purple-600 font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarIcon className="w-4 h-4 inline mr-2" />
              Calendar
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-md transition-all ${
                view === 'list'
                  ? 'bg-white shadow-md text-purple-600 font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4 inline mr-2" />
              List
            </button>
          </div>

          {/* Filters */}
          <ReminderFilters
            filterType={filterType}
            filterPriority={filterPriority}
            filterStatus={filterStatus}
            filterDateRange={filterDateRange}
            onTypeChange={setFilterType}
            onPriorityChange={setFilterPriority}
            onStatusChange={setFilterStatus}
            onDateRangeChange={setFilterDateRange}
          />
        </div>
      </div>

      {/* Main Content */}
      {view === 'calendar' ? (
        <ReminderCalendar 
          reminders={filteredReminders}
          leads={allLeads}
          routes={routes}
        />
      ) : (
        <RemindersList
          reminders={filteredReminders}
          leads={allLeads}
          routes={routes}
        />
      )}

      {/* Create Reminder Modal */}
      <CreateReminderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        leads={allLeads.filter(l => l.status !== 'new')} // Exclude main sheet
        routes={routes}
      />
    </div>
  );
}
