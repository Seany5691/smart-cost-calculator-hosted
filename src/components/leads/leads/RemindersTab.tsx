'use client';

import { useState, useEffect } from 'react';
import { Bell, Calendar, Plus, Trash2, CheckCircle, Circle } from 'lucide-react';
import { ConfirmModal } from '@/components/leads/ui/ConfirmModal';
import { useAuthStore } from '@/store/auth';
import { useRemindersStore, useLeadReminders } from '@/store/reminders';

interface RemindersTabProps {
  leadId: string;
}

// Import the enhanced version
import { EnhancedRemindersTab } from './EnhancedRemindersTab';

export const RemindersTab = ({ leadId }: RemindersTabProps) => {
  // Use the enhanced version
  return <EnhancedRemindersTab leadId={leadId} />;
};

// Keep old version as backup (commented out)
/*
export const RemindersTabOld = ({ leadId }: RemindersTabProps) => {
  console.log('[RemindersTab] Component mounted for lead:', leadId);
  
  const user = useAuthStore((state) => state.user);
  const reminders = useLeadReminders(leadId);
  const { addReminder, toggleComplete, deleteReminder } = useRemindersStore();
  
  console.log('[RemindersTab] User:', user);
  console.log('[RemindersTab] Reminders:', reminders);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderNote, setNewReminderNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleteReminderId, setDeleteReminderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAddReminder = async () => {
    console.log('[RemindersTab] handleAddReminder called!');
    console.log('[RemindersTab] User:', user);
    console.log('[RemindersTab] Date:', newReminderDate);
    console.log('[RemindersTab] Note:', newReminderNote);
    
    if (!user) {
      console.error('[RemindersTab] No user - aborting');
      setError('User not authenticated');
      return;
    }

    if (!newReminderDate) {
      console.error('[RemindersTab] No date - aborting');
      setError('Please select a date');
      return;
    }

    try {
      setLoading(true);
      console.log('[RemindersTab] Creating reminder:', { leadId, userId: user.id, date: newReminderDate, note: newReminderNote });
      
      const createdReminder = await addReminder(
        leadId,
        user.id,
        newReminderDate,
        newReminderNote.trim() || 'Reminder'
      );
      
      console.log('[RemindersTab] Reminder created successfully:', createdReminder);

      setShowAddForm(false);
      setNewReminderDate('');
      setNewReminderNote('');
      setError(null);
    } catch (error) {
      console.error('Error adding reminder:', error);
      setError('Failed to add reminder');
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

  const getReminderStyle = (dateString: string, completed: boolean) => {
    if (completed) return 'bg-gray-50 border-gray-200';

    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'bg-red-50 border-red-300';
    if (diffDays === 0) return 'bg-green-50 border-green-300';
    if (diffDays <= 2) return 'bg-blue-50 border-blue-300';
    return 'bg-purple-50 border-purple-200';
  };

  return (
    <div className="space-y-4">
      {/* Add Reminder Button */}
      <button
        onClick={() => setShowAddForm(!showAddForm)}
        className="btn btn-primary w-full sm:w-auto"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Reminder
      </button>

      {/* Add Reminder Form */}
      {showAddForm && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date *
            </label>
            <input
              type="date"
              value={newReminderDate}
              onChange={(e) => setNewReminderDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note
            </label>
            <textarea
              value={newReminderNote}
              onChange={(e) => setNewReminderNote(e.target.value)}
              placeholder="What is this reminder for?"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex space-x-2">
            <button
              onClick={handleAddReminder}
              className="btn btn-primary"
            >
              Save Reminder
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewReminderDate('');
                setNewReminderNote('');
                setError(null);
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
              className={`p-4 rounded-lg border-2 transition-all ${getReminderStyle(reminder.reminderDate, reminder.completed)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <button
                    onClick={() => handleToggleComplete(reminder.id)}
                    className="mt-1 text-gray-600 hover:text-gray-900 transition-colors"
                    aria-label={reminder.completed ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    {reminder.completed ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <span className={`font-medium ${reminder.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {formatDate(reminder.reminderDate)}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({new Date(reminder.reminderDate).toLocaleDateString()})
                      </span>
                    </div>
                    <p className={`mt-1 text-sm ${reminder.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                      {reminder.note}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteReminder(reminder.id)}
                  className="ml-2 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label="Delete reminder"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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

*/
