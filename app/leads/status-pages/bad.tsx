'use client';

import LeadsManager from '@/components/leads/LeadsManager';
import AddLeadButton from '@/components/leads/AddLeadButton';

export default function BadLeadsStatusPage() {
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
      <LeadsManager statusFilter="bad" />
    </div>
  );
}
