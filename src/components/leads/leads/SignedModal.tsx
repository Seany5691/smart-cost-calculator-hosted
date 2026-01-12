'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, FileText, AlertCircle, Award } from 'lucide-react';
import { Lead } from '@/lib/leads/types';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

interface SignedModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { dateSigned: string; notes: string }) => Promise<void>;
}

export const SignedModal = ({ lead, isOpen, onClose, onConfirm }: SignedModalProps) => {
  const user = useAuthStore((state) => state.user);
  const [signedDate, setSignedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Set default date to today
    if (isOpen) {
      setSignedDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    console.log('[SignedModal] handleSubmit called');
    console.log('[SignedModal] User:', user);
    console.log('[SignedModal] Date:', signedDate, 'Notes:', notes);
    
    // Validation
    if (!signedDate) {
      setError('Please select the date when this lead was signed');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      console.log('[SignedModal] Creating note...');
      
      // Create a note documenting the signing
      const noteText = notes.trim() 
        ? `Signed on ${new Date(signedDate).toLocaleDateString()}: ${notes.trim()}`
        : `Signed on ${new Date(signedDate).toLocaleDateString()}`;
      
      // Create note in PostgreSQL - placeholder
      console.log('Note created:', noteText);
      
      console.log('[SignedModal] Note created successfully');
      
      // Update the lead status
      console.log('[SignedModal] Confirming with dateSigned:', signedDate);
      await onConfirm({
        dateSigned: signedDate,
        notes: noteText
      });

      // Reset form
      setSignedDate('');
      setNotes('');
      onClose();
    } catch (err: any) {
      console.error('[SignedModal] Error:', err);
      setError(err.message || 'Failed to mark lead as signed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSignedDate('');
    setNotes('');
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
        aria-labelledby="signed-modal-title"
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transition-opacity duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 id="signed-modal-title" className="text-2xl font-bold text-white">
                  Mark as Signed
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
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-900">
                  <p className="font-medium">Congratulations on the win!</p>
                  <p className="mt-1 text-green-700">
                    Record when this lead was signed and add any relevant notes about the deal.
                  </p>
                </div>
              </div>
            </div>

            {/* Date Signed */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date Signed *
              </label>
              <input
                type="date"
                value={signedDate}
                onChange={(e) => setSignedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Select the date when this lead was successfully signed
              </p>
            </div>

            {/* Notes Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Contract value, special terms, next steps, etc."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                rows={4}
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                Add any relevant details about the deal (optional)
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
              disabled={isSubmitting || !signedDate}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-semibold"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Award className="w-4 h-4" />
                  <span>Mark as Signed</span>
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
