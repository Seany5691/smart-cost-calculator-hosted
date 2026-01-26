'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  dealName: string;
  isDeleting?: boolean;
}

/**
 * DeleteDealModal Component
 * 
 * Standardized confirmation modal for deal deletion
 * - Portal rendering at document.body level
 * - Orange/amber color scheme matching All Deals section
 * - Click outside to close
 * - Keyboard support (Escape key)
 * - Full ARIA attributes
 * - Loading state during deletion
 * 
 * Standardization Requirements:
 * ✓ Portal rendering
 * ✓ Proper backdrop with blur effect
 * ✓ Orange/amber color scheme
 * ✓ z-index 9999
 * ✓ Click outside to close
 * ✓ Accessibility (ARIA attributes)
 * ✓ Keyboard support
 */
export default function DeleteDealModal({
  isOpen,
  onClose,
  onConfirm,
  dealName,
  isDeleting = false,
}: DeleteDealModalProps) {
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
      aria-labelledby="delete-modal-title"
      aria-describedby="delete-modal-description"
    >
      <div
        className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h2
              id="delete-modal-title"
              className="text-xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent"
            >
              Delete Deal
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="text-gray-400 hover:text-white transition-colors duration-200 p-2 hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p
            id="delete-modal-description"
            className="text-gray-300 text-base leading-relaxed"
          >
            Are you sure you want to delete{' '}
            <span className="font-semibold text-white">"{dealName}"</span>?
          </p>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-300 text-sm font-medium">
              ⚠️ This action cannot be undone. All deal data will be permanently removed.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="px-6 py-2.5 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:from-red-600 hover:to-orange-600 transition-all duration-300 font-medium shadow-lg hover:shadow-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Deleting...</span>
              </>
            ) : (
              <span>Delete Deal</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
