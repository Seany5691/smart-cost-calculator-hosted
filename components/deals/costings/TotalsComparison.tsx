'use client';

interface TotalsComparisonProps {
  totals: {
    hardwareTotal: { actual: number; rep: number };
    installationTotal: { actual: number; rep: number };
    connectivityTotal: { actual: number; rep: number };
    licensingTotal: { actual: number; rep: number };
    settlement: { actual: number; rep: number };
    financeFee: { actual: number; rep: number };
    factor: { actual: number; rep: number };
    totalPayout: { actual: number; rep: number };
    hardwareRental: { actual: number; rep: number };
    totalMRC: { actual: number; rep: number };
  };
}

/**
 * TotalsComparison Component
 * 
 * Side-by-side comparison of actual vs rep costs for all categories
 * - Hardware, Installation, Connectivity, Licensing
 * - Settlement, Finance Fee
 * - Total Payout (highlighted)
 * - Hardware Rental, Total MRC (highlighted)
 * 
 * Requirements: AC-7.1 through AC-7.10
 */
export default function TotalsComparison({ totals }: TotalsComparisonProps) {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-ZA', {
      minimumFractionDigits: 5,
      maximumFractionDigits: 5,
    }).format(value);
  };

  const rows = [
    { label: 'Hardware Total', actual: totals.hardwareTotal.actual, rep: totals.hardwareTotal.rep, highlight: false, isCurrency: true, isCostItem: true },
    { label: 'Hardware Rental (Monthly)', actual: totals.hardwareRental.actual, rep: totals.hardwareRental.rep, highlight: false, isCurrency: true, isCostItem: false },
    { label: 'Connectivity Total', actual: totals.connectivityTotal.actual, rep: totals.connectivityTotal.rep, highlight: false, isCurrency: true, isCostItem: true },
    { label: 'Licensing Total', actual: totals.licensingTotal.actual, rep: totals.licensingTotal.rep, highlight: false, isCurrency: true, isCostItem: true },
    { label: 'Settlement', actual: totals.settlement.actual, rep: totals.settlement.rep, highlight: false, isCurrency: true, isCostItem: true },
    { label: 'Installation Total', actual: totals.installationTotal.actual, rep: totals.installationTotal.rep, highlight: false, isCurrency: true, isCostItem: true },
    { label: 'Finance Fee', actual: totals.financeFee.actual, rep: totals.financeFee.rep, highlight: false, isCurrency: true, isCostItem: true },
    { label: 'Factor', actual: totals.factor.actual, rep: totals.factor.rep, highlight: false, isCurrency: false, isCostItem: false },
    { label: 'Total Payout', actual: totals.totalPayout.actual, rep: totals.totalPayout.rep, highlight: true, isCurrency: true, isCostItem: false },
    { label: 'Total MRC', actual: totals.totalMRC.actual, rep: totals.totalMRC.rep, highlight: true, isCurrency: true, isCostItem: false },
  ];

  return (
    <div>
      <h3 className="text-xl font-bold text-white mb-4">Totals Comparison</h3>
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Category</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Actual Cost</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Rep Cost</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Difference</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                // For cost items (Hardware, Installation, Finance Fee, etc.): difference = rep - actual
                // Lower actual cost = savings/profit (positive difference)
                // For revenue items (Total Payout, Hardware Rental, Total MRC): difference = actual - rep
                // Higher actual revenue = more income (positive difference)
                // Factor: difference = actual - rep (to show variance)
                const difference = row.isCostItem ? row.rep - row.actual : row.actual - row.rep;
                const diffClass = difference > 0 ? 'text-green-400' : difference < 0 ? 'text-red-400' : 'text-gray-300';
                const rowClass = row.highlight 
                  ? 'border-t-2 border-white/20 bg-orange-500/10 font-bold' 
                  : 'border-b border-white/5';

                return (
                  <tr key={index} className={rowClass}>
                    <td className="px-4 py-3 text-white">{row.label}</td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {row.isCurrency ? formatCurrency(row.actual) : formatNumber(row.actual)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {row.isCurrency ? formatCurrency(row.rep) : formatNumber(row.rep)}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${diffClass}`}>
                      {row.isCurrency ? formatCurrency(difference) : formatNumber(difference)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
