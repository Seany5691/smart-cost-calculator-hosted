'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, FileText, AlertCircle } from 'lucide-react';
import type { Lead } from '@/lib/leads/types';

interface LaterStageModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { date_to_call_back: string; notes: string }) => void;
}

type ReminderType = 'call' | 'email' | 'meeting' | 'followup';
type Priority = 'high' | 'medium' | 'low';

export default function LaterStageModal({
  lead,
  isOpen,
  onClose,
  onConfirm
}: LaterStageModalProps) {
  const [mounted, setMounted] = useState(false);
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackTime, setCallbackTime] = useState('09:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [reminderType, setReminderType] = useState<ReminderType>('followup');
  const [priority, setPriority] = useState<Priority>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen) return null;
  if (!mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!callbackDate) {
      setError('Please select a callback date');
      return;
    }

    if (!explanation.trim()) {
      setError('Please provide an explanation for moving this lead to Later Stage');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create the note text with all the details
      const timeStr = isAllDay ? 'All Day' : callbackTime;
      const noteText = `Moved to Later Stage: ${explanation.trim()}\nCallback: ${callbackDate} at ${timeStr}\nType: ${reminderType}\nPriority: ${priority}`;
      
      // Update the lead status and callback date
      await onConfirm({ 
        date_to_call_back: callbackDate, 
        notes: noteText 
      });

      // Create a reminder for this callback
      try {
        const token = localStorage.getItem('auth-storage');
        let authToken = null;
        if (token) {
          const data = JSON.parse(token);
          authToken = data.token;
        }

        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const reminderData = {
          lead_id: lead.id,
          title: `Callback: ${lead.name}`,
          description: explanation.trim(),
          reminder_date: callbackDate,
          reminder_time: isAllDay ? null : callbackTime,
          is_all_day: isAllDay,
          reminder_type: reminderType,
          priority: priority,
          message: `Later Stage Callback - ${explanation.trim()}`,
          note: explanation.trim(),
          status: 'pending',
          completed: false
        };

        const reminderResponse = await fetch(`/api/leads/${lead.id}/reminders`, {
          method: 'POST',
          headers,
          body: JSON.stringify(reminderData)
        });

        if (!reminderResponse.ok) {
          console.error('Failed to create reminder, but lead was updated');
        }
      } catch (reminderError) {
        console.error('Error creating reminder:', reminderError);
        // Don't fail the whole operation if reminder creation fails
      }
      
      // Reset form
      setCallbackDate('');
      setCallbackTime('09:00');
      setIsAllDay(false);
      setExplanation('');
      setReminderType('followup');
      setPriority('medium');
      setError('');
      onClose();
    } catch (error) {
      console.error('Error updating lead:', error);
      setError('Failed to move lead to Later Stage');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCallbackDate('');
    setCallbackTime('09:00');
    setIsAllDay(false);
    setExplanation('');
    setReminderType('followup');
    setPriority('medium');
    setError('');
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-emerald-500/30">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Calendar className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Move to Later Stage</h2>
              <p className="text-sm text-emerald-200">{lead.name}</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-emerald-200" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar space-y-5">
          {/* Info Box */}
          <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <AlertCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">Why are you moving this lead?</h4>
                <p className="text-emerald-200 text-sm">
                  Provide an explanation and set a callback date. This information will be saved as a note for future reference.
                </p>
              </div>
            </div>
          </div>

          {/* Explanation Field */}
          <div>
            <label className="block text-white font-medium mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Explanation <span className="text-red-400">*</span>
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="e.g., Customer needs time to review proposal, Budget not available until next quarter, etc."
              className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 resize-none"
              rows={4}
              disabled={loading}
              required
            />
            <p className="text-sm text-emerald-300/70 mt-1">
              This will be saved as a note with the callback details
            </p>
          </div>

          {/* Reminder Type */}
          <div>
            <label className="block text-white font-medium mb-3">
              Reminder Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: 'call' as ReminderType, label: 'Phone Call' },
                { value: 'email' as ReminderType, label: 'Email' },
                { value: 'meeting' as ReminderType, label: 'Meeting' },
                { value: 'followup' as ReminderType, label: 'Follow-up' },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setReminderType(type.value)}
                  disabled={loading}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    reminderType === type.value
                      ? 'border-emerald-500 bg-emerald-500/20 text-white'
                      : 'border-white/20 bg-white/5 text-gray-300 hover:border-white/30'
                  }`}
                >
                  <div className="text-xs font-medium">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-white font-medium mb-2">
              Priority <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  disabled={loading}
                  className={`p-3 rounded-lg border-2 transition-all font-medium ${
                    priority === p
                      ? p === 'high' ? 'border-red-500 bg-red-500/20 text-red-300'
                        : p === 'medium' ? 'border-yellow-500 bg-yellow-500/20 text-yellow-300'
                        : 'border-green-500 bg-green-500/20 text-green-300'
                      : 'border-white/20 bg-white/5 text-gray-300 hover:border-white/30'
                  }`}
                >
                  {p === 'high' ? 'High' : p === 'medium' ? 'Medium' : 'Low'}
                </button>
              ))}
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-medium mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Callback Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={callbackDate}
                onChange={(e) => setCallbackDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Time
              </label>
              <div className="space-y-2">
                {!isAllDay && (
                  <div className="flex gap-2">
                    <select
                      value={callbackTime.split(':')[0]}
                      onChange={(e) => setCallbackTime(`${e.target.value}:${callbackTime.split(':')[1]}`)}
                      disabled={loading}
                      className="flex-1 px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    >
                      {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                        <option key={hour} value={hour.toString().padStart(2, '0')}>
                          {hour.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <span className="flex items-center text-gray-300 font-semibold">:</span>
                    <select
                      value={callbackTime.split(':')[1]}
                      onChange={(e) => setCallbackTime(`${callbackTime.split(':')[0]}:${e.target.value}`)}
                      disabled={loading}
                      className="flex-1 px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    >
                      {['00', '15', '30', '45'].map(minute => (
                        <option key={minute} value={minute}>
                          {minute}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isAllDay}
                    onChange={(e) => setIsAllDay(e.target.checked)}
                    disabled={loading}
                    className="rounded border-emerald-500/30 bg-white/10 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-300">All Day</span>
                </label>
              </div>
            </div>
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
          <div className="flex gap-3 justify-end pt-4 border-t border-emerald-500/20">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !callbackDate || !explanation.trim()}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Moving...</span>
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>Move to Later Stage</span>
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
