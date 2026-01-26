'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/auth-simple';
import { Bell, Calendar as CalendarIcon, Plus, Filter, Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface Reminder {
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
}

interface CategorizedReminders {
  overdue: Reminder[];
  today: Reminder[];
  tomorrow: Reminder[];
  upcoming: Reminder[];
  future: Reminder[];
  completed: Reminder[];
}

export default function RemindersPage() {
  const { token } = useAuthStore();
  const [reminders, setReminders] = useState<CategorizedReminders | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'active' | 'completed' | 'all'>('active');

  useEffect(() => {
    if (token) {
      fetchReminders();
    }
  }, [token]);

  const fetchReminders = async () => {
    try {
      const response = await fetch('/api/reminders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setReminders(data.categorized);
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReminder = async (reminderId: string, leadId: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/reminders/${reminderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ completed: true })
      });

      if (response.ok) {
        fetchReminders();
      }
    } catch (error) {
      console.error('Error completing reminder:', error);
    }
  };

  const handleDeleteReminder = async (reminderId: string, leadId: string) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) return;

    try {
      const response = await fetch(`/api/leads/${leadId}/reminders/${reminderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        fetchReminders();
      }
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  const getFilteredReminders = () => {
    if (!reminders) return [];

    let allReminders: Reminder[] = [];
    
    if (filterStatus === 'active') {
      allReminders = [
        ...reminders.overdue,
        ...reminders.today,
        ...reminders.tomorrow,
        ...reminders.upcoming,
        ...reminders.future
      ];
    } else if (filterStatus === 'completed') {
      allReminders = reminders.completed;
    } else {
      allReminders = [
        ...reminders.overdue,
        ...reminders.today,
        ...reminders.tomorrow,
        ...reminders.upcoming,
        ...reminders.future,
        ...reminders.completed
      ];
    }

    // Apply type filter
    if (filterType !== 'all') {
      allReminders = allReminders.filter(r => r.reminder_type === filterType);
    }

    // Apply priority filter
    if (filterPriority !== 'all') {
      allReminders = allReminders.filter(r => r.priority === filterPriority);
    }

    return allReminders;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-900/30 border-red-500/50';
      case 'high': return 'text-orange-400 bg-orange-900/30 border-orange-500/50';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/50';
      case 'low': return 'text-green-400 bg-green-900/30 border-green-500/50';
      default: return 'text-gray-400 bg-gray-900/30 border-gray-500/50';
    }
  };

  const getCategoryBadge = (reminder: Reminder) => {
    if (reminder.completed) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-900/50 text-green-300 border border-green-500/50">Completed</span>;
    }

    const dueDate = new Date(reminder.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

    if (dueDateOnly < today) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-900/50 text-red-300 border border-red-500/50">Overdue</span>;
    } else if (dueDateOnly.getTime() === today.getTime()) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-900/50 text-blue-300 border border-blue-500/50">Today</span>;
    } else if (dueDateOnly.getTime() === new Date(today.getTime() + 86400000).getTime()) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-900/50 text-purple-300 border border-purple-500/50">Tomorrow</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-900/50 text-gray-300 border border-gray-500/50">Upcoming</span>;
    }
  };

  const filteredReminders = getFilteredReminders();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="ml-3 text-gray-300">Loading reminders...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Reminders</h2>
        <p className="text-gray-300">
          Manage all your lead reminders and callbacks
        </p>
      </div>

      {/* Stats */}
      {reminders && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <div className="text-sm text-gray-400">Overdue</div>
            </div>
            <div className="text-2xl font-bold text-white">{reminders.overdue.length}</div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <div className="text-sm text-gray-400">Today</div>
            </div>
            <div className="text-2xl font-bold text-white">{reminders.today.length}</div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarIcon className="w-5 h-5 text-purple-400" />
              <div className="text-sm text-gray-400">Upcoming</div>
            </div>
            <div className="text-2xl font-bold text-white">
              {reminders.tomorrow.length + reminders.upcoming.length + reminders.future.length}
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div className="text-sm text-gray-400">Completed</div>
            </div>
            <div className="text-2xl font-bold text-white">{reminders.completed.length}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-5 h-5 text-gray-400" />
          <span className="text-white font-medium">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="callback">Callback</option>
              <option value="follow_up">Follow Up</option>
              <option value="meeting">Meeting</option>
              <option value="email">Email</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reminders List */}
      {filteredReminders.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No reminders found</h3>
          <p className="text-gray-400">
            {filterStatus !== 'all' || filterType !== 'all' || filterPriority !== 'all'
              ? 'Try adjusting your filters'
              : 'Create reminders from the lead details page'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReminders.map((reminder) => (
            <div key={reminder.id} className="glass-card p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-white">{reminder.title}</h3>
                    {getCategoryBadge(reminder)}
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(reminder.priority)}`}>
                      {reminder.priority}
                    </span>
                  </div>
                  {reminder.description && (
                    <p className="text-sm text-gray-400 mb-2">{reminder.description}</p>
                  )}
                  {reminder.lead_name && (
                    <p className="text-sm text-gray-500">
                      Lead: {reminder.lead_name}
                      {reminder.lead_phone && ` (${reminder.lead_phone})`}
                    </p>
                  )}
                </div>
                {!reminder.completed && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCompleteReminder(reminder.id, reminder.lead_id)}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Complete
                    </button>
                    <button
                      onClick={() => handleDeleteReminder(reminder.id, reminder.lead_id)}
                      className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>📅 {new Date(reminder.due_date).toLocaleDateString()}</span>
                <span>🏷️ {reminder.reminder_type}</span>
                <span>🕐 Created {new Date(reminder.created_at).toLocaleDateString()}</span>
                {reminder.completed_at && (
                  <span>✅ Completed {new Date(reminder.completed_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
