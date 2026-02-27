'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ExistingDataModalProps {
  isOpen: boolean;
  onContinue: () => void;
  onStartNew: () => void;
}

export default function ExistingDataModal({ 
  isOpen, 
  onContinue, 
  onStartNew 
}: ExistingDataModalProps) {
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onContinue(); // Default to continue on escape
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onContinue]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl shadow-2xl max-w-md w-full border border-purple-500/30">
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
          <h3 className="text-xl font-semibold text-white">Existing Calculation Found</h3>
          <button
            onClick={onContinue}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-purple-200" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-purple-200 mb-6">
            We found a previous calculation. Would you like to continue with it or start a new calculation?
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={onStartNew}
              className="flex-1 px-6 py-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors font-medium"
            >
              Start New
            </button>
            <button
              onClick={onContinue}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
            >
              Continue Previous
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
