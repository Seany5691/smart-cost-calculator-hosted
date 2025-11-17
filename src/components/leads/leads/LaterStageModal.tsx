'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, FileText, AlertCircle } from 'lucide-react';
import { Lead } from '@/lib/leads/types';
import { useRemindersStore } from '@/store/reminders';
import { useAuthStore } from '@/store/auth';
import { createLeadNote } from '@/lib/leads/supabaseNotesReminders';

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
  const [explanation, setExplanation] = useState('');
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
      
      // Create a reminder for the callback date
      await addReminder(
        lead.id,
        user.id,
        callbackDate,
        explanation.trim()
      );
      
      console.log('[LaterStageModal] Reminder created successfully');
      
      // Also create a note documenting the move
      const noteText = `Moved to Later Stage: ${explanation.trim()}`;
      await createLeadNote(lead.id, user.id, noteText);
      
      console.log('[LaterStageModal] Note created successfully');
      
      // Update the lead status
      await onConfirm({
        date_to_call_back: callbackDate,
        notes: noteText
      });

      // Reset form
      setCallbackDate('');
      setExplanation('');
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
    setExplanation('');
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
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="later-stage-modal-title"
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg transition-opacity duration-200"
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

            {/* Callback Date Field */}
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                When should you follow up with this lead?
              </p>
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
