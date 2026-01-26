'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Lead } from '@/lib/leads/types';
import { X, Edit, User, Phone, Building2, MapPin, Briefcase, FileText, AlertCircle, Loader2 } from 'lucide-react';

// Helper function to get auth token
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const data = JSON.parse(stored);
      return data.state?.token || data.token || null;
    }
  } catch (error) {
    console.error('Error reading auth token:', error);
  }
  return null;
}

interface EditLeadModalProps {
  lead: Lead;
  onClose: () => void;
  onUpdate: () => void;
}

export default function EditLeadModal({ lead, onClose, onUpdate }: EditLeadModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    provider: '',
    address: '',
    town: '',
    contact_person: '',
    type_of_business: '',
    notes: ''
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    // Populate form with lead data
    setFormData({
      name: lead.name || '',
      phone: lead.phone || '',
      provider: lead.provider || '',
      address: lead.address || '',
      town: lead.town || '',
      contact_person: lead.contact_person || '',
      type_of_business: lead.type_of_business || '',
      notes: lead.notes || ''
    });
    setError('');
  }, [lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = getAuthToken();
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim() || undefined,
          provider: formData.provider.trim() || undefined,
          address: formData.address.trim() || undefined,
          town: formData.town.trim() || undefined,
          contactPerson: formData.contact_person.trim() || undefined,
          typeOfBusiness: formData.type_of_business.trim() || undefined,
          notes: formData.notes.trim() || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update lead');
      }

      onUpdate();
      onClose();
    } catch (err) {
      console.error('Error updating lead:', err);
      setError(err instanceof Error ? err.message : 'Failed to update lead');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setError('');
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 sm:p-0">
      <div className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl sm:rounded-none shadow-2xl max-w-4xl sm:max-w-full w-full max-h-[90vh] sm:h-screen overflow-hidden border border-emerald-500/30 sm:m-0">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Edit className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Edit Lead</h2>
              <p className="text-sm text-emerald-200">Update lead information</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="p-2 min-w-[44px] min-h-[44px] hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center"
          >
            <X className="w-5 h-5 text-emerald-200" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] sm:max-h-[calc(100vh-160px)] custom-scrollbar space-y-4">
          {/* Info Box */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-emerald-400 font-medium mb-1">Note about Maps Address</p>
                <p className="text-sm text-emerald-300">
                  The Google Maps URL cannot be changed after creation. All other fields can be updated.
                </p>
              </div>
            </div>
          </div>

          {/* Maps Address (Read-only) */}
          <div>
            <label className="block text-white font-medium mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Google Maps URL (Read-only)
            </label>
            <input
              type="text"
              value={lead.maps_address || 'No maps address'}
              disabled
              className="w-full px-4 py-3 bg-white/5 border border-emerald-500/20 rounded-lg text-gray-400 cursor-not-allowed"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-white font-medium mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Lead name or business name"
              required
              disabled={loading}
              className="w-full h-12 px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-base placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-white font-medium mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+27 12 345 6789"
              disabled={loading}
              className="w-full h-12 px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-base placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Provider */}
          <div>
            <label className="block text-white font-medium mb-2">
              <Building2 className="w-4 h-4 inline mr-1" />
              Provider
            </label>
            <input
              type="text"
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              placeholder="e.g., Telkom, Vodacom, MTN"
              disabled={loading}
              className="w-full h-12 px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-base placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-white font-medium mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Physical Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street address"
              disabled={loading}
              className="w-full h-12 px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-base placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Town */}
          <div>
            <label className="block text-white font-medium mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Town/City
            </label>
            <input
              type="text"
              value={formData.town}
              onChange={(e) => setFormData({ ...formData, town: e.target.value })}
              placeholder="e.g., Potchefstroom, Klerksdorp"
              disabled={loading}
              className="w-full h-12 px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-base placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Contact Person */}
          <div>
            <label className="block text-white font-medium mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Contact Person
            </label>
            <input
              type="text"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              placeholder="Name of contact person"
              disabled={loading}
              className="w-full h-12 px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-base placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Business Type */}
          <div>
            <label className="block text-white font-medium mb-2">
              <Briefcase className="w-4 h-4 inline mr-1" />
              Type of Business
            </label>
            <input
              type="text"
              value={formData.type_of_business}
              onChange={(e) => setFormData({ ...formData, type_of_business: e.target.value })}
              placeholder="e.g., Restaurant, Retail, Office"
              disabled={loading}
              className="w-full h-12 px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-base placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-white font-medium mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information..."
              rows={3}
              disabled={loading}
              className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-400 font-medium mb-1">Error</p>
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-emerald-500/20">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 min-h-[44px] bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="w-full sm:w-auto px-6 py-3 min-h-[44px] bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
