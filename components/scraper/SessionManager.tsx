'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, FolderOpen, Loader2, Calendar, MapPin, Building2 } from 'lucide-react';

interface Session {
  id: string;
  name: string;
  created_at: string;
  town_count: number;
  business_count: number;
}

interface SessionManagerProps {
  isOpen: boolean;
  mode: 'save' | 'load';
  sessions: Session[];
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  onLoad: (sessionId: string) => Promise<void>;
}

export default function SessionManager({
  isOpen,
  mode,
  sessions,
  onClose,
  onSave,
  onLoad,
}: SessionManagerProps) {
  const [sessionName, setSessionName] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // CRITICAL: Mounted state for SSR safety - prevents hydration mismatch
  const [mounted, setMounted] = useState(false);

  // Set mounted state on client side only
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle escape key and prevent body scroll
  useEffect(() => {
    if (!isOpen) return;

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Don't render until mounted (prevents SSR hydration issues)
  if (!mounted || !isOpen) return null;

  const handleSave = async () => {
    if (!sessionName.trim()) return;

    setIsLoading(true);
    try {
      await onSave(sessionName.trim());
      setSessionName('');
      onClose();
    } catch (error) {
      console.error('Error saving session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = async () => {
    if (!selectedSessionId) return;

    setIsLoading(true);
    try {
      await onLoad(selectedSessionId);
      setSelectedSessionId(null);
      onClose();
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Use createPortal to render at document.body level - ensures modal appears above ALL content
  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div className="bg-gradient-to-br from-slate-900 to-rose-900 rounded-none sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-hidden border-0 sm:border sm:border-rose-500/30">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-rose-500/20">
          <div className="flex items-center gap-2 sm:gap-3">
            {mode === 'save' ? (
              <Save className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400" />
            ) : (
              <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400" />
            )}
            <h2 id="session-modal-title" className="text-xl sm:text-2xl font-bold text-white">
              {mode === 'save' ? 'Save Session' : 'Load Session'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            disabled={isLoading}
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-rose-200" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto h-[calc(100vh-180px)] sm:h-auto sm:max-h-[calc(90vh-160px)] custom-scrollbar">
          {mode === 'save' ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="session-name" className="text-white font-medium text-base">
                  Session Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="session-name"
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && sessionName.trim()) {
                      handleSave();
                    }
                  }}
                  placeholder="e.g., Johannesburg Scrape - Jan 2024"
                  className="w-full px-4 py-3 h-12 text-base bg-white/10 border border-rose-500/30 rounded-lg text-white placeholder-rose-300/50 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500 transition-all"
                  autoFocus
                  disabled={isLoading}
                />
              </div>
              <p className="text-sm text-rose-300/70">
                Give your session a descriptive name to easily identify it later.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-12 h-12 text-rose-500/50 mx-auto mb-3" />
                  <p className="text-rose-200">No saved sessions found.</p>
                  <p className="text-sm text-rose-300/70 mt-1">
                    Complete a scraping session and save it to see it here.
                  </p>
                </div>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    disabled={isLoading}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all min-h-[44px] ${
                      selectedSessionId === session.id
                        ? 'border-rose-500 bg-rose-500/20'
                        : 'border-rose-500/30 hover:border-rose-500/50 bg-white/5'
                    } disabled:opacity-50`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate text-base">{session.name}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-rose-300">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(session.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{session.town_count} towns</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            <span>{session.business_count} businesses</span>
                          </div>
                        </div>
                      </div>
                      {selectedSessionId === session.id && (
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 p-4 sm:p-6 border-t border-rose-500/20">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-3 h-12 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          {mode === 'save' ? (
            <button
              onClick={handleSave}
              disabled={!sessionName.trim() || isLoading}
              className="w-full sm:w-auto px-6 py-3 h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Session
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleLoad}
              disabled={!selectedSessionId || isLoading}
              className="w-full sm:w-auto px-6 py-3 h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <FolderOpen className="w-4 h-4" />
                  Load Session
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body // CRITICAL: Render at document.body level to escape parent stacking context
  );
}
