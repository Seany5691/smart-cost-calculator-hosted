/**
 * ScrapingAnalytics Component
 * Displays insights and statistics about scraping performance
 * Phase 4: Scraping analytics dashboard
 */

'use client';

import React, { useMemo } from 'react';
import { TrendingUp, Clock, MapPin, Building2, Phone, BarChart3 } from 'lucide-react';
import { Business } from '@/lib/store/scraper';

interface ScrapingAnalyticsProps {
  businesses: Business[];
  completedTowns: number;
  totalDuration: number;
  townCompletionTimes: number[];
}

export default function ScrapingAnalytics({
  businesses,
  completedTowns,
  totalDuration,
  townCompletionTimes,
}: ScrapingAnalyticsProps) {
  const analytics = useMemo(() => {
    // Average businesses per town
    const avgBusinessesPerTown = completedTowns > 0
      ? (businesses.length / completedTowns).toFixed(1)
      : '0';

    // Average time per town
    const avgTimePerTown = townCompletionTimes.length > 0
      ? townCompletionTimes.reduce((a, b) => a + b, 0) / townCompletionTimes.length
      : 0;
    const avgTimeFormatted = (avgTimePerTown / 1000 / 60).toFixed(1); // minutes

    // Provider distribution
    const providerCounts = businesses.reduce((acc, b) => {
      const provider = b.provider || 'Unknown';
      acc[provider] = (acc[provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const providerDistribution = Object.entries(providerCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([provider, count]) => ({
        provider,
        count,
        percentage: ((count / businesses.length) * 100).toFixed(1),
      }));

    // Town distribution
    const townCounts = businesses.reduce((acc, b) => {
      acc[b.town] = (acc[b.town] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const townDistribution = Object.entries(townCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // Top 5 towns
      .map(([town, count]) => ({
        town,
        count,
        percentage: ((count / businesses.length) * 100).toFixed(1),
      }));

    // Industry distribution
    const industryCounts = businesses.reduce((acc, b) => {
      acc[b.industry] = (acc[b.industry] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const industryDistribution = Object.entries(industryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // Top 5 industries
      .map(([industry, count]) => ({
        industry,
        count,
        percentage: ((count / businesses.length) * 100).toFixed(1),
      }));

    // Phone number coverage
    const withPhone = businesses.filter(b => b.phone && b.phone.trim() !== '').length;
    const phonePercentage = ((withPhone / businesses.length) * 100).toFixed(1);

    return {
      avgBusinessesPerTown,
      avgTimeFormatted,
      providerDistribution,
      townDistribution,
      industryDistribution,
      withPhone,
      phonePercentage,
    };
  }, [businesses, completedTowns, townCompletionTimes]);

  if (businesses.length === 0) {
    return null;
  }

  return (
    <div className="glass-card p-4 lg:p-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-6 h-6 text-teal-400" />
        <h2 className="text-xl font-bold text-white">Scraping Analytics</h2>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Avg Businesses per Town */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-teal-400" />
            <span className="text-sm text-gray-400">Avg per Town</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {analytics.avgBusinessesPerTown}
          </div>
          <div className="text-xs text-gray-500 mt-1">businesses</div>
        </div>

        {/* Avg Time per Town */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-gray-400">Avg Time</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {analytics.avgTimeFormatted}
          </div>
          <div className="text-xs text-gray-500 mt-1">minutes per town</div>
        </div>

        {/* Phone Coverage */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-400">Phone Coverage</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {analytics.phonePercentage}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {analytics.withPhone} of {businesses.length}
          </div>
        </div>

        {/* Total Businesses */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-gray-400">Total Scraped</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {businesses.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">businesses</div>
        </div>
      </div>

      {/* Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Provider Distribution */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            Provider Distribution
          </h3>
          <div className="space-y-2">
            {analytics.providerDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-300 truncate flex-1">{item.provider}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{item.count}</span>
                  <span className="text-gray-500">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Towns */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Top Towns
          </h3>
          <div className="space-y-2">
            {analytics.townDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-300 truncate flex-1">{item.town}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{item.count}</span>
                  <span className="text-gray-500">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Industries */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Top Industries
          </h3>
          <div className="space-y-2">
            {analytics.industryDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-300 truncate flex-1">{item.industry}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{item.count}</span>
                  <span className="text-gray-500">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
