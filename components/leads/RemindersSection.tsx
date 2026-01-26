'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-simple';
import { useToast } from '@/components/ui/Toast/useToast';

interface Reminder {
  id: string;
  lead_id: string;
  user_id: string;
  reminder_type: 'call' | 'email' | 'meeting' | 'follow_up' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string;
  title: string;
  description?: string;
  recurrence_pattern?: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  username: string;
  lead_name?: string;
  lead_phone?: string;
}

interface RemindersSectionProps {
  leadId?: string;
  showLeadInfo?: boolean;
}

export default function RemindersSection({ leadId, showLeadInfo = false }: RemindersSectionProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [categorized, setCategorized] = useState<{
    overdue: Reminder[];
    today: Reminder[];
    tomorrow: Reminder[];
    upcoming: Reminder[];
    future: Reminder[];
    completed: Reminder[];
  }>({
    overdue: [],
    today: [],
    tomorrow: [],
    upcoming: [],
    future: [],
    completed: [],
  });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [formData, setFormData] = useState({
    reminder_type: 'call' as const,
    priority: 'medium' as const,
    due_date: '',
    title: '',
    description: '',
    recurrence_pattern: '',
  });

  useEffect(() => {
    fetchReminders();
  }, [leadId, showCompleted]);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const url = leadId
        ? `/api/leads/${leadId}/reminders`
        : `/api/reminders?includeCompleted=${showCompleted}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch reminders');
      
      const data = await response.json();
      
      if (leadId) {
        setReminders(data.reminders);
        // Categorize client-side for lead-specific reminders
        categorizeReminders(data.reminders);
      } else {
        setReminders(data.reminders);
        setCategorized(data.categorized);
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const categorizeReminders = (remindersList: Reminder[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const cats = {
      overdue: [] as Reminder[],
      today: [] as Reminder[],
      tomorrow: [] as Reminder[],
      upcoming: [] as Reminder[],
      future: [] as Reminder[],
      completed: [] as Reminder[],
    };

    remindersList.forEach((reminder) => {
      const dueDate = new Date(reminder.due_date);
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

      if (reminder.completed) {
        cats.completed.push(reminder);
      } else if (dueDateOnly < today) {
        cats.overdue.push(reminder);
      } else if (dueDateOnly.getTime() === today.getTime()) {
        cats.today.push(reminder);
      } else if (dueDateOnly.getTime() === tomorrow.getTime()) {
        cats.tomorrow.push(reminder);
      } else if (dueDateOnly < nextWeek) {
        cats.upcoming.push(reminder);
      } else {
        cats.future.push(reminder);
      }
    });

    setCategorized(cats);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!leadId) {
      toast.error('Lead ID is required', {
        message: 'Cannot create reminder without a lead',
        section: 'leads'
      });
      return;
    }

    try {
      const response = await fetch(`/api/leads/${leadId}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create reminder');
      }

      // Reset form and refresh
      setFormData({
        reminder_type: 'call',
        priority: 'medium',
        due_date: '',
        title: '',
        description: '',
        recurrence_pattern: '',
      });
      setShowForm(false);
      fetchReminders();
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast.error('Failed to create reminder', {
        message: error instanceof Error ? error.message : 'Please try again',
        section: 'leads'
      });
    }
  };

  const toggleComplete = async (reminderId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/reminders/${reminderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentStatus }),
      });

      if (!response.ok) throw new Error('Failed to update reminder');
      
      fetchReminders();
    } catch (error) {
      console.error('Error toggling reminder:', error);
      toast.error('Failed to update reminder', {
        message: 'Please try again',
        section: 'leads'
      });
    }
  };

  const deleteReminder = async (reminderId: string) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) return;

    try {
      const response = await fetch(`/api/leads/${leadId}/reminders/${reminderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete reminder');
      
      fetchReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast.error('Failed to delete reminder', {
        message: 'Please try again',
        section: 'leads'
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return '📞';
      case 'email': return '📧';
      case 'meeting': return '🤝';
      case 'follow_up': return '🔄';
      default: return '📝';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const ReminderCard = ({ reminder }: { reminder: Reminder }) => (
    <div
      className={`p-4 rounded-lg border ${
        reminder.completed
          ? 'bg-white/5 border-white/10 opacity-60'
          : 'bg-white/10 border-white/20'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <input
            type="checkbox"
            checked={reminder.completed}
            onChange={() => toggleComplete(reminder.id, reminder.completed)}
            className="mt-1 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-lg">{getTypeIcon(reminder.reminder_type)}</span>
              <h4
                className={`font-medium ${
                  reminder.completed ? 'line-through text-gray-400' : 'text-white'
                }`}
              >
                {reminder.title}
              </h4>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(
                  reminder.priority
                )}`}
              >
                {reminder.priority}
              </span>
            </div>
            {reminder.description && (
              <p className="text-sm text-gray-300 mb-2">{reminder.description}</p>
            )}
            <div className="flex items-center space-x-4 text-xs text-gray-400">
              <span>📅 {formatDate(reminder.due_date)}</span>
              <span>👤 {reminder.user_name}</span>
              {showLeadInfo && reminder.lead_name && (
                <span>🏢 {reminder.lead_name}</span>
              )}
            </div>
            {reminder.recurrence_pattern && (
              <div className="mt-1 text-xs text-blue-400">
                🔄 {reminder.recurrence_pattern}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => deleteReminder(reminder.id)}
          className="text-red-400 hover:text-red-300 text-sm ml-2"
        >
          🗑️
        </button>
      </div>
    </div>
  );

  const ReminderCategory = ({ title, reminders, color }: { title: string; reminders: Reminder[]; color: string }) => {
    if (reminders.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className={`text-lg font-semibold mb-3 ${color}`}>
          {title} ({reminders.length})
        </h3>
        <div className="space-y-2">
          {reminders.map((reminder) => (
            <ReminderCard key={reminder.id} reminder={reminder} />
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-4">Loading reminders...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Reminders</h2>
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 text-sm text-white">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded"
            />
            <span>Show completed</span>
          </label>
          {leadId && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {showForm ? 'Cancel' : '+ Add Reminder'}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white/10 border border-white/20 p-4 rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">Type</label>
              <select
                value={formData.reminder_type}
                onChange={(e) =>
                  setFormData({ ...formData, reminder_type: e.target.value as any })
                }
                className="w-full px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              >
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="follow_up">Follow Up</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value as any })
                }
                className="w-full px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Due Date & Time</label>
            <input
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
              placeholder="e.g., Follow up call"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
              rows={3}
              placeholder="Additional details..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Recurrence (Optional)</label>
            <input
              type="text"
              value={formData.recurrence_pattern}
              onChange={(e) =>
                setFormData({ ...formData, recurrence_pattern: e.target.value })
              }
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
              placeholder="e.g., Daily, Weekly, Monthly"
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Reminder
          </button>
        </form>
      )}

      <div>
        <ReminderCategory title="⚠️ Overdue" reminders={categorized.overdue} color="text-red-400" />
        <ReminderCategory title="📅 Today" reminders={categorized.today} color="text-blue-400" />
        <ReminderCategory title="🌅 Tomorrow" reminders={categorized.tomorrow} color="text-purple-400" />
        <ReminderCategory title="📆 This Week" reminders={categorized.upcoming} color="text-green-400" />
        <ReminderCategory title="🗓️ Future" reminders={categorized.future} color="text-gray-400" />
        {showCompleted && (
          <ReminderCategory title="✅ Completed" reminders={categorized.completed} color="text-gray-500" />
        )}
      </div>

      {reminders.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No reminders yet. {leadId && 'Click "Add Reminder" to create one.'}
        </div>
      )}
    </div>
  );
}
