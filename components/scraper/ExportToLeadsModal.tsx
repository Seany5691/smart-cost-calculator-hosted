'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ExportToLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (listName: string) => void;
  businessCount: number;
  initialListName?: string;
}

export default function ExportToLeadsModal({
  isOpen,
  onClose,
  onConfirm,
  businessCount,
  initialListName = 'Scraped Leads',
}: ExportToLeadsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [listName, setListName] = useState(initialListName);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setListName(initialListName);
    }
  }, [isOpen, initialListName]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && listName.trim()) {
        e.preventDefault();
        handleConfirm();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleEnter);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleEnter);
    };
  }, [isOpen, listName, onClose]);

  if (!mounted || !isOpen) return null;

  const handleConfirm = () => {
    if (listName.trim()) {
      onConfirm(listName.trim());
    }
  };

  const handleClose = () => {
    setListName(initialListName);
    onClose();
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div 
        className="bg-gradient-to-br from-slate-900 to-teal-900 rounded-2xl shadow-2xl max-w-md w-full border border-teal-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-teal-500/20">
          <h2 id="export-modal-title" className="text-xl font-bold text-white">Export to Leads</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-teal-200" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-2">
            <label htmlFor="list-name" className="text-white font-medium">
              Lead List Name <span className="text-red-400">*</span>
            </label>
            <input
              id="list-name"
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Enter a name for this lead list"
              className="w-full px-4 py-3 bg-white/10 border border-teal-500/30 rounded-lg text-white placeholder-teal-300/50 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
              autoFocus
            />
            <p className="text-sm text-teal-300/70">
              This name will be used to identify the imported leads
            </p>
          </div>

          <div className="mt-4 bg-teal-500/10 border border-teal-500/30 rounded-lg p-4">
            <p className="text-sm text-teal-300">
              {businessCount} business{businessCount !== 1 ? 'es' : ''} will be exported to the leads section
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-teal-500/20">
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!listName.trim()}
            className={`px-6 py-2 rounded-lg transition-colors font-semibold ${
              listName.trim()
                ? 'bg-teal-600 hover:bg-teal-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
            }`}
          >
            Export to Leads
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
