'use client';

interface TermAnalysisProps {
  termAnalysis: {
    term: number;
    connectivityOverTerm: { actual: number; rep: number };
    licensingOverTerm: { actual: number; rep: number };
    totalRecurringOverTerm: { actual: number; rep: number };
    gpOverTerm: number;
  };
}

/**
 * TermAnalysis Component
 * 
 * Displays recurring costs over contract term
 * - Connectivity over term (actual vs rep)
 * - Licensing over term (actual vs rep)
 * - Total recurring over term
 * - GP over term
 * - Note: Hardware not included (one-time cost)
 * 
 * Requirements: AC-9.1 through AC-9.6
 */
export default function TermAnalysis({ termAnalysis }: TermAnalysisProps) {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const rows = [
    {
      label: 'Connectivity',
      actual: termAnalysis.connectivityOverTerm.actual,
      rep: termAnalysis.connectivityOverTerm.rep,
    },
    {
      label: 'Licensing',
      actual: termAnalysis.licensingOverTerm.actual,
      rep: termAnalysis.licensingOverTerm.rep,
    },
    {
      label: 'Total Recurring',
      actual: termAnalysis.totalRecurringOverTerm.actual,
      rep: termAnalysis.totalRecurringOverTerm.rep,
      highlight: true,
    },
  ];

  return (
    <div>
      <h3 className="text-xl font-bold text-white mb-4">
        Term Analysis ({termAnalysis.term} months)
      </h3>

      <div className="glass-card rounded-xl overflow-hidden">
        {/* Table */}
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
                const difference = row.rep - row.actual;
                const diffClass = difference > 0 ? 'text-green-400' : difference < 0 ? 'text-red-400' : 'text-gray-300';
                const rowClass = row.highlight 
                  ? 'border-t-2 border-white/20 bg-orange-500/10 font-bold' 
                  : 'border-b border-white/5';

                return (
                  <tr key={index} className={rowClass}>
                    <td className="px-4 py-3 text-white">{row.label}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{formatCurrency(row.actual)}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{formatCurrency(row.rep)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${diffClass}`}>
                      {formatCurrency(difference)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* GP Over Term */}
        <div className="p-6 border-t border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Gross Profit Over Term</p>
              <p className="text-xs text-gray-500">Total recurring profit over {termAnalysis.term} months</p>
            </div>
            <p className={`text-3xl font-bold ${termAnalysis.gpOverTerm > 0 ? 'text-green-400' : termAnalysis.gpOverTerm < 0 ? 'text-red-400' : 'text-gray-300'}`}>
              {formatCurrency(termAnalysis.gpOverTerm)}
            </p>
          </div>
        </div>

        {/* Note */}
        <div className="p-4 bg-orange-500/10 border-t border-orange-500/30">
          <p className="text-sm text-gray-300">
            <span className="font-semibold text-white">Note:</span> Hardware costs are not included in term analysis as they are one-time costs. 
            This analysis focuses on recurring monthly costs (connectivity and licensing) over the contract term.
          </p>
        </div>
      </div>
    </div>
  );
}
