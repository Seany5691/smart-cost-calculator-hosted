'use client';

import LeadsManager from '@/components/leads/LeadsManager';
import AddLeadButton from '@/components/leads/AddLeadButton';

export default function ProposalStatusPage({ highlightLeadId }: { highlightLeadId?: string | null }) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Proposal</h2>
          <p className="text-gray-300">
            Leads that require proposal creation
          </p>
        </div>
        <AddLeadButton defaultStatus="proposal" />
      </div>
      <LeadsManager key="proposal-status" statusFilter="proposal" showDateInfo={true} highlightLeadId={highlightLeadId} />
    </div>
  );
}
