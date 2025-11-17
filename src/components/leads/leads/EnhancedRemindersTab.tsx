'use client';

import { useState, useEffect } from 'react';
import { Bell, Calendar, Plus, Trash2, CheckCircle, Circle, Clock, AlertTriangle, Repeat, Edit2 } from 'lucide-react';
import { ConfirmModal } from '@/components/leads/ui/ConfirmModal';
import { useAuthStore } from '@/store/auth';
import { useRemindersStore, useLeadReminders } from '@/store/reminders';
import {
  ReminderType,
  ReminderPriority,
  RecurrencePattern,
  getReminderTypeIcon,
  getReminderTypeLabel,
  getReminderPriorityColor,
  formatReminderTime,
} from '@/lib/leads/supabaseNotesReminders';
import { cn } from '@/lib/utils';

interface EnhancedRemindersTabProps {
  leadId: string;
}

export const EnhancedRemindersTab = ({ leadId }: EnhancedRemindersTabProps) => {
  console.log('[EnhancedRemindersTab] Component mounted for lead:', leadId);
  
  const user = useAuthStore((state) => state.user);
  const reminders = useLeadReminders(leadId);
  const { addReminder, toggleComplete, deleteReminder, updateReminder } = useRemindersStore();
  
  console.log('[EnhancedRemindersTab] User:', user);
  console.log('[EnhancedRemindersTab] Reminders:', reminders);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<string | null>(null);
  
  // Form state
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [reminderType, setReminderType] = useState<ReminderType>('task');
  const [priority, setPriority] = useState<ReminderPriority>('medium');
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [deleteReminderId, setDeleteReminderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setReminderDate('');
    setReminderTime('09:00');
    setIsAllDay(false);
    setReminderType('task');
    setPriority('medium');
    setNote('');
    setIsRecurring(false);
    setRecurrenceType('weekly');
    setRecurrenceInterval(1);
    setRecurrenceEndDate('');
    setError(null);
    setEditingReminder(null);
  };

  const loadReminderForEdit = (reminderId: string) => {
    const reminder = reminders.find(r => r.id === reminderId);
    if (!reminder) return;

    setEditingReminder(reminderId);
    setReminderDate(reminder.reminderDate);
    setReminderTime(reminder.reminderTime || '09:00');
    setIsAllDay(reminder.isAllDay);
    setReminderType(reminder.reminderType);
    setPriority(reminder.priority);
    setNote(reminder.note);
    setIsRecurring(reminder.isRecurring);
    
    if (reminder.recurrencePattern) {
      setRecurrenceType(reminder.recurrencePattern.type);
      setRecurrenceInterval(reminder.recurrencePattern.interval);
      setRecurrenceEndDate(reminder.recurrencePattern.endDate || '');
    }
    
    setShowAddForm(true);
  };

  const handleSaveReminder = async () => {
    console.log('[EnhancedRemindersTab] handleSaveReminder called!');
    
    if (!user) {
      console.error('[EnhancedRemindersTab] No user - aborting');
      setError('User not authenticated');
      return;
    }

    if (!reminderDate) {
      console.error('[EnhancedRemindersTab] No date - aborting');
      setError('Please select a date');
      return;
    }

    if (!note.trim()) {
      setError('Please enter a note');
      return;
    }

    try {
      setLoading(true);
      
      const recurrencePattern: RecurrencePattern | null = isRecurring ? {
        type: recurrenceType,
        interval: recurrenceInterval,
        endDate: recurrenceEndDate || undefined,
      } : null;

      if (editingReminder) {
        // Update existing reminder
        await updateReminder(editingReminder, {
          reminderDate,
          reminderTime: isAllDay ? null : reminderTime,
          isAllDay,
          reminderType,
          priority,
          note: note.trim(),
          isRecurring,
          recurrencePattern,
        });
      } else {
        // Create new reminder
        await addReminder(
          leadId,
          user.id,
          reminderDate,
          note.trim(),
          {
            reminderTime: isAllDay ? null : reminderTime,
            isAllDay,
            reminderType,
            priority,
            isRecurring,
            recurrencePattern,
          }
        );
      }

      setShowAddForm(false);
      resetForm();
    } catch (error) {
      console.error('Error saving reminder:', error);
      setError('Failed to save reminder');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (reminderId: string) => {
    try {
      await toggleComplete(reminderId);
    } catch (error) {
      console.error('Error toggling reminder:', error);
    }
  };

  const handleDeleteReminder = (reminderId: string) => {
    setDeleteReminderId(reminderId);
  };

  const confirmDeleteReminder = async () => {
    if (!deleteReminderId) return;
    
    try {
      setLoading(true);
      await deleteReminder(deleteReminderId);
      setDeleteReminderId(null);
    } catch (error) {
      console.error('Error deleting reminder:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays <= 7) return `In ${diffDays} days`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  const getReminderStyle = (dateString: string, completed: boolean, priorityLevel: ReminderPriority) => {
    if (completed) return 'bg-gray-50 border-gray-200';

    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Priority-based colors
    if (diffDays < 0) return 'bg-red-50 border-red-300'; // Overdue
    if (diffDays === 0) {
      // Today - color by priority
      if (priorityLevel === 'high') return 'bg-red-50 border-red-300';
      if (priorityLevel === 'medium') return 'bg-yellow-50 border-yellow-300';
      return 'bg-green-50 border-green-300';
    }
    if (diffDays <= 2) return 'bg-blue-50 border-blue-300';
    return 'bg-purple-50 border-purple-200';
  };

  const getPriorityBadge = (priorityLevel: ReminderPriority) => {
    const styles = {
      high: 'bg-red-100 text-red-700 border-red-300',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      low: 'bg-green-100 text-green-700 border-green-300',
    };
    
    const labels = {
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    };

    return (
      <span className={cn('px-2 py-0.5 text-xs font-semibold rounded-full border', styles[priorityLevel])}>
        {labels[priorityLevel]}
      </span>
    );
  };

  const reminderTypes: { value: ReminderType; label: string; icon: string }[] = [
    { value: 'call', label: 'Phone Call', icon: '📞' },
    { value: 'email', label: 'Email', icon: '📧' },
    { value: 'meeting', label: 'Meeting', icon: '📅' },
    { value: 'task', label: 'Task', icon: '📝' },
    { value: 'followup', label: 'Follow-up', icon: '🔔' },
    { value: 'quote', label: 'Quote', icon: '💰' },
    { value: 'document', label: 'Document', icon: '📄' },
  ];

  return (
    <div className="space-y-4">
      {/* Add/Edit Reminder Button */}
      <button
        onClick={() => {
          resetForm();
          setShowAddForm(!showAddForm);
        }}
        className="btn btn-primary w-full sm:w-auto"
      >
        <Plus className="w-4 h-4 mr-2" />
        {editingReminder ? 'Cancel Edit' : 'Add Reminder'}
      </button>

      {/* Add/Edit Reminder Form */}
      {showAddForm && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border-2 border-blue-200 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Bell className="w-5 h-5 mr-2 text-blue-600" />
            {editingReminder ? 'Edit Reminder' : 'Create New Reminder'}
          </h3>

          {/* Reminder Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {reminderTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setReminderType(type.value)}
                  className={cn(
                    'p-3 rounded-lg border-2 transition-all text-center',
                    reminderType === type.value
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="text-xs font-medium">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['high', 'medium', 'low'] as ReminderPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    'p-3 rounded-lg border-2 transition-all font-medium',
                    priority === p
                      ? p === 'high' ? 'border-red-500 bg-red-50 text-red-700'
                        : p === 'medium' ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  {p === 'high' ? '🔴 High' : p === 'medium' ? '🟡 Medium' : '🟢 Low'}
                </button>
              ))}
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date *
              </label>
              <input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Time
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isAllDay}
                    onChange={(e) => setIsAllDay(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">All Day</span>
                </label>
                {!isAllDay && (
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note *
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What is this reminder for?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Recurring */}
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Repeat className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Recurring Reminder</span>
            </label>

            {isRecurring && (
              <div className="mt-3 p-4 bg-white rounded-lg border border-gray-200 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Repeat Every
                    </label>
                    <select
                      value={recurrenceType}
                      onChange={(e) => setRecurrenceType(e.target.value as any)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="daily">Day(s)</option>
                      <option value="weekly">Week(s)</option>
                      <option value="monthly">Month(s)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Interval
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    min={reminderDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex space-x-2">
            <button
              onClick={handleSaveReminder}
              disabled={loading}
              className="btn btn-primary flex-1"
            >
              {loading ? 'Saving...' : editingReminder ? 'Update Reminder' : 'Save Reminder'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                resetForm();
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reminders List */}
      {reminders.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No reminders yet</p>
          <p className="text-sm text-gray-500 mt-1">Add a reminder to keep track of follow-ups</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className={cn(
                'p-4 rounded-lg border-2 transition-all',
                getReminderStyle(reminder.reminderDate, reminder.completed, reminder.priority)
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3 flex-1">
                  <button
                    onClick={() => handleToggleComplete(reminder.id)}
                    className="mt-1 text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
                    aria-label={reminder.completed ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    {reminder.completed ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    {/* Type and Priority */}
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">{getReminderTypeIcon(reminder.reminderType)}</span>
                      <span className="text-xs font-medium text-gray-600">
                        {getReminderTypeLabel(reminder.reminderType)}
                      </span>
                      {getPriorityBadge(reminder.priority)}
                      {reminder.isRecurring && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 border border-purple-300 flex items-center">
                          <Repeat className="w-3 h-3 mr-1" />
                          Recurring
                        </span>
                      )}
                    </div>

                    {/* Date and Time */}
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <span className={cn(
                        'font-medium',
                        reminder.completed ? 'line-through text-gray-500' : 'text-gray-900'
                      )}>
                        {formatDate(reminder.reminderDate)}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({new Date(reminder.reminderDate).toLocaleDateString()})
                      </span>
                      {!reminder.isAllDay && reminder.reminderTime && (
                        <>
                          <Clock className="w-4 h-4 text-gray-600 ml-2" />
                          <span className="text-sm text-gray-700">
                            {formatReminderTime(reminder.reminderTime, reminder.isAllDay)}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Note */}
                    <p className={cn(
                      'text-sm',
                      reminder.completed ? 'line-through text-gray-500' : 'text-gray-700'
                    )}>
                      {reminder.note}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col space-y-2 flex-shrink-0">
                  <button
                    onClick={() => loadReminderForEdit(reminder.id)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    aria-label="Edit reminder"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteReminder(reminder.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Delete reminder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteReminderId !== null}
        onClose={() => setDeleteReminderId(null)}
        onConfirm={confirmDeleteReminder}
        title="Delete Reminder"
        message="Are you sure you want to delete this reminder?"
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};
