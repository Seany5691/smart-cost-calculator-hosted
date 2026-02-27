'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { setupCalculatorKeyboardShortcuts, useCalculatorStore } from '@/lib/store/calculator';
import { useAuthStore } from '@/lib/store/auth-simple';
import CalculatorWizard from '@/components/calculator/CalculatorWizard';
import ExistingDataModal from '@/components/calculator/ExistingDataModal';
import { Loader2 } from 'lucide-react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

function CalculatorContent() {
  console.log('[CALCULATOR PAGE] Rendering calculator page');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setDealDetails, dealDetails, resetCalculator } = useCalculatorStore();
  const { isAuthenticated } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const [showExistingDataModal, setShowExistingDataModal] = useState(false);
  const [hasCheckedExistingData, setHasCheckedExistingData] = useState(false);

  // Wait for auth hydration (handled by AuthProvider)
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Redirect to login if not authenticated or unauthorized role
  useEffect(() => {
    if (isHydrated) {
      const { user } = useAuthStore.getState();
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user && !['admin', 'manager', 'user'].includes(user.role)) {
        // Telesales cannot access calculator
        router.push('/');
      }
    }
  }, [isHydrated, isAuthenticated, router]);

  // Check for existing data and show prompt (except when coming from leads proposal button)
  useEffect(() => {
    if (!isHydrated || hasCheckedExistingData) return;

    const customerNameParam = searchParams.get('customerName');
    const proposalLeadId = typeof window !== 'undefined' ? localStorage.getItem('proposal-lead-id') : null;
    
    // If coming from leads proposal button, skip the prompt (data already cleared)
    if (proposalLeadId) {
      console.log('[CALCULATOR PAGE] Coming from leads proposal button, skipping existing data check');
      setHasCheckedExistingData(true);
      return;
    }

    // Check if there's existing data in the calculator
    const hasExistingData = dealDetails.customerName && dealDetails.customerName.trim() !== '';
    
    // Only show modal if there's existing data AND we're not pre-filling from URL
    if (hasExistingData && !customerNameParam) {
      console.log('[CALCULATOR PAGE] Found existing data, showing prompt');
      setShowExistingDataModal(true);
    }
    
    setHasCheckedExistingData(true);
  }, [isHydrated, hasCheckedExistingData, dealDetails.customerName, searchParams]);

  // Pre-fill customer name and deal name from URL parameters
  useEffect(() => {
    const customerName = searchParams.get('customerName');
    const dealName = searchParams.get('dealName');
    
    if (customerName || dealName) {
      console.log('[CALCULATOR PAGE] Pre-filling deal details:', { customerName, dealName });
      setDealDetails({
        customerName: customerName || '',
        dealName: dealName || customerName || '',
      });
    }
  }, [searchParams, setDealDetails]);

  // Setup keyboard shortcuts
  useEffect(() => {
    console.log('[CALCULATOR PAGE] Setting up keyboard shortcuts');
    const cleanup = setupCalculatorKeyboardShortcuts();
    return () => {
      console.log('[CALCULATOR PAGE] Cleaning up keyboard shortcuts');
      if (cleanup) cleanup();
    };
  }, []);

  const handleContinuePrevious = () => {
    setShowExistingDataModal(false);
  };

  const handleStartNew = () => {
    resetCalculator();
    localStorage.removeItem('calculator-storage');
    setShowExistingDataModal(false);
  };

  console.log('[CALCULATOR PAGE] About to render CalculatorWizard');

  // Show loading while checking authentication
  if (!isHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-4" />
          <div className="text-white text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <CalculatorWizard />
      </div>
      
      {/* Existing Data Modal */}
      <ExistingDataModal
        isOpen={showExistingDataModal}
        onContinue={handleContinuePrevious}
        onStartNew={handleStartNew}
      />
    </div>
  );
}

export default function CalculatorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-4" />
          <div className="text-white text-xl">Loading...</div>
        </div>
      </div>
    }>
      <CalculatorContent />
    </Suspense>
  );
}
