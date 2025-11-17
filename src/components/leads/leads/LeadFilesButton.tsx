'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Lead, LeadAttachment } from '@/lib/leads/types';
import { Paperclip, X } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { storage, STORAGE_KEYS } from '@/lib/leads/localStorage';

interface LeadFilesButtonProps {
  lead: Lead;
  compact?: boolean; // For icon-only display
}

export const LeadFilesButton = ({ lead, compact = false }: LeadFilesButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [attachments, setAttachments] = useState<LeadAttachment[]>([]);
  const [mounted, setMounted] = useState(false);

  // Check if component is mounted (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load attachments when modal opens or lead changes
  useEffect(() => {
    loadAttachments();
  }, [lead.id, isOpen]);

  const loadAttachments = () => {
    // Get attachments from localStorage
    const allLeads = storage.get<Lead[]>(STORAGE_KEYS.LEADS) || [];
    const currentLead = allLeads.find(l => l.id === lead.id);
    setAttachments(currentLead?.attachments || []);
  };

  const handleUpload = async (file: File, description?: string) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const fileData = reader.result as string;
          
          const newAttachment: LeadAttachment = {
            id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            lead_id: lead.id,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            file_data: fileData,
            uploaded_by: 'current_user',
            uploaded_at: new Date().toISOString(),
            description
          };

          // Update lead in localStorage
          const allLeads = storage.get<Lead[]>(STORAGE_KEYS.LEADS) || [];
          const leadIndex = allLeads.findIndex(l => l.id === lead.id);
          
          if (leadIndex !== -1) {
            const updatedLead = { ...allLeads[leadIndex] };
            updatedLead.attachments = [...(updatedLead.attachments || []), newAttachment];
            allLeads[leadIndex] = updatedLead;
            storage.set(STORAGE_KEYS.LEADS, allLeads);
            
            loadAttachments();
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

  const handleDelete = async (attachmentId: string) => {
    try {
      const allLeads = storage.get<Lead[]>(STORAGE_KEYS.LEADS) || [];
      const leadIndex = allLeads.findIndex(l => l.id === lead.id);
      
      if (leadIndex !== -1) {
        const updatedLead = { ...allLeads[leadIndex] };
        updatedLead.attachments = (updatedLead.attachments || []).filter(a => a.id !== attachmentId);
        allLeads[leadIndex] = updatedLead;
        storage.set(STORAGE_KEYS.LEADS, allLeads);
        
        loadAttachments();
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      throw error;
    }
  };

  const fileCount = attachments.length;

  // Render modal content
  const modalContent = isOpen ? (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] transition-opacity"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="files-modal-title"
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[calc(100vh-4rem)] transition-opacity duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Paperclip className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 id="files-modal-title" className="text-xl font-bold text-gray-900">
                  Files & Attachments
                </h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  {lead.name} • {fileCount} file{fileCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            <FileUpload
              leadId={lead.id}
              attachments={attachments}
              onUpload={handleUpload}
              onDelete={handleDelete}
              maxSize={10}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
            <button
              onClick={() => setIsOpen(false)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      {/* Files Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={compact 
          ? "flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded border border-green-200 transition-colors w-full"
          : "btn btn-primary flex items-center gap-2 relative"
        }
        title="View and manage files"
      >
        <Paperclip className="w-3.5 h-3.5" />
        {compact ? <span>Files</span> : <span>Files</span>}
        {!compact && fileCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {fileCount}
          </span>
        )}
      </button>

      {/* Files Modal - Rendered via Portal */}
      {mounted && isOpen && typeof document !== 'undefined' && (
        createPortal(modalContent, document.body)
      )}
    </>
  );
};
