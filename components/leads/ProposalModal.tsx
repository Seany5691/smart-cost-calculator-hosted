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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-purple-500/30">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Create Proposal</h2>
              <p className="text-sm text-purple-200">{lead.name}</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-purple-200" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleCreateProposal} className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar space-y-5">
          {/* Info Box */}
          <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <AlertCircle className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">Ready to create a proposal?</h4>
                <p className="text-purple-200 text-sm">
                  Provide a description for this proposal. You'll be taken to the calculator to generate the proposal document.
                </p>
              </div>
            </div>
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-white font-medium mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Initial proposal for phone system upgrade, Follow-up proposal with revised pricing, etc."
              className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500 resize-none"
              rows={4}
              disabled={loading}
              required
            />
            <p className="text-sm text-purple-300/70 mt-1">
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

          {/* Footer */}
          <div className="flex gap-3 justify-end pt-4 border-t border-purple-500/20">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !description.trim()}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
        </form>
      </div>
    </div>,
    document.body
  );
}
