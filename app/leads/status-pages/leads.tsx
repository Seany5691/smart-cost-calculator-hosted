'use client';

import LeadsManager from '@/components/leads/LeadsManager';
import AddLeadButton from '@/components/leads/AddLeadButton';

export default function LeadsStatusPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Leads</h2>
          <p className="text-gray-300">
            Active leads in your pipeline ready for follow-up
          </p>
        </div>
        <AddLeadButton defaultStatus="leads" />
      </div>
      <LeadsManager statusFilter="leads" />
    </div>
  );
}
