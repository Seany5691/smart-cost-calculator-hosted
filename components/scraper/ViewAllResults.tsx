'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Table, ExternalLink } from 'lucide-react';
import { Business } from '@/lib/store/scraper';

interface ViewAllResultsProps {
  businesses: Business[];
}

const ViewAllResults = React.memo(({ businesses }: ViewAllResultsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

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
            <h3 className="text-xl font-bold text-white">
              View All Results
            </h3>
            <p className="text-sm text-gray-400">
              {businesses.length} businesses scraped
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="btn btn-secondary flex items-center gap-2"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Hide
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show
            </>
          )}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white/5 rounded-lg border border-white/10 overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/10 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-300">Business Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-300">Phone</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-300">Provider</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-300">Industry</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-300">Town</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-300">Address</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-300">Maps URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {businesses.map((business, index) => (
                    <tr
                      key={`${business.phone}-${index}`}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-white">
                        {business.name}
                      </td>
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                        {business.phone || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`
                          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap
                          ${business.provider === 'Unknown'
                            ? 'bg-gray-500/20 text-gray-300'
                            : 'bg-gradient-to-r from-teal-500/30 to-cyan-500/30 text-teal-300 border border-teal-500/30'
                          }
                        `}>
                          {business.provider || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {business.industry}
                      </td>
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                        {business.town}
                      </td>
                      <td className="px-4 py-3 text-gray-400 max-w-xs truncate">
                        {business.address || 'N/A'}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {business.website ? (
                          <a
                            href={business.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline flex items-center gap-1 truncate"
                          >
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">View on Maps</span>
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

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 max-h-96 overflow-y-auto">
            {businesses.map((business, index) => (
              <div
                key={`${business.phone}-${index}`}
                className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300"
              >
                {/* Business Name */}
                <div className="font-bold text-white text-base mb-3">
                  {business.name}
                </div>

                {/* Business Details Grid */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between py-1.5 border-b border-white/10">
                    <span className="text-gray-400 font-medium">Phone:</span>
                    <span className="text-white font-semibold">{business.phone || 'N/A'}</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-white/10">
                    <span className="text-gray-400 font-medium">Provider:</span>
                    <span className={`
                      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${business.provider === 'Unknown'
                        ? 'bg-gray-500/20 text-gray-300'
                        : 'bg-gradient-to-r from-teal-500/30 to-cyan-500/30 text-teal-300 border border-teal-500/30'
                      }
                    `}>
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
                    <div className="pt-1.5">
                      <span className="text-gray-400 font-medium block mb-1">Address:</span>
                      <span className="text-gray-300 text-xs leading-relaxed block">{business.address}</span>
                    </div>
                  )}

                  {business.website && (
                    <div className="pt-1.5">
                      <a
                        href={business.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline flex items-center gap-1 text-sm"
                      >
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        <span>View on Google Maps</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
});

ViewAllResults.displayName = 'ViewAllResults';

export default ViewAllResults;
