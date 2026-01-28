'use client';

import { useState } from 'react';
import { useLeadsStore } from '@/lib/store/leads';
import type { Lead } from '@/lib/leads/types';
import { Eye, Edit, Trash2, Phone, MapPin, Mail, Calendar, ChevronDown, ChevronUp, StickyNote, Bell, Clock, Plus, X, FileText, Share2 } from 'lucide-react';
import LeadDetailsModal from './LeadDetailsModal';
import EditLeadModal from './EditLeadModal';
import LaterStageModal from './LaterStageModal';
import SignedModal from './SignedModal';
import AddNoteModal from './AddNoteModal';
import AddReminderModal from './AddReminderModal';
import ShareLeadModal from './ShareLeadModal';
import SharedWithIndicator from './SharedWithIndicator';
import DeleteNoteModal from './DeleteNoteModal';
import DeleteReminderModal from './DeleteReminderModal';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast/useToast';

interface LeadsCardsProps {
  leads: Lead[];
  onUpdate: () => void;
}

interface LeadNote {
  id: string;
  content: string;
  created_at: string;
}

interface LeadReminder {
  id: string;
  reminder_type: string;
  priority: string;
  reminder_date: string;
  reminder_time?: string;
  message?: string;
  title?: string;
  note?: string;
  completed: boolean;
  status?: string;
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

export default function LeadsCards({ leads, onUpdate }: LeadsCardsProps) {
  const { selectedLeads, toggleLeadSelection } = useLeadsStore();
  const { toast } = useToast();
  const router = useRouter();
  const [detailsLead, setDetailsLead] = useState<Lead | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [notesReminders, setNotesReminders] = useState<Record<string, { notes: LeadNote[], reminders: LeadReminder[], loading: boolean }>>({});
  const [addNoteModalLead, setAddNoteModalLead] = useState<Lead | null>(null);
  const [addReminderModalLead, setAddReminderModalLead] = useState<Lead | null>(null);
  const [shareModalLead, setShareModalLead] = useState<Lead | null>(null);
  const [deleteNoteModal, setDeleteNoteModal] = useState<{ leadId: string; noteId: string } | null>(null);
  const [deleteReminderModal, setDeleteReminderModal] = useState<{ leadId: string; reminderId: string } | null>(null);
  const [isDeletingNote, setIsDeletingNote] = useState(false);
  const [isDeletingReminder, setIsDeletingReminder] = useState(false);
  const [laterStageLead, setLaterStageLead] = useState<Lead | null>(null);
  const [signedLead, setSignedLead] = useState<Lead | null>(null);

  const handleCreateProposal = (lead: Lead) => {
    // Store lead ID in localStorage for the calculator to attach the proposal
    localStorage.setItem('proposal-lead-id', lead.id);
    localStorage.setItem('proposal-lead-name', lead.name);
    
    // Navigate to calculator with pre-filled customer name
    router.push(`/calculator?customerName=${encodeURIComponent(lead.name)}&dealName=${encodeURIComponent(lead.name)}`);
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete lead');
      }

      const data = await response.json();
      
      // Show appropriate success message based on action
      if (data.action === 'unshared') {
        toast.success('Lead removed from your list', {
          message: 'The shared lead has been removed',
          section: 'leads'
        });
      } else {
        toast.success('Lead deleted successfully', {
          message: 'The lead has been permanently deleted',
          section: 'leads'
        });
      }

      onUpdate();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead', {
        message: 'Please try again',
        section: 'leads'
      });
    }
  };

  const fetchNotesReminders = async (leadId: string) => {
    setNotesReminders(prev => ({ ...prev, [leadId]: { notes: [], reminders: [], loading: true } }));
    
    try {
      const token = getAuthToken();
      if (!token) return;

      // Fetch notes
      const notesResponse = await fetch(`/api/leads/${leadId}/notes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const notesData = notesResponse.ok ? await notesResponse.json() : { notes: [] };

      // Fetch reminders
      const remindersResponse = await fetch(`/api/leads/${leadId}/reminders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const remindersData = remindersResponse.ok ? await remindersResponse.json() : { reminders: [] };

      setNotesReminders(prev => ({
        ...prev,
        [leadId]: {
          notes: notesData.notes || [],
          reminders: remindersData.reminders || [],
          loading: false
        }
      }));
    } catch (error) {
      console.error('Error fetching notes/reminders:', error);
      setNotesReminders(prev => ({ ...prev, [leadId]: { notes: [], reminders: [], loading: false } }));
    }
  };

  const toggleExpand = (leadId: string) => {
    if (expandedLead === leadId) {
      setExpandedLead(null);
    } else {
      setExpandedLead(leadId);
      if (!notesReminders[leadId]) {
        fetchNotesReminders(leadId);
      }
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800 border-blue-200',
      leads: 'bg-purple-100 text-purple-800 border-purple-200',
      working: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      bad: 'bg-red-100 text-red-800 border-red-200',
      later: 'bg-orange-100 text-orange-800 border-orange-200',
      signed: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'low': return 'text-green-400 bg-green-500/10 border-green-500/30';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const formatDateTime = (date: string | null, time?: string | null): string => {
    if (!date) return '';
    const d = new Date(date);
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    if (time) {
      return `${dateStr} at ${time}`;
    }
    return dateStr;
  };

  const getRelativeTime = (date: string): string => {
    const now = new Date();
    const reminderDate = new Date(date);
    const diffMs = reminderDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  const handleDeleteNote = (leadId: string, noteId: string) => {
    setDeleteNoteModal({ leadId, noteId });
  };

  const confirmDeleteNote = async () => {
    if (!deleteNoteModal) return;
    
    setIsDeletingNote(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Not authenticated', {
          message: 'Please log in to continue',
          section: 'leads'
        });
        return;
      }

      const response = await fetch(`/api/leads/${deleteNoteModal.leadId}/notes/${deleteNoteModal.noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete note');

      // Refresh notes/reminders
      fetchNotesReminders(deleteNoteModal.leadId);
      setDeleteNoteModal(null);
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note', {
        message: 'Please try again',
        section: 'leads'
      });
    } finally {
      setIsDeletingNote(false);
    }
  };

  const handleDeleteReminder = (leadId: string, reminderId: string) => {
    setDeleteReminderModal({ leadId, reminderId });
  };

  const confirmDeleteReminder = async () => {
    if (!deleteReminderModal) return;
    
    setIsDeletingReminder(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Not authenticated', {
          message: 'Please log in to continue',
          section: 'leads'
        });
        return;
      }

      const response = await fetch(`/api/leads/${deleteReminderModal.leadId}/reminders/${deleteReminderModal.reminderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete reminder');

      // Refresh notes/reminders
      fetchNotesReminders(deleteReminderModal.leadId);
      setDeleteReminderModal(null);
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast.error('Failed to delete reminder', {
        message: 'Please try again',
        section: 'leads'
      });
    } finally {
      setIsDeletingReminder(false);
    }
  };

  const handleToggleReminderComplete = async (leadId: string, reminderId: string, currentCompleted: boolean) => {
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Not authenticated', {
          message: 'Please log in to continue',
          section: 'leads'
        });
        return;
      }

      const response = await fetch(`/api/leads/${leadId}/reminders/${reminderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          completed: !currentCompleted,
          status: !currentCompleted ? 'completed' : 'pending'
        })
      });

      if (!response.ok) throw new Error('Failed to update reminder');

      // Refresh notes/reminders
      fetchNotesReminders(leadId);
    } catch (error) {
      console.error('Error updating reminder:', error);
      toast.error('Failed to update reminder', {
        message: 'Please try again',
        section: 'leads'
      });
    }
  };

  const handleStatusChange = async (lead: Lead, newStatus: string) => {
    // Show modal for later or signed status
    if (newStatus === 'later') {
      setLaterStageLead(lead);
      return;
    }
    
    if (newStatus === 'signed') {
      setSignedLead(lead);
      return;
    }
    
    // For other statuses, update immediately
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Not authenticated', {
          message: 'Please log in to continue',
          section: 'leads'
        });
        return;
      }
      
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update lead status');
      }

      // Refresh the leads list to show updated data
      onUpdate();
      
      toast.success('Lead status updated', {
        message: `Lead moved to ${newStatus}`,
        section: 'leads'
      });
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast.error('Failed to move lead', {
        message: error instanceof Error ? error.message : 'Unknown error',
        section: 'leads'
      });
    }
  };

  const handleLaterStageConfirm = async (data: { date_to_call_back: string; notes: string }) => {
    if (!laterStageLead) return;
    
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Not authenticated', {
          message: 'Please log in to continue',
          section: 'leads'
        });
        return;
      }
      
      const response = await fetch(`/api/leads/${laterStageLead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'later',
          date_to_call_back: data.date_to_call_back,
          notes: data.notes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update lead');
      }

      setLaterStageLead(null);
      onUpdate();
      
      toast.success('Lead moved to Later Stage', {
        message: 'Callback date has been set',
        section: 'leads'
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Failed to move lead', {
        message: error instanceof Error ? error.message : 'Unknown error',
        section: 'leads'
      });
    }
  };

  const handleSignedConfirm = async (data: { date_signed: string; notes: string }) => {
    if (!signedLead) return;
    
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Not authenticated', {
          message: 'Please log in to continue',
          section: 'leads'
        });
        return;
      }
      
      const response = await fetch(`/api/leads/${signedLead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'signed',
          date_signed: data.date_signed,
          notes: data.notes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update lead');
      }

      setSignedLead(null);
      onUpdate();
      
      toast.success('Lead marked as Signed', {
        message: 'Congratulations on the win!',
        section: 'leads'
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Failed to mark lead as signed', {
        message: error instanceof Error ? error.message : 'Unknown error',
        section: 'leads'
      });
    }
  };

  return (
    <>
      <div className="block lg:hidden space-y-4">
        {leads.map((lead) => {
          const isExpanded = expandedLead === lead.id;
          const data = notesReminders[lead.id];
          const totalCount = (data?.notes.length || 0) + (data?.reminders.length || 0);

          return (
            <div
              key={lead.id}
              className="bg-white/10 border border-white/20 rounded-lg overflow-hidden hover:border-emerald-500/50 transition-colors"
              style={{ backgroundColor: lead.background_color }}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={() => toggleLeadSelection(lead.id)}
                      className="mt-1 rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate mb-1">
                        {lead.name}
                      </h3>
                      {lead.type_of_business && (
                        <p className="text-sm text-gray-300 truncate">
                          {lead.type_of_business}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Status Dropdown - Full width on mobile */}
                <div className="mt-2">
                  <label className="block text-xs text-gray-400 mb-1">Status</label>
                  <select
                    value={lead.status}
                    onChange={(e) => handleStatusChange(lead, e.target.value)}
                    className={`w-full px-3 py-2 min-h-[44px] text-sm font-semibold rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 ${getStatusColor(lead.status)}`}
                  >
                    <option value="new">New (Main Sheet)</option>
                    <option value="leads">Leads (Active Pipeline)</option>
                    <option value="working">Working On</option>
                    <option value="later">Later Stage</option>
                    <option value="bad">Bad Lead</option>
                    <option value="signed">Signed</option>
                  </select>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* Shared With Indicator */}
                <SharedWithIndicator leadId={lead.id} compact={false} />

                {/* Contact Info */}
                {lead.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-sm text-emerald-400 hover:text-emerald-300 truncate"
                    >
                      {lead.phone}
                    </a>
                  </div>
                )}

                {lead.provider && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm text-gray-300">
                      Provider: <span className="font-medium text-white">{lead.provider}</span>
                    </span>
                  </div>
                )}

                {lead.town && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300 truncate">{lead.town}</span>
                  </div>
                )}

                {lead.contact_person && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300 truncate">
                      {lead.contact_person}
                    </span>
                  </div>
                )}

                {lead.date_to_call_back && lead.status === 'later' && (
                  <div className="flex items-center gap-1.5 p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <Calendar className="w-4 h-4 text-orange-400" />
                    <span className="text-sm text-orange-300 font-medium">
                      Callback: {new Date(lead.date_to_call_back).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                  </div>
                )}

                {lead.date_signed && lead.status === 'signed' && (
                  <div className="flex items-center gap-1.5 p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                    <Calendar className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-300 font-medium">
                      Signed: {new Date(lead.date_signed).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                  </div>
                )}

                {/* Notes & Reminders Dropdown - Embedded in Card Body */}
                <div className="pt-2">
                  <button
                    onClick={() => toggleExpand(lead.id)}
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
                          {totalCount + (lead.notes ? 1 : 0)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      {(data?.notes.length || 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <StickyNote className="w-3 h-3" />
                          {data.notes.length}
                        </span>
                      )}
                      {(data?.reminders.length || 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <Bell className="w-3 h-3" />
                          {data.reminders.length}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="mt-2 space-y-4">
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAddNoteModalLead(lead)}
                          className="flex items-center gap-2 px-4 py-3 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Add Note
                        </button>
                        <button
                          onClick={() => setAddReminderModalLead(lead)}
                          className="flex items-center gap-2 px-4 py-3 min-h-[44px] bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Add Reminder
                        </button>
                      </div>

                      {data?.loading ? (
                        <div className="text-center py-4 text-white/60 text-sm">Loading...</div>
                      ) : (
                        <>
                          {/* Legacy Notes */}
                          {lead.notes && (
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Legacy Notes
                              </h4>
                              <div className="py-2 border-b border-white/10">
                                <p className="text-sm text-white/90 whitespace-pre-wrap">{lead.notes}</p>
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {data?.notes && data.notes.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                                <StickyNote className="w-4 h-4" />
                                Notes ({data.notes.length})
                              </h4>
                              <div className="space-y-2">
                                {data.notes.map((note) => (
                                  <div key={note.id} className="py-2 border-b border-white/10 last:border-0 flex items-start justify-between gap-3">
                                    <div className="flex-1">
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
                                    <button
                                      onClick={() => handleDeleteNote(lead.id, note.id)}
                                      className="text-red-400 hover:text-red-300 p-1"
                                      title="Delete note"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Reminders */}
                          {data?.reminders && data.reminders.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                                <Bell className="w-4 h-4" />
                                Reminders ({data.reminders.length})
                              </h4>
                              <div className="space-y-2">
                                {data.reminders.map((reminder) => (
                                  <div key={reminder.id} className="py-2 border-b border-white/10 last:border-0 flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2 flex-1">
                                      <input
                                        type="checkbox"
                                        checked={reminder.completed || reminder.status === 'completed'}
                                        onChange={() => handleToggleReminderComplete(lead.id, reminder.id, reminder.completed)}
                                        className="mt-1 rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className={`px-2 py-0.5 rounded text-xs border ${getPriorityColor(reminder.priority)}`}>
                                            {reminder.priority}
                                          </span>
                                          <span className="text-xs text-white/60">{reminder.reminder_type}</span>
                                        </div>
                                        <p className={`text-sm text-white font-medium ${(reminder.completed || reminder.status === 'completed') ? 'line-through opacity-60' : ''}`}>
                                          {reminder.message || reminder.title}
                                        </p>
                                        {reminder.note && (
                                          <p className="text-xs text-white/70 mt-1">{reminder.note}</p>
                                        )}
                                        <div className="flex items-center gap-3 mt-2 text-xs text-white/60">
                                          <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {formatDateTime(reminder.reminder_date, reminder.reminder_time)}
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
                                    </div>
                                    <button
                                      onClick={() => handleDeleteReminder(lead.id, reminder.id)}
                                      className="text-red-400 hover:text-red-300 p-1"
                                      title="Delete reminder"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Empty State */}
                          {data && data.notes.length === 0 && data.reminders.length === 0 && !lead.notes && (
                            <div className="text-center py-4 text-white/60 text-sm">
                              No notes or reminders for this lead
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer - Mobile Optimized Buttons */}
              <div className="px-4 py-3 bg-white/5 border-t border-white/10">
                {/* Primary Actions Row */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <button
                    onClick={() => setDetailsLead(lead)}
                    className="flex flex-col items-center justify-center p-3 min-h-[60px] text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-5 h-5 mb-1" />
                    <span className="text-xs">View</span>
                  </button>
                  <button
                    onClick={() => setEditLead(lead)}
                    className="flex flex-col items-center justify-center p-3 min-h-[60px] text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-5 h-5 mb-1" />
                    <span className="text-xs">Edit</span>
                  </button>
                  <button
                    onClick={() => handleCreateProposal(lead)}
                    className="flex flex-col items-center justify-center p-3 min-h-[60px] text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors"
                    title="Create Proposal"
                  >
                    <FileText className="w-5 h-5 mb-1" />
                    <span className="text-xs">Proposal</span>
                  </button>
                </div>
                
                {/* Secondary Actions Row */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setShareModalLead(lead)}
                    className="flex flex-col items-center justify-center p-3 min-h-[60px] text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-colors"
                    title="Share Lead"
                  >
                    <Share2 className="w-5 h-5 mb-1" />
                    <span className="text-xs">Share</span>
                  </button>
                  {lead.maps_address && (
                    <a
                      href={lead.maps_address}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-3 min-h-[60px] text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-colors"
                      title="Open in Maps"
                    >
                      <MapPin className="w-5 h-5 mb-1" />
                      <span className="text-xs">Maps</span>
                    </a>
                  )}
                  <button
                    onClick={() => setDeleteConfirm(lead.id)}
                    className="flex flex-col items-center justify-center p-3 min-h-[60px] text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5 mb-1" />
                    <span className="text-xs">Delete</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {detailsLead && (
        <LeadDetailsModal
          lead={detailsLead}
          onClose={() => setDetailsLead(null)}
          onUpdate={onUpdate}
        />
      )}

      {editLead && (
        <EditLeadModal
          lead={editLead}
          onClose={() => setEditLead(null)}
          onUpdate={onUpdate}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (() => {
        const lead = leads.find(l => l.id === deleteConfirm);
        const currentUserId = (() => {
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
        })();
        const isOwner = lead && currentUserId && lead.user_id === currentUserId;
        
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-white mb-4">
                {isOwner ? 'Confirm Delete' : 'Remove Shared Lead'}
              </h3>
              <p className="text-gray-300 mb-6">
                {isOwner 
                  ? 'Are you sure you want to delete this lead? This will permanently delete it for everyone it\'s shared with. This action cannot be undone.'
                  : 'Are you sure you want to remove this lead that has been shared with you? This will only remove it from your view, not from the owner or other users.'
                }
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  {isOwner ? 'Delete' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add Note Modal */}
      {addNoteModalLead && (
        <AddNoteModal
          isOpen={true}
          onClose={() => setAddNoteModalLead(null)}
          leadId={addNoteModalLead.id}
          leadName={addNoteModalLead.name}
          onSuccess={() => {
            fetchNotesReminders(addNoteModalLead.id);
            onUpdate();
          }}
        />
      )}

      {/* Add Reminder Modal */}
      {addReminderModalLead && (
        <AddReminderModal
          isOpen={true}
          onClose={() => setAddReminderModalLead(null)}
          leadId={addReminderModalLead.id}
          leadName={addReminderModalLead.name}
          onSuccess={() => {
            fetchNotesReminders(addReminderModalLead.id);
            onUpdate();
          }}
        />
      )}

      {/* Share Lead Modal */}
      {shareModalLead && (
        <ShareLeadModal
          isOpen={true}
          onClose={() => setShareModalLead(null)}
          leadId={shareModalLead.id}
          leadName={shareModalLead.name}
          onShareSuccess={() => {
            onUpdate();
            toast.success('Lead shared successfully', {
              message: `${shareModalLead.name} has been shared`,
              section: 'leads'
            });
          }}
        />
      )}

      {/* Delete Note Modal */}
      <DeleteNoteModal
        isOpen={deleteNoteModal !== null}
        onClose={() => setDeleteNoteModal(null)}
        onConfirm={confirmDeleteNote}
        isDeleting={isDeletingNote}
      />

      {/* Delete Reminder Modal */}
      <DeleteReminderModal
        isOpen={deleteReminderModal !== null}
        onClose={() => setDeleteReminderModal(null)}
        onConfirm={confirmDeleteReminder}
        isDeleting={isDeletingReminder}
      />

      {/* Later Stage Modal */}
      {laterStageLead && (
        <LaterStageModal
          lead={laterStageLead}
          isOpen={true}
          onClose={() => setLaterStageLead(null)}
          onConfirm={handleLaterStageConfirm}
        />
      )}

      {/* Signed Modal */}
      {signedLead && (
        <SignedModal
          lead={signedLead}
          isOpen={true}
          onClose={() => setSignedLead(null)}
          onConfirm={handleSignedConfirm}
        />
      )}
    </>
  );
}
