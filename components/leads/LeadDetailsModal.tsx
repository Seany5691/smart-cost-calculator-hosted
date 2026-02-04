'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Lead } from '@/lib/leads/types';
import { X, Phone, MapPin, Calendar, Paperclip, Eye, User, Building2, Briefcase, FileText } from 'lucide-react';
import NotesSection from './NotesSection';
import RemindersSection from './RemindersSection';
import AttachmentsSection from './AttachmentsSection';

interface LeadDetailsModalProps {
  lead: Lead;
  onClose: () => void;
  onUpdate: () => void;
}

export default function LeadDetailsModal({ lead, onClose, onUpdate }: LeadDetailsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 sm:p-0">
          <div className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl sm:rounded-none shadow-2xl max-w-2xl sm:max-w-full w-full max-h-[90vh] sm:h-screen overflow-hidden border border-emerald-500/30 sm:m-0">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Eye className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Lead Details</h2>
                  <p className="text-sm text-emerald-200">View lead information</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 min-w-[44px] min-h-[44px] hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center"
              >
                <X className="w-5 h-5 text-emerald-200" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] sm:max-h-[calc(100vh-160px)] custom-scrollbar space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-400" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-emerald-200 mb-1">
                      Status
                    </label>
                    <p className="text-white capitalize px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg">{lead.status}</p>
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-emerald-200 mb-1">
                      Name
                    </label>
                    <p className="text-white px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg">{lead.name}</p>
                  </div>
                  {lead.type_of_business && (
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-emerald-200 mb-1">
                        <Briefcase className="w-4 h-4 inline mr-1" />
                        Type of Business
                      </label>
                      <p className="text-white px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg">{lead.type_of_business}</p>
                    </div>
                  )}
                  {lead.contact_person && (
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-emerald-200 mb-1">
                        <User className="w-4 h-4 inline mr-1" />
                        Contact Person
                      </label>
                      <p className="text-white px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg">{lead.contact_person}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-emerald-400" />
                  Contact Information
                </h3>
                <div className="space-y-3">
                  {lead.phone && (
                    <div>
                      <label className="block text-sm font-medium text-emerald-200 mb-1">
                        Phone Number
                      </label>
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-emerald-400 hover:text-emerald-300 px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg block"
                      >
                        {lead.phone}
                      </a>
                    </div>
                  )}
                  {lead.provider && (
                    <div>
                      <label className="block text-sm font-medium text-emerald-200 mb-1">
                        <Building2 className="w-4 h-4 inline mr-1" />
                        Provider
                      </label>
                      <p className="text-white px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg">{lead.provider}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              {(lead.address || lead.town || lead.maps_address) && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                    Location
                  </h3>
                  <div className="space-y-3">
                    {lead.address && (
                      <div>
                        <label className="block text-sm font-medium text-emerald-200 mb-1">
                          Physical Address
                        </label>
                        <p className="text-white px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg">{lead.address}</p>
                      </div>
                    )}
                    {lead.town && (
                      <div>
                        <label className="block text-sm font-medium text-emerald-200 mb-1">
                          Town/City
                        </label>
                        <p className="text-white px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg">{lead.town}</p>
                      </div>
                    )}
                    {lead.maps_address && (
                      <div>
                        <label className="block text-sm font-medium text-emerald-200 mb-1">
                          Google Maps
                        </label>
                        <a
                          href={lead.maps_address}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg block"
                        >
                          View on Google Maps
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dates */}
              {(lead.date_to_call_back || lead.date_signed) && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-400" />
                    Important Dates
                  </h3>
                  <div className="space-y-3">
                    {lead.date_to_call_back && (
                      <div>
                        <label className="block text-sm font-medium text-emerald-200 mb-1">
                          Callback Date
                        </label>
                        <p className="text-white px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg">
                          {new Date(lead.date_to_call_back).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {lead.date_signed && (
                      <div>
                        <label className="block text-sm font-medium text-emerald-200 mb-1">
                          Date Signed
                        </label>
                        <p className="text-white px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg">
                          {new Date(lead.date_signed).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes (Legacy field) */}
              {lead.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-400" />
                    Legacy Notes
                  </h3>
                  <p className="text-gray-300 whitespace-pre-wrap px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg">{lead.notes}</p>
                </div>
              )}

              {/* Notes Section */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  Notes
                </h3>
                <NotesSection leadId={lead.id} />
              </div>

              {/* Reminders Section */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  Reminders
                </h3>
                <RemindersSection leadId={lead.id} />
              </div>

              {/* Attachments Section */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Paperclip className="w-5 h-5 text-emerald-400" />
                  Attachments
                </h3>
                <button
                  onClick={() => setShowAttachments(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-semibold"
                >
                  <Paperclip className="w-4 h-4" />
                  Manage Attachments
                </button>
              </div>

              {/* List Name */}
              {lead.list_name && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">List</h3>
                  <p className="text-white px-3 py-2 bg-white/5 border border-emerald-500/20 rounded-lg">{lead.list_name}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-emerald-500/20 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-3 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Attachments Modal */}
      {showAttachments && (
        <AttachmentsSection
          leadId={lead.id}
          leadName={lead.name}
          onClose={() => setShowAttachments(false)}
        />
      )}
    </>
  );
}
