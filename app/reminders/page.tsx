'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-simple';
import RemindersSection from '@/components/leads/RemindersSection';

export default function RemindersPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Reminders</h1>
          <p className="text-gray-600">
            Manage all your reminders across all leads
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <RemindersSection showLeadInfo={true} />
        </div>
      </div>
    </div>
  );
}
