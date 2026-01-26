'use client';

import React, { useState, useMemo } from 'react';
import { Download, Filter } from 'lucide-react';
import { Business } from '@/lib/store/scraper';
import { useToast } from '@/components/ui/Toast/useToast';

interface ProviderExportProps {
  businesses: Business[];
}

const ProviderExport = React.memo(({ businesses }: ProviderExportProps) => {
  const { toast } = useToast();
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(new Set());

  // Get provider statistics
  const providerStats = useMemo(() => {
    const stats = new Map<string, number>();
    businesses.forEach(business => {
      const count = stats.get(business.provider) || 0;
      stats.set(business.provider, count + 1);
    });
    return Array.from(stats.entries())
      .sort((a, b) => b[1] - a[1]); // Sort by count descending
  }, [businesses]);

  const handleToggleProvider = (provider: string) => {
    const newSet = new Set(selectedProviders);
    if (newSet.has(provider)) {
      newSet.delete(provider);
    } else {
      newSet.add(provider);
    }
    setSelectedProviders(newSet);
  };

  const handleSelectAll = () => {
    const allProviders = new Set(providerStats.map(([provider]) => provider));
    setSelectedProviders(allProviders);
  };

  const handleDeselectAll = () => {
    setSelectedProviders(new Set());
  };

  const handleExport = async () => {
    if (selectedProviders.size === 0) {
      toast.warning('No providers selected', {
        message: 'Please select at least one provider to export',
        section: 'scraper'
      });
      return;
    }

    try {
      const filteredBusinesses = businesses.filter(b => selectedProviders.has(b.provider));
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `businesses_by_provider_${timestamp}.xlsx`;

      const response = await fetch('/api/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businesses: filteredBusinesses,
          filename,
          byProvider: true, // Flag to use provider-based export
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Export successful', {
        message: `Exported ${filteredBusinesses.length} businesses from ${selectedProviders.size} provider${selectedProviders.size !== 1 ? 's' : ''}`,
        section: 'scraper'
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed', {
        message: 'Failed to export. Please try again.',
        section: 'scraper'
      });
    }
  };

  if (businesses.length === 0) {
    return null;
  }

  const selectedBusinessCount = businesses.filter(b => selectedProviders.has(b.provider)).length;

  return (
    <div className="space-y-2 sm:space-y-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 lg:p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg">
            <Filter className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base lg:text-lg font-bold text-white">
              Export by Provider
            </h3>
            <p className="text-xs text-gray-400 hidden sm:block">
              Filter and export by phone provider
            </p>
          </div>
        </div>
      </div>

      {/* Selection Controls */}
      <div className="flex items-center justify-between p-3 lg:p-4 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 rounded-lg border border-teal-500/30">
        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <button
            onClick={handleSelectAll}
            className="font-medium text-teal-400 hover:text-teal-300 hover:underline transition-colors min-h-[44px] px-2"
          >
            All
          </button>
          <span className="text-gray-500">•</span>
          <button
            onClick={handleDeselectAll}
            className="font-medium text-teal-400 hover:text-teal-300 hover:underline transition-colors min-h-[44px] px-2"
          >
            None
          </button>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-sm lg:text-base font-semibold text-white">
            {selectedProviders.size}
          </span>
          <span className="text-xs sm:text-sm text-gray-300">
            provider{selectedProviders.size !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Provider Checkboxes List */}
      <div className="bg-white/5 rounded-lg border border-white/10 p-2 sm:p-4 max-h-60 sm:max-h-80 overflow-y-auto space-y-1 sm:space-y-2 momentum-scroll">
        {providerStats.map(([provider, count]) => (
          <label
            key={provider}
            className={`
              flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg cursor-pointer transition-all duration-200 min-h-[44px]
              ${selectedProviders.has(provider)
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md'
                : 'hover:bg-white/10'
              }
            `}
          >
            <input
              type="checkbox"
              checked={selectedProviders.has(provider)}
              onChange={() => handleToggleProvider(provider)}
              className="w-5 h-5 text-teal-600 rounded focus:ring-1 focus:ring-teal-500 cursor-pointer flex-shrink-0"
              style={{ minWidth: '20px', minHeight: '20px' }}
            />
            <span className={`text-sm lg:text-base flex-1 ${
              selectedProviders.has(provider) ? 'text-white font-medium' : 'text-gray-300'
            }`}>
              {provider}
            </span>
            <span className={`
              text-xs font-semibold px-2 py-1 rounded-full
              ${selectedProviders.has(provider)
                ? 'bg-white/20 text-white'
                : 'bg-white/10 text-gray-400'
              }
            `}>
              {count}
            </span>
          </label>
        ))}
      </div>

      {/* Export Section */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 lg:p-4 bg-white/5 rounded-lg border border-white/10">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white">
            Ready to export
          </span>
          {selectedProviders.size > 0 && (
            <span className="text-xs text-gray-400 mt-1">
              {selectedBusinessCount} business{selectedBusinessCount !== 1 ? 'es' : ''} from all towns
            </span>
          )}
        </div>
        <button
          onClick={handleExport}
          disabled={selectedProviders.size === 0}
          className={`
            btn flex items-center justify-center gap-2 shadow-lg h-12 w-full sm:w-auto
            ${selectedProviders.size === 0
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-xl'
            }
          `}
        >
          <Download className="w-4 h-4" />
          Export to Excel
        </button>
      </div>
    </div>
  );
});

ProviderExport.displayName = 'ProviderExport';

export default ProviderExport;
