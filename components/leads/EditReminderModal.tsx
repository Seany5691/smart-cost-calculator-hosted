'use client';

/**
 * EditReminderModal Component
 * 
 * Modal for editing existing reminders with all fields.
 * 
 * Features:
 * - React Portal implementation for proper z-index layering
 * - Glassmorphic design with emerald theme
 * - All reminder fields editable
 * - Type and priority selection
 * - Date and time pickers
 * - All-day toggle
 * - Validation
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, Repeat, AlertCircle, Bell } from 'lucide-react';
import { useRemindersStore } from '@/lib/store/reminders';
import { useLeadsStore } from '@/lib/store/leads';
import type { LeadReminder, ReminderType, ReminderPriority, RecurrencePattern, UpdateReminderRequest } from '@/lib/leads/types';
import { getReminderTypeIcon, getReminderTypeLabel } from '@/lib/leads/types';

interface EditReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: LeadReminder;
}

export default function EditReminderModal({ isOpen, onClose, reminder }: EditReminderModalProps) {
  const { updateReminder } = useRemindersStore();
  const { leads } = useLeadsStore();

  // CRITICAL: Mounted state for SSR safety
  const [mounted, setMounted] = useState(false);

  const [formData, setFormData] = useState({
    lead_id: reminder.lead_id || '',
    route_id: reminder.route_id || '',
    title: reminder.title || '',
    description: reminder.description || '',
    reminder_type: reminder.reminder_type,
    priority: reminder.priority,
    reminder_date: reminder.reminder_date || '',
    reminder_time: reminder.reminder_time || '09:00',
    is_all_day: reminder.is_all_day,
    message: reminder.message || '',
    is_recurring: reminder.is_recurring,
    recurrence_pattern: reminder.recurrence_pattern,
    status: reminder.status,
    completed: reminder.completed,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Update form when reminder changes
  useEffect(() => {
    if (isOpen && reminder) {
      setFormData({
        lead_id: reminder.lead_id || '',
        route_id: reminder.route_id || '',
        title: reminder.title || '',
        description: reminder.description || '',
        reminder_type: reminder.reminder_type,
        priority: reminder.priority,
        reminder_date: reminder.reminder_date || '',
        reminder_time: reminder.reminder_time || '09:00',
        is_all_day: reminder.is_all_day,
        message: reminder.message || '',
        is_recurring: reminder.is_recurring,
        recurrence_pattern: reminder.recurrence_pattern,
        status: reminder.status,
        completed: reminder.completed,
      });
      setErrors({});
    }
  }, [isOpen, reminder]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.reminder_date) {
      newErrors.reminder_date = 'Date is required';
    }

    if (!formData.message && !formData.title) {
      newErrors.message = 'Message or title is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const requestData: UpdateReminderRequest = {
        lead_id: formData.lead_id || null,
        route_id: formData.route_id || null,
        title: formData.title || null,
        description: formData.description || null,
        reminder_date: formData.reminder_date,
        reminder_time: formData.is_all_day ? null : formData.reminder_time,
        is_all_day: formData.is_all_day,
        reminder_type: formData.reminder_type,
        priority: formData.priority,
        message: formData.message || formData.title || '',
        note: formData.description,
        status: formData.status,
        completed: formData.completed,
        is_recurring: formData.is_recurring,
        recurrence_pattern: formData.recurrence_pattern,
      };

      await updateReminder(reminder.lead_id || '', reminder.id, requestData);
      onClose();
    } catch (error) {
      console.error('Error updating reminder:', error);
      setErrors({ submit: 'Failed to update reminder. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Don't render until mounted (prevents SSR issues)
  if (!mounted) return null;

  // Use createPortal to render at document.body level
  return createPortal(
    <>
      {/* BACKDROP OVERLAY - Creates dark background, centers modal, and appears ABOVE navigation */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        
        {/* MODAL CONTAINER - The glassmorphic card that "floats" */}
        <div className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-emerald-500/30">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Bell className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Edit Reminder</h2>
                <p className="text-sm text-emerald-200">Update reminder details</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-emerald-200" />
            </button>
          </div>

          {/* Form - Scrollable content area with custom scrollbar */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar space-y-6">
            {/* Title */}
            <div>
              <label className="block text-white font-medium mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                placeholder="Enter reminder title"
              />
            </div>

            {/* Type Selection */}
            <div>
              <label className="block text-white font-medium mb-2">
                Type
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['call', 'email', 'meeting', 'task', 'followup', 'quote', 'document'] as ReminderType[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleChange('reminder_type', type)}
                    className={`p-3 rounded-lg border transition-all ${
                      formData.reminder_type === type
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-white/5 border-emerald-500/20 text-white/60 hover:bg-white/10 hover:border-emerald-500/30'
                    }`}
                  >
                    <div className="text-2xl mb-1">{getReminderTypeIcon(type)}</div>
                    <div className="text-xs">{getReminderTypeLabel(type)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Selection */}
            <div>
              <label className="block text-white font-medium mb-2">
                Priority
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['high', 'medium', 'low'] as ReminderPriority[]).map(priority => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => handleChange('priority', priority)}
                    className={`p-3 rounded-lg border transition-all ${
                      formData.priority === priority
                        ? priority === 'high' ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                          priority === 'medium' ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' :
                          'bg-green-500/20 border-green-500/50 text-green-400'
                        : 'bg-white/5 border-emerald-500/20 text-white/60 hover:bg-white/10 hover:border-emerald-500/30'
                    }`}
                  >
                    <div className="text-sm font-medium capitalize">{priority}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white font-medium mb-2">
                  Date <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                  <input
                    type="date"
                    value={formData.reminder_date}
                    onChange={(e) => handleChange('reminder_date', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {errors.reminder_date && (
                  <p className="mt-1 text-sm text-red-400">{errors.reminder_date}</p>
                )}
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  Time
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                  <input
                    type="time"
                    value={formData.reminder_time}
                    onChange={(e) => handleChange('reminder_time', e.target.value)}
                    disabled={formData.is_all_day}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* All Day Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="edit-all-day"
                checked={formData.is_all_day}
                onChange={(e) => handleChange('is_all_day', e.target.checked)}
                className="w-5 h-5 rounded border-emerald-500/30 bg-white/5 text-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
              />
              <label htmlFor="edit-all-day" className="text-sm text-white cursor-pointer">
                All-day event
              </label>
            </div>

            {/* Message */}
            <div>
              <label className="block text-white font-medium mb-2">
                Message <span className="text-red-400">*</span>
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => handleChange('message', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 resize-none"
                placeholder="Enter reminder message"
              />
              {errors.message && (
                <p className="mt-1 text-sm text-red-400">{errors.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-white font-medium mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={2}
                className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 resize-none"
                placeholder="Additional details"
              />
            </div>

            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-400 font-medium mb-1">Error</p>
                    <p className="text-sm text-red-300">{errors.submit}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-emerald-500/20">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
}
