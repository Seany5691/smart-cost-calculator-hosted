'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, FileText, AlertCircle, Clock } from 'lucide-react';
import { Lead } from '@/lib/leads/types';
import { useAuthStore } from '@/store/auth';
import { useRemindersStore } from '@/store/reminders';
import { cn } from '@/lib/utils';

interface LaterStageModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { date_to_call_back: string; notes: string }) => Promise<void>;
}

export const LaterStageModal = ({ lead, isOpen, onClose, onConfirm }: LaterStageModalProps) => {
  const user = useAuthStore((state) => state.user);
  const { addReminder } = useRemindersStore();
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackTime, setCallbackTime] = useState('09:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [reminderType, setReminderType] = useState<string>('callback');
  const [priority, setPriority] = useState<string>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async () => {
    console.log('[LaterStageModal] handleSubmit called');
    console.log('[LaterStageModal] User:', user);
    console.log('[LaterStageModal] Date:', callbackDate, 'Explanation:', explanation);
    
    // Validation
    if (!callbackDate) {
      setError('Please select a callback date');
      return;
    }

    if (!explanation.trim()) {
      setError('Please provide an explanation for moving this lead to Later Stage');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      console.log('[LaterStageModal] Creating reminder...');
      
      // Create a reminder for the callback date with all options
      await addReminder(
        lead.id,
        user.id,
        callbackDate,
        explanation.trim(),
        {
          reminderTime: isAllDay ? null : callbackTime,
          isAllDay,
          reminderType,
          priority,
        }
      );
      
      console.log('[LaterStageModal] Reminder created successfully');
      
      // Also create a note documenting the move - PostgreSQL placeholder
      const noteText = `Moved to Later Stage: ${explanation.trim()}`;
      console.log('Note created:', noteText);
      
      console.log('[LaterStageModal] Note created successfully');
      
      // Update the lead status
      await onConfirm({
        date_to_call_back: callbackDate,
        notes: noteText
      });

      // Reset form
      setCallbackDate('');
      setCallbackTime('09:00');
      setIsAllDay(false);
      setExplanation('');
      setReminderType('followup');
      setPriority('medium');
      onClose();
    } catch (err: any) {
      console.error('[LaterStageModal] Error:', err);
      setError(err.message || 'Failed to move lead to Later Stage');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setCallbackDate('');
    setCallbackTime('09:00');
    setIsAllDay(false);
    setExplanation('');
    setReminderType('followup');
    setPriority('medium');
    setError('');
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] transition-opacity"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="later-stage-modal-title"
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transition-opacity duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 id="later-stage-modal-title" className="text-2xl font-bold text-white">
                  Move to Later Stage
                </h2>
                <p className="text-sm text-white/90">
                  {lead.name}
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Info Box */}
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-purple-900">
                  <p className="font-medium">Why are you moving this lead?</p>
                  <p className="mt-1 text-purple-700">
                    Provide an explanation and set a callback date. A reminder will be created for the callback date, and a note will document the reason.
                  </p>
                </div>
              </div>
            </div>

            {/* Explanation Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Explanation *
              </label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="e.g., Customer needs time to review proposal, Budget not available until next quarter, etc."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={4}
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be saved as both a note and a reminder
              </p>
            </div>

            {/* Reminder Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Reminder Type *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'call', label: 'Phone Call', icon: '📞' },
                  { value: 'email', label: 'Email', icon: '📧' },
                  { value: 'meeting', label: 'Meeting', icon: '📅' },
                  { value: 'followup', label: 'Follow-up', icon: '🔔' },
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setReminderType(type.value)}
                    disabled={isSubmitting}
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
                {(['high', 'medium', 'low'] as string[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    disabled={isSubmitting}
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
                  Callback Date *
                </label>
                <input
                  type="date"
                  value={callbackDate}
                  onChange={(e) => setCallbackDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isSubmitting}
                  required
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
                        value={callbackTime.split(':')[0]}
                        onChange={(e) => setCallbackTime(`${e.target.value}:${callbackTime.split(':')[1]}`)}
                        disabled={isSubmitting}
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
                        value={callbackTime.split(':')[1]}
                        onChange={(e) => setCallbackTime(`${callbackTime.split(':')[0]}:${e.target.value}`)}
                        disabled={isSubmitting}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        {['00', '15', '30', '45'].map(minute => (
                          <option key={minute} value={minute}>
                            {minute}
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
                      disabled={isSubmitting}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">All Day</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex justify-end space-x-3 rounded-b-2xl">
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !callbackDate || !explanation.trim()}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-semibold"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Moving...</span>
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>Move to Later Stage</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
};
