'use client';

import { useState } from 'react';
import { useLeadsStore } from '@/lib/store/leads';
import type { LeadStatus } from '@/lib/leads/types';
import { Search, Filter, X } from 'lucide-react';

export default function LeadsFilters() {
  const { filters, setFilters, clearFilters } = useLeadsStore();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ search: searchInput });
  };

  const handleStatusToggle = (status: string) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status as LeadStatus)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status as LeadStatus];
    
    setFilters({ status: newStatuses.length > 0 ? newStatuses : undefined });
  };

  const handleProviderToggle = (provider: string) => {
    const currentProviders = filters.provider || [];
    const newProviders = currentProviders.includes(provider)
      ? currentProviders.filter(p => p !== provider)
      : [...currentProviders, provider];
    
    setFilters({ provider: newProviders.length > 0 ? newProviders : undefined });
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="glass-card p-4 space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search leads by name, phone, address, town..."
            className="w-full h-12 pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-base placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 min-h-[44px] bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="px-4 py-2 min-h-[44px] bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              clearFilters();
              setSearchInput('');
            }}
            className="px-4 py-2 min-h-[44px] bg-white/10 border border-white/20 text-red-400 rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </form>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="space-y-4 pt-4 border-t border-white/20">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {['new', 'leads', 'working', 'bad', 'later', 'signed'].map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusToggle(status)}
                  className={`px-3 py-2 min-h-[44px] rounded-full text-sm font-medium transition-colors ${
                    filters.status?.includes(status as LeadStatus)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Provider Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Provider
            </label>
            <div className="flex flex-wrap gap-2">
              {['Telkom', 'Vodacom', 'MTN', 'Cell C', 'Other'].map((provider) => (
                <button
                  key={provider}
                  onClick={() => handleProviderToggle(provider)}
                  className={`px-3 py-2 min-h-[44px] rounded-full text-sm font-medium transition-colors ${
                    filters.provider?.includes(provider)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {provider}
                </button>
              ))}
            </div>
          </div>

          {/* Date Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Created From
              </label>
              <input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => setFilters({ date_from: e.target.value || undefined })}
                className="w-full h-12 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-base focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Created To
              </label>
              <input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => setFilters({ date_to: e.target.value || undefined })}
                className="w-full h-12 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-base focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Callback Date Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Callback From
              </label>
              <input
                type="date"
                value={filters.callback_date_from || ''}
                onChange={(e) => setFilters({ callback_date_from: e.target.value || undefined })}
                className="w-full h-12 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-base focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Callback To
              </label>
              <input
                type="date"
                value={filters.callback_date_to || ''}
                onChange={(e) => setFilters({ callback_date_to: e.target.value || undefined })}
                className="w-full h-12 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-base focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* List Name Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              List Name
            </label>
            <input
              type="text"
              value={filters.list_name || ''}
              onChange={(e) => setFilters({ list_name: e.target.value || undefined })}
              placeholder="Filter by list name"
              className="w-full h-12 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-base placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
      )}
    </div>
  );
}
