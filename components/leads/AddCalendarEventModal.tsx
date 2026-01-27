'use client';

/**
 * AddCalendarEventModal Component
 * 
 * Modal for creating calendar events (not tied to leads)
 * Supports single-day, all-day, and multi-day events
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar as CalendarIcon, Clock, MapPin, AlertCircle, Loader2, Plus } from 'lucide-react';

interface AddCalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedDate?: Date;
}

export default function AddCalendarEventModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedDate
}: AddCalendarEventModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    end_date: '',
    event_time: '09:00',
    end_time: '10:00',
    is_all_day: false,
    is_multi_day: false,
    event_type: 'event' as 'event' | 'appointment' | 'meeting' | 'deadline' | 'reminder' | 'other',
    priority: 'medium' as 'low' | 'medium' | 'high',
    location: ''
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Reset form
      const dateStr = preselectedDate 
        ? preselectedDate.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      setFormData({
        title: '',
        description: '',
        event_date: dateStr,
        end_date: dateStr,
        event_time: '09:00',
        end_time: '10:00',
        is_all_day: false,
        is_multi_day: false,
        event_type: 'event',
        priority: 'medium',
        location: ''
      });
      setError('');
    }
  }, [isOpen, preselectedDate]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // If toggling multi-day off, reset end_date to match event_date
      if (field === 'is_multi_day' && !value) {
        updated.end_date = updated.event_date;
      }
      
      // If changing event_date and not multi-day, update end_date too
      if (field === 'event_date' && !updated.is_multi_day) {
        updated.end_date = value;
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      setError('Please enter an event title');
      return;
    }

    if (!formData.event_date) {
      setError('Please select a start date');
      return;
    }

    if (formData.is_multi_day && !formData.end_date) {
      setError('Please select an end date for multi-day event');
      return;
    }

    if (formData.is_multi_day && formData.end_date < formData.event_date) {
      setError('End date must be after start date');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('auth-storage');
      let authToken = null;
      if (token) {
        const data = JSON.parse(token);
        authToken = data.state?.token || data.token;
      }

      if (!authToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          event_date: formData.event_date,
          end_date: formData.is_multi_day ? formData.end_date : formData.event_date,
          event_time: formData.is_all_day ? null : formData.event_time,
          end_time: formData.is_all_day ? null : formData.end_time,
          is_all_day: formData.is_all_day,
          is_multi_day: formData.is_multi_day,
          event_type: formData.event_type,
          priority: formData.priority,
          location: formData.location.trim() || null
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create event');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error creating event:', err);
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  if (!mounted) return null;

  const eventTypeIcons = {
    event: '📅',
    appointment: '🗓️',
    meeting: '🤝',
    deadline: '⏰',
    reminder: '🔔',
    other: '📌'
  };

  const eventTypeLabels = {
    event: 'Event',
    appointment: 'Appointment',
    meeting: 'Meeting',
    deadline: 'Deadline',
    reminder: 'Reminder',
    other: 'Other'
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-emerald-500/30">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Plus className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Add Calendar Event</h2>
              <p className="text-sm text-emerald-200">Create a new event on your calendar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-emerald-200" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-white font-medium mb-2">
              Event Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g., Conference Meeting, Doctor Appointment"
              disabled={loading}
              className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-white font-medium mb-2">
              Event Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(eventTypeIcons) as Array<keyof typeof eventTypeIcons>).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleChange('event_type', type)}
                  disabled={loading}
                  className={`p-3 rounded-lg border transition-all ${
                    formData.event_type === type
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : 'bg-white/5 border-emerald-500/20 text-white/60 hover:bg-white/10 hover:border-emerald-500/30'
                  }`}
                >
                  <div className="text-2xl mb-1">{eventTypeIcons[type]}</div>
                  <div className="text-xs">{eventTypeLabels[type]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-white font-medium mb-2">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['high', 'medium', 'low'] as const).map(priority => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => handleChange('priority', priority)}
                  disabled={loading}
                  className={`p-3 rounded-lg border transition-all ${
                    formData.priority === priority
                      ? priority === 'high' ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                        priority === 'medium' ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' :
                        'bg-green-500/20 border-green-500/50 text-green-400'
                      : 'bg-white/5 border-emerald-500/20 text-white/60 hover:bg-white/10 hover:border-emerald-500/30'
                  }`}
                >
                  <div className="text-sm font-medium capitalize">{priority}</div>
                </button>
              ))}
            </div>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="all-day"
              checked={formData.is_all_day}
              onChange={(e) => handleChange('is_all_day', e.target.checked)}
              disabled={loading}
              className="w-5 h-5 rounded border-emerald-500/30 bg-white/5 text-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <label htmlFor="all-day" className="text-sm text-white cursor-pointer">
              All-day event
            </label>
          </div>

          {/* Multi-Day Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="multi-day"
              checked={formData.is_multi_day}
              onChange={(e) => handleChange('is_multi_day', e.target.checked)}
              disabled={loading}
              className="w-5 h-5 rounded border-emerald-500/30 bg-white/5 text-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <label htmlFor="multi-day" className="text-sm text-white cursor-pointer">
              Multi-day event
            </label>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-medium mb-2">
                {formData.is_multi_day ? 'Start Date' : 'Date'} <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 pointer-events-none" />
                <input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => handleChange('event_date', e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 [color-scheme:dark]"
                />
              </div>
            </div>

            {formData.is_multi_day && (
              <div>
                <label className="block text-white font-medium mb-2">
                  End Date <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 pointer-events-none" />
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                    min={formData.event_date}
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 [color-scheme:dark]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Time Range (only if not all-day) */}
          {!formData.is_all_day && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white font-medium mb-2">
                  Start Time
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 pointer-events-none z-10" />
                  <select
                    value={formData.event_time}
                    onChange={(e) => handleChange('event_time', e.target.value)}
                    disabled={loading}
                    className="w-full pl-10 pr-10 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2310b981'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.5rem center',
                      backgroundSize: '1.5em 1.5em'
                    }}
                  >
                    {Array.from({ length: 96 }, (_, i) => {
                      const hours = Math.floor(i / 4);
                      const minutes = (i % 4) * 15;
                      const time24 = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                      const isPM = hours >= 12;
                      const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
                      const time12 = `${hours12}:${minutes.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
                      return (
                        <option key={time24} value={time24}>
                          {time12}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  End Time
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 pointer-events-none z-10" />
                  <select
                    value={formData.end_time}
                    onChange={(e) => handleChange('end_time', e.target.value)}
                    disabled={loading}
                    className="w-full pl-10 pr-10 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2310b981'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.5rem center',
                      backgroundSize: '1.5em 1.5em'
                    }}
                  >
                    {Array.from({ length: 96 }, (_, i) => {
                      const hours = Math.floor(i / 4);
                      const minutes = (i % 4) * 15;
                      const time24 = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                      const isPM = hours >= 12;
                      const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
                      const time12 = `${hours12}:${minutes.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
                      return (
                        <option key={time24} value={time24}>
                          {time12}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="block text-white font-medium mb-2">
              Location (Optional)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 pointer-events-none" />
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="e.g., Conference Room A, Zoom"
                disabled={loading}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-white font-medium mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              placeholder="Add any additional details about this event..."
              disabled={loading}
              className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end pt-4 border-t border-emerald-500/20">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title.trim() || !formData.event_date}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Event</span>
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
