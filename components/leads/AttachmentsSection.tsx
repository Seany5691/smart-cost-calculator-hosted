'use client';

/**
 * Attachments Section Component
 * Displays and manages file attachments for a lead
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Paperclip, Upload, Download, Trash2, FileText, X, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast/useToast';

interface Attachment {
  id: string;
  lead_id: string;
  filename: string;
  mime_type: string;
  file_size: number;
  file_path: string;
  description?: string | null;
  user_id: string;
  created_at: string;
}

interface AttachmentsSectionProps {
  leadId: string;
  onClose?: () => void;
}

export default function AttachmentsSection({ leadId, onClose }: AttachmentsSectionProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchAttachments();
    }
  }, [leadId, mounted]);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      
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

      const response = await fetch(`/api/leads/${leadId}/attachments`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch attachments');
      const data = await response.json();
      setAttachments(data.attachments || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching attachments:', err);
      toast.error('Failed to load attachments', {
        message: err instanceof Error ? err.message : 'Please try again',
        section: 'leads'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large', {
        message: 'File size exceeds 10MB limit',
        section: 'leads'
      });
      return;
    }

    try {
      setUploading(true);
      setError(null);

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

      const formData = new FormData();
      formData.append('file', file);
      if (description) {
        formData.append('description', description);
      }

      const response = await fetch(`/api/leads/${leadId}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      // Reset form
      setDescription('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Show success toast
      toast.success('File uploaded', {
        message: `${file.name} has been attached`,
        section: 'leads'
      });

      // Refresh attachments list
      await fetchAttachments();
    } catch (err: any) {
      console.error('Error uploading file:', err);
      toast.error('Upload failed', {
        message: err.message || 'Failed to upload file',
        section: 'leads'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (attachment: Attachment) => {
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

      const response = await fetch(
        `/api/leads/${leadId}/attachments/${attachment.id}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      if (!response.ok) throw new Error('Failed to download file');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('File downloaded', {
        message: attachment.filename,
        section: 'leads'
      });
    } catch (err) {
      console.error('Error downloading file:', err);
      toast.error('Download failed', {
        message: 'Failed to download file',
        section: 'leads'
      });
    }
  };

  const handleDeleteClick = (attachmentId: string) => {
    setDeleteConfirm(attachmentId);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

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

      const response = await fetch(
        `/api/leads/${leadId}/attachments/${deleteConfirm}`,
        { 
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to delete attachment');

      toast.success('File deleted', {
        message: 'Attachment has been removed',
        section: 'leads'
      });

      // Refresh attachments list
      await fetchAttachments();
    } catch (err) {
      console.error('Error deleting attachment:', err);
      toast.error('Delete failed', {
        message: 'Failed to delete attachment',
        section: 'leads'
      });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Main Modal */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        <div 
          className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-emerald-500/30"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Sticky */}
          <div className="flex items-center justify-between p-6 border-b border-emerald-500/20 sticky top-0 bg-gradient-to-br from-slate-900 to-emerald-900 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Paperclip className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Attachments</h2>
                <p className="text-sm text-emerald-200">
                  {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-emerald-200" />
              </button>
            )}
          </div>

          {/* Content - Scrollable with custom scrollbar */}
          <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6 custom-scrollbar">
            {/* Upload Section */}
            <div className="mb-6 p-4 bg-white/5 border border-emerald-500/20 rounded-lg backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-emerald-200 mb-2">
                    Upload File (Max 10MB)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="block w-full text-sm text-emerald-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/20 file:text-emerald-300 hover:file:bg-emerald-500/30 disabled:opacity-50 file:cursor-pointer cursor-pointer"
                  />
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description (optional)"
                    disabled={uploading}
                    className="mt-2 w-full px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  />
                </div>
                {uploading && (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Uploading...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Attachments List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              </div>
            ) : attachments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-emerald-400/30 mx-auto mb-3" />
                <p className="text-emerald-200">No attachments yet</p>
                <p className="text-sm text-emerald-300/70 mt-1">
                  Upload files to attach them to this lead
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-4 p-4 bg-white/5 border border-emerald-500/20 rounded-lg hover:bg-white/10 transition-all backdrop-blur-sm"
                  >
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <FileText className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {attachment.filename}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-emerald-300/70">
                        <span>{formatFileSize(attachment.file_size)}</span>
                        <span>•</span>
                        <span>{formatDate(attachment.created_at)}</span>
                      </div>
                      {attachment.description && (
                        <p className="text-sm text-emerald-200/80 mt-1 truncate">
                          {attachment.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(attachment)}
                        className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(attachment.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-emerald-500/20 bg-gradient-to-br from-slate-900 to-emerald-900">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
          onClick={() => setDeleteConfirm(null)}
        >
          <div 
            className="bg-gradient-to-br from-slate-900 to-red-900 rounded-2xl shadow-2xl max-w-md w-full border border-red-500/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Delete Attachment</h3>
              </div>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete this attachment? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>,
    document.body
  );
}
