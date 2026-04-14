'use client';

import { useEffect, useState, useMemo } from 'react';
import { useLeadsStore } from '@/lib/store/leads';
import LeadsTable from '@/components/leads/LeadsTable';
import LeadsCards from '@/components/leads/LeadsCards';
import { Loader2, Calendar, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { extractCoordinatesFromMapsUrl, generateRouteUrl, calculateStopCount } from '@/lib/routes';
import type { Lead } from '@/lib/leads/types';

interface AppointmentsContentProps {
  highlightLeadId?: string | null;
}

interface LeadReminder {
  id: string;
  lead_id: string;
  reminder_date: string;
  reminder_time: string | null;
  completed: boolean;
  status: string;
  message?: string;
  title?: string;
}

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

// Helper to get next reminder for a lead
function getNextReminderForLead(leadId: string, reminders: LeadReminder[]): LeadReminder | null {
  const now = new Date();
  
  // Filter to this lead's uncompleted future reminders
  const upcomingReminders = reminders
    .filter(r => r.lead_id === leadId)
    .filter(r => !r.completed && r.status !== 'completed')
    .filter(r => {
      const reminderDateTime = new Date(`${r.reminder_date}T${r.reminder_time || '00:00:00'}`);
      return reminderDateTime >= now;
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.reminder_date}T${a.reminder_time || '00:00:00'}`);
      const dateB = new Date(`${b.reminder_date}T${b.reminder_time || '00:00:00'}`);
      return dateA.getTime() - dateB.getTime();
    });
  
  return upcomingReminders[0] || null;
}

// Helper to format reminder date/time
function formatReminderDateTime(date: string, time: string | null): string {
  const d = new Date(`${date}T${time || '00:00:00'}`);
  
  // Format date as DD/MM/YYYY
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  
  // Format time as HH:MM am/pm
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  
  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
}

export default function AppointmentsContent({ highlightLeadId }: AppointmentsContentProps) {
  const { leads, fetchLeads, loading } = useLeadsStore();
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [mounted, setMounted] = useState(false);
  
  // Route generation state
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]); // Ordered array of lead IDs
  const [startingPoint, setStartingPoint] = useState<string>('');
  const [routeLoading, setRouteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Reminders state
  const [allReminders, setAllReminders] = useState<LeadReminder[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchLeads({ status: ['appointments'] });
    }
  }, [mounted, fetchLeads]);
  
  // Fetch reminders for all leads
  useEffect(() => {
    if (mounted && leads.length > 0) {
      fetchAllReminders();
    }
  }, [mounted, leads]);

  const fetchAllReminders = async () => {
    setRemindersLoading(true);
    try {
      const token = getAuthToken();
      if (!token) return;
      
      const headers: HeadersInit = { 'Authorization': `Bearer ${token}` };
      
      // Fetch reminders for all leads in parallel
      const reminderPromises = leads.map(lead =>
        fetch(`/api/reminders?includeCompleted=false&limit=1000`, { headers })
          .then(res => res.ok ? res.json() : { reminders: [] })
          .then(data => data.reminders || [])
          .catch(() => [])
      );
      
      const results = await Promise.all(reminderPromises);
      const allFetchedReminders = results.flat();
      
      setAllReminders(allFetchedReminders);
    } catch (err) {
      console.error('Error fetching reminders:', err);
    } finally {
      setRemindersLoading(false);
    }
  };

  const handleUpdate = () => {
    fetchLeads({ status: ['appointments'] });
    fetchAllReminders();
  };
  
  // Sort leads by next reminder date/time
  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      const reminderA = getNextReminderForLead(a.id, allReminders);
      const reminderB = getNextReminderForLead(b.id, allReminders);
      
      // Leads without reminders go to bottom
      if (!reminderA && !reminderB) return 0;
      if (!reminderA) return 1;
      if (!reminderB) return -1;
      
      // Compare reminder dates/times
      const dateA = new Date(`${reminderA.reminder_date}T${reminderA.reminder_time || '00:00:00'}`);
      const dateB = new Date(`${reminderB.reminder_date}T${reminderB.reminder_time || '00:00:00'}`);
      
      return dateA.getTime() - dateB.getTime();
    });
  }, [leads, allReminders]);
  
  // Get next reminder info for each lead
  const leadReminders = useMemo(() => {
    const map: Record<string, { date: string; time: string | null } | null> = {};
    sortedLeads.forEach(lead => {
      const reminder = getNextReminderForLead(lead.id, allReminders);
      if (reminder) {
        map[lead.id] = {
          date: reminder.reminder_date,
          time: reminder.reminder_time
        };
      } else {
        map[lead.id] = null;
      }
    });
    return map;
  }, [sortedLeads, allReminders]);
  
  // Handle lead selection (maintains order)
  const handleToggleSelect = (leadId: string) => {
    setSelectedLeads(prev => {
      if (prev.includes(leadId)) {
        return prev.filter(id => id !== leadId);
      } else {
        return [...prev, leadId];
      }
    });
  };
  
  // Get selection order number for a lead
  const getSelectionOrder = (leadId: string): number | null => {
    const index = selectedLeads.indexOf(leadId);
    return index >= 0 ? index + 1 : null;
  };
  
  // Handle route generation
  const handleGenerateRoute = async () => {
    try {
      setError(null);
      setSuccessMessage(null);
      setRouteLoading(true);

      if (selectedLeads.length === 0) {
        setError('Please select at least one lead to generate a route');
        return;
      }

      if (selectedLeads.length > 25) {
        setError('Google Maps supports a maximum of 25 waypoints. Please select fewer leads.');
        return;
      }

      // Get leads in selection order
      const orderedLeads = selectedLeads
        .map(id => sortedLeads.find(l => l.id === id))
        .filter(Boolean) as Lead[];

      const leadsWithoutCoords = orderedLeads.filter(lead => !lead.maps_address);
      if (leadsWithoutCoords.length > 0) {
        const leadNames = leadsWithoutCoords.map(l => l.name).join(', ');
        setError(`The following leads are missing Google Maps addresses: ${leadNames}. Please update them before generating a route.`);
        return;
      }

      // Extract coordinates from all leads
      const waypointsWithLeads = orderedLeads.map(lead => ({
        lead,
        coords: extractCoordinatesFromMapsUrl(lead.maps_address || '')
      }));

      const failedLeads = waypointsWithLeads.filter(item => item.coords === null);
      
      if (failedLeads.length > 0) {
        const failedNames = failedLeads.map(item => item.lead.name).join(', ');
        setError(`The following leads have invalid Google Maps URLs: ${failedNames}. Please check the addresses and try again.`);
        return;
      }

      const waypoints = waypointsWithLeads.map(item => item.coords!);

      // Generate route URL
      const routeUrl = generateRouteUrl(waypoints, startingPoint || undefined);
      const stopCount = calculateStopCount(waypoints, startingPoint || undefined);

      // Create route in database
      const token = getAuthToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const requestBody = {
        name: `Appointments Route ${new Date().toLocaleDateString()}`,
        routeUrl,
        stopCount,
        startingPoint: startingPoint || null,
        leadIds: selectedLeads // Use ordered selection
      };
      
      const routeResponse = await fetch('/api/leads/routes', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!routeResponse.ok) {
        const errorData = await routeResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.details || errorData.error || 'Failed to create route');
      }

      const route = await routeResponse.json();

      // Clear selections
      setSelectedLeads([]);
      setStartingPoint('');

      // Refresh leads
      await handleUpdate();

      setSuccessMessage(
        `Route "${route.route.name}" generated successfully with ${stopCount} stops! All leads moved to "Leads" tab.`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Route generation error:', err);
      setError(err.message || 'Failed to generate route');
    } finally {
      setRouteLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-pink-500/20 rounded-xl">
            <Calendar className="w-6 h-6 text-pink-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Appointments</h2>
            <p className="text-sm text-emerald-200">
              Scheduled appointments with reminders
            </p>
          </div>
        </div>
        
        {/* View Toggle */}
        <div className="flex gap-2 bg-white/10 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded-md transition-colors ${
              viewMode === 'table'
                ? 'bg-emerald-500 text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`px-4 py-2 rounded-md transition-colors ${
              viewMode === 'cards'
                ? 'bg-emerald-500 text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Cards
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-white/80">Total Appointments:</span>
          <span className="text-2xl font-bold text-pink-400">{sortedLeads.length}</span>
        </div>
        {selectedLeads.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/10">
            <span className="text-white/80">Selected for Route:</span>
            <span className="text-xl font-bold text-blue-400 ml-2">{selectedLeads.length}</span>
          </div>
        )}
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="glass-card p-4 border-l-4 border-green-500 bg-green-50/10">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
            <p className="text-sm text-green-200">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="glass-card p-4 border-l-4 border-red-500 bg-red-50/10">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-400 mr-3 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-200">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Route Generation Section */}
      <div className="glass-card p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-400" />
          Generate Route
        </h3>
        
        {/* Starting Point */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-white mb-2">
            Starting Point (Optional)
          </label>
          <input
            type="text"
            value={startingPoint}
            onChange={(e) => setStartingPoint(e.target.value)}
            placeholder="Paste Google Maps URL or enter address..."
            className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <p className="text-xs text-gray-400 mt-2">
            Example: https://maps.google.com/?q=123+Main+St or "123 Main Street, City"
          </p>
        </div>
        
        {/* Generate Button */}
        <button
          onClick={handleGenerateRoute}
          disabled={selectedLeads.length === 0 || routeLoading}
          className={`w-full px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
            selectedLeads.length === 0 || routeLoading
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:shadow-lg'
          }`}
        >
          {routeLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating Route...
            </>
          ) : (
            <>
              <MapPin className="w-5 h-5" />
              Generate Route ({selectedLeads.length} {selectedLeads.length === 1 ? 'stop' : 'stops'})
            </>
          )}
        </button>
        
        {selectedLeads.length > 0 && (
          <p className="text-xs text-emerald-300 mt-2 text-center">
            Route will be generated in the order you selected the leads
          </p>
        )}
      </div>

      {/* Content */}
      {loading || remindersLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      ) : sortedLeads.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/60 text-lg">No appointments scheduled</p>
          <p className="text-white/40 text-sm mt-2">
            Move leads to Appointments to schedule them
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <LeadsTable
          leads={sortedLeads}
          onUpdate={handleUpdate}
          highlightLeadId={highlightLeadId}
          showDateInfo={true}
          leadReminders={leadReminders}
          // Route selection props
          isAppointmentsTab={true}
          selectedLeads={selectedLeads}
          onToggleSelect={handleToggleSelect}
          getSelectionOrder={getSelectionOrder}
        />
      ) : (
        <LeadsCards
          leads={sortedLeads}
          onUpdate={handleUpdate}
          highlightLeadId={highlightLeadId}
          showDateInfo={true}
          leadReminders={leadReminders}
          // Route selection props
          isAppointmentsTab={true}
          selectedLeads={selectedLeads}
          onToggleSelect={handleToggleSelect}
          getSelectionOrder={getSelectionOrder}
        />
      )}
    </div>
  );
}
