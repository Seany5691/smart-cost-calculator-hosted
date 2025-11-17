'use client';

import { memo, useState } from 'react';
import { Lead, LeadStatus, LeadSortOptions, STATUS_COLORS } from '@/lib/leads/types';
import { cn } from '@/lib/utils';
import { ConfirmModal } from '../ui/ConfirmModal';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit,
  Trash2,
  MapPin,
  Phone,
  CheckSquare,
  Square
} from 'lucide-react';

interface LeadTableProps {
  leads: Lead[];
  onStatusChange?: (leadId: string, status: LeadStatus) => void;
  onEdit?: (lead: Lead) => void;
  onDelete?: (leadId: string) => void;
  onBulkAction?: (leadIds: string[], action: string) => void;
  sortOptions: LeadSortOptions;
  onSort: (options: LeadSortOptions) => void;
  selectedLeads?: string[];
  onSelectionChange?: (leadIds: string[]) => void;
  showBulkActions?: boolean;
}

const LeadTableComponent = ({
  leads,
  onStatusChange,
  onEdit,
  onDelete,
  onBulkAction,
  sortOptions,
  onSort,
  selectedLeads = [],
  onSelectionChange,
  showBulkActions = true
}: LeadTableProps) => {
  const [editingCell, setEditingCell] = useState<{ leadId: string; field: keyof Lead } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ leadId: string; leadName: string } | null>(null);

  const handleSort = (field: keyof Lead) => {
    const newDirection = 
      sortOptions.field === field && sortOptions.direction === 'asc' ? 'desc' : 'asc';
    onSort({ field, direction: newDirection });
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    
    if (selectedLeads.length === leads.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(leads.map(lead => lead.id));
    }
  };

  const handleSelectLead = (leadId: string) => {
    if (!onSelectionChange) return;
    
    if (selectedLeads.includes(leadId)) {
      onSelectionChange(selectedLeads.filter(id => id !== leadId));
    } else {
      onSelectionChange([...selectedLeads, leadId]);
    }
  };

  const startEditing = (leadId: string, field: keyof Lead, currentValue: any) => {
    setEditingCell({ leadId, field });
    setEditValue(currentValue?.toString() || '');
  };

  const saveEdit = (lead: Lead) => {
    if (!editingCell || !onEdit) return;
    
    const updatedLead = {
      ...lead,
      [editingCell.field]: editValue
    };
    
    onEdit(updatedLead);
    setEditingCell(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const renderSortIcon = (field: keyof Lead) => {
    if (sortOptions.field !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" aria-hidden="true" />;
    }
    return sortOptions.direction === 'asc' ? (
      <ArrowUp className="w-4 h-4 ml-1" aria-hidden="true" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1" aria-hidden="true" />
    );
  };

  const renderEditableCell = (lead: Lead, field: keyof Lead, value: any) => {
    const isEditing = editingCell?.leadId === lead.id && editingCell?.field === field;

    if (isEditing) {
      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveEdit(lead)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveEdit(lead);
            if (e.key === 'Escape') cancelEdit();
          }}
          className="input py-1 px-2 text-sm"
          autoFocus
          aria-label={`Edit ${field}`}
        />
      );
    }

    return (
      <span
        onClick={() => startEditing(lead.id, field, value)}
        className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            startEditing(lead.id, field, value);
          }
        }}
        aria-label={`Edit ${field}: ${value || 'empty'}`}
      >
        {value || '-'}
      </span>
    );
  };

  const getStatusColor = (status: LeadStatus) => {
    const color = STATUS_COLORS[status];
    const colorMap = {
      blue: 'bg-blue-100 text-blue-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      red: 'bg-red-100 text-red-700',
      purple: 'bg-purple-100 text-purple-700',
      green: 'bg-green-100 text-green-700'
    };
    return colorMap[color as keyof typeof colorMap] || 'bg-gray-100 text-gray-700';
  };

  const isTelkom = (provider: string | null) => {
    return provider?.toLowerCase().includes('telkom');
  };

  return (
    <div className="w-full">
      {/* Bulk Actions */}
      {showBulkActions && selectedLeads.length > 0 && onBulkAction && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">
            {selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onBulkAction(selectedLeads, 'delete')}
              className="btn btn-danger btn-mobile-icon"
              aria-label="Delete selected leads"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              <span className="ml-2 hidden sm:inline">Delete</span>
            </button>
            <button
              onClick={() => onBulkAction(selectedLeads, 'export')}
              className="btn btn-secondary btn-mobile-icon"
              aria-label="Export selected leads"
            >
              Export
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-mobile-responsive">
        <table className="min-w-full bg-white rounded-xl shadow-xl overflow-hidden">
          <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <tr>
              {/* Checkbox Column */}
              {showBulkActions && onSelectionChange && (
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={handleSelectAll}
                    className="touch-target"
                    aria-label={selectedLeads.length === leads.length ? 'Deselect all' : 'Select all'}
                  >
                    {selectedLeads.length === leads.length ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" aria-hidden="true" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" aria-hidden="true" />
                    )}
                  </button>
                </th>
              )}

              {/* Number Column */}
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('number')}
                  className="flex items-center text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors touch-target"
                  aria-label="Sort by number"
                >
                  #
                  {renderSortIcon('number')}
                </button>
              </th>

              {/* Name Column */}
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors touch-target"
                  aria-label="Sort by name"
                >
                  Name
                  {renderSortIcon('name')}
                </button>
              </th>

              {/* Provider Column */}
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('provider')}
                  className="flex items-center text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors touch-target"
                  aria-label="Sort by provider"
                >
                  Provider
                  {renderSortIcon('provider')}
                </button>
              </th>

              {/* Phone Column */}
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Phone
              </th>

              {/* Business Type Column */}
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Business Type
              </th>

              {/* Status Column */}
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors touch-target"
                  aria-label="Sort by status"
                >
                  Status
                  {renderSortIcon('status')}
                </button>
              </th>

              {/* Actions Column */}
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {leads.map((lead, index) => (
              <tr
                key={lead.id}
                className={cn(
                  'hover:bg-gray-50 transition-colors',
                  lead.status === 'bad' && 'bg-red-50',
                  lead.status === 'signed' && 'bg-green-50',
                  isTelkom(lead.provider) && 'border-l-4 border-l-blue-600',
                  selectedLeads.includes(lead.id) && 'bg-blue-50',
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                )}
              >
                {/* Checkbox */}
                {showBulkActions && onSelectionChange && (
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleSelectLead(lead.id)}
                      className="touch-target"
                      aria-label={`Select lead ${lead.name}`}
                    >
                      {selectedLeads.includes(lead.id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" aria-hidden="true" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" aria-hidden="true" />
                      )}
                    </button>
                  </td>
                )}

                {/* Number */}
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {lead.number}
                </td>

                {/* Name */}
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {renderEditableCell(lead, 'name', lead.name)}
                </td>

                {/* Provider */}
                <td className="px-4 py-3 text-sm">
                  <span className={cn(
                    'font-medium',
                    isTelkom(lead.provider) && 'text-blue-600 font-semibold'
                  )}>
                    {renderEditableCell(lead, 'provider', lead.provider)}
                  </span>
                </td>

                {/* Phone */}
                <td className="px-4 py-3 text-sm">
                  {lead.phone ? (
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-blue-600 hover:underline flex items-center space-x-1"
                    >
                      <Phone className="w-3 h-3" aria-hidden="true" />
                      <span>{lead.phone}</span>
                    </a>
                  ) : (
                    renderEditableCell(lead, 'phone', lead.phone)
                  )}
                </td>

                {/* Business Type */}
                <td className="px-4 py-3 text-sm text-gray-700">
                  {renderEditableCell(lead, 'type_of_business', lead.type_of_business)}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-semibold uppercase',
                    getStatusColor(lead.status)
                  )}>
                    {lead.status}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    {lead.maps_address && (
                      <a
                        href={lead.maps_address}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 transition-colors touch-target"
                        aria-label="View on Google Maps"
                      >
                        <MapPin className="w-4 h-4" aria-hidden="true" />
                      </a>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(lead)}
                        className="text-gray-600 hover:text-blue-600 transition-colors touch-target"
                        aria-label="Edit lead"
                      >
                        <Edit className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => setDeleteConfirm({ leadId: lead.id, leadName: lead.name })}
                        className="text-gray-600 hover:text-red-600 transition-colors touch-target"
                        aria-label="Delete lead"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {leads.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-xl">
          <p className="text-gray-500 text-lg">No leads found</p>
          <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or import new leads</p>
        </div>
      )}

      {/* Mobile Fallback Message */}
      <div className="md:hidden mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-900">
          💡 Tip: For better table viewing on mobile, try rotating your device to landscape mode or use the card view.
        </p>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm && onDelete) {
            onDelete(deleteConfirm.leadId);
          }
          setDeleteConfirm(null);
        }}
        title="Delete Lead"
        message={`Are you sure you want to delete ${deleteConfirm?.leadName}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

LeadTableComponent.displayName = 'LeadTable';

export const LeadTable = memo(LeadTableComponent);
