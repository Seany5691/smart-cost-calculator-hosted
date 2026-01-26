'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Loader2 } from 'lucide-react';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  onSuccess?: () => void;
}

export default function AddNoteModal({
  isOpen,
  onClose,
  leadId,
  leadName,
  onSuccess
}: AddNoteModalProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // CRITICAL: Mounted state for SSR safety - prevents hydration mismatch
  const [mounted, setMounted] = useState(false);

  // Set mounted state on client side only
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Don't render until mounted (prevents SSR hydration issues)
  if (!mounted || !isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Please enter note content');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get auth token
      const token = localStorage.getItem('auth-storage');
      let authToken = null;
      if (token) {
        const data = JSON.parse(token);
        authToken = data.state?.token || data.token;
      }

      if (!authToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/leads/${leadId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add note');
      }

      // Success
      setContent('');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error adding note:', err);
      setError(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setContent('');
      setError('');
      onClose();
    }
  };

  // Use createPortal to render at document.body level - ensures modal appears above ALL content
  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden border border-emerald-500/30">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Add Note</h2>
              <p className="text-sm text-emerald-200">{leadName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-emerald-200" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-1">
                  <p className="text-red-400 font-medium mb-1">Error</p>
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-white font-medium">
              Note Content <span className="text-red-400">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="Enter your note here..."
              required
              disabled={loading}
              className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-sm text-emerald-300/70">
              Add any important information about this lead
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end pt-4 border-t border-emerald-500/20">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                'Save Note'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body // CRITICAL: Render at document.body level to escape parent stacking context
  );
}
