'use client';

import { useState, useEffect } from 'react';
import { useDealsStore } from '@/lib/store/deals';
import { Search, SortAsc, SortDesc, X, Filter } from 'lucide-react';

interface DealsFiltersProps {
  users: Array<{ id: string; username: string }>;
  isAdmin: boolean;
}

/**
 * DealsFilters Component
 * 
 * Provides search, sort, and filter controls for deals list
 * - Search input with debounce (300ms)
 * - Sort by dropdown (created_at, customer_name, total_payout, total_mrc)
 * - Sort order toggle (asc/desc)
 * - User filter dropdown (admin only)
 * - Clear filters button
 * 
 * Requirements: AC-3.2, AC-3.4, AC-3.5
 */
export default function DealsFilters({ users, isAdmin }: DealsFiltersProps) {
  const {
    searchQuery,
    sortBy,
    sortOrder,
    selectedUserId,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    setSelectedUserId,
    clearFilters,
  } = useDealsStore();

  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  const handleClearFilters = () => {
    setLocalSearch('');
    clearFilters();
  };

  const hasActiveFilters = searchQuery || sortBy !== 'created_at' || sortOrder !== 'desc' || selectedUserId;

  return (
    <div className="glass-card p-6 rounded-2xl space-y-4">
      {/* Search and Clear Filters Row */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search by customer, deal name, or created by..."
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300"
          />
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all duration-300 flex items-center gap-2 whitespace-nowrap"
          >
            <X className="w-5 h-5" />
            <span className="hidden md:inline">Clear Filters</span>
          </button>
        )}
      </div>

      {/* Sort and Filter Controls Row */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Sort By Dropdown */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 appearance-none cursor-pointer"
          >
            <option value="created_at" className="bg-slate-800">Date Created</option>
            <option value="customer_name" className="bg-slate-800">Customer Name</option>
            <option value="total_payout" className="bg-slate-800">Total Payout</option>
            <option value="total_mrc" className="bg-slate-800">Monthly MRC</option>
          </select>
        </div>

        {/* Sort Order Toggle */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Sort Order
          </label>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2"
          >
            {sortOrder === 'asc' ? (
              <>
                <SortAsc className="w-5 h-5" />
                <span>Ascending</span>
              </>
            ) : (
              <>
                <SortDesc className="w-5 h-5" />
                <span>Descending</span>
              </>
            )}
          </button>
        </div>

        {/* User Filter (Admin Only) */}
        {isAdmin && (
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Filter by User
            </label>
            <select
              value={selectedUserId || ''}
              onChange={(e) => setSelectedUserId(e.target.value || null)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 appearance-none cursor-pointer"
            >
              <option value="" className="bg-slate-800">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id} className="bg-slate-800">
                  {user.username}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
