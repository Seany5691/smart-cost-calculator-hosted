'use client';

import { useState } from 'react';
import { Card } from '@/components/leads/ui/Card';
import { ConfirmModal } from '@/components/leads/ui/ConfirmModal';
import { StickyNote, Edit, Trash2, Save, X } from 'lucide-react';

interface NotesListProps {
  leadId: string;
  notes: any[];
  onAddNote: (content: string) => Promise<void>;
  onUpdateNote: (noteId: string, content: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  isLoading?: boolean;
}

export const NotesList = ({
  leadId,
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  isLoading = false
}: NotesListProps) => {
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddNote = async () => {
    if (!newNoteContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddNote(newNoteContent);
      setNewNoteContent('');
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (note: any) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (noteId: string) => {
    if (!editContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onUpdateNote(noteId, editContent);
      setEditingNoteId(null);
      setEditContent('');
    } catch (error) {
      console.error('Error updating note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  const handleDeleteNote = async (noteId: string) => {
    setDeleteNoteId(noteId);
  };

  const confirmDeleteNote = async () => {
    if (!deleteNoteId) return;

    setIsSubmitting(true);
    try {
      await onDeleteNote(deleteNoteId);
      setDeleteNoteId(null);
    } catch (error) {
      console.error('Error deleting note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className="space-y-4">
      {/* Add New Note */}
      <Card variant="glass" padding="md">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <StickyNote className="w-5 h-5 text-blue-600" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-gray-900">Add Note</h3>
          </div>
          
          <textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Add a note about this lead..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            disabled={isSubmitting}
            aria-label="New note content"
          />
          
          <button
            onClick={handleAddNote}
            disabled={!newNoteContent.trim() || isSubmitting}
            className="btn btn-primary w-full sm:w-auto"
          >
            {isSubmitting ? 'Adding...' : 'Add Note'}
          </button>
        </div>
      </Card>

      {/* Notes List */}
      <div className="space-y-3">
        {isLoading ? (
          <Card variant="glass" padding="md">
            <p className="text-gray-500 text-center">Loading notes...</p>
          </Card>
        ) : notes.length === 0 ? (
          <Card variant="glass" padding="md">
            <p className="text-gray-500 text-center">No notes yet. Add your first note above.</p>
          </Card>
        ) : (
          notes.map((note) => (
            <Card key={note.id} variant="glass" padding="md">
              {editingNoteId === note.id ? (
                // Edit Mode
                <div className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                    disabled={isSubmitting}
                    aria-label="Edit note content"
                  />
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSaveEdit(note.id)}
                      disabled={!editContent.trim() || isSubmitting}
                      className="btn btn-success flex-1 sm:flex-none"
                    >
                      <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSubmitting}
                      className="btn btn-secondary flex-1 sm:flex-none"
                    >
                      <X className="w-4 h-4 mr-2" aria-hidden="true" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <p className="text-gray-800 whitespace-pre-wrap flex-1">{note.content}</p>
                    
                    <div className="flex space-x-1 ml-4">
                      <button
                        onClick={() => handleStartEdit(note)}
                        disabled={isSubmitting}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors touch-target"
                        aria-label="Edit note"
                      >
                        <Edit className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={isSubmitting}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-target"
                        aria-label="Delete note"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatDate(note.created_at)}</span>
                    {note.updated_at !== note.created_at && (
                      <span className="italic">Edited {formatDate(note.updated_at)}</span>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteNoteId !== null}
        onClose={() => setDeleteNoteId(null)}
        onConfirm={confirmDeleteNote}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};
