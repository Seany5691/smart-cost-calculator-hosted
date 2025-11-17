'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, User, Phone, Building2, MapPin, Briefcase, FileText } from 'lucide-react';
import { LeadStatus, LEAD_STATUSES } from '@/lib/leads/types';
import { useLeadsStore } from '@/store/leads/leads';

interface AddLeadButtonProps {
  defaultStatus?: LeadStatus;
  onSuccess?: () => void;
}

export const AddLeadButton = ({ defaultStatus = 'leads', onSuccess }: AddLeadButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const { createLead } = useLeadsStore();
  
  const [formData, setFormData] = useState({
    maps_address: '',
    name: '',
    phone: '',
    provider: '',
    address: '',
    town: '',
    contact_person: '',
    type_of_business: '',
    status: defaultStatus,
    notes: '',
    date_to_call_back: ''
  });

  // Check if component is mounted (client-side only)
  useState(() => {
    setMounted(true);
  });

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!formData.maps_address.trim()) {
      setError('Google Maps URL or address is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await createLead({
        maps_address: formData.maps_address.trim(),
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        provider: formData.provider.trim() || undefined,
        address: formData.address.trim() || undefined,
        town: formData.town.trim() || undefined,
        contact_person: formData.contact_person.trim() || undefined,
        type_of_business: formData.type_of_business.trim() || undefined,
        status: formData.status,
        notes: formData.notes.trim() || undefined,
        date_to_call_back: formData.date_to_call_back || undefined
      });

      // Reset form
      setFormData({
        maps_address: '',
        name: '',
        phone: '',
        provider: '',
        address: '',
        town: '',
        contact_person: '',
        type_of_business: '',
        status: defaultStatus,
        notes: '',
        date_to_call_back: ''
      });
      
      setIsOpen(false);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      maps_address: '',
      name: '',
      phone: '',
      provider: '',
      address: '',
      town: '',
      contact_person: '',
      type_of_business: '',
      status: defaultStatus,
      notes: '',
      date_to_call_back: ''
    });
    setError('');
    setIsOpen(false);
  };

  const modalContent = isOpen ? (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] transition-opacity"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-lead-modal-title"
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[calc(100vh-4rem)] transition-opacity duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-green-500 to-emerald-500 p-6 flex items-center justify-between z-10 rounded-t-2xl flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 id="add-lead-modal-title" className="text-2xl font-bold text-white">
                  Add New Lead
                </h2>
                <p className="text-sm text-white/90">
                  Manually add a lead to your pipeline
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {/* Google Maps URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Google Maps URL or Address *
                </label>
                <input
                  type="text"
                  value={formData.maps_address}
                  onChange={(e) => setFormData({ ...formData, maps_address: e.target.value })}
                  placeholder="https://maps.google.com/... or street address"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Lead name or business name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+27 12 345 6789"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              {/* Provider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Provider
                </label>
                <input
                  type="text"
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  placeholder="e.g., Telkom, Vodacom, MTN"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Physical Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              {/* Town */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Town/City
                </label>
                <input
                  type="text"
                  value={formData.town}
                  onChange={(e) => setFormData({ ...formData, town: e.target.value })}
                  placeholder="e.g., Potchefstroom, Klerksdorp"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Contact Person
                </label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Name of contact person"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              {/* Business Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Briefcase className="w-4 h-4 inline mr-1" />
                  Type of Business
                </label>
                <input
                  type="text"
                  value={formData.type_of_business}
                  onChange={(e) => setFormData({ ...formData, type_of_business: e.target.value })}
                  placeholder="e.g., Restaurant, Retail, Office"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as LeadStatus })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={isSubmitting}
                >
                  {LEAD_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional information..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              {/* Callback Date (if Later Stage) */}
              {formData.status === 'later' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Callback Date
                  </label>
                  <input
                    type="date"
                    value={formData.date_to_call_back}
                    onChange={(e) => setFormData({ ...formData, date_to_call_back: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex justify-end space-x-3 rounded-b-2xl flex-shrink-0">
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.name.trim() || !formData.maps_address.trim()}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-semibold"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add Lead</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      {/* Add Lead Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="btn btn-success flex items-center gap-2"
        title="Add new lead manually"
      >
        <Plus className="w-4 h-4" />
        <span>Add Lead</span>
      </button>

      {/* Modal - Rendered via Portal */}
      {mounted && isOpen && typeof document !== 'undefined' && createPortal(modalContent, document.body)}
    </>
  );
};
