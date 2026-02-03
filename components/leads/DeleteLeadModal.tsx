'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, Trash2, UserMinus } from 'lucide-react';

/**
 * DeleteLeadModal Component
 * 
 * Standardized confirmation modal for lead deletion/removal
 * - Portal rendering at document.body level
 * - Emerald/green color scheme matching Leads section
 * - Click outside to close
 * - Proper accessibility attributes
 * - Different messaging for owner vs shared lead
 * 
 * Standardization Requirements:
 * ✓ Portal rendering
 * ✓ Proper backdrop with blur effect
 * ✓ Emerald/green color scheme
 * ✓ z-index 9999
 * ✓ Click outside to close
 * ✓ Sticky header
 * ✓ Custom scrollbar
 * ✓ Accessibility
 */

interface DeleteLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  leadName: string;
  isOwner: boolean;
}

export default function DeleteLeadModal({
  isOpen,
  onClose,
  onConfirm,
  leadName,
  isOwner
}: DeleteLeadModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsDeleting(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error deleting/removing lead:', error);
      setIsDeleting(false);
    }
  };

  if (!mounted || !isOpen) return null;

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
      aria-labelledby="delete-lead-modal-title"
      aria-describedby="delete-lead-modal-description"
    >
      <div
        className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden border border-emerald-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 bg-gradient-to-br from-slate-900 to-emerald-900 z-10 flex items-center justify-between p-6 border-b border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${isOwner ? 'bg-red-500/20 border-red-500/30' : 'bg-orange-500/20 border-orange-500/30'}`}>
              {isOwner ? (
                <Trash2 className="w-5 h-5 text-red-400" />
              ) : (
                <UserMinus className="w-5 h-5 text-orange-400" />
              )}
            </div>
            <h2
              id="delete-lead-modal-title"
              className="text-2xl font-bold text-white"
            >
              {isOwner ? 'Confirm Delete' : 'Remove Shared Lead'}
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] custom-scrollbar space-y-4">
          <p
            id="delete-lead-modal-description"
            className="text-white text-base leading-relaxed"
          >
            {isOwner ? (
              <>
                Are you sure you want to delete <span className="font-semibold text-emerald-300">{leadName}</span>?
              </>
            ) : (
              <>
                Are you sure you want to remove <span className="font-semibold text-emerald-300">{leadName}</span> that has been shared with you?
              </>
            )}
          </p>
          
          <div className={`rounded-lg p-4 border ${isOwner ? 'bg-red-500/10 border-red-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
            <p className={`text-sm font-medium ${isOwner ? 'text-red-300' : 'text-orange-300'}`}>
              {isOwner ? (
                <>
                  ⚠️ This will permanently delete the lead for everyone it's shared with. This action cannot be undone.
                </>
              ) : (
                <>
                  ℹ️ This will only remove it from your view, not from the owner or other users.
                </>
              )}
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
            className={`px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
              isOwner 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isOwner ? 'Deleting...' : 'Removing...'}
              </>
            ) : (
              <>
                {isOwner ? (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Lead
                  </>
                ) : (
                  <>
                    <UserMinus className="w-4 h-4" />
                    Remove Lead
                  </>
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.5);
        }
      `}</style>
    </div>,
    document.body
  );
}
