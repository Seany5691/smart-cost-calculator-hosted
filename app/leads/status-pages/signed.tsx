'use client';

import LeadsManager from '@/components/leads/LeadsManager';
import AddLeadButton from '@/components/leads/AddLeadButton';

export default function SignedStatusPage({ highlightLeadId }: { highlightLeadId?: string | null }) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Signed</h2>
          <p className="text-gray-300">
            Successfully converted leads that have signed contracts
          </p>
        </div>
        <AddLeadButton defaultStatus="signed" />
      </div>
      <LeadsManager key="signed-status" statusFilter="signed" highlightLeadId={highlightLeadId} />
    </div>
  );
}
