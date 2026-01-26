'use client';

import { CostingSection } from '@/lib/store/deals';

interface LicensingBreakdownProps {
  licensing: CostingSection;
}

/**
 * LicensingBreakdown Component
 * 
 * Displays licensing cost breakdown table
 * - Item name, quantity, actual cost, rep cost, profit
 * - Totals row
 * - Color-coded profit (green positive, red negative)
 * 
 * Requirements: AC-6.5, AC-6.6
 */
export default function LicensingBreakdown({ licensing }: LicensingBreakdownProps) {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getProfitClass = (profit: number): string => {
    if (profit > 0) return 'text-green-400';
    if (profit < 0) return 'text-red-400';
    return 'text-gray-300';
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-white mb-4">Licensing Breakdown</h3>
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Item</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Qty</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Actual Cost</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Rep Cost</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Profit</th>
              </tr>
            </thead>
            <tbody>
              {licensing.items.map((item, index) => (
                <tr key={index} className="border-b border-white/5">
                  <td className="px-4 py-3 text-white">{item.name}</td>
                  <td className="px-4 py-3 text-center text-gray-300">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{formatCurrency(item.actualCost * item.quantity)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{formatCurrency(item.repCost * item.quantity)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${getProfitClass(item.profit * item.quantity)}`}>
                    {formatCurrency(item.profit * item.quantity)}
                  </td>
                </tr>
              ))}
              {/* Totals Row */}
              <tr className="border-t-2 border-white/20 bg-white/5 font-bold">
                <td className="px-4 py-3 text-white" colSpan={2}>Total</td>
                <td className="px-4 py-3 text-right text-white">{formatCurrency(licensing.totalActual)}</td>
                <td className="px-4 py-3 text-right text-white">{formatCurrency(licensing.totalRep)}</td>
                <td className={`px-4 py-3 text-right ${getProfitClass(licensing.totalProfit)}`}>
                  {formatCurrency(licensing.totalProfit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
