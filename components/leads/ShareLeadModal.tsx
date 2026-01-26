'use client';

import { useState, useEffect } from 'react';
import { X, Users, Check } from 'lucide-react';

interface User {
  id: string; // Changed from number to string for UUID support
  username: string;
  email: string;
}

// Helper function to get auth token
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const data = JSON.parse(stored);
      return data.state?.token || data.token || null;
    }
  } catch (error) {
    console.error('Error reading auth token:', error);
  }
  return null;
}

interface ShareLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  onShareSuccess?: () => void;
}

export default function ShareLeadModal({
  isOpen,
  onClose,
  leadId,
  leadName,
  onShareSuccess,
}: ShareLeadModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]); // Changed from number[] to string[]
  const [initialSharedUserIds, setInitialSharedUserIds] = useState<string[]>([]); // Track initially shared users
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchCurrentShares();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/users', { headers });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchCurrentShares = async () => {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/leads/${leadId}/share`, { headers });
      if (response.ok) {
        const data = await response.json();
        const sharedUserIds = data.shares?.map((share: any) => share.user_id) || [];
        setSelectedUserIds(sharedUserIds);
        setInitialSharedUserIds(sharedUserIds);
      }
    } catch (err) {
      console.error('Error fetching current shares:', err);
    }
  };

  const handleToggleUser = (userId: string) => { // Changed from number to string
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleShare = async () => {
    setLoading(true);
    setError('');

    try {
      const token = getAuthToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Determine users to add and remove
      const usersToAdd = selectedUserIds.filter(id => !initialSharedUserIds.includes(id));
      const usersToRemove = initialSharedUserIds.filter(id => !selectedUserIds.includes(id));

      // Add new shares
      if (usersToAdd.length > 0) {
        const response = await fetch(`/api/leads/${leadId}/share`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ userIds: usersToAdd }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to share lead');
        }
      }

      // Remove shares
      for (const userId of usersToRemove) {
        const response = await fetch(`/api/leads/${leadId}/share?userId=${userId}`, {
          method: 'DELETE',
          headers,
        });

        if (!response.ok) {
          console.error(`Failed to unshare with user ${userId}`);
        }
      }

      onShareSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sharing');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Share Lead</h2>
              <p className="text-sm text-slate-400 mt-0.5">{leadName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* User List */}
          <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
            {filteredUsers.length === 0 ? (
              <p className="text-center text-slate-400 py-4">No users found</p>
            ) : (
              filteredUsers.map(user => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 p-3 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-white/10"
                >
                  <div className="relative flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => handleToggleUser(user.id)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedUserIds.includes(user.id)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-slate-600'
                    }`}>
                      {selectedUserIds.includes(user.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{user.username}</p>
                    <p className="text-sm text-slate-400 truncate">{user.email}</p>
                  </div>
                </label>
              ))
            )}
          </div>

          {/* Selected Count */}
          {selectedUserIds.length > 0 && (
            <div className="text-sm text-slate-400">
              {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors font-medium"
          >
            {loading ? 'Updating...' : 'Update Sharing'}
          </button>
        </div>
      </div>
    </div>
  );
}
