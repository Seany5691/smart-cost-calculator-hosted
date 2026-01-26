'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Calendar, FileText, AlertCircle } from 'lucide-react';
import type { Lead } from '@/lib/leads/types';

interface SignedModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { date_signed: string; notes: string }) => void;
}

export default function SignedModal({
  lead,
  isOpen,
  onClose,
  onConfirm
}: SignedModalProps) {
  const [mounted, setMounted] = useState(false);
  const [dateSigned, setDateSigned] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen) return null;
  if (!mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dateSigned) {
      setError('Please select a signed date');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onConfirm({ 
        date_signed: dateSigned, 
        notes: notes.trim() || `Signed on ${dateSigned}` 
      });
      
      // Reset form
      setDateSigned(new Date().toISOString().split('T')[0]);
      setNotes('');
      setError('');
      onClose();
    } catch (error) {
      console.error('Error updating lead:', error);
      setError('Failed to mark lead as signed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setDateSigned(new Date().toISOString().split('T')[0]);
    setNotes('');
    setError('');
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-emerald-500/30">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Mark as Signed</h2>
              <p className="text-sm text-emerald-200">{lead.name}</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-emerald-200" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar space-y-5">
          {/* Info Box */}
          <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <AlertCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">Congratulations!</h4>
                <p className="text-emerald-200 text-sm">
                  Record when this lead signed the contract. You can add optional notes about the deal.
                </p>
              </div>
            </div>
          </div>

          {/* Signed Date */}
          <div>
            <label className="block text-white font-medium mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Signed Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={dateSigned}
              onChange={(e) => setDateSigned(e.target.value)}
              required
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              disabled={loading}
            />
            <p className="text-sm text-emerald-300/70 mt-1">
              When did this lead sign the contract?
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-white font-medium mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add any notes about the signing, deal details, or next steps..."
              className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 resize-none"
              disabled={loading}
            />
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
          <div className="flex gap-3 justify-end pt-4 border-t border-emerald-500/20">
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
              disabled={loading || !dateSigned}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Mark as Signed</span>
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
