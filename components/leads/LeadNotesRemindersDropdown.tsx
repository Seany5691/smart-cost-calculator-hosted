'use client';

/**
 * LeadNotesRemindersDropdown Component
 * 
 * Expandable dropdown that shows all notes and reminders for a specific lead
 * Used in all lead tables/cards across different tabs
 */

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, StickyNote, Bell, Calendar, Clock, AlertCircle, FileText } from 'lucide-react';
import type { LeadNote, LeadReminder } from '@/lib/leads/types';

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

// Helper to format date/time
function formatDateTime(date: string | null, time: string | null): string {
  if (!date) return '';
  const d = new Date(date);
  const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  if (time) {
    return `${dateStr} at ${time}`;
  }
  return dateStr;
}

// Helper to get relative time
function getRelativeTime(date: string): string {
  const now = new Date();
  const reminderDate = new Date(date);
  const diffMs = reminderDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return `In ${diffDays} days`;
}

interface LeadNotesRemindersDropdownProps {
  leadId: string;
  leadName: string;
  legacyNotes?: string | null;
}

export default function LeadNotesRemindersDropdown({ leadId, leadName, legacyNotes }: LeadNotesRemindersDropdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [reminders, setReminders] = useState<LeadReminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Fetch notes and reminders when expanded
  useEffect(() => {
    if (isExpanded && !loaded) {
      fetchData();
    }
  }, [isExpanded, loaded]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) return;

      // Fetch notes
      const notesResponse = await fetch(`/api/leads/${leadId}/notes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (notesResponse.ok) {
        const notesData = await notesResponse.json();
        setNotes(notesData.notes || []);
      }

      // Fetch reminders
      const remindersResponse = await fetch(`/api/leads/${leadId}/reminders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (remindersResponse.ok) {
        const remindersData = await remindersResponse.json();
        setReminders(remindersData.reminders || []);
      }

      setLoaded(true);
    } catch (error) {
      console.error('Error fetching notes/reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'low': return 'text-green-400 bg-green-500/10 border-green-500/30';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const getStatusColor = (reminder: LeadReminder) => {
    if (reminder.completed || reminder.status === 'completed') {
      return 'text-green-400 bg-green-500/10 border-green-500/30';
    }
    const now = new Date();
    const reminderDate = new Date(reminder.reminder_date);
    if (reminderDate < now) {
      return 'text-red-400 bg-red-500/10 border-red-500/30';
    }
    return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
  };

  const totalCount = notes.length + reminders.length + (legacyNotes ? 1 : 0);

  return (
    <div className="w-full">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-2 hover:opacity-80 transition-opacity text-left"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-white/60" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/60" />
          )}
          <span className="text-sm text-white/80">
            {isExpanded ? 'Hide' : 'Show'} Notes & Reminders
          </span>
          {totalCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs text-blue-400">
              {totalCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-white/60">
          {notes.length > 0 && (
            <span className="flex items-center gap-1">
              <StickyNote className="w-3 h-3" />
              {notes.length}
            </span>
          )}
          {reminders.length > 0 && (
            <span className="flex items-center gap-1">
              <Bell className="w-3 h-3" />
              {reminders.length}
            </span>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-2 space-y-4">
          {loading ? (
            <div className="text-center py-4 text-white/60">Loading...</div>
          ) : (
            <>
              {/* Legacy Notes Section */}
              {legacyNotes && (
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Legacy Notes
                  </h4>
                  <div className="py-2 border-b border-white/10">
                    <p className="text-sm text-white/90 whitespace-pre-wrap">{legacyNotes}</p>
                  </div>
                </div>
              )}

              {/* Notes Section */}
              {notes.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <StickyNote className="w-4 h-4" />
                    Notes ({notes.length})
                  </h4>
                  <div className="space-y-2">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="py-2 border-b border-white/10 last:border-0"
                      >
                        <p className="text-sm text-white/90 whitespace-pre-wrap">{note.content}</p>
                        <p className="text-xs text-white/50 mt-1">
                          {new Date(note.created_at).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reminders Section */}
              {reminders.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Reminders ({reminders.length})
                  </h4>
                  <div className="space-y-2">
                    {reminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className="py-2 border-b border-white/10 last:border-0"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-xs border ${getPriorityColor(reminder.priority)}`}>
                                {reminder.priority}
                              </span>
                              <span className="text-xs text-white/60">{reminder.reminder_type}</span>
                            </div>
                            <p className="text-sm text-white font-medium">{reminder.message || reminder.title}</p>
                            {reminder.note && (
                              <p className="text-xs text-white/70 mt-1">{reminder.note}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-white/60">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDateTime(reminder.reminder_date, reminder.reminder_time || null)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {getRelativeTime(reminder.reminder_date)}
                          </span>
                          {(reminder.completed || reminder.status === 'completed') && (
                            <span className="text-green-400">✓ Completed</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {notes.length === 0 && reminders.length === 0 && !legacyNotes && (
                <div className="text-center py-6 text-white/60">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notes or reminders for this lead</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
