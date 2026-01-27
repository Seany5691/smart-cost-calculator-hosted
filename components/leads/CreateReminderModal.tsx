'use client';

/**
 * CreateReminderModal Component
 * 
 * Comprehensive modal for creating reminders with all features from old app.
 * 
 * Features:
 * - Lead/Route selection
 * - Title and description fields
 * - Type selection (7 types)
 * - Priority selection (3 levels)
 * - Date and time pickers
 * - All-day toggle
 * - Recurring toggle with pattern configuration
 * - Template selection
 * - Validation
 * - Glassmorphism styling
 * - React Portal implementation for proper z-index layering
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, Repeat, AlertCircle, Bell } from 'lucide-react';
import { useRemindersStore } from '@/lib/store/reminders';
import { useLeadsStore } from '@/lib/store/leads';
import type { ReminderType, ReminderPriority, RecurrencePattern, CreateReminderRequest } from '@/lib/leads/types';
import { getReminderTypeIcon, getReminderTypeLabel } from '@/lib/leads/types';

interface CreateReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId?: string;
  routeId?: string;
}

export default function CreateReminderModal({ isOpen, onClose, leadId, routeId }: CreateReminderModalProps) {
  const { createReminder } = useRemindersStore();
  const { leads } = useLeadsStore();

  // CRITICAL: Mounted state for SSR safety
  const [mounted, setMounted] = useState(false);

  const [formData, setFormData] = useState({
    lead_id: leadId || '',
    route_id: routeId || '',
    title: '',
    description: '',
    reminder_type: 'task' as ReminderType,
    priority: 'medium' as ReminderPriority,
    reminder_date: '',
    reminder_time: '09:00',
    is_all_day: false,
    message: '',
    is_recurring: false,
    recurrence_pattern: null as RecurrencePattern | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        lead_id: leadId || '',
        route_id: routeId || '',
        title: '',
        description: '',
        reminder_type: 'task',
        priority: 'medium',
        reminder_date: '',
        reminder_time: '09:00',
        is_all_day: false,
        message: '',
        is_recurring: false,
        recurrence_pattern: null,
      });
      setErrors({});
    }
  }, [isOpen, leadId, routeId]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
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

    if (!formData.lead_id && !formData.route_id && !formData.title) {
      newErrors.title = 'Title is required for standalone reminders';
    }

    if (!formData.reminder_date) {
      newErrors.reminder_date = 'Date is required';
    }

    if (!formData.message && !formData.title) {
      newErrors.message = 'Message or title is required';
    }

    if (formData.is_recurring && !formData.recurrence_pattern) {
      newErrors.recurrence_pattern = 'Recurrence pattern is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const requestData: CreateReminderRequest = {
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
        is_recurring: formData.is_recurring,
        recurrence_pattern: formData.recurrence_pattern,
      };

      await createReminder(formData.lead_id || '', requestData);
      onClose();
    } catch (error) {
      console.error('Error creating reminder:', error);
      setErrors({ submit: 'Failed to create reminder. Please try again.' });
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
                <h2 className="text-2xl font-bold text-white">Create Reminder</h2>
                <p className="text-sm text-emerald-200">Set up a new reminder</p>
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
          {/* Lead Selection */}
          {!leadId && !routeId && (
            <div>
              <label className="block text-white font-medium mb-2">
                Lead (Optional)
              </label>
              <select
                value={formData.lead_id}
                onChange={(e) => handleChange('lead_id', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Standalone Reminder</option>
                {leads
                  .filter(lead => lead.status !== 'new')
                  .map(lead => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name} ({lead.status})
                    </option>
                  ))}
              </select>
              <p className="mt-2 text-xs text-emerald-300/70">
                Only showing leads from: Leads, Working On, Later Stage, Bad Leads, and Signed tabs
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-white font-medium mb-2">
              Title {!formData.lead_id && <span className="text-red-400">*</span>}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              placeholder="Enter reminder title"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-400">{errors.title}</p>
            )}
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
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 pointer-events-none z-10" />
                <select
                  value={formData.reminder_time}
                  onChange={(e) => handleChange('reminder_time', e.target.value)}
                  disabled={formData.is_all_day}
                  className="w-full pl-10 pr-10 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2310b981'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.5rem center',
                    backgroundSize: '1.5em 1.5em'
                  }}
                >
                  {Array.from({ length: 96 }, (_, i) => {
                    const hours = Math.floor(i / 4);
                    const minutes = (i % 4) * 15;
                    const time24 = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    const isPM = hours >= 12;
                    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
                    const time12 = `${hours12}:${minutes.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
                    return (
                      <option key={time24} value={time24}>
                        {time12}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="all-day"
              checked={formData.is_all_day}
              onChange={(e) => handleChange('is_all_day', e.target.checked)}
              className="w-5 h-5 rounded border-emerald-500/30 bg-white/5 text-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <label htmlFor="all-day" className="text-sm text-white cursor-pointer">
              All-day event
            </label>
          </div>

          {/* Message/Note */}
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

          {/* Recurring Toggle */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="recurring"
                checked={formData.is_recurring}
                onChange={(e) => handleChange('is_recurring', e.target.checked)}
                className="w-5 h-5 rounded border-emerald-500/30 bg-white/5 text-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
              />
              <label htmlFor="recurring" className="text-sm text-white cursor-pointer flex items-center gap-2">
                <Repeat className="w-4 h-4" />
                Recurring reminder
              </label>
            </div>

            {/* Recurrence Pattern (shown when recurring is enabled) */}
            {formData.is_recurring && (
              <div className="pl-8 space-y-3 border-l-2 border-emerald-500/30">
                <div>
                  <label className="block text-white font-medium mb-2">
                    Repeat
                  </label>
                  <select
                    value={formData.recurrence_pattern?.type || 'daily'}
                    onChange={(e) => handleChange('recurrence_pattern', {
                      ...formData.recurrence_pattern,
                      type: e.target.value as 'daily' | 'weekly' | 'monthly',
                      interval: formData.recurrence_pattern?.interval || 1,
                    })}
                    className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">
                    Every
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={formData.recurrence_pattern?.interval || 1}
                      onChange={(e) => handleChange('recurrence_pattern', {
                        ...formData.recurrence_pattern,
                        type: formData.recurrence_pattern?.type || 'daily',
                        interval: parseInt(e.target.value),
                      })}
                      className="w-20 px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-white">
                      {formData.recurrence_pattern?.type === 'daily' ? 'day(s)' :
                       formData.recurrence_pattern?.type === 'weekly' ? 'week(s)' :
                       'month(s)'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.recurrence_pattern?.endDate || ''}
                    onChange={(e) => handleChange('recurrence_pattern', {
                      ...formData.recurrence_pattern,
                      type: formData.recurrence_pattern?.type || 'daily',
                      interval: formData.recurrence_pattern?.interval || 1,
                      endDate: e.target.value || undefined,
                    })}
                    className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}
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
              {isSubmitting ? 'Creating...' : 'Create Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>,
    document.body
  );
}
