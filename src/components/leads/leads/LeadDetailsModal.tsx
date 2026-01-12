'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Lead, LeadInteraction, LeadAttachment } from '@/lib/leads/types';
import { NotesList } from './NotesList';
import { InteractionHistory } from './InteractionHistory';
import { X, StickyNote, Activity, Paperclip, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { storage, STORAGE_KEYS } from '@/lib/leads/localStorage';
import { useAuthStore } from '@/store/auth';

interface LeadDetailsModalProps {
  lead: Lead;
  isOpen?: boolean;
  onClose: () => void;
  onUpdate?: (leadId: string, updates: Partial<Lead>) => void;
  onStatusChange?: (leadId: string, status: any, additionalData?: any) => void;
}

type TabType = 'notes' | 'reminders' | 'files' | 'history';

export const LeadDetailsModal = ({ lead, isOpen = true, onClose, onUpdate, onStatusChange }: LeadDetailsModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('notes');
  const [notes, setNotes] = useState<any[]>([]);
  const [interactions, setInteractions] = useState<LeadInteraction[]>([]);
  const [attachments, setAttachments] = useState<LeadAttachment[]>([]);
  const [remindersCount, setRemindersCount] = useState(0);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch notes and attachments when modal opens
  useEffect(() => {
    if (isOpen && lead.id) {
      fetchNotes();
      fetchInteractions();
      fetchAttachments();
      fetchRemindersCount();
    }
  }, [isOpen, lead.id]);

  const fetchRemindersCount = async () => {
    try {
      // Placeholder for PostgreSQL reminders count
      setRemindersCount(0);
    } catch (error) {
      console.error('Error fetching reminders count:', error);
    }
  };

  const fetchNotes = async () => {
    setIsLoadingNotes(true);
    try {
      // Load notes from PostgreSQL - placeholder
      setNotes([]);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const fetchInteractions = async () => {
    setIsLoadingInteractions(true);
    try {
      const response = await fetch(`/api/leads/${lead.id}/interactions`);
      const result = await response.json();
      if (result.success) {
        setInteractions(result.data);
      }
    } catch (error) {
      console.error('Error fetching interactions:', error);
    } finally {
      setIsLoadingInteractions(false);
    }
  };

  const fetchAttachments = () => {
    // Get attachments from localStorage
    const allLeads = storage.get<Lead[]>(STORAGE_KEYS.LEADS) || [];
    const currentLead = allLeads.find(l => l.id === lead.id);
    setAttachments(currentLead?.attachments || []);
  };

  const handleFileUpload = async (file: File, description?: string) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const fileData = reader.result as string;
          
          const newAttachment: LeadAttachment = {
            id: `att_${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
            lead_id: lead.id,
            user_id: 'current_user',
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            storage_path: `attachments/${lead.id}/${file.name}`,
            description,
            created_at: new Date().toISOString()
          };

          // Update lead in localStorage
          const allLeads = storage.get<Lead[]>(STORAGE_KEYS.LEADS) || [];
          const leadIndex = allLeads.findIndex(l => l.id === lead.id);
          
          if (leadIndex !== -1) {
            const updatedLead = { ...allLeads[leadIndex] };
            updatedLead.attachments = [...(updatedLead.attachments || []), newAttachment];
            allLeads[leadIndex] = updatedLead;
            storage.set(STORAGE_KEYS.LEADS, allLeads);
            
            fetchAttachments();
            resolve();
          } else {
            reject(new Error('Lead not found'));
          }
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileDelete = async (attachmentId: string) => {
    try {
      const allLeads = storage.get<Lead[]>(STORAGE_KEYS.LEADS) || [];
      const leadIndex = allLeads.findIndex(l => l.id === lead.id);
      
      if (leadIndex !== -1) {
        const updatedLead = { ...allLeads[leadIndex] };
        updatedLead.attachments = (updatedLead.attachments || []).filter(a => a.id !== attachmentId);
        allLeads[leadIndex] = updatedLead;
        storage.set(STORAGE_KEYS.LEADS, allLeads);
        
        fetchAttachments();
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      throw error;
    }
  };

  const user = useAuthStore((state) => state.user);

  const handleAddNote = async (content: string) => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    try {
      // Create note in PostgreSQL - placeholder
      console.log('Note created:', content.trim());

      // Refresh notes display
      await fetchNotes();
      await fetchInteractions(); // Refresh interactions to show note_added
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  };

  const handleUpdateNote = async (noteId: string, content: string) => {
    try {
      // Update note in PostgreSQL - placeholder
      console.log('Note updated:', noteId, content.trim());

      // Refresh notes display
      await fetchNotes();
      await fetchInteractions(); // Refresh interactions to show note_updated
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      // Delete note from PostgreSQL - placeholder
      console.log('Note deleted:', noteId);

      // Refresh notes display
      await fetchNotes();
      await fetchInteractions(); // Refresh interactions to show note_deleted
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <StickyNote className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 id="modal-title" className="text-2xl font-bold text-white">
                  {lead.name}
                </h2>
                <p className="text-sm text-white/90">
                  {lead.provider && `${lead.provider} • `}
                  {lead.type_of_business}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors touch-target"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 px-6 bg-gray-50">
            <button
              onClick={() => setActiveTab('notes')}
              className={cn(
                'flex items-center space-x-2 px-4 py-3 border-b-2 font-medium transition-all',
                activeTab === 'notes'
                  ? 'border-blue-500 text-blue-600 bg-white rounded-t-lg'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-t-lg'
              )}
              aria-selected={activeTab === 'notes'}
              role="tab"
            >
              <StickyNote className="w-4 h-4" aria-hidden="true" />
              <span>Notes</span>
              {notes.length > 0 && (
                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-semibold">
                  {notes.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('reminders')}
              className={cn(
                'flex items-center space-x-2 px-4 py-3 border-b-2 font-medium transition-all',
                activeTab === 'reminders'
                  ? 'border-purple-500 text-purple-600 bg-white rounded-t-lg'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-t-lg'
              )}
              aria-selected={activeTab === 'reminders'}
              role="tab"
            >
              <Bell className="w-4 h-4" aria-hidden="true" />
              <span>Reminders</span>
              {remindersCount > 0 && (
                <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full font-semibold">
                  {remindersCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={cn(
                'flex items-center space-x-2 px-4 py-3 border-b-2 font-medium transition-all',
                activeTab === 'files'
                  ? 'border-green-500 text-green-600 bg-white rounded-t-lg'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-t-lg'
              )}
              aria-selected={activeTab === 'files'}
              role="tab"
            >
              <Paperclip className="w-4 h-4" aria-hidden="true" />
              <span>Files</span>
              {attachments.length > 0 && (
                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-semibold">
                  {attachments.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                'flex items-center space-x-2 px-4 py-3 border-b-2 font-medium transition-all',
                activeTab === 'history'
                  ? 'border-orange-500 text-orange-600 bg-white rounded-t-lg'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-t-lg'
              )}
              aria-selected={activeTab === 'history'}
              role="tab"
            >
              <Activity className="w-4 h-4" aria-hidden="true" />
              <span>Activity</span>
              {interactions.length > 0 && (
                <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full font-semibold">
                  {interactions.length}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'notes' ? (
              <NotesList
                leadId={lead.id}
                notes={notes}
                onAddNote={handleAddNote}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
                isLoading={isLoadingNotes}
              />
            ) : activeTab === 'reminders' ? (
              <div className="p-6">
                <p className="text-gray-500 text-center">Reminders will be available after PostgreSQL migration is complete.</p>
              </div>
            ) : activeTab === 'files' ? (
              <div className="p-6">
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Paperclip className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">File uploads will be available after PostgreSQL migration is complete.</p>
                    <p className="text-sm text-gray-400">For now, files are stored locally.</p>
                  </div>
                </div>
              </div>
            ) : (
              <InteractionHistory
                leadId={lead.id}
                interactions={interactions}
                isLoading={isLoadingInteractions}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
};
