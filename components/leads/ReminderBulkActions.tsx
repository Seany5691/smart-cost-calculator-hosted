'use client';

/**
 * ReminderBulkActions Component
 * 
 * Bulk actions for reminders (complete, delete multiple).
 */

import { useState } from 'react';
import { CheckCircle2, Trash2, X } from 'lucide-react';
import { useRemindersStore } from '@/lib/store/reminders';
import ConfirmModal from './ConfirmModal';
import { useToast } from '@/components/ui/Toast/useToast';

interface ReminderBulkActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export default function ReminderBulkActions({ selectedIds, onClearSelection, onActionComplete }: ReminderBulkActionsProps) {
  const { reminders, updateReminder, deleteReminder } = useRemindersStore();
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (selectedIds.length === 0) return null;

  const handleBulkComplete = async () => {
    setIsProcessing(true);
    try {
      // Update each selected reminder
      for (const id of selectedIds) {
        const reminder = reminders.find(r => r.id === id);
        if (reminder && !reminder.completed) {
          await updateReminder(reminder.lead_id || '', id, {
            completed: true,
            status: 'completed'
          });
        }
      }
      onActionComplete();
      onClearSelection();
    } catch (error) {
      console.error('Error completing reminders:', error);
      toast.error('Failed to complete reminders', {
        message: 'Please try again',
        section: 'leads'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsProcessing(true);
    try {
      // Delete each selected reminder
      for (const id of selectedIds) {
        const reminder = reminders.find(r => r.id === id);
        if (reminder) {
          await deleteReminder(reminder.lead_id || '', id);
        }
      }
      setShowDeleteConfirm(false);
      onActionComplete();
      onClearSelection();
    } catch (error) {
      console.error('Error deleting reminders:', error);
      toast.error('Failed to delete reminders', {
        message: 'Please try again',
        section: 'leads'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <div className="bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-blue-400">{selectedIds.length}</span>
              </div>
              <span className="text-white font-medium">
                {selectedIds.length} reminder{selectedIds.length > 1 ? 's' : ''} selected
              </span>
            </div>

            <div className="h-6 w-px bg-white/20" />

            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkComplete}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50"
                title="Mark all as complete"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Complete All</span>
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                title="Delete all selected"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">Delete All</span>
              </button>

              <button
                onClick={onClearSelection}
                disabled={isProcessing}
                className="flex items-center justify-center w-9 h-9 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors disabled:opacity-50"
                title="Clear selection"
              >
                <X className="w-4 h-4 text-white/70" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleBulkDelete}
          title="Delete Multiple Reminders"
          message={`Are you sure you want to delete ${selectedIds.length} reminder${selectedIds.length > 1 ? 's' : ''}? This action cannot be undone.`}
          confirmText="Delete All"
          variant="danger"
        />
      )}
    </>
  );
}
