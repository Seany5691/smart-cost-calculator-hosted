'use client';

import React, { useMemo, useCallback } from 'react';
import { MapPin, Building2, Clock, TrendingUp } from 'lucide-react';

interface SummaryStatsProps {
  totalTowns: number;
  totalBusinesses: number;
  totalDuration: number;
  averageBusinessesPerTown: number;
}

const SummaryStats = React.memo(({
  totalTowns,
  totalBusinesses,
  totalDuration,
  averageBusinessesPerTown,
}: SummaryStatsProps) => {
  const formatDuration = useCallback((ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}m ${secs}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }, []);

  const stats = useMemo(() => [
    {
      label: 'Towns Scraped',
      value: totalTowns,
      icon: MapPin,
    },
    {
      label: 'Total Businesses',
      value: totalBusinesses,
      icon: Building2,
    },
    {
      label: 'Total Duration',
      value: formatDuration(totalDuration),
      icon: Clock,
    },
    {
      label: 'Avg per Town',
      value: averageBusinessesPerTown.toFixed(1),
      icon: TrendingUp,
    },
  ], [totalTowns, totalBusinesses, totalDuration, averageBusinessesPerTown, formatDuration]);

  return (
    <div className="space-y-3 w-full">
      {/* Header */}
      <div className="flex items-center gap-2 lg:gap-3">
        <div className="p-1.5 lg:p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg">
          <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base lg:text-lg font-bold text-white">
            Summary Statistics
          </h3>
          <p className="text-xs text-gray-400">
            Scraping session results
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white/5 rounded-lg border border-white/10 p-4 lg:p-3">
              <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                <Icon className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                <span className="text-xs font-medium">{stat.label}</span>
              </div>
              <p className="text-lg lg:text-base font-bold text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Time Progress Bar at Bottom */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs lg:text-sm">
          <span className="text-gray-400">Time Taken</span>
          <span className="font-semibold text-white">{formatDuration(totalDuration)}</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-3 lg:h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300 ease-out rounded-full"
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </div>
  );
});

SummaryStats.displayName = 'SummaryStats';

export default SummaryStats;
