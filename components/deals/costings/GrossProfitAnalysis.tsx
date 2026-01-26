'use client';

import { Info } from 'lucide-react';

interface GrossProfitAnalysisProps {
  grossProfit: {
    actualGP: number;
    repGP: number;
    difference: number;
  };
}

/**
 * GrossProfitAnalysis Component
 * 
 * Displays gross profit analysis
 * - True GP: (rental ÷ factor) - settlement - hardware - scales
 * - Rep GP: From totals data
 * - GP Difference: Rep GP - True GP
 * - Color-coded differences
 * - Explanation tooltip
 * 
 * Requirements: AC-8.1 through AC-8.4
 */
export default function GrossProfitAnalysis({ grossProfit }: GrossProfitAnalysisProps) {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getDifferenceClass = (value: number): string => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-300';
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-xl font-bold text-white">Gross Profit Analysis</h3>
        <div className="group relative">
          <Info className="w-5 h-5 text-gray-400 cursor-help" />
          <div className="absolute left-0 top-6 w-64 p-3 bg-slate-800 border border-white/20 rounded-lg text-sm text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
            <p className="font-semibold text-white mb-1">True GP Calculation:</p>
            <p>(Hardware Rental ÷ Factor) - Settlement - Hardware Cost - Scale Costs</p>
            <p className="mt-2 text-xs text-gray-400">Scale costs include installation, extension, fuel, and finance fees</p>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Actual GP */}
          <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-sm text-gray-400 mb-2">True GP (Actual)</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(grossProfit.actualGP)}</p>
            <p className="text-xs text-gray-500 mt-2">Based on actual costs</p>
          </div>

          {/* Rep GP */}
          <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-sm text-gray-400 mb-2">Rep GP (Role-Based)</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(grossProfit.repGP)}</p>
            <p className="text-xs text-gray-500 mt-2">Based on rep pricing</p>
          </div>

          {/* GP Difference */}
          <div className="text-center p-4 bg-orange-500/10 rounded-lg border border-orange-500/30">
            <p className="text-sm text-gray-400 mb-2">GP Difference</p>
            <p className={`text-3xl font-bold ${getDifferenceClass(grossProfit.difference)}`}>
              {formatCurrency(grossProfit.difference)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {grossProfit.difference > 0 ? 'Actual GP higher' : grossProfit.difference < 0 ? 'Rep GP higher' : 'Equal'}
            </p>
          </div>
        </div>

        {/* Explanation */}
        <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <p className="text-sm text-gray-300">
            <span className="font-semibold text-white">Note:</span> The GP Difference shows how much the actual GP differs from the rep's GP. 
            A positive difference means actual costs result in higher profit margins than what the rep sees, while a negative difference means the rep is seeing higher margins than actual.
          </p>
        </div>
      </div>
    </div>
  );
}
