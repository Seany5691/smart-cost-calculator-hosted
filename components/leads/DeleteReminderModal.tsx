'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

/**
 * DeleteReminderModal Component
 * 
 * Standardized confirmation modal for reminder deletion
 * - Portal rendering at document.body level
 * - Emerald/green color scheme matching Leads section
 * - Click outside to close
 * - Keyboard support (Escape key)
 * - Full ARIA attributes
 * - Loading state during deletion
 * 
 * Standardization Requirements:
 * ✓ Portal rendering
 * ✓ Proper backdrop with blur effect
 * ✓ Emerald/green color scheme
 * ✓ z-index 9999
 * ✓ Click outside to close
 * ✓ Accessibility (ARIA attributes)
 * ✓ Keyboard support
 */
export default function DeleteReminderModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteReminderModalProps) {
  const [mounted, setMounted] = useState(false);

  // Handle mounting for SSR safety
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, isDeleting]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const handleConfirm = () => {
    if (!isDeleting) {
      onConfirm();
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          handleClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-reminder-modal-title"
      aria-describedby="delete-reminder-modal-description"
    >
      <div
        className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden border border-emerald-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 bg-gradient-to-br from-slate-900 to-emerald-900 z-10 flex items-center justify-between p-6 border-b border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg border border-red-500/30">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h2
              id="delete-reminder-modal-title"
              className="text-2xl font-bold text-white"
            >
              Delete Reminder
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-emerald-200" />
          </button>
        </div>

        {/* Content with Custom Scrollbar */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)] custom-scrollbar space-y-4">
          <p
            id="delete-reminder-modal-description"
            className="text-white text-base leading-relaxed"
          >
            Are you sure you want to delete this reminder?
          </p>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-300 text-sm font-medium">
              ⚠️ This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-emerald-500/20">
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Deleting...</span>
              </>
            ) : (
              <span>Delete Reminder</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
