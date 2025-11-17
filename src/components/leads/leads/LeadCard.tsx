'use client';

import { memo, useState, useEffect } from 'react';
import { Lead, LeadStatus, STATUS_COLORS, LEAD_STATUSES } from '@/lib/leads/types';
import { Card } from '@/components/leads/ui/Card';
import { cn } from '@/lib/utils';
import { AddNoteModal } from './AddNoteModal';
import { AddReminderModal } from './AddReminderModal';
import { EditLeadModal } from './EditLeadModal';
import { LeadFilesButton } from './LeadFilesButton';
import { ConfirmModal } from '../ui/ConfirmModal';
import { 
  MapPin, 
  Phone, 
  Building2, 
  Briefcase,
  Trash2,
  MessageSquare,
  Bell,
  Calendar,
  ChevronRight,
  Edit,
  User
} from 'lucide-react';
import { getLeadNotes, type LeadNote } from '@/lib/leads/supabaseNotesReminders';
import { useAuthStore } from '@/store/auth';
import { useRemindersStore, useLeadReminders } from '@/store/reminders';

interface LeadCardProps {
  lead: Lead;
  onStatusChange?: (leadId: string, status: LeadStatus, additionalData?: any) => void;
  onUpdate?: (leadId: string, updates: Partial<Lead>) => void;
  onEdit?: (lead: Lead) => void;
  onDelete?: (leadId: string) => void;
  onViewDetails?: (lead: Lead) => void;
  isSelected?: boolean;
  onSelect?: (leadId: string) => void;
  onDeselect?: (leadId: string) => void;
  showActions?: boolean;
  variant?: 'default' | 'compact';
}

const LeadCardComponent = ({
  lead,
  onStatusChange,
  onDelete,
  isSelected = false,
  showActions = true,
}: LeadCardProps) => {
  const user = useAuthStore((state) => state.user);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const statusColor = STATUS_COLORS[lead.status];
  
  // Get reminders from global store
  const reminders = useLeadReminders(lead.id);
  const { toggleComplete } = useRemindersStore();
  
  // Provider-specific styling (Telkom priority)
  const isTelkom = lead.provider?.toLowerCase().includes('telkom');
  
  // Status-specific styling
  const isBadLead = lead.status === 'bad';
  const isSigned = lead.status === 'signed';

  // Load notes when component mounts or lead changes
  useEffect(() => {
    if (user) {
      loadNotes();
    }
  }, [lead.id, user]);

  const loadNotes = async () => {
    if (!user) return;
    
    try {
      const leadNotes = await getLeadNotes(lead.id);
      setNotes(leadNotes as any);
    } catch (error) {
      console.error('Error loading notes:', error);
      setNotes([]);
    }
  };

  const handleToggleReminderCompletion = async (reminderId: string) => {
    try {
      await toggleComplete(reminderId);
    } catch (error) {
      console.error('Error toggling reminder:', error);
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as LeadStatus;
    if (onStatusChange) {
      onStatusChange(lead.id, newStatus);
    }
  };

  const activeReminders = reminders.filter(r => !r.completed);
  const completedReminders = reminders.filter(r => r.completed);
  const displayReminders = showCompleted ? reminders : activeReminders;
  const totalItems = notes.length + activeReminders.length;

  return (
    <Card
      variant="glass"
      padding="md"
      className={cn(
        'relative transition-all duration-200 hover:shadow-lg',
        isBadLead && 'bg-red-50/80 border-red-200',
        isSigned && 'bg-green-50/80 border-green-200',
        isTelkom && 'border-l-4 border-l-blue-600',
        isSelected && 'ring-2 ring-blue-500 bg-blue-50/50'
      )}
    >
      {/* Main Content - Horizontal Layout */}
      <div className="flex gap-4 items-start">
        {/* Left Side - Lead Information */}
        <div className="flex-1 space-y-2">
          {/* Name */}
          <h3 className="text-base font-bold text-gray-900 line-clamp-1" title={lead.name}>
            {lead.name}
          </h3>

          {/* Provider */}
          {lead.provider && (
            <div className="flex items-center gap-1.5 text-sm">
              <Building2 className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <span className={cn(
                'font-medium',
                isTelkom && 'text-blue-600 font-semibold'
              )}>
                {lead.provider}
              </span>
            </div>
          )}

          {/* Phone */}
          {lead.phone && (
            <div className="flex items-center gap-1.5 text-sm">
              <Phone className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <a 
                href={`tel:${lead.phone}`}
                className="text-blue-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {lead.phone}
              </a>
            </div>
          )}

          {/* Address */}
          {lead.address && (
            <div className="flex items-start gap-1.5 text-sm">
              <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 line-clamp-2">{lead.address}</span>
            </div>
          )}

          {/* Town */}
          {lead.town && (
            <div className="flex items-center gap-1.5 text-sm">
              <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <span className="text-gray-700 font-medium">{lead.town}</span>
            </div>
          )}

          {/* Contact Person */}
          {lead.contact_person && (
            <div className="flex items-center gap-1.5 text-sm">
              <User className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <span className="text-gray-700">Contact: {lead.contact_person}</span>
            </div>
          )}

          {/* Business Type */}
          {lead.type_of_business && (
            <div className="flex items-center gap-1.5 text-sm">
              <Briefcase className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <span className="text-gray-700">{lead.type_of_business}</span>
            </div>
          )}
        </div>

        {/* Right Side - Actions */}
        {showActions && (
          <div className="flex flex-col gap-2 min-w-[140px]">
            {/* Compact Action Buttons */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNoteModal(true);
                }}
                className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                title="Add Note"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Note</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReminderModal(true);
                }}
                className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 transition-colors"
                title="Add Reminder"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Remind</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditModal(true);
                }}
                className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded border border-orange-200 transition-colors"
                title="Edit Lead"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              
              <LeadFilesButton lead={lead} compact />
              
              {lead.maps_address && (
                <a
                  href={
                    lead.maps_address.startsWith('http://') || lead.maps_address.startsWith('https://')
                      ? lead.maps_address
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.maps_address)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded border border-green-200 transition-colors"
                  title="View on Google Maps"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Maps</span>
                </a>
              )}
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
                title="Delete Lead"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>

            {/* Status Dropdown */}
            <select
              value={lead.status}
              onChange={handleStatusChange}
              onClick={(e) => e.stopPropagation()}
              className="w-full px-2 py-1.5 text-xs font-medium border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              {LEAD_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Notes & Reminders Dropdown - Inside Card */}
      <details className="mt-4 pt-4 border-t border-gray-200 group">
        <summary className="cursor-pointer list-none flex items-center justify-between text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors">
          <span className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
            Notes & Reminders
            {totalItems > 0 && (
              <span className="text-xs font-normal text-gray-500">
                ({totalItems} items)
              </span>
            )}
          </span>
        </summary>
        
        <div className="mt-3 space-y-4 pl-6">
          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Notes ({notes.length})
              </p>
            </div>
            
            {notes.length > 0 ? (
              <div className="space-y-2">
                {notes.slice(-3).map(note => (
                  <div key={note.id} className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
                    <p>{note.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
                {notes.length > 3 && (
                  <p className="text-xs text-gray-500 italic">
                    Showing last 3 of {notes.length} notes
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">No notes yet. Use the Note button above to add one.</p>
            )}
          </div>

          {/* Reminders */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                <Bell className="w-3 h-3" />
                Reminders ({activeReminders.length})
              </p>
              {completedReminders.length > 0 && (
                <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                    className="rounded w-[14px] h-[14px] md:w-3 md:h-3"
                  />
                  Completed
                </label>
              )}
            </div>
            
            {displayReminders.length > 0 ? (
              <div className="space-y-2">
                {displayReminders.map(reminder => (
                  <div 
                    key={reminder.id} 
                    className={cn(
                      'flex items-center gap-2 text-sm p-2 rounded border',
                      reminder.completed 
                        ? 'bg-gray-50 border-gray-200 opacity-60' 
                        : 'bg-purple-50 border-purple-200'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={reminder.completed}
                      onChange={() => handleToggleReminderCompletion(reminder.id)}
                      className="rounded w-[14px] h-[14px] md:w-4 md:h-4"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span className={cn(
                      'text-gray-700 flex-1 text-xs',
                      reminder.completed && 'line-through'
                    )}>
                      {new Date(reminder.reminderDate).toLocaleDateString()} - {reminder.note}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">No reminders yet. Use the Reminder button above to add one.</p>
            )}
          </div>
        </div>
      </details>

      {/* Modals */}
      <AddNoteModal
        isOpen={showNoteModal}
        onClose={() => {
          setShowNoteModal(false);
          loadNotes(); // Refresh notes when modal closes
        }}
        leadId={lead.id}
        leadName={lead.name}
      />
      <AddReminderModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        leadId={lead.id}
        leadName={lead.name}
      />
      <EditLeadModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        lead={lead}
        onLeadUpdated={() => {
          // Optionally refresh data here
          setShowEditModal(false);
        }}
      />
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          if (onDelete) {
            onDelete(lead.id);
          }
        }}
        title="Delete Lead"
        message={`Are you sure you want to delete ${lead.name}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </Card>
  );
};

LeadCardComponent.displayName = 'LeadCard';

export const LeadCard = memo(LeadCardComponent);
