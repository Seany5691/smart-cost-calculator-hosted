'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCalculatorStore } from '@/lib/store/calculator';
import { useToast } from '@/components/ui/Toast/useToast';

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (proposalData: ProposalData) => void;
}

export interface ProposalData {
  customerName: string;
  currentMRC: number;
  specialistEmail: string;
  specialistPhone: string;
  proposalType: 'normal' | 'comparative' | 'cash';
}

export default function ProposalModal({ isOpen, onClose, onSubmit }: ProposalModalProps) {
  const { dealDetails } = useCalculatorStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // CRITICAL: Mounted state for SSR safety - prevents hydration mismatch
  const [mounted, setMounted] = useState(false);
  
  const [formData, setFormData] = useState<ProposalData>({
    customerName: dealDetails.customerName || '',
    currentMRC: 0,
    specialistEmail: '',
    specialistPhone: '',
    proposalType: 'normal'
  });

  // Set mounted state on client side only
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Update customer name when deal details change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      customerName: dealDetails.customerName || ''
    }));
  }, [dealDetails.customerName]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleInputChange = (field: keyof ProposalData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.customerName.trim()) {
      toast.error('Missing Customer Name', {
        message: 'Please enter a customer name',
        section: 'calculator'
      });
      return;
    }
    if (!formData.specialistEmail.trim()) {
      toast.error('Missing Email Address', {
        message: 'Please enter a specialist email address',
        section: 'calculator'
      });
      return;
    }
    if (!formData.specialistPhone.trim()) {
      toast.error('Missing Phone Number', {
        message: 'Please enter a specialist phone number',
        section: 'calculator'
      });
      return;
    }
    
    onSubmit(formData);
  };

  const handleClose = () => {
    setFormData({
      customerName: dealDetails.customerName || '',
      currentMRC: 0,
      specialistEmail: '',
      specialistPhone: '',
      proposalType: 'normal'
    });
    onClose();
  };

  // Don't render until mounted (prevents SSR hydration issues)
  if (!mounted || !isOpen) return null;

  // Use createPortal to render at document.body level - ensures modal appears above ALL content
  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div 
        ref={modalRef} 
        className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl sm:rounded-none shadow-2xl max-w-4xl sm:max-w-full w-full max-h-[90vh] sm:h-screen overflow-hidden border border-purple-500/30 sm:m-0"
      >
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
          <h2 id="proposal-modal-title" className="text-2xl font-bold text-white">Generate Proposal</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] sm:h-[calc(100vh-80px)] custom-scrollbar space-y-4">
          {/* Proposal Type Selection */}
          <div className="space-y-3 pb-4 border-b border-purple-500/20">
            <label className="text-white font-medium">
              Proposal Type <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Normal Proposal */}
              <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                <input
                  type="radio"
                  name="proposalType"
                  value="normal"
                  checked={formData.proposalType === 'normal'}
                  onChange={(e) => handleInputChange('proposalType', e.target.value)}
                  className="w-4 h-4 text-purple-600 bg-white/10 border-purple-500/30 focus:ring-purple-500 focus:ring-2"
                />
                <span className="text-white font-medium">Normal Proposal</span>
              </label>
              
              {/* Comparative Proposal */}
              <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                <input
                  type="radio"
                  name="proposalType"
                  value="comparative"
                  checked={formData.proposalType === 'comparative'}
                  onChange={(e) => handleInputChange('proposalType', e.target.value)}
                  className="w-4 h-4 text-purple-600 bg-white/10 border-purple-500/30 focus:ring-purple-500 focus:ring-2"
                />
                <span className="text-white font-medium">Comparative Proposal</span>
              </label>
              
              {/* Cash Proposal */}
              <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                <input
                  type="radio"
                  name="proposalType"
                  value="cash"
                  checked={formData.proposalType === 'cash'}
                  onChange={(e) => handleInputChange('proposalType', e.target.value)}
                  className="w-4 h-4 text-purple-600 bg-white/10 border-purple-500/30 focus:ring-purple-500 focus:ring-2"
                />
                <span className="text-white font-medium">Cash Proposal</span>
              </label>
            </div>
          </div>

          {/* Customer Name */}
          <div className="space-y-2">
            <label htmlFor="customerName" className="text-white font-medium">
              Customer Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="customerName"
              value={formData.customerName}
              onChange={(e) => handleInputChange('customerName', e.target.value)}
              placeholder="Enter customer name"
              className="w-full px-4 py-3 h-12 bg-white/10 border border-purple-500/30 rounded-lg text-white text-base placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition-all"
              required
            />
            <p className="text-sm text-purple-300/70">Enter the customer's full name for the proposal</p>
          </div>

          {/* Current Monthly Amounts */}
          <div className="space-y-2">
            <label htmlFor="currentMRC" className="text-white font-medium">
              Current Monthly Amounts <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              id="currentMRC"
              value={formData.currentMRC}
              onChange={(e) => handleInputChange('currentMRC', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-4 py-3 h-12 bg-white/10 border border-purple-500/30 rounded-lg text-white text-base placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition-all"
              required
            />
            <p className="text-sm text-purple-300/70">Monthly amounts excluding current hardware rental (R)</p>
          </div>

          {/* Specialist Email */}
          <div className="space-y-2">
            <label htmlFor="specialistEmail" className="text-white font-medium">
              Specialist Email Address <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              id="specialistEmail"
              value={formData.specialistEmail}
              onChange={(e) => handleInputChange('specialistEmail', e.target.value)}
              placeholder="specialist@company.com"
              className="w-full px-4 py-3 h-12 bg-white/10 border border-purple-500/30 rounded-lg text-white text-base placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition-all"
              required
            />
            <p className="text-sm text-purple-300/70">Email address for proposal correspondence</p>
          </div>

          {/* Specialist Phone */}
          <div className="space-y-2">
            <label htmlFor="specialistPhone" className="text-white font-medium">
              Specialist Phone Number <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              id="specialistPhone"
              value={formData.specialistPhone}
              onChange={(e) => handleInputChange('specialistPhone', e.target.value)}
              placeholder="+27 XX XXX XXXX"
              className="w-full px-4 py-3 h-12 bg-white/10 border border-purple-500/30 rounded-lg text-white text-base placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition-all"
              required
            />
            <p className="text-sm text-purple-300/70">Contact number for follow-up questions</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-2 h-12 bg-white/10 border border-white/20 text-white text-base rounded-lg hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-2 h-12 bg-purple-600 hover:bg-purple-700 text-white text-base rounded-lg transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Generate Proposal</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body // CRITICAL: Render at document.body level to escape parent stacking context
  );
}
