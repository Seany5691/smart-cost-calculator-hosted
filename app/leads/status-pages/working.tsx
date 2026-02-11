'use client';

import LeadsManager from '@/components/leads/LeadsManager';
import AddLeadButton from '@/components/leads/AddLeadButton';

export default function WorkingStatusPage({ highlightLeadId }: { highlightLeadId?: string | null }) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Working On</h2>
          <p className="text-gray-300">
            Leads currently being actively worked on
          </p>
        </div>
        <AddLeadButton defaultStatus="working" />
      </div>
      <LeadsManager key="working-status" statusFilter="working" highlightLeadId={highlightLeadId} />
    </div>
  );
}
