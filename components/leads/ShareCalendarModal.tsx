'use client';

/**
 * ShareCalendarModal Component
 * 
 * Modal for sharing calendar with other users
 * Allows owner to grant view/add/edit permissions
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Check, Loader2, AlertCircle, UserPlus, Trash2 } from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
}

interface CalendarShare {
  id: string;
  shared_with_user_id: string;
  username: string;
  email: string;
  can_add_events: boolean;
  can_edit_events: boolean;
}

interface ShareCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareCalendarModal({ isOpen, onClose }: ShareCalendarModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingShares, setLoadingShares] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [currentShares, setCurrentShares] = useState<CalendarShare[]>([]);
  
  const [selectedUserId, setSelectedUserId] = useState('');
  const [canAddEvents, setCanAddEvents] = useState(false);
  const [canEditEvents, setCanEditEvents] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableUsers();
      fetchCurrentShares();
    }
  }, [isOpen]);

  const getAuthToken = () => {
    const token = localStorage.getItem('auth-storage');
    if (token) {
      const data = JSON.parse(token);
      return data.state?.token || data.token;
    }
    return null;
  };

  const fetchAvailableUsers = async () => {
    try {
      const authToken = getAuthToken();
      if (!authToken) return;

      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchCurrentShares = async () => {
    setLoadingShares(true);
    try {
      const authToken = getAuthToken();
      if (!authToken) return;

      const response = await fetch('/api/calendar/shares', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentShares(data.shares || []);
      }
    } catch (err) {
      console.error('Error fetching calendar shares:', err);
    } finally {
      setLoadingShares(false);
    }
  };

  const handleAddShare = async () => {
    if (!selectedUserId) {
      setError('Please select a user');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/calendar/shares', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          shared_with_user_id: selectedUserId,
          can_add_events: canAddEvents,
          can_edit_events: canEditEvents
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to share calendar');
      }

      setSuccess('Calendar shared successfully!');
      setSelectedUserId('');
      setCanAddEvents(false);
      setCanEditEvents(false);
      
      // Refresh shares list
      await fetchCurrentShares();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error sharing calendar:', err);
      setError(err instanceof Error ? err.message : 'Failed to share calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    if (!confirm('Are you sure you want to stop sharing your calendar with this user?')) {
      return;
    }

    try {
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/calendar/shares/${shareId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove share');
      }

      setSuccess('Share removed successfully!');
      await fetchCurrentShares();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error removing share:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove share');
    }
  };

  const handleUpdatePermissions = async (shareId: string, canAdd: boolean, canEdit: boolean) => {
    try {
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/calendar/shares/${shareId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          can_add_events: canAdd,
          can_edit_events: canEdit
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update permissions');
      }

      setSuccess('Permissions updated!');
      await fetchCurrentShares();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to update permissions');
    }
  };

  if (!isOpen) return null;
  if (!mounted) return null;

  // Filter out users who already have access
  const availableUsersFiltered = availableUsers.filter(
    user => !currentShares.some(share => share.shared_with_user_id === user.id)
  );

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-emerald-500/30">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Share Calendar</h2>
              <p className="text-sm text-emerald-200">Manage who can view and edit your calendar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-emerald-200" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar space-y-6">
          {/* Success Message */}
          {success && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-green-400">{success}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Add New Share */}
          <div className="bg-white/5 border border-emerald-500/30 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 text-white font-medium">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              <span>Share with New User</span>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">
                Select User <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Choose a user...</option>
                {availableUsersFiltered.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canAddEvents}
                  onChange={(e) => setCanAddEvents(e.target.checked)}
                  disabled={loading}
                  className="w-5 h-5 rounded border-emerald-500/30 bg-white/5 text-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
                />
                <span className="text-white">Allow adding events to my calendar</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canEditEvents}
                  onChange={(e) => setCanEditEvents(e.target.checked)}
                  disabled={loading}
                  className="w-5 h-5 rounded border-emerald-500/30 bg-white/5 text-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
                />
                <span className="text-white">Allow editing events on my calendar</span>
              </label>
            </div>

            <button
              onClick={handleAddShare}
              disabled={loading || !selectedUserId}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sharing...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Share Calendar</span>
                </>
              )}
            </button>
          </div>

          {/* Current Shares */}
          <div>
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              Currently Shared With
            </h3>

            {loadingShares ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              </div>
            ) : currentShares.length === 0 ? (
              <div className="bg-white/5 border border-emerald-500/30 rounded-lg p-6 text-center">
                <Users className="w-12 h-12 text-emerald-400/50 mx-auto mb-2" />
                <p className="text-emerald-300/70">Your calendar is not shared with anyone yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentShares.map(share => (
                  <div
                    key={share.id}
                    className="bg-white/5 border border-emerald-500/30 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-white font-medium">{share.username}</p>
                        <p className="text-emerald-300/70 text-sm">{share.email}</p>
                        
                        <div className="mt-3 space-y-2">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={share.can_add_events}
                              onChange={(e) => handleUpdatePermissions(share.id, e.target.checked, share.can_edit_events)}
                              className="w-4 h-4 rounded border-emerald-500/30 bg-white/5 text-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
                            />
                            <span className="text-emerald-200 text-sm">Can add events</span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={share.can_edit_events}
                              onChange={(e) => handleUpdatePermissions(share.id, share.can_add_events, e.target.checked)}
                              className="w-4 h-4 rounded border-emerald-500/30 bg-white/5 text-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
                            />
                            <span className="text-emerald-200 text-sm">Can edit events</span>
                          </label>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveShare(share.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Remove share"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-emerald-500/20">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
