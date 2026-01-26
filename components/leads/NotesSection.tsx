'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-simple';
import { useToast } from '@/components/ui/Toast/useToast';

interface Note {
  id: string;
  lead_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  username: string;
}

interface NotesSectionProps {
  leadId: string;
}

export default function NotesSection({ leadId }: NotesSectionProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchNotes();
  }, [leadId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leads/${leadId}/notes`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/leads/${leadId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNoteContent.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setNotes([data.note, ...notes]);
        setNewNoteContent('');
      } else {
        const error = await response.json();
        toast.error('Failed to add note', {
          message: error.error || 'Please try again',
          section: 'leads'
        });
      }
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note', {
        message: 'Please try again',
        section: 'leads'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/leads/${leadId}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setNotes(notes.map((n) => (n.id === noteId ? data.note : n)));
        setEditingNoteId(null);
        setEditContent('');
      } else {
        const error = await response.json();
        toast.error('Failed to update note', {
          message: error.error || 'Please try again',
          section: 'leads'
        });
      }
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note', {
        message: 'Please try again',
        section: 'leads'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`/api/leads/${leadId}/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotes(notes.filter((n) => n.id !== noteId));
      } else {
        const error = await response.json();
        toast.error('Failed to delete note', {
          message: error.error || 'Please try again',
          section: 'leads'
        });
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note', {
        message: 'Please try again',
        section: 'leads'
      });
    }
  };

  const startEditing = (note: Note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditContent('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canEditNote = (note: Note) => {
    return user?.role === 'admin' || note.user_id === user?.id;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Note Form */}
      <form onSubmit={handleAddNote} className="space-y-2">
        <label className="block text-sm font-medium text-white">
          Add Note
        </label>
        <textarea
          value={newNoteContent}
          onChange={(e) => setNewNoteContent(e.target.value)}
          placeholder="Enter your note here..."
          rows={3}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={!newNoteContent.trim() || submitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Adding...' : 'Add Note'}
        </button>
      </form>

      {/* Notes List */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No notes yet</p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="bg-white/5 rounded-lg p-4 border border-white/10"
            >
              {editingNoteId === note.id ? (
                // Edit Mode
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={submitting}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateNote(note.id)}
                      disabled={!editContent.trim() || submitting}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={submitting}
                      className="px-3 py-1 bg-white/10 border border-white/20 text-white text-sm rounded hover:bg-white/20 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-semibold text-white">
                        {note.user_name}
                      </span>
                      <span className="text-gray-400 text-sm ml-2">
                        @{note.username}
                      </span>
                    </div>
                    {canEditNote(note) && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditing(note)}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-200 whitespace-pre-wrap mb-2">
                    {note.content}
                  </p>
                  <div className="text-xs text-gray-400">
                    <span>Created: {formatDate(note.created_at)}</span>
                    {note.updated_at !== note.created_at && (
                      <span className="ml-3">
                        Updated: {formatDate(note.updated_at)}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
