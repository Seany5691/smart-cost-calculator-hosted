'use client';

import LeadsManager from '@/components/leads/LeadsManager';
import AddLeadButton from '@/components/leads/AddLeadButton';

export default function LaterStatusPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Later Stage</h2>
          <p className="text-gray-300">
            Leads scheduled for future follow-up with callback dates
          </p>
        </div>
        <AddLeadButton defaultStatus="later" />
      </div>
      <LeadsManager key="later-status" statusFilter="later" />
    </div>
  );
}
