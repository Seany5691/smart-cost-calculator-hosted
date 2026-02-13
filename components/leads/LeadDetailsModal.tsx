'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useCalculatorStore } from '@/lib/store/calculator';
import type { Lead } from '@/lib/leads/types';
import { X, Phone, MapPin, Calendar, Paperclip, Eye, User, Building2, Briefcase, FileText, Edit, Trash2, Share2, ExternalLink, Bell, Clock } from 'lucide-react';
import NotesSection from './NotesSection';
import AttachmentsSection from './AttachmentsSection';
import EditLeadModal from './EditLeadModal';
import ShareLeadModal from './ShareLeadModal';
import SharedWithIndicator from './SharedWithIndicator';
import DeleteLeadModal from './DeleteLeadModal';
import { useToast } from '@/components/ui/Toast/useToast';

interface LeadDetailsModalProps {
  lead: Lead;
  onClose: () => void;
  onUpdate: () => void;
}

export default function LeadDetailsModal({ lead, onClose, onUpdate }: LeadDetailsModalProps) {
  const router = useRouter();
  const { resetCalculator } = useCalculatorStore();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reminders, setReminders] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [loadingAttachments, setLoadingAttachments] = useState(true);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Fetch reminders
  useEffect(() => {
    if (mounted) {
      fetchReminders();
      fetchAttachments();
    }
  }, [mounted, lead.id]);

  const fetchReminders = async () => {
    try {
      setLoadingReminders(true);
      const token = localStorage.getItem('auth-storage');
      let authToken = null;
      if (token) {
        const data = JSON.parse(token);
        authToken = data.state?.token || data.token;
      }

      if (!authToken) return;

      const response = await fetch(`/api/leads/${lead.id}/reminders`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setReminders(data.reminders || []);
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoadingReminders(false);
    }
  };

  const fetchAttachments = async () => {
    try {
      setLoadingAttachments(true);
      const token = localStorage.getItem('auth-storage');
      let authToken = null;
      if (token) {
        const data = JSON.parse(token);
        authToken = data.state?.token || data.token;
      }

      if (!authToken) return;

      const response = await fetch(`/api/leads/${lead.id}/attachments`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAttachments(data.attachments || []);
      }
    } catch (error) {
      console.error('Error fetching attachments:', error);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const handleToggleReminderComplete = async (reminderId: string, currentCompleted: boolean) => {
    try {
      const token = localStorage.getItem('auth-storage');
      let authToken = null;
      if (token) {
        const data = JSON.parse(token);
        authToken = data.state?.token || data.token;
      }

      if (!authToken) return;

      const response = await fetch(`/api/leads/${lead.id}/reminders/${reminderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          completed: !currentCompleted,
          status: !currentCompleted ? 'completed' : 'pending'
        })
      });

      if (response.ok) {
        fetchReminders();
      }
    } catch (error) {
      console.error('Error updating reminder:', error);
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownloadAttachment = async (attachmentId: string, filename: string) => {
    try {
      const token = localStorage.getItem('auth-storage');
      let authToken = null;
      if (token) {
        const data = JSON.parse(token);
        authToken = data.state?.token || data.token;
      }

      if (!authToken) return;

      const response = await fetch(`/api/leads/${lead.id}/attachments/${attachmentId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast.error('Failed to download file', {
        message: 'Please try again',
        section: 'leads'
      });
    }
  };

  // Handle creating proposal
  const handleCreateProposal = () => {
    // Reset calculator first to start fresh
    resetCalculator();
    localStorage.removeItem('calculator-storage');
    
    // Store lead ID in localStorage for the calculator to attach the proposal
    localStorage.setItem('proposal-lead-id', lead.id);
    localStorage.setItem('proposal-lead-name', lead.name);
    
    // Close modal and navigate to calculator
    onClose();
    router.push(`/calculator?customerName=${encodeURIComponent(lead.name)}&dealName=${encodeURIComponent(lead.name)}`);
  };

  // Handle view lead in tab
  const handleViewLead = () => {
    // Map status to tab ID
    const statusToTab: Record<string, string> = {
      'new': 'main-sheet', // Main Sheet
      'leads': 'leads',
      'working': 'working',
      'proposal': 'proposal',
      'later': 'later',
      'bad': 'bad',
      'signed': 'signed'
    };

    const tabId = statusToTab[lead.status] || 'leads';
    
    // Close modal first
    onClose();
    
    // Navigate to the tab with lead ID for highlighting
    router.push(`/leads?tab=${tabId}&highlightLead=${lead.id}`);
  };

  // Handle delete success
  const handleDeleteConfirm = async () => {
    try {
      const token = localStorage.getItem('auth-storage');
      let authToken = null;
      if (token) {
        const data = JSON.parse(token);
        authToken = data.state?.token || data.token;
      }

      if (!authToken) {
        toast.error('Not authenticated', {
          message: 'Please log in to continue',
          section: 'leads'
        });
        return;
      }

      const response = await fetch(`/api/leads/${lead.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`
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

      setShowDeleteModal(false);
      onClose();
      onUpdate();
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead', {
        message: 'Please try again',
        section: 'leads'
      });
    }
  };

  // Check if current user is owner
  const isOwner = (() => {
    try {
      const stored = localStorage.getItem('auth-storage');
      if (stored) {
        const data = JSON.parse(stored);
        const currentUserId = data.state?.user?.userId || data.user?.userId;
        return lead.user_id === currentUserId;
      }
    } catch (error) {
      console.error('Error checking ownership:', error);
    }
    return true; // Default to true to allow delete
  })();

  if (!mounted) return null;

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 sm:p-0">
          <div className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl sm:rounded-none shadow-2xl max-w-2xl sm:max-w-full w-full max-h-[90vh] sm:h-screen overflow-hidden border border-emerald-500/30 sm:m-0">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Eye className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Lead Details</h2>
                  <p className="text-sm text-emerald-200">View lead information</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 min-w-[44px] min-h-[44px] hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center"
              >
                <X className="w-5 h-5 text-emerald-200" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] sm:max-h-[calc(100vh-160px)] custom-scrollbar space-y-6">
              {/* Action Buttons Section */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-emerald-400" />
                  Actions
                </h3>
                
                {/* Shared Status - Full Width */}
                <div className="mb-3">
                  <SharedWithIndicator leadId={lead.id} />
                </div>

                {/* Action Buttons - Glassmorphism Design */}
                <div className="flex flex-wrap gap-2">
                  {/* View Lead */}
                  <button
                    onClick={handleViewLead}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg transition-all duration-200 font-medium border border-white/20 hover:border-emerald-500/50 min-h-[44px]"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View Lead</span>
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg transition-all duration-200 font-medium border border-white/20 hover:border-blue-500/50 min-h-[44px]"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>

                  {/* Create Proposal */}
                  <button
                    onClick={handleCreateProposal}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg transition-all duration-200 font-medium border border-white/20 hover:border-purple-500/50 min-h-[44px]"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Proposal</span>
                  </button>

                  {/* Attachments */}
                  <button
                    onClick={() => setShowAttachments(true)}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg transition-all duration-200 font-medium border border-white/20 hover:border-yellow-500/50 min-h-[44px]"
                  >
                    <Paperclip className="w-4 h-4" />
                    <span>Attachments</span>
                  </button>

                  {/* Share Lead */}
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg transition-all duration-200 font-medium border border-white/20 hover:border-cyan-500/50 min-h-[44px]"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>

                  {/* Open in Maps */}
                  {lead.maps_address && (
                    <a
                      href={lead.maps_address}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg transition-all duration-200 font-medium border border-white/20 hover:border-indigo-500/50 min-h-[44px]"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>Maps</span>
                    </a>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-red-500/20 backdrop-blur-sm text-white rounded-lg transition-all duration-200 font-medium border border-white/20 hover:border-red-500/50 min-h-[44px]"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-400" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-emerald-200 mb-1">
                      Status
                    </label>
                    <p className="text-white capitalize px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg">{lead.status}</p>
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-emerald-200 mb-1">
                      Name
                    </label>
                    <p className="text-white px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg">{lead.name}</p>
                  </div>
                  {lead.type_of_business && (
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-emerald-200 mb-1">
                        <Briefcase className="w-4 h-4 inline mr-1" />
                        Type of Business
                      </label>
                      <p className="text-white px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg">{lead.type_of_business}</p>
                    </div>
                  )}
                  {lead.contact_person && (
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-emerald-200 mb-1">
                        <User className="w-4 h-4 inline mr-1" />
                        Contact Person
                      </label>
                      <p className="text-white px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg">{lead.contact_person}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-emerald-400" />
                  Contact Information
                </h3>
                <div className="space-y-3">
                  {lead.phone && (
                    <div>
                      <label className="block text-sm font-medium text-emerald-200 mb-1">
                        Phone Number
                      </label>
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-emerald-400 hover:text-emerald-300 px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg block"
                      >
                        {lead.phone}
                      </a>
                    </div>
                  )}
                  {lead.provider && (
                    <div>
                      <label className="block text-sm font-medium text-emerald-200 mb-1">
                        <Building2 className="w-4 h-4 inline mr-1" />
                        Provider
                      </label>
                      <p className="text-white px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg">{lead.provider}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              {(lead.address || lead.town || lead.maps_address) && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                    Location
                  </h3>
                  <div className="space-y-3">
                    {lead.address && (
                      <div>
                        <label className="block text-sm font-medium text-emerald-200 mb-1">
                          Physical Address
                        </label>
                        <p className="text-white px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg">{lead.address}</p>
                      </div>
                    )}
                    {lead.town && (
                      <div>
                        <label className="block text-sm font-medium text-emerald-200 mb-1">
                          Town/City
                        </label>
                        <p className="text-white px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg">{lead.town}</p>
                      </div>
                    )}
                    {lead.maps_address && (
                      <div>
                        <label className="block text-sm font-medium text-emerald-200 mb-1">
                          Google Maps
                        </label>
                        <a
                          href={lead.maps_address}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg block"
                        >
                          View on Google Maps
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dates */}
              {(lead.date_to_call_back || lead.date_signed) && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-400" />
                    Important Dates
                  </h3>
                  <div className="space-y-3">
                    {lead.date_to_call_back && (
                      <div>
                        <label className="block text-sm font-medium text-emerald-200 mb-1">
                          Callback Date
                        </label>
                        <p className="text-white px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg">
                          {new Date(lead.date_to_call_back).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {lead.date_signed && (
                      <div>
                        <label className="block text-sm font-medium text-emerald-200 mb-1">
                          Date Signed
                        </label>
                        <p className="text-white px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg">
                          {new Date(lead.date_signed).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes (Legacy field) */}
              {lead.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-400" />
                    Legacy Notes
                  </h3>
                  <p className="text-gray-300 whitespace-pre-wrap px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg">{lead.notes}</p>
                </div>
              )}

              {/* Notes Section */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  Notes
                </h3>
                <NotesSection leadId={lead.id} />
              </div>

              {/* Reminders Section */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  Reminders
                </h3>
                {loadingReminders ? (
                  <div className="text-center py-4 text-white/60">Loading reminders...</div>
                ) : reminders.length > 0 ? (
                  <div className="space-y-3">
                    {reminders.map((reminder) => (
                      <div key={reminder.id} className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={reminder.completed || reminder.status === 'completed'}
                            onChange={() => handleToggleReminderComplete(reminder.id, reminder.completed)}
                            className="mt-1 rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded text-xs border ${getPriorityColor(reminder.priority)}`}>
                                {reminder.priority}
                              </span>
                              <span className="text-xs text-white/60">{reminder.reminder_type}</span>
                              {reminder.username && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full border bg-blue-500/20 text-blue-400 border-blue-500/30">
                                  👤 {reminder.username || reminder.user_name}
                                </span>
                              )}
                            </div>
                            <p className={`text-sm text-white font-medium mb-1 ${(reminder.completed || reminder.status === 'completed') ? 'line-through opacity-60' : ''}`}>
                              {reminder.message || reminder.title || 'No message'}
                            </p>
                            {reminder.note && (
                              <p className="text-xs text-white/70 mb-2">{reminder.note}</p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-white/60">
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/60">
                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No reminders for this lead</p>
                  </div>
                )}
              </div>

              {/* Attachments Section */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Paperclip className="w-5 h-5 text-emerald-400" />
                  Attachments
                </h3>
                {loadingAttachments ? (
                  <div className="text-center py-4 text-white/60">Loading attachments...</div>
                ) : attachments.length > 0 ? (
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">{attachment.filename}</p>
                            <p className="text-xs text-white/60">{formatFileSize(attachment.file_size)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownloadAttachment(attachment.id, attachment.filename)}
                          className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">View</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/60">
                    <Paperclip className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No attachments for this lead</p>
                    <p className="text-xs mt-1">Use the Attachments button above to add files</p>
                  </div>
                )}
              </div>

              {/* List Name */}
              {lead.list_name && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">List</h3>
                  <p className="text-white px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg">{lead.list_name}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-emerald-500/20 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-3 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Attachments Modal */}
      {showAttachments && (
        <AttachmentsSection
          leadId={lead.id}
          leadName={lead.name}
          onClose={() => setShowAttachments(false)}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <EditLeadModal
          lead={lead}
          onClose={() => setShowEditModal(false)}
          onUpdate={() => {
            setShowEditModal(false);
            onUpdate();
          }}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareLeadModal
          isOpen={showShareModal}
          leadId={lead.id}
          leadName={lead.name}
          onClose={() => setShowShareModal(false)}
          onShareSuccess={() => {
            setShowShareModal(false);
            onUpdate();
          }}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <DeleteLeadModal
          isOpen={showDeleteModal}
          leadName={lead.name}
          isOwner={isOwner}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </>
  );
}
