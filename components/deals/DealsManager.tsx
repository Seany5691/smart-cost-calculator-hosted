'use client';

import { useEffect, useState } from 'react';
import { useDealsStore } from '@/lib/store/deals';
import { useAuthStore } from '@/lib/store/auth-simple';
import DealsFilters from './DealsFilters';
import DealsTable from './DealsTable';
import DealsCards from './DealsCards';
import DealsPagination from './DealsPagination';
import CostingsModal from './CostingsModal';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';

/**
 * DealsManager Component
 * 
 * Main container for deals list management
 * - Fetches deals on mount and when filters change
 * - Detects mobile/desktop and renders appropriate view
 * - Handles deal opening and costings generation
 * - Manages loading and error states
 * 
 * Requirements: AC-3.1 through AC-6.8
 */
export default function DealsManager() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    deals,
    isLoading,
    error,
    fetchDeals,
    openDeal,
    fetchCostings,
    deleteDeal,
    costings,
    isCostingsLoading,
    searchQuery,
    sortBy,
    sortOrder,
    selectedUserId,
    currentPage,
  } = useDealsStore();

  const [isMobile, setIsMobile] = useState(false);
  const [isCostingsModalOpen, setIsCostingsModalOpen] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; username: string }>>([]);

  // Detect mobile/desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch users list for admin filter
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsersList();
    }
  }, [user]);

  // Fetch deals on mount and when filters change
  useEffect(() => {
    fetchDeals().catch((error) => {
      console.error('[DEALS-MANAGER] Error fetching deals:', error);
    });
  }, [searchQuery, sortBy, sortOrder, selectedUserId, currentPage]);

  const fetchUsersList = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('[DEALS-MANAGER] Error fetching users:', error);
    }
  };

  const handleOpenDeal = async (dealId: string) => {
    try {
      await openDeal(dealId);
      router.push('/calculator');
    } catch (error) {
      console.error('[DEALS-MANAGER] Error opening deal:', error);
      // Error is already handled in the store
    }
  };

  const handleGenerateCostings = async (dealId: string) => {
    try {
      await fetchCostings(dealId);
      setIsCostingsModalOpen(true);
    } catch (error) {
      console.error('[DEALS-MANAGER] Error generating costings:', error);
      // Error is already handled in the store
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    try {
      await deleteDeal(dealId);
      // Refresh the deals list after deletion
      await fetchDeals();
    } catch (error) {
      console.error('[DEALS-MANAGER] Error deleting deal:', error);
      // Error is already handled in the store
    }
  };

  const handleCloseCostingsModal = () => {
    setIsCostingsModalOpen(false);
  };

  // Loading state
  if (isLoading && deals.length === 0) {
    return (
      <div className="glass-card p-8 rounded-2xl text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mb-4"></div>
        <p className="text-white">Loading deals...</p>
      </div>
    );
  }

  // Error state
  if (error && deals.length === 0) {
    return (
      <div className="glass-card p-8 rounded-2xl text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Error Loading Deals</h3>
        <p className="text-gray-300 mb-4">{error}</p>
        <button
          onClick={() => fetchDeals()}
          className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all duration-300"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (!isLoading && deals.length === 0) {
    return (
      <div className="glass-card p-12 rounded-2xl text-center">
        <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileText className="w-10 h-10 text-orange-400" />
        </div>
        <h3 className="text-2xl font-semibold text-white mb-2">No Deals Found</h3>
        <p className="text-gray-300 mb-6">
          {searchQuery 
            ? 'No deals match your search criteria. Try adjusting your filters.'
            : 'You haven\'t saved any deals yet. Create a deal in the calculator to see it here.'}
        </p>
        <button
          onClick={() => router.push('/calculator')}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all duration-300 shadow-lg hover:shadow-orange-500/50"
        >
          Go to Calculator
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <DealsFilters
        users={users}
        isAdmin={user?.role === 'admin'}
      />

      {/* Table (Desktop) or Cards (Mobile) */}
      {isMobile ? (
        <DealsCards
          deals={deals}
          onOpenDeal={handleOpenDeal}
          onGenerateCostings={handleGenerateCostings}
          onDeleteDeal={handleDeleteDeal}
          isAdmin={user?.role === 'admin'}
          currentUserId={user?.id || ''}
        />
      ) : (
        <DealsTable
          deals={deals}
          onOpenDeal={handleOpenDeal}
          onGenerateCostings={handleGenerateCostings}
          onDeleteDeal={handleDeleteDeal}
          isAdmin={user?.role === 'admin'}
          currentUserId={user?.id || ''}
        />
      )}

      {/* Pagination */}
      <DealsPagination />

      {/* Costings Modal (Admin Only) */}
      {user?.role === 'admin' && costings && (
        <CostingsModal
          isOpen={isCostingsModalOpen}
          onClose={handleCloseCostingsModal}
          costings={costings}
          isLoading={isCostingsLoading}
        />
      )}
    </div>
  );
}
