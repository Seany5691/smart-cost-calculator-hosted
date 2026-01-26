'use client';

/**
 * ReminderCard Component
 * 
 * Displays a single reminder with all fields from old app.
 * 
 * Features:
 * - Type emoji and label
 * - Priority badge
 * - Recurring indicator
 * - Description
 * - Route info
 * - Checkbox for completion
 * - Display lead name (link to lead), message, date, time, status
 * - Color code: overdue (red), today (yellow), future (default)
 * - Edit and Delete buttons
 * - Navigate to lead's status tab on lead name click
 * - Glassmorphism styling
 * - Display relative time for reminders
 * 
 * Validates: Requirements 13.3-13.22
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRemindersStore } from '@/lib/store/reminders';
import { Edit, Trash2, Clock, Calendar, User, MapPin, Repeat } from 'lucide-react';
import type { LeadReminder } from '@/lib/leads/types';
import { getReminderTypeIcon, getReminderTypeLabel, getReminderPriorityColor, getReminderPriorityLabel, formatReminderTime } from '@/lib/leads/types';
import ConfirmModal from './ConfirmModal';
import EditReminderModal from './EditReminderModal';
import { useToast } from '@/components/ui/Toast/useToast';

interface ReminderCardProps {
  reminder: LeadReminder;
  leadName: string;
  leadStatus: string;
  leadData?: {
    name: string;
    contact_person?: string;
    town?: string;
    phone?: string;
  };
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export default function ReminderCard({ reminder, leadName, leadStatus, leadData, isSelected = false, onToggleSelect }: ReminderCardProps) {
  const router = useRouter();
  const { updateReminder, deleteReminder, toggleComplete } = useRemindersStore();
  const { toast } = useToast();
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Determine if reminder is overdue or today
  const getReminderCategory = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const reminderDate = reminder.reminder_date ? new Date(reminder.reminder_date) : new Date();
    const reminderDateOnly = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate());

    if (reminderDateOnly < today) {
      return 'overdue';
    } else if (reminderDateOnly.getTime() === today.getTime()) {
      return 'today';
    }
    return 'future';
  };

  const category = getReminderCategory();

  // Get color classes based on category and priority
  const getColorClasses = () => {
    if (reminder.completed || reminder.status === 'completed') {
      return {
        border: 'border-green-500/30',
        bg: 'from-green-500/10 to-green-600/10',
        badge: 'bg-green-500/20 text-green-400 border-green-500/30'
      };
    }

    switch (category) {
      case 'overdue':
        return {
          border: 'border-red-500/30',
          bg: 'from-red-500/10 to-red-600/10',
          badge: 'bg-red-500/20 text-red-400 border-red-500/30'
        };
      case 'today':
        return {
          border: 'border-yellow-500/30',
          bg: 'from-yellow-500/10 to-yellow-600/10',
          badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        };
      default:
        return {
          border: 'border-white/10',
          bg: 'from-white/5 to-white/10',
          badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        };
    }
  };

  const colors = getColorClasses();

  // Get priority color
  const priorityColor = getReminderPriorityColor(reminder.priority);
  const priorityClasses = {
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  // Format relative time
  const getRelativeTime = () => {
    const now = new Date();
    const timeStr = reminder.reminder_time || '00:00';
    const reminderDateTime = new Date(`${reminder.reminder_date}T${timeStr}`);
    const diffMs = reminderDateTime.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMs < 0) {
      const absDays = Math.abs(diffDays);
      const absHours = Math.abs(diffHours);
      if (absDays > 0) {
        return `${absDays} day${absDays > 1 ? 's' : ''} ago`;
      } else if (absHours > 0) {
        return `${absHours} hour${absHours > 1 ? 's' : ''} ago`;
      } else {
        return 'Just now';
      }
    } else {
      if (diffDays > 0) {
        return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
      } else if (diffHours > 0) {
        return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
      } else {
        return 'Now';
      }
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle toggling completion
  const handleToggleComplete = async () => {
    setIsUpdating(true);
    try {
      toggleComplete(reminder.id);
      await updateReminder(reminder.lead_id || '', reminder.id, {
        completed: !reminder.completed,
        status: !reminder.completed ? 'completed' : 'pending'
      });
    } catch (error) {
      console.error('Error toggling reminder completion:', error);
      // Revert on error
      toggleComplete(reminder.id);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle deleting reminder
  const handleDelete = async () => {
    setIsUpdating(true);
    try {
      await deleteReminder(reminder.lead_id || '', reminder.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast.error('Failed to delete reminder', {
        message: 'Please try again',
        section: 'leads'
      });
      setIsUpdating(false);
    }
  };

  // Navigate to lead's status tab
  const handleLeadClick = () => {
    if (!reminder.lead_id) return;
    
    // Map status to tab index
    const statusToTab: Record<string, number> = {
      'new': 1, // Main Sheet
      'leads': 2,
      'working': 3,
      'later': 4,
      'bad': 5,
      'signed': 6
    };

    const tabIndex = statusToTab[leadStatus] || 2;
    router.push(`/leads?tab=${tabIndex}`);
  };

  return (
    <>
      <div className={`bg-gradient-to-br ${colors.bg} backdrop-blur-xl rounded-xl border ${isSelected ? 'border-blue-500/50 ring-2 ring-blue-500/30' : colors.border} shadow-lg p-5 transition-all duration-300 hover:shadow-xl`}>
        <div className="flex items-start gap-4">
          {/* Selection Checkbox (if bulk actions enabled) */}
          {onToggleSelect && (
            <div className="flex-shrink-0 pt-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(reminder.id)}
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
              />
            </div>
          )}

          {/* Completion Checkbox */}
          <div className="flex-shrink-0 pt-1">
            <input
              type="checkbox"
              checked={reminder.completed || reminder.status === 'completed'}
              onChange={handleToggleComplete}
              disabled={isUpdating}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer disabled:opacity-50"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header: Type, Lead Name, Priority, Status */}
            <div className="flex items-center flex-wrap gap-2 mb-3">
              {/* Type Emoji */}
              <span className="text-2xl" title={getReminderTypeLabel(reminder.reminder_type)}>
                {getReminderTypeIcon(reminder.reminder_type)}
              </span>

              {/* Lead Name */}
              {reminder.lead_id && (
                <button
                  onClick={handleLeadClick}
                  className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="truncate">{leadName}</span>
                </button>
              )}

              {!reminder.lead_id && reminder.title && (
                <span className="text-white font-semibold">{reminder.title}</span>
              )}

              {/* Priority Badge */}
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${priorityClasses[priorityColor as keyof typeof priorityClasses]}`}>
                {getReminderPriorityLabel(reminder.priority)}
              </span>

              {/* Status Badge */}
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${colors.badge}`}>
                {reminder.completed || reminder.status === 'completed' ? '✅ Completed' : category === 'overdue' ? '🔴 Overdue' : category === 'today' ? '🟡 Today' : '🔵 Upcoming'}
              </span>

              {/* Recurring Indicator */}
              {reminder.is_recurring && (
                <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border bg-purple-500/20 text-purple-400 border-purple-500/30" title="Recurring Reminder">
                  <Repeat className="w-3 h-3" />
                  Recurring
                </span>
              )}
            </div>

            {/* Message/Note */}
            <p className={`text-white mb-3 whitespace-pre-wrap ${reminder.completed || reminder.status === 'completed' ? 'line-through opacity-60' : ''}`}>
              {reminder.message || reminder.note || reminder.description || 'No message'}
            </p>

            {/* Lead Details (for Later Stage reminders) - Compact Display */}
            {leadData && (
              <div className="mb-3 p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-white/50">Company:</span>
                    <span className="text-white font-medium">{leadData.name}</span>
                  </div>
                  {leadData.contact_person && (
                    <div className="flex items-center gap-2">
                      <span className="text-white/50">Contact:</span>
                      <span className="text-white">{leadData.contact_person}</span>
                    </div>
                  )}
                  {leadData.town && (
                    <div className="flex items-center gap-2">
                      <span className="text-white/50">Town:</span>
                      <span className="text-white">{leadData.town}</span>
                    </div>
                  )}
                  {leadData.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-white/50">Phone:</span>
                      <span className="text-white">{leadData.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Description (if different from message) */}
            {reminder.description && reminder.description !== reminder.message && (
              <p className="text-white/60 text-sm mb-3 whitespace-pre-wrap">
                {reminder.description}
              </p>
            )}

            {/* Route Info */}
            {reminder.route_id && (
              <div className="flex items-center gap-2 mb-3 text-sm text-white/70">
                <MapPin className="w-4 h-4" />
                <span>Linked to route</span>
              </div>
            )}

            {/* Date, Time, and Relative Time */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(reminder.reminder_date || '')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{formatReminderTime(reminder.reminder_time || null, reminder.is_all_day)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-white/40">•</span>
                <span className="font-medium text-white/70">{getRelativeTime()}</span>
              </div>
            </div>

            {/* Created Date */}
            <div className="mt-2 text-xs text-white/40">
              Created {new Date(reminder.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              disabled={isUpdating}
              className="flex items-center justify-center w-9 h-9 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Edit"
            >
              <Edit className="w-4 h-4 text-white/70" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isUpdating}
              className="flex items-center justify-center w-9 h-9 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditReminderModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          reminder={reminder}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="Delete Reminder"
          message={`Are you sure you want to delete this reminder? This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
        />
      )}
    </>
  );
}
