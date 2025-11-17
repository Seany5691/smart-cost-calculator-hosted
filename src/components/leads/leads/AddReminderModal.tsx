'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Bell, 
  Calendar, 
  Clock, 
  AlertTriangle,
  Repeat
} from 'lucide-react';
import type { ReminderType, ReminderPriority, RecurrencePattern } from '@/lib/leads/supabaseNotesReminders';
import { useAuthStore } from '@/store/auth';
import { useRemindersStore } from '@/store/reminders';
import { cn } from '@/lib/utils';

interface AddReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  onReminderAdded?: () => void;
}

export const AddReminderModal = ({ isOpen, onClose, leadId, leadName, onReminderAdded }: AddReminderModalProps) => {
  const user = useAuthStore((state) => state.user);
  const { addReminder } = useRemindersStore();
  
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

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
  };

  const handleSubmit = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    if (!reminderDate) {
      setError('Please select a date');
      return;
    }

    if (!note.trim()) {
      setError('Please enter a note');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const recurrencePattern: RecurrencePattern | null = isRecurring ? {
        type: recurrenceType,
        interval: recurrenceInterval,
        endDate: recurrenceEndDate || undefined,
      } : null;

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

      if (onReminderAdded) {
        onReminderAdded();
      }

      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating reminder:', error);
      setError('Failed to create reminder');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const reminderTypes: { value: ReminderType; label: string; icon: string }[] = [
    { value: 'call', label: 'Phone Call', icon: '📞' },
    { value: 'email', label: 'Email', icon: '📧' },
    { value: 'meeting', label: 'Meeting', icon: '📅' },
    { value: 'task', label: 'Task', icon: '📝' },
    { value: 'followup', label: 'Follow-up', icon: '🔔' },
    { value: 'quote', label: 'Quote', icon: '💰' },
    { value: 'document', label: 'Document', icon: '📄' },
  ];

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-t-2xl z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Add Reminder</h2>
                  <p className="text-purple-100 text-sm">{leadName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Reminder Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Type *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {reminderTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setReminderType(type.value)}
                    className={cn(
                      'p-3 rounded-lg border-2 transition-all text-center hover:scale-105',
                      reminderType === type.value
                        ? 'border-purple-500 bg-purple-50 shadow-md'
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
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Priority *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['high', 'medium', 'low'] as ReminderPriority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all font-semibold hover:scale-105',
                      priority === p
                        ? p === 'high' ? 'border-red-500 bg-red-50 text-red-700 shadow-md'
                          : p === 'medium' ? 'border-yellow-500 bg-yellow-50 text-yellow-700 shadow-md'
                          : 'border-green-500 bg-green-50 text-green-700 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                    )}
                  >
                    {p === 'high' ? '🔴 High Priority' : p === 'medium' ? '🟡 Medium Priority' : '🟢 Low Priority'}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Time
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAllDay}
                      onChange={(e) => setIsAllDay(e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700 font-medium">All Day</span>
                  </label>
                  {!isAllDay && (
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Recurring */}
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <Repeat className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Recurring Reminder</span>
              </label>

              {isRecurring && (
                <div className="mt-3 p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Repeat Every
                      </label>
                      <select
                        value={recurrenceType}
                        onChange={(e) => setRecurrenceType(e.target.value as any)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
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
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
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
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex justify-end space-x-3 rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? 'Creating...' : 'Create Reminder'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};
