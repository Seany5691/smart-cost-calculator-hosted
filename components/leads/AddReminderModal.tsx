'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Bell, Calendar, Clock, AlertCircle, Loader2, Users, Check } from 'lucide-react';

interface User {
  user_id: string;
  username: string;
  email: string;
}

interface AddReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  onSuccess?: () => void;
}

export default function AddReminderModal({
  isOpen,
  onClose,
  leadId,
  leadName,
  onSuccess
}: AddReminderModalProps) {
  const [message, setMessage] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [reminderType, setReminderType] = useState<'call' | 'email' | 'meeting' | 'task' | 'followup' | 'quote' | 'document'>('task');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [usersWithAccess, setUsersWithAccess] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen && leadId) {
      fetchUsersWithAccess();
    }
  }, [isOpen, leadId]);

  const fetchUsersWithAccess = async () => {
    setLoadingUsers(true);
    try {
      const token = localStorage.getItem('auth-storage');
      let authToken = null;
      let currentUserId = null;
      
      if (token) {
        const data = JSON.parse(token);
        authToken = data.state?.token || data.token;
        currentUserId = data.state?.user?.id || data.user?.id;
      }

      if (!authToken) return;

      const response = await fetch(`/api/leads/${leadId}/share`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const users: User[] = [];
        
        // Add owner
        if (data.owner) {
          users.push({
            user_id: data.owner.user_id,
            username: data.owner.username,
            email: data.owner.email
          });
        }
        
        // Add sharees
        if (data.shares && Array.isArray(data.shares)) {
          data.shares.forEach((share: any) => {
            users.push({
              user_id: share.user_id,
              username: share.username,
              email: share.email
            });
          });
        }
        
        setUsersWithAccess(users);
        
        // Auto-select current user
        if (currentUserId) {
          setSelectedUserIds([currentUserId]);
        }
      }
    } catch (err) {
      console.error('Error fetching users with access:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  if (!isOpen) return null;
  if (!mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setError('Please enter a reminder message');
      return;
    }

    if (!reminderDate) {
      setError('Please select a reminder date');
      return;
    }

    if (!reminderTime) {
      setError('Please select a reminder time');
      return;
    }

    // Validate that at least one user is selected
    if (selectedUserIds.length === 0) {
      setError('Please select at least one user to receive this reminder');
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

      const response = await fetch(`/api/leads/${leadId}/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          message: message.trim(),
          reminder_date: reminderDate,
          reminder_time: reminderTime,
          reminder_type: reminderType,
          priority: priority,
          status: 'pending',
          completed: false,
          shared_with_user_ids: selectedUserIds // Only selected users will receive the reminder
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add reminder');
      }

      // Success
      setMessage('');
      setReminderDate('');
      setReminderTime('09:00');
      setReminderType('task');
      setPriority('medium');
      setSelectedUserIds([]);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error adding reminder:', err);
      setError(err instanceof Error ? err.message : 'Failed to add reminder');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setMessage('');
      setReminderDate('');
      setReminderTime('09:00');
      setReminderType('task');
      setPriority('medium');
      setSelectedUserIds([]);
      setError('');
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden border border-emerald-500/30">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Bell className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Add Reminder</h2>
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

          {/* Info Box */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-emerald-400 font-medium mb-1">Reminder Notification</p>
                <p className="text-sm text-emerald-300">
                  You'll be notified at the specified date and time
                </p>
              </div>
            </div>
          </div>

          {/* Reminder Message */}
          <div>
            <label className="block text-white font-medium mb-2">
              Reminder Message <span className="text-red-400">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="What do you want to be reminded about?"
              required
              disabled={loading}
              className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* FIX #4: Add Type Selection */}
          <div>
            <label className="block text-white font-medium mb-2">
              Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['call', 'email', 'meeting', 'task', 'followup', 'quote', 'document'] as const).map(type => {
                const icons = {
                  call: '📞',
                  email: '📧',
                  meeting: '🤝',
                  task: '✅',
                  followup: '🔄',
                  quote: '💰',
                  document: '📄'
                };
                const labels = {
                  call: 'Call',
                  email: 'Email',
                  meeting: 'Meeting',
                  task: 'Task',
                  followup: 'Follow Up',
                  quote: 'Quote',
                  document: 'Document'
                };
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setReminderType(type)}
                    disabled={loading}
                    className={`p-3 rounded-lg border transition-all ${
                      reminderType === type
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-white/5 border-emerald-500/20 text-white/60 hover:bg-white/10 hover:border-emerald-500/30'
                    }`}
                  >
                    <div className="text-2xl mb-1">{icons[type]}</div>
                    <div className="text-xs">{labels[type]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FIX #4: Add Priority Selection */}
          <div>
            <label className="block text-white font-medium mb-2">
              Priority <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['high', 'medium', 'low'] as const).map(priorityOption => (
                <button
                  key={priorityOption}
                  type="button"
                  onClick={() => setPriority(priorityOption)}
                  disabled={loading}
                  className={`p-3 rounded-lg border transition-all ${
                    priority === priorityOption
                      ? priorityOption === 'high' ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                        priorityOption === 'medium' ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' :
                        'bg-green-500/20 border-green-500/50 text-green-400'
                      : 'bg-white/5 border-emerald-500/20 text-white/60 hover:bg-white/10 hover:border-emerald-500/30'
                  }`}
                >
                  <div className="text-sm font-medium capitalize">{priorityOption}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-medium mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                required
                min={new Date().toISOString().split('T')[0]}
                disabled={loading}
                className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 [color-scheme:dark]"
                style={{
                  colorScheme: 'dark'
                }}
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Time <span className="text-red-400">*</span>
              </label>
              <select
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2310b981'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
              >
                {Array.from({ length: 96 }, (_, i) => {
                  const hours = Math.floor(i / 4);
                  const minutes = (i % 4) * 15;
                  const time24 = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                  const isPM = hours >= 12;
                  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
                  const time12 = `${hours12}:${minutes.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
                  return (
                    <option key={time24} value={time24}>
                      {time12}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Share with Users */}
          {usersWithAccess.length > 0 && (
            <div>
              <label className="block text-white font-medium mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Share Reminder With <span className="text-red-400">*</span>
              </label>
              <p className="text-emerald-300/70 text-xs mb-2">
                Select who should receive this reminder. Only selected users will see it.
              </p>
              <div className="bg-white/5 border border-emerald-500/30 rounded-lg p-3 max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  </div>
                ) : usersWithAccess.length === 0 ? (
                  <p className="text-emerald-300/50 text-sm text-center py-2">
                    No other users have access to this lead
                  </p>
                ) : (
                  usersWithAccess.map(user => (
                    <label
                      key={user.user_id}
                      className="flex items-center gap-3 p-2 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className="relative flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.user_id)}
                          onChange={() => handleToggleUser(user.user_id)}
                          disabled={loading}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedUserIds.includes(user.user_id)
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-emerald-500/50'
                        }`}>
                          {selectedUserIds.includes(user.user_id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{user.username}</p>
                        <p className="text-emerald-300/70 text-xs truncate">{user.email}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
              {selectedUserIds.length > 0 && (
                <p className="text-emerald-300/70 text-sm mt-2">
                  {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} will receive this reminder
                </p>
              )}
              {selectedUserIds.length === 0 && (
                <p className="text-red-400 text-sm mt-2">
                  Please select at least one user
                </p>
              )}
            </div>
          )}

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
              disabled={loading || !message.trim() || !reminderDate || !reminderTime || selectedUserIds.length === 0}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  <span>Save Reminder</span>
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
