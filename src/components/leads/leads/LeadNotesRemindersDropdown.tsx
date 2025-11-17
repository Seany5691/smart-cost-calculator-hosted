'use client';

import { useState, useEffect } from 'react';
import { Lead } from '@/lib/leads/types';
import { ChevronRight, MessageSquare, Bell, Calendar } from 'lucide-react';
import { 
  getLeadNotes,
  type LeadNote,
} from '@/lib/leads/supabaseNotesReminders';
import { useAuthStore } from '@/store/auth';
import { useRemindersStore, useLeadReminders } from '@/store/reminders';

interface LeadNotesRemindersDropdownProps {
  lead: Lead;
  onNotesClick?: () => void;
  onRemindersClick?: () => void;
  refreshTrigger?: number; // Add trigger to force refresh
}

export const LeadNotesRemindersDropdown = ({ 
  lead, 
  onNotesClick, 
  onRemindersClick,
  refreshTrigger = 0
}: LeadNotesRemindersDropdownProps) => {
  const user = useAuthStore((state) => state.user);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Get reminders from global store
  const reminders = useLeadReminders(lead.id);
  const { toggleComplete } = useRemindersStore();
  
  // Debug logging
  useEffect(() => {
    console.log('[Dropdown] Reminders for lead', lead.id, ':', reminders);
    console.log('[Dropdown] Active reminders:', reminders.filter(r => !r.completed));
    console.log('[Dropdown] Completed reminders:', reminders.filter(r => r.completed));
  }, [reminders, lead.id]);

  // Load notes for this lead - reload when lead changes or refreshTrigger changes
  useEffect(() => {
    if (user) {
      loadNotes();
    }
  }, [lead.id, refreshTrigger, user]);

  const loadNotes = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // Load notes from Supabase
      const leadNotes = await getLeadNotes(lead.id);
      setNotes(leadNotes as any);
    } catch (error) {
      console.error('Error loading notes:', error);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReminderCompletion = async (reminderId: string) => {
    try {
      await toggleComplete(reminderId);
    } catch (error) {
      console.error('Error toggling reminder:', error);
    }
  };

  const [showCompleted, setShowCompleted] = useState(false);
  
  const activeReminders = reminders.filter(r => !r.completed);
  const completedReminders = reminders.filter(r => r.completed);
  const displayReminders = showCompleted ? reminders : activeReminders;
  const totalItems = notes.length + activeReminders.length;

  // Always show the dropdown so users know they can add notes/reminders
  return (
    <details className="mt-4 pt-4 border-t border-gray-200 group">
      <summary className="cursor-pointer list-none flex items-center justify-between text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors">
        <span className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
          Notes & Reminders
          {totalItems > 0 && (
            <span className="text-xs font-normal text-gray-500">
              ({totalItems} items)
            </span>
          )}
        </span>
      </summary>
      
      <div className="mt-3 space-y-4 pl-6">
        {/* Notes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              Notes ({notes.length})
            </p>
          </div>
          
          {notes.length > 0 ? (
            <div className="space-y-2">
              {notes.slice(-3).map(note => (
                <div key={note.id} className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
                  <p>{note.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(note.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
              {notes.length > 3 && onNotesClick && (
                <button
                  onClick={onNotesClick}
                  className="text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  View all {notes.length} notes
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">No notes yet. Use the Note button above to add one.</p>
          )}
        </div>

        {/* Reminders */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
              <Bell className="w-3 h-3" />
              Reminders ({activeReminders.length})
            </p>
            {completedReminders.length > 0 && (
              <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                  className="rounded w-3 h-3"
                />
                Completed
              </label>
            )}
          </div>
          
          {displayReminders.length > 0 ? (
            <div className="space-y-2">
              {displayReminders.map(reminder => (
                <div key={reminder.id} className={`flex items-center gap-2 text-sm p-2 rounded border ${reminder.completed ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-purple-50 border-purple-200'}`}>
                  <input
                    type="checkbox"
                    checked={reminder.completed}
                    onChange={() => handleToggleReminderCompletion(reminder.id)}
                    className="rounded"
                  />
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span className={`text-gray-700 flex-1 text-xs ${reminder.completed ? 'line-through' : ''}`}>
                    {new Date(reminder.reminderDate).toLocaleDateString()} - {reminder.note}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">No reminders yet. Use the Reminder button above to add one.</p>
          )}
        </div>
      </div>
    </details>
  );
};
