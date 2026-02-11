'use client';

import LeadsManager from '@/components/leads/LeadsManager';
import AddLeadButton from '@/components/leads/AddLeadButton';

export default function BadLeadsStatusPage({ highlightLeadId }: { highlightLeadId?: string | null }) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Bad Leads</h2>
          <p className="text-gray-300">
            Leads that are not viable or not interested
          </p>
        </div>
        <AddLeadButton defaultStatus="bad" />
      </div>
      <LeadsManager key="bad-status" statusFilter="bad" highlightLeadId={highlightLeadId} />
    </div>
  );
}
