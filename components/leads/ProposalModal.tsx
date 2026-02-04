'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Lead } from '@/lib/leads/types';

interface ProposalModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { date_proposal_created: string; notes: string }) => void;
}

export default function ProposalModal({
  lead,
  isOpen,
  onClose,
  onConfirm
}: ProposalModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle escape key and prevent body scroll
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;
  if (!mounted) return null;

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!description.trim()) {
      setError('Please provide a description for this proposal');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get current date for proposal created date
      const proposalCreatedDate = new Date().toISOString().split('T')[0];
      
      // Create the note text with the description
      const noteText = `Proposal Created: ${description.trim()}\nDate: ${proposalCreatedDate}`;
      
      // Update the lead status and proposal created date
      await onConfirm({ 
        date_proposal_created: proposalCreatedDate, 
        notes: noteText 
      });
      
      // Store lead info in localStorage for calculator
      localStorage.setItem('proposal-lead-id', lead.id);
      localStorage.setItem('proposal-lead-name', lead.name);
      
      // Reset form
      setDescription('');
      setError('');
      
      // Navigate to calculator with pre-filled customer name
      router.push(`/calculator?customerName=${encodeURIComponent(lead.name)}&dealName=${encodeURIComponent(lead.name)}`);
    } catch (error) {
      console.error('Error updating lead:', error);
      setError('Failed to move lead to Proposal');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setDescription('');
    setError('');
    onClose();
  };

  return createPortal(
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
        aria-labelledby="proposal-modal-title"
      >
        <div
          className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-emerald-500/30"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sticky Header */}
          <div className="sticky top-0 bg-gradient-to-r from-green-500 to-emerald-500 p-6 flex items-center justify-between z-10 rounded-t-2xl flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 id="proposal-modal-title" className="text-2xl font-bold text-white">
                  Create Proposal
                </h2>
                <p className="text-sm text-white/90">{lead.name}</p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Scrollable Content */}
          <form onSubmit={handleCreateProposal} className="p-6 overflow-y-auto max-h-[calc(90vh-160px)] custom-scrollbar space-y-5">
            {/* Info Box */}
            <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <AlertCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium mb-1">Ready to create a proposal?</h4>
                  <p className="text-emerald-200 text-sm">
                    Provide a description for this proposal. You'll be taken to the calculator to generate the proposal document.
                  </p>
                </div>
              </div>
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-emerald-200 font-medium mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Initial proposal for phone system upgrade, Follow-up proposal with revised pricing, etc."
                className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 resize-none"
                rows={4}
                disabled={loading}
                required
              />
              <p className="text-sm text-emerald-300/70 mt-1">
                This will be saved as a note with the proposal creation date
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-400 font-medium mb-1">Error</p>
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 bg-slate-900/80 backdrop-blur-sm border-t border-emerald-500/20 p-6 flex flex-col sm:flex-row justify-end gap-3 rounded-b-2xl flex-shrink-0">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 min-h-[44px] text-emerald-200 bg-white/10 border border-emerald-500/30 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleCreateProposal}
              disabled={loading || !description.trim()}
              className="w-full sm:w-auto px-6 py-3 min-h-[44px] bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Create Proposal</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

