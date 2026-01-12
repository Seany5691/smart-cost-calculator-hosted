'use client';

import { useState } from 'react';
import { Upload, X, File, Image, FileText, Loader2, Download, Trash2 } from 'lucide-react';
import { getLeadsAdapter } from '@/lib/leads/leadsAdapter';
import { useAuthStore } from '@/store/auth';
import { LeadAttachment } from '@/lib/leads/types';

interface AttachmentUploaderProps {
  leadId: string;
  onUploadComplete?: () => void;
}

export default function AttachmentUploader({ leadId, onUploadComplete }: AttachmentUploaderProps) {
  const user = useAuthStore((state) => state.user);
  const [attachments, setAttachments] = useState<LeadAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  // Load attachments on mount
  useState(() => {
    loadAttachments();
  });

  const loadAttachments = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const data = await getLeadsAdapter().getAttachments(user.id, leadId);
      setAttachments(data);
    } catch (err: any) {
      console.error('Error loading attachments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user) return;

    setIsUploading(true);
    setError(null);

    try {
      const file = files[0];

      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('File size must be less than 50MB');
      }

      // Upload file
      const attachment = await getLeadsAdapter().uploadAttachment(
        user.id,
        leadId,
        file,
        description || undefined
      );

      // Add to list
      setAttachments([attachment, ...attachments]);
      setDescription('');

      // Reset file input
      event.target.value = '';

      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (attachment: LeadAttachment) => {
    try {
      const blob = await getLeadsAdapter().downloadAttachment(attachment.storage_path);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Failed to download file');
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!user) return;
    
    if (!confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    try {
      await getLeadsAdapter().deleteAttachment(user.id, attachmentId);
      setAttachments(attachments.filter(a => a.id !== attachmentId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete attachment');
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="w-5 h-5 text-blue-500" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="w-5 h-5 text-red-500" />;
    } else {
      return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="glass-card p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Attachments</h3>
        
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <X className="w-5 h-5 text-red-500 mr-2 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="space-y-3">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <label className="block">
            <input
              type="file"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            />
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isUploading
                  ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                  : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                  <p className="text-sm text-gray-600">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Images, PDF, Word, Excel, Text (Max 50MB)
                  </p>
                </div>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* Attachments List */}
      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading attachments...</p>
        </div>
      ) : attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="glass-card p-4 flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {getFileIcon(attachment.file_type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.file_name}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{formatFileSize(attachment.file_size)}</span>
                    <span>•</span>
                    <span>
                      {new Date(attachment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {attachment.description && (
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {attachment.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => handleDownload(attachment)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(attachment.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <File className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">No attachments yet</p>
        </div>
      )}
    </div>
  );
}
