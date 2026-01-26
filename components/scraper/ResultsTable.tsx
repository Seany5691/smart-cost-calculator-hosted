'use client';

import React, { useState, useMemo } from 'react';
import { Table, Search, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import { Business } from '@/lib/store/scraper';
import ScrollableTable from '@/components/ui/ScrollableTable';

interface ResultsTableProps {
  businesses: Business[];
}

type SortField = 'name' | 'phone' | 'provider' | 'industry' | 'town' | 'address';
type SortDirection = 'asc' | 'desc';

const ResultsTable = React.memo(({ businesses }: ResultsTableProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Filter businesses based on search query
  const filteredBusinesses = useMemo(() => {
    if (!searchQuery.trim()) return businesses;

    const query = searchQuery.toLowerCase();
    return businesses.filter(
      (business) =>
        business.name.toLowerCase().includes(query) ||
        business.phone.toLowerCase().includes(query) ||
        business.provider.toLowerCase().includes(query) ||
        business.industry.toLowerCase().includes(query) ||
        business.town.toLowerCase().includes(query) ||
        (business.address && business.address.toLowerCase().includes(query))
    );
  }, [businesses, searchQuery]);

  // Sort filtered businesses
  const sortedBusinesses = useMemo(() => {
    const sorted = [...filteredBusinesses];
    sorted.sort((a, b) => {
      let aValue = a[sortField] || '';
      let bValue = b[sortField] || '';

      // Handle undefined/null values
      if (!aValue) aValue = '';
      if (!bValue) bValue = '';

      // Convert to lowercase for case-insensitive sorting
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredBusinesses, sortField, sortDirection]);

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with ascending direction
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 inline ml-1" />
    );
  };

  if (businesses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg shadow-lg">
            <Table className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Results Table</h3>
            <p className="text-sm text-gray-400">
              {sortedBusinesses.length} of {businesses.length} businesses
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, phone, provider, industry, town, or address..."
          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Desktop Table View with Horizontal Scroll */}
      <ScrollableTable minWidth="800px">
        <div className="hidden md:block bg-white/5 rounded-lg border border-white/10 overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-white/10 sticky top-0">
                <tr>
                  <th
                    onClick={() => handleSort('name')}
                    className="px-4 py-3 text-left font-semibold text-gray-300 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    Business Name {renderSortIcon('name')}
                  </th>
                  <th
                    onClick={() => handleSort('phone')}
                    className="px-4 py-3 text-left font-semibold text-gray-300 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    Phone {renderSortIcon('phone')}
                  </th>
                  <th
                    onClick={() => handleSort('provider')}
                    className="px-4 py-3 text-left font-semibold text-gray-300 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    Provider {renderSortIcon('provider')}
                  </th>
                  <th
                    onClick={() => handleSort('industry')}
                    className="px-4 py-3 text-left font-semibold text-gray-300 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    Industry {renderSortIcon('industry')}
                  </th>
                  <th
                    onClick={() => handleSort('town')}
                    className="px-4 py-3 text-left font-semibold text-gray-300 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    Town {renderSortIcon('town')}
                  </th>
                  <th
                    onClick={() => handleSort('address')}
                    className="px-4 py-3 text-left font-semibold text-gray-300 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    Address {renderSortIcon('address')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-300">Map Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {sortedBusinesses.map((business, index) => (
                  <tr
                    key={`${business.phone}-${index}`}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-white">{business.name}</td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                      {business.phone || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap
                        ${
                          business.provider === 'Unknown'
                            ? 'bg-gray-500/20 text-gray-300'
                            : 'bg-gradient-to-r from-teal-500/30 to-cyan-500/30 text-teal-300 border border-teal-500/30'
                        }
                      `}
                      >
                        {business.provider || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{business.industry}</td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{business.town}</td>
                    <td className="px-4 py-3 text-gray-400 max-w-xs truncate">
                      {business.address || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      {business.website ? (
                        <a
                          href={business.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-400 hover:text-teal-300 inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ScrollableTable>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 max-h-96 overflow-y-auto">
        {sortedBusinesses.map((business, index) => (
          <div
            key={`${business.phone}-${index}`}
            className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300"
          >
            {/* Business Name */}
            <div className="font-bold text-white text-base mb-3">{business.name}</div>

            {/* Business Details Grid */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between py-1.5 border-b border-white/10">
                <span className="text-gray-400 font-medium">Phone:</span>
                <span className="text-white font-semibold">{business.phone || 'N/A'}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-white/10">
                <span className="text-gray-400 font-medium">Provider:</span>
                <span
                  className={`
                  inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${
                    business.provider === 'Unknown'
                      ? 'bg-gray-500/20 text-gray-300'
                      : 'bg-gradient-to-r from-teal-500/30 to-cyan-500/30 text-teal-300 border border-teal-500/30'
                  }
                `}
                >
                  {business.provider || 'Unknown'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-white/10">
                <span className="text-gray-400 font-medium">Industry:</span>
                <span className="text-white text-right">{business.industry}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-white/10">
                <span className="text-gray-400 font-medium">Town:</span>
                <span className="text-white">{business.town}</span>
              </div>

              {business.address && business.address !== 'N/A' && (
                <div className="pt-1.5 border-b border-white/10 pb-1.5">
                  <span className="text-gray-400 font-medium block mb-1">Address:</span>
                  <span className="text-gray-300 text-xs leading-relaxed block">
                    {business.address}
                  </span>
                </div>
              )}

              {business.website && (
                <div className="pt-1.5">
                  <a
                    href={business.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-400 hover:text-teal-300 inline-flex items-center gap-1 text-xs"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View on Google Maps
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

ResultsTable.displayName = 'ResultsTable';

export default ResultsTable;
