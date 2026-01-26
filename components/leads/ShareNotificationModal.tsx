'use client';

import { UserPlus, X } from 'lucide-react';

interface ShareNotification {
  id: number;
  lead_id: number;
  business_name: string;
  contact_person: string;
  shared_by_username: string;
  created_at: string;
}

interface ShareNotificationModalProps {
  notification: ShareNotification;
  onClose: () => void;
}

export default function ShareNotificationModal({
  notification,
  onClose,
}: ShareNotificationModalProps) {
  const handleOk = async () => {
    // Mark notification as read
    try {
      await fetch('/api/leads/share-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: notification.id }),
      });
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleOk}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <UserPlus className="w-5 h-5 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Lead Shared With You</h2>
          </div>
          <button
            onClick={handleOk}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 bg-slate-800/30 rounded-lg border border-white/10">
            <p className="text-slate-300 mb-3">
              <span className="font-semibold text-blue-400">{notification.shared_by_username}</span>
              {' '}has shared a lead with you:
            </p>
            
            <div className="space-y-2">
              <div>
                <p className="text-sm text-slate-400">Business Name</p>
                <p className="text-white font-medium">{notification.business_name || 'N/A'}</p>
              </div>
              
              {notification.contact_person && (
                <div>
                  <p className="text-sm text-slate-400">Contact Person</p>
                  <p className="text-white font-medium">{notification.contact_person}</p>
                </div>
              )}
            </div>
          </div>

          <p className="text-sm text-slate-400 text-center">
            You can now view and edit this lead, add notes, and create reminders.
          </p>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10">
          <button
            onClick={handleOk}
            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
