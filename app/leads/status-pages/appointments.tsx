'use client';

import { useEffect, useState } from 'react';
import { useLeadsStore } from '@/lib/store/leads';
import LeadsTable from '@/components/leads/LeadsTable';
import LeadsCards from '@/components/leads/LeadsCards';
import { Loader2, Calendar } from 'lucide-react';

interface AppointmentsContentProps {
  highlightLeadId?: string | null;
}

export default function AppointmentsContent({ highlightLeadId }: AppointmentsContentProps) {
  const { leads, fetchLeads, loading } = useLeadsStore();
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchLeads({ status: ['appointments'] });
    }
  }, [mounted, fetchLeads]);

  const handleUpdate = () => {
    fetchLeads({ status: ['appointments'] });
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
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <Calendar className="w-6 h-6 text-purple-400" />
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
          <span className="text-2xl font-bold text-purple-400">{leads.length}</span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/60 text-lg">No appointments scheduled</p>
          <p className="text-white/40 text-sm mt-2">
            Move leads to Appointments to schedule them
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <LeadsTable
          leads={leads}
          onUpdate={handleUpdate}
          highlightLeadId={highlightLeadId}
        />
      ) : (
        <LeadsCards
          leads={leads}
          onUpdate={handleUpdate}
          highlightLeadId={highlightLeadId}
        />
      )}
    </div>
  );
}
