'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, User, Phone, Building2, MapPin, Briefcase, FileText, Search, Loader2, AlertCircle } from 'lucide-react';

// Helper function to get auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (!authStorage) return null;
    
    const parsed = JSON.parse(authStorage);
    return parsed?.state?.token || parsed?.token || null;
  } catch (error) {
    console.error('Error reading auth token:', error);
    return null;
  }
}

interface AddLeadButtonProps {
  defaultStatus?: 'new' | 'leads' | 'working' | 'proposal' | 'later' | 'bad' | 'signed';
  onSuccess?: () => void;
}

const LEAD_STATUSES = [
  { value: 'new', label: 'New (Main Sheet)' },
  { value: 'leads', label: 'Leads (Active Pipeline)' },
  { value: 'working', label: 'Working On' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'later', label: 'Later Stage' },
  { value: 'bad', label: 'Bad Leads' },
  { value: 'signed', label: 'Signed' }
];

export default function AddLeadButton({ defaultStatus = 'leads', onSuccess }: AddLeadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingProvider, setIsCheckingProvider] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    mapsAddress: '',
    name: '',
    phone: '',
    provider: '',
    address: '',
    town: '',
    contactPerson: '',
    typeOfBusiness: '',
    status: defaultStatus,
    notes: '',
    dateToCallBack: ''
  });

  // Check if component is mounted (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCheckProvider = async () => {
    if (!formData.phone.trim()) {
      setError('Please enter a phone number first');
      return;
    }

    setIsCheckingProvider(true);
    setError('');

    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/dashboard/lookup-number', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phoneNumber: formData.phone.trim()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to lookup provider');
      }

      const result = await response.json();
      
      // Auto-fill the provider field
      if (result.provider && result.provider !== 'Unknown') {
        setFormData({ ...formData, provider: result.provider });
      } else {
        setError('Provider not found for this number');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to lookup provider');
    } finally {
      setIsCheckingProvider(false);
    }
  };

  const handleSubmit = async () => {
    // Validation - only name is required
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mapsAddress: formData.mapsAddress.trim(),
          name: formData.name.trim(),
          phone: formData.phone.trim() || undefined,
          provider: formData.provider.trim() || undefined,
          address: formData.address.trim() || undefined,
          town: formData.town.trim() || undefined,
          contactPerson: formData.contactPerson.trim() || undefined,
          typeOfBusiness: formData.typeOfBusiness.trim() || undefined,
          status: formData.status,
          notes: formData.notes.trim() || undefined,
          dateToCallBack: formData.dateToCallBack || undefined
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add lead');
      }

      // Reset form
      setFormData({
        mapsAddress: '',
        name: '',
        phone: '',
        provider: '',
        address: '',
        town: '',
        contactPerson: '',
        typeOfBusiness: '',
        status: defaultStatus,
        notes: '',
        dateToCallBack: ''
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
      mapsAddress: '',
      name: '',
      phone: '',
      provider: '',
      address: '',
      town: '',
      contactPerson: '',
      typeOfBusiness: '',
      status: defaultStatus,
      notes: '',
      dateToCallBack: ''
    });
    setError('');
    setIsOpen(false);
  };

  if (!mounted) return null;

  const modalContent = isOpen ? createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 sm:p-0"
      onClick={handleCancel}
    >
      <div
        className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl sm:rounded-none shadow-2xl max-w-4xl sm:max-w-full w-full max-h-[90vh] sm:h-screen overflow-hidden border border-emerald-500/30 sm:m-0"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-lead-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Plus className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 id="add-lead-modal-title" className="text-2xl font-bold text-white">
                Add New Lead
              </h2>
              <p className="text-sm text-emerald-200">
                Manually add a lead to your pipeline
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="p-2 min-w-[44px] min-h-[44px] hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-emerald-200" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] sm:max-h-[calc(100vh-160px)] custom-scrollbar space-y-4">
              {/* Google Maps URL */}
              <div>
                <label className="block text-white font-medium mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Google Maps URL or Address
                </label>
                <input
                  type="text"
                  value={formData.mapsAddress}
                  onChange={(e) => setFormData({ ...formData, mapsAddress: e.target.value })}
                  placeholder="https://maps.google.com/... or street address"
                  className="w-full h-12 px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-base placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                  disabled={isSubmitting || isCheckingProvider}
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
                  className="w-full h-12 px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-base placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                  disabled={isSubmitting || isCheckingProvider}
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-white font-medium mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+27 12 345 6789"
                    className="flex-1 h-12 px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-base placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    disabled={isSubmitting || isCheckingProvider}
                  />
                  <button
                    type="button"
                    onClick={handleCheckProvider}
                    disabled={isSubmitting || isCheckingProvider || !formData.phone.trim()}
                    className="px-4 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                    title="Check provider using porting.co.za"
                  >
                    {isCheckingProvider ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">Checking...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span className="hidden sm:inline">Check Provider</span>
                      </>
                    )}
                  </button>
                </div>
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
                  className="w-full h-12 px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-base placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                  disabled={isSubmitting || isCheckingProvider}
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
                  className="w-full h-12 px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-base placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                  disabled={isSubmitting || isCheckingProvider}
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
                  className="w-full h-12 px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-base placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                  disabled={isSubmitting || isCheckingProvider}
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
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="Name of contact person"
                  className="w-full h-12 px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-base placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                  disabled={isSubmitting || isCheckingProvider}
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
                  value={formData.typeOfBusiness}
                  onChange={(e) => setFormData({ ...formData, typeOfBusiness: e.target.value })}
                  placeholder="e.g., Restaurant, Retail, Office"
                  className="w-full h-12 px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-base placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                  disabled={isSubmitting || isCheckingProvider}
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full h-12 px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-base focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                  disabled={isSubmitting || isCheckingProvider}
                >
                  {LEAD_STATUSES.map((status) => (
                    <option key={status.value} value={status.value} className="bg-slate-800">
                      {status.label}
                    </option>
                  ))}
                </select>
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
                  className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 resize-none"
                  rows={3}
                  disabled={isSubmitting || isCheckingProvider}
                />
              </div>

              {/* Callback Date (if Later Stage) */}
              {formData.status === 'later' && (
                <div>
                  <label className="block text-white font-medium mb-2">
                    Callback Date
                  </label>
                  <input
                    type="date"
                    value={formData.dateToCallBack}
                    onChange={(e) => setFormData({ ...formData, dateToCallBack: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full h-12 px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    disabled={isSubmitting || isCheckingProvider}
                  />
                </div>
              )}

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
                  disabled={isSubmitting || isCheckingProvider}
                  className="w-full sm:w-auto px-6 py-3 min-h-[44px] bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isCheckingProvider || !formData.name.trim()}
                  className="w-full sm:w-auto px-6 py-3 min-h-[44px] bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
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
            </form>
          </div>
        </div>,
        document.body
      ) : null;

  return (
    <>
      {/* Add Lead Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-2 px-4 py-3 min-w-[44px] min-h-[44px] bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg transition-shadow font-medium"
        title="Add new lead manually"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Add Lead</span>
      </button>

      {/* Modal - Rendered via Portal */}
      {modalContent}
    </>
  );
}
