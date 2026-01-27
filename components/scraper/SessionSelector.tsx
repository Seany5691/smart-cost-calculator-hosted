/**
 * SessionSelector Component
 * Displays list of user's scraping sessions from database
 * Allows loading businesses from any session (cross-device sync)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, FolderOpen, Calendar, Package, Trash2, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast/useToast';

interface Session {
  id: string;
  name: string;
  status: string;
  businessCount: number;
  townsCompleted: number;
  createdAt: string;
  updatedAt: string;
}

interface SessionSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSession: (sessionId: string, sessionName: string) => Promise<void>;
}

export default function SessionSelector({ isOpen, onClose, onLoadSession }: SessionSelectorProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch sessions from database
  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) {
        toast.error('Authentication required', {
          message: 'Please log in to view sessions',
          section: 'scraper'
        });
        return;
      }

      const authData = JSON.parse(authStorage);
      const token = authData.token;

      const response = await fetch('/api/scraper/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load sessions', {
        message: error.message || 'Please try again',
        section: 'scraper'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSession = async (sessionId: string, sessionName: string) => {
    setLoadingSessionId(sessionId);
    try {
      await onLoadSession(sessionId, sessionName);
      onClose();
    } catch (error) {
      // Error handling done in parent
    } finally {
      setLoadingSessionId(null);
    }
  };

  const handleDeleteSession = async (sessionId: string, sessionName: string) => {
    if (!confirm(`Delete session "${sessionName}"? This will remove all scraped businesses from this session.`)) {
      return;
    }

    setDeletingSessionId(sessionId);
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) {
        toast.error('Authentication required', {
          message: 'Please log in to delete sessions',
          section: 'scraper'
        });
        return;
      }

      const authData = JSON.parse(authStorage);
      const token = authData.token;

      const response = await fetch(`/api/scraper/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      toast.success('Session deleted', {
        message: `Deleted "${sessionName}"`,
        section: 'scraper'
      });

      // Refresh sessions list
      fetchSessions();
    } catch (error: any) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session', {
        message: error.message || 'Please try again',
        section: 'scraper'
      });
    } finally {
      setDeletingSessionId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'running':
        return 'text-blue-400';
      case 'paused':
        return 'text-yellow-400';
      case 'stopped':
        return 'text-orange-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-card w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-6 h-6 text-teal-400" />
            <h2 className="text-xl lg:text-2xl font-bold text-white">
              Your Scraping Sessions
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-teal-400 animate-spin mb-4" />
              <p className="text-gray-400">Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="w-16 h-16 text-gray-600 mb-4" />
              <p className="text-gray-400 text-center">
                No saved sessions found
              </p>
              <p className="text-gray-500 text-sm text-center mt-2">
                Start scraping to create your first session
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="glass-card p-4 hover:bg-white/5 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Session Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-lg mb-2 truncate">
                        {session.name}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        {/* Status */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Status:</span>
                          <span className={`font-medium capitalize ${getStatusColor(session.status)}`}>
                            {session.status}
                          </span>
                        </div>

                        {/* Business Count */}
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">
                            {session.businessCount} business{session.businessCount !== 1 ? 'es' : ''}
                          </span>
                        </div>

                        {/* Date */}
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-400">
                            {formatDate(session.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Load Button */}
                      <button
                        onClick={() => handleLoadSession(session.id, session.name)}
                        disabled={loadingSessionId === session.id || session.businessCount === 0}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        {loadingSessionId === session.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <FolderOpen className="w-4 h-4" />
                            Load
                          </>
                        )}
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteSession(session.id, session.name)}
                        disabled={deletingSessionId === session.id}
                        className="p-2 hover:bg-red-600/20 text-red-400 hover:text-red-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete session"
                      >
                        {deletingSessionId === session.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 lg:p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
