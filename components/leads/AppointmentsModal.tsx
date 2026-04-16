'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Bell, Calendar, Clock, Check, AlertCircle, Loader2 } from 'lucide-react';
import WheelTimePicker from './WheelTimePicker';

interface User {
  id: string;
  username: string;
  email: string;
}

interface AppointmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  onSuccess: () => void;
}

type ReminderType = 'call' | 'email' | 'meeting' | 'task' | 'followup' | 'quote' | 'document';

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

// Helper function to get current user ID
function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const data = JSON.parse(stored);
      return data.state?.user?.userId || data.user?.userId || null;
    }
  } catch (error) {
    console.error('Error reading user ID:', error);
  }
  return null;
}

export default function AppointmentsModal({
  isOpen,
  onClose,
  leadId,
  leadName,
  onSuccess
}: AppointmentsModalProps) {
  // ===== STATE =====
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Users
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Lead Sharing
  const [leadShareUserIds, setLeadShareUserIds] = useState<string[]>([]);
  const [initialLeadShareUserIds, setInitialLeadShareUserIds] = useState<string[]>([]);
  const [leadShareSearch, setLeadShareSearch] = useState('');
  
  // Reminder
  const [reminderMessage, setReminderMessage] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [reminderType, setReminderType] = useState<ReminderType>('meeting');
  const [reminderPriority, setReminderPriority] = useState<'low' | 'medium' | 'high'>('high');
  const [reminderUserIds, setReminderUserIds] = useState<string[]>([]);
  
  // ===== COMPUTED VALUES =====
  
  // Filtered users for lead sharing (based on search)
  const filteredLeadShareUsers = useMemo(() => {
    return allUsers.filter(user =>
      user.username.toLowerCase().includes(leadShareSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(leadShareSearch.toLowerCase())
    );
  }, [allUsers, leadShareSearch]);
  
  // Available users for reminder sharing (only those selected for lead share)
  const availableReminderUsers = useMemo(() => {
    return allUsers.filter(user => leadShareUserIds.includes(user.id));
  }, [allUsers, leadShareUserIds]);
  
  // Validation
  const isValid = useMemo(() => {
    return (
      leadShareUserIds.length > 0 &&
      reminderMessage.trim().length > 0 &&
      reminderDate.length > 0 &&
      reminderTime.length > 0 &&
      reminderUserIds.length > 0
    );
  }, [leadShareUserIds, reminderMessage, reminderDate, reminderTime, reminderUserIds]);
  
  // ===== EFFECTS =====
  
  // Mount check for SSR safety
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAllUsers();
      fetchCurrentLeadShares();
      setCurrentUserId(getCurrentUserId());
    }
  }, [isOpen, leadId]);
  
  // Auto-cleanup: Remove reminder users when removed from lead share
  useEffect(() => {
    setReminderUserIds(prev => 
      prev.filter(id => leadShareUserIds.includes(id))
    );
  }, [leadShareUserIds]);
  
  // Auto-select current user for reminder when lead share changes
  useEffect(() => {
    if (currentUserId && leadShareUserIds.includes(currentUserId)) {
      if (!reminderUserIds.includes(currentUserId)) {
        setReminderUserIds(prev => [...prev, currentUserId]);
      }
    }
  }, [leadShareUserIds, currentUserId, reminderUserIds]);
  
  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, loading, onClose]);
  
  // ===== API FUNCTIONS =====
  
  const fetchAllUsers = async () => {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/users', { headers });
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };
  
  const fetchCurrentLeadShares = async () => {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/leads/${leadId}/share`, { headers });
      if (response.ok) {
        const data = await response.json();
        
        // Combine owner and sharees
        const ownerAndSharees = [
          data.owner?.user_id,
          ...data.shares.map((s: any) => s.user_id)
        ].filter(Boolean);
        
        setLeadShareUserIds(ownerAndSharees);
        setInitialLeadShareUserIds(ownerAndSharees);
      }
    } catch (err) {
      console.error('Error fetching current shares:', err);
    }
  };
  
  // ===== HANDLERS =====
  
  const handleLeadShareToggle = (userId: string) => {
    setLeadShareUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  const handleReminderUserToggle = (userId: string) => {
    setReminderUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = getAuthToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // STEP 1: Update lead sharing
      const usersToAdd = leadShareUserIds.filter(id => !initialLeadShareUserIds.includes(id));
      const usersToRemove = initialLeadShareUserIds.filter(id => !leadShareUserIds.includes(id));
      
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
      
      for (const userId of usersToRemove) {
        const response = await fetch(`/api/leads/${leadId}/share?userId=${userId}`, {
          method: 'DELETE',
          headers,
        });

        if (!response.ok) {
          console.error(`Failed to unshare with user ${userId}`);
        }
      }
      
      // STEP 2: Create reminder
      const reminderResponse = await fetch(`/api/leads/${leadId}/reminders`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: reminderMessage.trim(),
          reminder_date: reminderDate,
          reminder_time: reminderTime,
          reminder_type: reminderType,
          priority: reminderPriority,
          status: 'pending',
          completed: false,
          shared_with_user_ids: reminderUserIds
        }),
      });

      if (!reminderResponse.ok) {
        const data = await reminderResponse.json();
        throw new Error(data.error || 'Failed to create reminder');
      }
      
      // STEP 3: Change lead status to 'appointments'
      const statusResponse = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: 'appointments' }),
      });

      if (!statusResponse.ok) {
        const data = await statusResponse.json();
        throw new Error(data.error || 'Failed to schedule appointment');
      }
      
      // Success!
      onSuccess();
      onClose();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule appointment');
    } finally {
      setLoading(false);
    }
  };
  
  // ===== RENDER =====
  
  if (!mounted || !isOpen) return null;
  
  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="appointments-modal-title"
    >
      <div 
        className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-emerald-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Calendar className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 id="appointments-modal-title" className="text-2xl font-bold text-white">
                Schedule Appointment
              </h2>
              <p className="text-sm text-emerald-200">{leadName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-emerald-200" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)] custom-scrollbar space-y-6">
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
          
          {/* Share Lead Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Share Lead</h3>
            </div>
            
            {/* Search */}
            <div>
              <input
                type="text"
                placeholder="Search users..."
                value={leadShareSearch}
                onChange={(e) => setLeadShareSearch(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              />
            </div>

            {/* User List */}
            <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar bg-white/5 border border-emerald-500/20 rounded-lg p-3">
              {filteredLeadShareUsers.length === 0 ? (
                <p className="text-center text-emerald-300/50 py-4">No users found</p>
              ) : (
                filteredLeadShareUsers.map(user => (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-emerald-500/30"
                  >
                    <div className="relative flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={leadShareUserIds.includes(user.id)}
                        onChange={() => handleLeadShareToggle(user.id)}
                        disabled={loading}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        leadShareUserIds.includes(user.id)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-emerald-500/50'
                      }`}>
                        {leadShareUserIds.includes(user.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{user.username}</p>
                      <p className="text-sm text-emerald-300/70 truncate">{user.email}</p>
                    </div>
                  </label>
                ))
              )}
            </div>

            {/* Selected Count */}
            {leadShareUserIds.length > 0 && (
              <div className="text-sm text-emerald-300/70">
                {leadShareUserIds.length} user{leadShareUserIds.length !== 1 ? 's' : ''} selected
              </div>
            )}
            {leadShareUserIds.length === 0 && (
              <div className="text-sm text-red-400">
                Please select at least one user to share with
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-emerald-500/20" />

          {/* Create Reminder Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-semibold text-white">Create Reminder</h3>
            </div>

            {/* Reminder Message */}
            <div>
              <label className="block text-white font-medium mb-2">
                Message <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                rows={3}
                placeholder="What is this appointment about?"
                required
                disabled={loading}
                className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            {/* Type Selection */}
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

            {/* Priority Selection */}
            <div>
              <label className="block text-white font-medium mb-2">
                Priority <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['high', 'medium', 'low'] as const).map(priorityOption => (
                  <button
                    key={priorityOption}
                    type="button"
                    onClick={() => setReminderPriority(priorityOption)}
                    disabled={loading}
                    className={`p-3 rounded-lg border transition-all ${
                      reminderPriority === priorityOption
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

            {/* Date */}
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
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-white font-medium mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Time <span className="text-red-400">*</span>
              </label>
              <WheelTimePicker
                value={reminderTime}
                onChange={setReminderTime}
                disabled={loading}
              />
            </div>

            {/* Share Reminder With */}
            {availableReminderUsers.length > 0 && (
              <div>
                <label className="block text-white font-medium mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  Share Reminder With <span className="text-red-400">*</span>
                </label>
                <p className="text-emerald-300/70 text-xs mb-2">
                  Select who should receive this reminder. Only users with lead access are shown.
                </p>
                <div className="bg-white/5 border border-emerald-500/30 rounded-lg p-3 max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                  {availableReminderUsers.map(user => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 p-2 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className="relative flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={reminderUserIds.includes(user.id)}
                          onChange={() => handleReminderUserToggle(user.id)}
                          disabled={loading}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          reminderUserIds.includes(user.id)
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-emerald-500/50'
                        }`}>
                          {reminderUserIds.includes(user.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{user.username}</p>
                        <p className="text-emerald-300/70 text-xs truncate">{user.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {reminderUserIds.length > 0 && (
                  <p className="text-emerald-300/70 text-sm mt-2">
                    {reminderUserIds.length} user{reminderUserIds.length !== 1 ? 's' : ''} will receive this reminder
                  </p>
                )}
                {reminderUserIds.length === 0 && (
                  <p className="text-red-400 text-sm mt-2">
                    Please select at least one user
                  </p>
                )}
              </div>
            )}
            
            {availableReminderUsers.length === 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-yellow-400 font-medium mb-1">No Users Selected</p>
                    <p className="text-sm text-yellow-300">
                      Please select users to share the lead with first
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-emerald-500/20">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !isValid}
            className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Scheduling...</span>
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4" />
                <span>Schedule Appointment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
