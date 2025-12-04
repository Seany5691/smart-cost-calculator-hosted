'use client';

import { memo, useState } from 'react';
import { Lead, LeadStatus, LEAD_STATUSES, STATUS_COLORS } from '@/lib/leads/types';
import { cn } from '@/lib/utils';
import { Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { LaterStageModal } from './LaterStageModal';
import { SignedModal } from './SignedModal';
import { formatDate } from '@/lib/dateUtils';

interface StatusManagerProps {
  lead: Lead;
  onStatusChange: (leadId: string, status: LeadStatus, additionalData?: any) => void;
  disabled?: boolean;
  compact?: boolean;
}

const StatusManagerComponent = ({
  lead,
  onStatusChange,
  disabled = false,
  compact = false
}: StatusManagerProps) => {
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus>(lead.status);
  const [showLaterStageModal, setShowLaterStageModal] = useState(false);
  const [showSignedModal, setShowSignedModal] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (disabled || isTransitioning) return;

    // If changing to "Later Stage", show modal for explanation and date
    if (newStatus === 'later') {
      setSelectedStatus(newStatus);
      setShowLaterStageModal(true);
      return;
    }

    // If changing to "Signed", show modal for date signed
    if (newStatus === 'signed') {
      setSelectedStatus(newStatus);
      setShowSignedModal(true);
      return;
    }

    // For other statuses, proceed with change
    setIsTransitioning(true);
    setSelectedStatus(newStatus);

    try {
      await onStatusChange(lead.id, newStatus);
    } catch (error) {
      console.error('Failed to change status:', error);
      setSelectedStatus(lead.status); // Revert on error
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleLaterStageConfirm = async (data: { date_to_call_back: string; notes: string }) => {
    setIsTransitioning(true);

    try {
      await onStatusChange(lead.id, 'later', data);
      setShowLaterStageModal(false);
    } catch (error) {
      console.error('Failed to change status to Later Stage:', error);
      setSelectedStatus(lead.status); // Revert on error
      throw error; // Re-throw to show error in modal
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleLaterStageCancel = () => {
    setShowLaterStageModal(false);
    setSelectedStatus(lead.status);
  };

  const handleSignedConfirm = async (data: { dateSigned: string; notes: string }) => {
    setIsTransitioning(true);

    try {
      await onStatusChange(lead.id, 'signed', data);
      setShowSignedModal(false);
    } catch (error) {
      console.error('Failed to change status to Signed:', error);
      setSelectedStatus(lead.status); // Revert on error
      throw error; // Re-throw to show error in modal
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleSignedCancel = () => {
    setShowSignedModal(false);
    setSelectedStatus(lead.status);
  };

  const getStatusColor = (status: LeadStatus) => {
    const color = STATUS_COLORS[status];
    const colorMap = {
      blue: 'bg-blue-100 text-blue-700 border-blue-300',
      yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      red: 'bg-red-100 text-red-700 border-red-300',
      purple: 'bg-purple-100 text-purple-700 border-purple-300',
      green: 'bg-green-100 text-green-700 border-green-300'
    };
    return colorMap[color as keyof typeof colorMap] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const getStatusLabel = (status: LeadStatus): string => {
    const labels: Record<LeadStatus, string> = {
      new: 'New',
      leads: 'Leads',
      working: 'Working On',
      bad: 'Bad Leads',
      later: 'Later Stage',
      signed: 'Signed'
    };
    return labels[status];
  };

  const getStatusDescription = (status: LeadStatus): string => {
    const descriptions: Record<LeadStatus, string> = {
      new: 'Newly imported leads',
      leads: 'New leads to be processed',
      working: 'Currently working on this lead',
      bad: 'Lead is not viable',
      later: 'Follow up at a later date',
      signed: 'Successfully signed'
    };
    return descriptions[status];
  };

  // Compact view - just a dropdown
  if (compact) {
    return (
      <div className="relative">
        <select
          value={selectedStatus}
          onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
          disabled={disabled || isTransitioning}
          className={cn(
            'input text-sm',
            disabled && 'opacity-50 cursor-not-allowed',
            isTransitioning && 'animate-pulse'
          )}
          aria-label="Change lead status"
        >
          {LEAD_STATUSES.map((statusOption) => (
            <option key={statusOption.value} value={statusOption.value}>
              {statusOption.label}
            </option>
          ))}
        </select>

        {/* Later Stage Modal */}
        <LaterStageModal
          lead={lead}
          isOpen={showLaterStageModal}
          onClose={handleLaterStageCancel}
          onConfirm={handleLaterStageConfirm}
        />

        {/* Signed Modal */}
        <SignedModal
          lead={lead}
          isOpen={showSignedModal}
          onClose={handleSignedCancel}
          onConfirm={handleSignedConfirm}
        />
      </div>
    );
  }

  // Full view - status cards with descriptions
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Change Lead Status
        </h3>
        {isTransitioning && (
          <div className="flex items-center space-x-2 text-sm text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
            <span>Updating...</span>
          </div>
        )}
      </div>

      {/* Status Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {LEAD_STATUSES.map((statusOption) => {
          const status = statusOption.value;
          const isSelected = selectedStatus === status;
          const isCurrent = lead.status === status;

          return (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              disabled={disabled || isTransitioning || isCurrent}
              className={cn(
                'relative p-4 rounded-lg border-2 transition-all duration-200 text-left touch-target',
                'hover:scale-105 active:scale-95',
                isSelected && !isCurrent && 'ring-2 ring-blue-500 ring-offset-2',
                isCurrent && getStatusColor(status),
                !isCurrent && 'bg-white border-gray-200 hover:border-gray-300',
                disabled && 'opacity-50 cursor-not-allowed',
                isTransitioning && 'opacity-50'
              )}
              aria-label={`Change status to ${statusOption.label}`}
              aria-pressed={isSelected}
              aria-disabled={disabled || isTransitioning || isCurrent}
            >
              {/* Current Status Indicator */}
              {isCurrent && (
                <div className="absolute top-2 right-2">
                  <CheckCircle className="w-5 h-5 text-green-600" aria-hidden="true" />
                  <span className="sr-only">Current status</span>
                </div>
              )}

              <div className="space-y-2">
                <div className="font-semibold text-sm uppercase tracking-wide">
                  {statusOption.label}
                </div>
                <div className="text-xs text-gray-600">
                  {getStatusDescription(status)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Later Stage Modal */}
      <LaterStageModal
        lead={lead}
        isOpen={showLaterStageModal}
        onClose={handleLaterStageCancel}
        onConfirm={handleLaterStageConfirm}
      />

      {/* Signed Modal */}
      <SignedModal
        lead={lead}
        isOpen={showSignedModal}
        onClose={handleSignedCancel}
        onConfirm={handleSignedConfirm}
      />

      {/* Current Status Info */}
      {lead.date_to_call_back && lead.status === 'later' && (
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="w-4 h-4 text-purple-600" aria-hidden="true" />
            <span className="font-medium text-purple-900">
              Callback scheduled for: {formatDate(lead.date_to_call_back)}
            </span>
          </div>
        </div>
      )}

      {lead.dateSigned && lead.status === 'signed' && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="w-4 h-4 text-green-600" aria-hidden="true" />
            <span className="font-medium text-green-900">
              Signed on: {formatDate(lead.dateSigned)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

StatusManagerComponent.displayName = 'StatusManager';

export const StatusManager = memo(StatusManagerComponent);
