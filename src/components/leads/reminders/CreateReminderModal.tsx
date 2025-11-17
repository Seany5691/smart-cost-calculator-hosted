'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Bell, 
  Calendar, 
  Clock, 
  AlertTriangle,
  Repeat,
  User,
  MapPin,
  FileText
} from 'lucide-react';
import type { Lead, Route } from '@/lib/leads/types';
import type { ReminderType, ReminderPriority, RecurrencePattern } from '@/lib/leads/supabaseNotesReminders';
import { useAuthStore } from '@/store/auth';
import { useRemindersStore } from '@/store/reminders';
import { cn } from '@/lib/utils';

interface CreateReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[]; // Filtered leads (no Main Sheet)
  routes: Route[];
}

type LinkType = 'lead' | 'route' | 'standalone';

export const CreateReminderModal = ({ isOpen, onClose, leads, routes }: CreateReminderModalProps) => {
  const user = useAuthStore((state) => state.user);
  const { addReminder } = useRemindersStore();
  
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [linkType, setLinkType] = useState<LinkType>('lead');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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
      // Reset form when modal opens
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setLinkType('lead');
    setSelectedLeadId('');
    setSelectedRouteId('');
    setTitle('');
    setDescription('');
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

    // Validation
    if (!reminderDate) {
      setError('Please select a date');
      return;
    }

    if (linkType === 'lead' && !selectedLeadId) {
      setError('Please select a lead');
      return;
    }

    if (linkType === 'route' && !selectedRouteId) {
      setError('Please select a route');
      return;
    }

    if (linkType === 'standalone' && !title.trim()) {
      setError('Please enter a title for standalone reminder');
      return;
    }

    if (!note.trim() && linkType !== 'standalone') {
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

      const reminderNote = linkType === 'standalone' ? (note.trim() || 'Reminder') : note.trim();

      await addReminder(
        linkType === 'lead' ? selectedLeadId : null,
        user.id,
        reminderDate,
        reminderNote,
        {
          reminderTime: isAllDay ? null : reminderTime,
          isAllDay,
          reminderType,
          priority,
          routeId: linkType === 'route' ? selectedRouteId : null,
          title: linkType === 'standalone' ? title.trim() : null,
          description: linkType === 'standalone' ? description.trim() : null,
          isRecurring,
          recurrencePattern,
        }
      );

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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Create Reminder</h2>
                <p className="text-sm text-gray-600">Set up a new reminder for leads, routes, or general tasks</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Link Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Link Reminder To *
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setLinkType('lead')}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all text-center',
                    linkType === 'lead'
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <User className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                  <div className="text-sm font-medium">Lead</div>
                </button>
                <button
                  type="button"
                  onClick={() => setLinkType('route')}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all text-center',
                    linkType === 'route'
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <MapPin className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                  <div className="text-sm font-medium">Route</div>
                </button>
                <button
                  type="button"
                  onClick={() => setLinkType('standalone')}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all text-center',
                    linkType === 'standalone'
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <FileText className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                  <div className="text-sm font-medium">General</div>
                </button>
              </div>
            </div>

            {/* Lead Selection */}
            {linkType === 'lead' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Lead *
                </label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Choose a lead...</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name} {lead.phone && `- ${lead.phone}`} ({lead.status})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Only leads from: Leads, Working On, Later Stage, Bad Leads, Signed
                </p>
              </div>
            )}

            {/* Route Selection */}
            {linkType === 'route' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Route *
                </label>
                <select
                  value={selectedRouteId}
                  onChange={(e) => setSelectedRouteId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Choose a route...</option>
                  {routes.map(route => (
                    <option key={route.id} value={route.id}>
                      {route.name} ({route.stop_count} stops)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Standalone Title */}
            {linkType === 'standalone' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Team Meeting, Review Documents"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            )}

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
                      'p-3 rounded-lg border-2 transition-all text-center',
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority *
              </label>
              <div className="grid grid-cols-3 gap-3">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Time
                </label>
                <div className="space-y-2">
                  {!isAllDay && (
                    <div className="flex gap-2">
                      <select
                        value={reminderTime.split(':')[0]}
                        onChange={(e) => setReminderTime(`${e.target.value}:${reminderTime.split(':')[1]}`)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                          <option key={hour} value={hour.toString().padStart(2, '0')}>
                            {hour.toString().padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                      <span className="flex items-center text-gray-500 font-semibold">:</span>
                      <select
                        value={reminderTime.split(':')[1]}
                        onChange={(e) => setReminderTime(`${reminderTime.split(':')[0]}:${e.target.value}`)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        {Array.from({ length: 12 }, (_, i) => i * 5).map(minute => (
                          <option key={minute} value={minute.toString().padStart(2, '0')}>
                            {minute.toString().padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isAllDay}
                      onChange={(e) => setIsAllDay(e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">All Day</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Note/Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {linkType === 'standalone' ? 'Description' : 'Note *'}
              </label>
              <textarea
                value={linkType === 'standalone' ? description : note}
                onChange={(e) => linkType === 'standalone' ? setDescription(e.target.value) : setNote(e.target.value)}
                placeholder={linkType === 'standalone' ? 'Additional details...' : 'What is this reminder for?'}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>

            {linkType === 'standalone' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Note
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional quick note"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            )}

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

            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
