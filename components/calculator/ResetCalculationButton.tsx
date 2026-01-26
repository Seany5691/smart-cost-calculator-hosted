'use client';

import { useState } from 'react';
import { useCalculatorStore } from '@/lib/store/calculator';
import { useToast } from '@/components/ui/Toast/useToast';
import { RotateCcw, X } from 'lucide-react';
import { createPortal } from 'react-dom';

/**
 * Reset Calculation Button
 * Allows users to clear all calculator data and start fresh
 */
export default function ResetCalculationButton() {
  const { toast } = useToast();
  const { resetCalculator } = useCalculatorStore();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleResetClick = () => {
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    // Reset the calculator store
    resetCalculator();
    
    // Clear localStorage
    localStorage.removeItem('calculator-storage');
    
    toast.success('Calculation Reset', {
      message: 'All calculator data has been cleared',
      section: 'calculator'
    });
    
    setShowConfirm(false);
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  const confirmModal = showConfirm && typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl shadow-2xl max-w-md w-full border border-purple-500/30">
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
          <h3 className="text-xl font-semibold text-white">Reset Calculation?</h3>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-purple-200" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-purple-200 mb-2">
            This will clear all calculator data including:
          </p>
          <ul className="list-disc list-inside text-purple-300 text-sm space-y-1 mb-4">
            <li>Deal details</li>
            <li>Hardware selections</li>
            <li>Licensing selections</li>
            <li>Connectivity selections</li>
            <li>All calculations</li>
          </ul>
          <p className="text-purple-200 text-sm">
            This action cannot be undone.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-end p-6 border-t border-purple-500/20">
          <button
            onClick={handleCancel}
            className="w-full sm:w-auto px-6 py-3 min-h-[44px] bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="w-full sm:w-auto px-6 py-3 min-h-[44px] bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Calculation
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        onClick={handleResetClick}
        className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2"
        title="Reset all calculator data"
      >
        <RotateCcw className="w-4 h-4" />
        <span className="hidden sm:inline">Reset Calculation</span>
        <span className="sm:hidden">Reset</span>
      </button>
      {confirmModal}
    </>
  );
}
