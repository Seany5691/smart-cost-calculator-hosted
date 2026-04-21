'use client';

import { useState } from 'react';
import { useCalculatorStore } from '@/lib/store/calculator';
import { calculateSettlement } from '@/lib/calculator';
import { useToast } from '@/components/ui/Toast/useToast';

// Inline SVG icons to avoid lucide-react webpack issues
const Calculator = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2"></rect>
    <line x1="8" y1="6" x2="16" y2="6"></line>
    <line x1="16" y1="14" x2="16" y2="18"></line>
    <line x1="8" y1="14" x2="8" y2="14"></line>
    <line x1="12" y1="14" x2="12" y2="14"></line>
    <line x1="8" y1="18" x2="8" y2="18"></line>
    <line x1="12" y1="18" x2="12" y2="18"></line>
  </svg>
);

const DollarSign = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
);

export default function SettlementStep() {
  const { settlementDetails, setSettlementDetails } = useCalculatorStore();
  const { toast } = useToast();
  
  // ===== HARDWARE SETTLEMENT - Local state for calculator inputs =====
  const [startDate, setStartDate] = useState<string>(
    settlementDetails.calculatorInputs?.startDate 
      ? new Date(settlementDetails.calculatorInputs.startDate).toISOString().split('T')[0]
      : ''
  );
  const [rentalType, setRentalType] = useState<'starting' | 'current'>(
    settlementDetails.calculatorInputs?.rentalType || 'starting'
  );
  const [rentalAmount, setRentalAmount] = useState<string>(
    settlementDetails.calculatorInputs?.rentalAmount?.toString() || ''
  );
  const [escalationRate, setEscalationRate] = useState<0 | 5 | 10 | 15>(
    settlementDetails.calculatorInputs?.escalationRate || 0
  );
  const [rentalTerm, setRentalTerm] = useState<12 | 24 | 36 | 48 | 60>(
    settlementDetails.calculatorInputs?.rentalTerm || 36
  );
  
  // ===== CONNECTIVITY & LICENSING SETTLEMENT - Local state for calculator inputs =====
  const [clStartDate, setClStartDate] = useState<string>(
    settlementDetails.connectivityLicensingCalculatorInputs?.startDate 
      ? new Date(settlementDetails.connectivityLicensingCalculatorInputs.startDate).toISOString().split('T')[0]
      : ''
  );
  const [clRentalType, setClRentalType] = useState<'starting' | 'current'>(
    settlementDetails.connectivityLicensingCalculatorInputs?.rentalType || 'starting'
  );
  const [clRentalAmount, setClRentalAmount] = useState<string>(
    settlementDetails.connectivityLicensingCalculatorInputs?.rentalAmount?.toString() || ''
  );
  const [clEscalationRate, setClEscalationRate] = useState<0 | 5 | 10 | 15>(
    settlementDetails.connectivityLicensingCalculatorInputs?.escalationRate || 0
  );
  const [clRentalTerm, setClRentalTerm] = useState<12 | 24 | 36 | 48 | 60>(
    settlementDetails.connectivityLicensingCalculatorInputs?.rentalTerm || 36
  );
  
  // Toggle between manual and calculator mode for HARDWARE
  const handleToggleCalculator = (useCalculator: boolean) => {
    setSettlementDetails({ useCalculator });
  };
  
  // Toggle between manual and calculator mode for CONNECTIVITY/LICENSING
  const handleToggleClCalculator = (useCalculator: boolean) => {
    setSettlementDetails({ connectivityLicensingUseCalculator: useCalculator });
  };
  
  // Toggle connectivity/licensing settlement feature
  const handleToggleConnectivityLicensing = (enabled: boolean) => {
    setSettlementDetails({ useConnectivityLicensingSettlement: enabled });
  };
  
  // Handle manual settlement input
  const handleManualAmountChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setSettlementDetails({ manualAmount: numValue });
      // IMPORTANT: Also update dealDetails.settlement for proposal generation
      const { setDealDetails } = useCalculatorStore.getState();
      setDealDetails({ settlement: numValue });
    } else if (value === '' || value === '0') {
      setSettlementDetails({ manualAmount: 0 });
      // IMPORTANT: Also update dealDetails.settlement for proposal generation
      const { setDealDetails } = useCalculatorStore.getState();
      setDealDetails({ settlement: 0 });
    }
  };
  
  // Calculate settlement
  const handleCalculateSettlement = () => {
    if (!startDate || !rentalAmount) {
      toast.error('Missing Required Fields', {
        message: 'Please fill in all required fields',
        section: 'calculator'
      });
      return;
    }
    
    const parsedStartDate = new Date(startDate);
    const parsedRentalAmount = parseFloat(rentalAmount);
    
    if (isNaN(parsedRentalAmount) || parsedRentalAmount < 0) {
      toast.error('Invalid Rental Amount', {
        message: 'Please enter a valid rental amount',
        section: 'calculator'
      });
      return;
    }
    
    // Calculate settlement using the calculator function
    const result = calculateSettlement(
      parsedStartDate,
      parsedRentalAmount,
      escalationRate,
      rentalTerm,
      rentalType
    );
    
    // Update store with calculation results
    setSettlementDetails({
      calculatorInputs: {
        startDate: parsedStartDate,
        rentalType,
        rentalAmount: parsedRentalAmount,
        escalationRate,
        rentalTerm,
      },
      calculatedBreakdown: result.calculations.map(calc => ({
        year: calc.year,
        amount: calc.amount,
        monthsRemaining: calc.monthsRemaining,
        isCompleted: calc.isCompleted,
        startDate: calc.startDate,
        endDate: calc.endDate,
      })),
      calculatedTotal: result.totalSettlement,
    });
    
    // IMPORTANT: Also update dealDetails.settlement for proposal generation
    // This ensures the ProposalGenerator can access settlement data correctly
    const { setDealDetails } = useCalculatorStore.getState();
    setDealDetails({ settlement: result.totalSettlement });
  };
  
  // ===== CONNECTIVITY & LICENSING SETTLEMENT HANDLERS =====
  
  // Handle manual connectivity/licensing settlement input
  const handleClManualAmountChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setSettlementDetails({ connectivityLicensingManualAmount: numValue });
    } else if (value === '' || value === '0') {
      setSettlementDetails({ connectivityLicensingManualAmount: 0 });
    }
  };
  
  // Calculate connectivity/licensing settlement
  const handleCalculateClSettlement = () => {
    if (!clStartDate || !clRentalAmount) {
      toast.error('Missing Required Fields', {
        message: 'Please fill in all required fields for Connectivity & Licensing Settlement',
        section: 'calculator'
      });
      return;
    }
    
    const parsedStartDate = new Date(clStartDate);
    const parsedRentalAmount = parseFloat(clRentalAmount);
    
    if (isNaN(parsedRentalAmount) || parsedRentalAmount < 0) {
      toast.error('Invalid Cost Amount', {
        message: 'Please enter a valid cost amount',
        section: 'calculator'
      });
      return;
    }
    
    // Calculate settlement using the same calculator function
    const result = calculateSettlement(
      parsedStartDate,
      parsedRentalAmount,
      clEscalationRate,
      clRentalTerm,
      clRentalType
    );
    
    // Update store with calculation results
    setSettlementDetails({
      connectivityLicensingCalculatorInputs: {
        startDate: parsedStartDate,
        rentalType: clRentalType,
        rentalAmount: parsedRentalAmount,
        escalationRate: clEscalationRate,
        rentalTerm: clRentalTerm,
      },
      connectivityLicensingCalculatedBreakdown: result.calculations.map(calc => ({
        year: calc.year,
        amount: calc.amount,
        monthsRemaining: calc.monthsRemaining,
        isCompleted: calc.isCompleted,
        startDate: calc.startDate,
        endDate: calc.endDate,
      })),
      connectivityLicensingCalculatedTotal: result.totalSettlement,
    });
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };
  
  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Settlement Calculation</h2>
      </div>

      {/* Connectivity & Licensing Settlement Toggle */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Connectivity and Licensing Settlement</h3>
            <p className="text-sm text-gray-400">Enable an additional settlement calculator for connectivity and licensing costs</p>
          </div>
          <button
            onClick={() => handleToggleConnectivityLicensing(!settlementDetails.useConnectivityLicensingSettlement)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settlementDetails.useConnectivityLicensingSettlement ? 'bg-green-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settlementDetails.useConnectivityLicensingSettlement ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ========== HARDWARE SETTLEMENT CALCULATOR ========== */}
      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Hardware Settlement Calculator</h3>
          
          {/* Calculator Toggle for Hardware */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Use Calculator:</span>
            <button
              onClick={() => handleToggleCalculator(!settlementDetails.useCalculator)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settlementDetails.useCalculator ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settlementDetails.useCalculator ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

      {/* Manual Input Mode */}
      {!settlementDetails.useCalculator && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Manual Settlement Amount</h3>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Settlement Amount (ZAR)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={settlementDetails.manualAmount}
              onChange={(e) => handleManualAmountChange(e.target.value)}
              className="w-full px-4 py-2 h-12 bg-white/10 border border-white/20 rounded-lg text-white text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter settlement amount"
            />
            <p className="text-xs text-gray-400">
              Enter the settlement amount manually (must be ≥ 0, including 0)
            </p>
          </div>
        </div>
      )}

      {/* Calculator Mode */}
      {settlementDetails.useCalculator && (
        <div className="space-y-6">
          {/* Calculator Form */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Settlement Calculator</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Contract Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 h-12 bg-white/10 border border-white/20 rounded-lg text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Rental Type */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Rental Type *
                </label>
                <select
                  value={rentalType}
                  onChange={(e) => setRentalType(e.target.value as 'starting' | 'current')}
                  className="w-full px-3 py-2 h-12 bg-white/10 border border-purple-500/30 rounded-lg text-white text-base focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="starting">Starting Rental (Year 1)</option>
                  <option value="current">Current Rental (Today's Rate)</option>
                </select>
              </div>

              {/* Rental Amount */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Rental Amount (ZAR) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rentalAmount}
                  onChange={(e) => setRentalAmount(e.target.value)}
                  className="w-full px-4 py-2 h-12 bg-white/10 border border-white/20 rounded-lg text-white text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter rental amount"
                />
              </div>

              {/* Escalation Rate */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Escalation Rate *
                </label>
                <select
                  value={escalationRate}
                  onChange={(e) => setEscalationRate(parseInt(e.target.value) as 0 | 5 | 10 | 15)}
                  className="w-full px-3 py-2 h-12 bg-white/10 border border-purple-500/30 rounded-lg text-white text-base focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="10">10%</option>
                  <option value="15">15%</option>
                </select>
              </div>

              {/* Rental Term */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-gray-300">
                  Rental Term (Months) *
                </label>
                <select
                  value={rentalTerm}
                  onChange={(e) => setRentalTerm(parseInt(e.target.value) as 12 | 24 | 36 | 48 | 60)}
                  className="w-full px-3 py-2 h-12 bg-white/10 border border-purple-500/30 rounded-lg text-white text-base focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="12">12 Months</option>
                  <option value="24">24 Months</option>
                  <option value="36">36 Months</option>
                  <option value="48">48 Months</option>
                  <option value="60">60 Months</option>
                </select>
              </div>
            </div>

            {/* Calculate Button */}
            <div className="mt-6">
              <button
                onClick={handleCalculateSettlement}
                className="w-full px-6 py-3 h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-lg transition-colors"
              >
                Calculate Settlement
              </button>
            </div>
          </div>

          {/* Settlement Breakdown Table */}
          {settlementDetails.calculatedBreakdown && settlementDetails.calculatedBreakdown.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Settlement Breakdown</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Year</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Period</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Months Remaining</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlementDetails.calculatedBreakdown.map((calc) => (
                      <tr key={calc.year} className="border-b border-white/5">
                        <td className="px-4 py-3 text-sm text-white">Year {calc.year}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {formatDate(calc.startDate)} - {formatDate(calc.endDate)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              calc.isCompleted
                                ? 'bg-gray-600 text-gray-300'
                                : 'bg-blue-600 text-white'
                            }`}
                          >
                            {calc.isCompleted ? 'Completed' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-300">
                          {calc.monthsRemaining}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-white">
                          {formatCurrency(calc.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-white/20">
                      <td colSpan={4} className="px-4 py-4 text-right text-base font-bold text-white">
                        Total Settlement:
                      </td>
                      <td className="px-4 py-4 text-right text-base font-bold text-blue-400">
                        {formatCurrency(settlementDetails.calculatedTotal || 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
      {/* END Hardware Settlement Calculator */}

      {/* ========== CONNECTIVITY & LICENSING SETTLEMENT CALCULATOR ========== */}
      {settlementDetails.useConnectivityLicensingSettlement && (
        <div className="bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Licensing And Connectivity Settlement Calculator</h3>
            
            {/* Calculator Toggle for Connectivity/Licensing */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">Use Calculator:</span>
              <button
                onClick={() => handleToggleClCalculator(!settlementDetails.connectivityLicensingUseCalculator)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settlementDetails.connectivityLicensingUseCalculator ? 'bg-green-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settlementDetails.connectivityLicensingUseCalculator ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Manual Input Mode */}
          {!settlementDetails.connectivityLicensingUseCalculator && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-green-400" />
                <h4 className="text-lg font-semibold text-white">Manual Settlement Amount</h4>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Settlement Amount (ZAR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settlementDetails.connectivityLicensingManualAmount}
                  onChange={(e) => handleClManualAmountChange(e.target.value)}
                  className="w-full px-4 py-2 h-12 bg-white/10 border border-white/20 rounded-lg text-white text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter settlement amount"
                />
                <p className="text-xs text-gray-400">
                  Enter the settlement amount manually (must be ≥ 0, including 0)
                </p>
              </div>
            </div>
          )}

          {/* Calculator Mode */}
          {settlementDetails.connectivityLicensingUseCalculator && (
            <div className="space-y-6">
              {/* Calculator Form */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5 text-green-400" />
                  <h4 className="text-lg font-semibold text-white">Settlement Calculator</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Contract Start Date *
                    </label>
                    <input
                      type="date"
                      value={clStartDate}
                      onChange={(e) => setClStartDate(e.target.value)}
                      className="w-full px-4 py-2 h-12 bg-white/10 border border-white/20 rounded-lg text-white text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Cost Type */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Cost Type *
                    </label>
                    <select
                      value={clRentalType}
                      onChange={(e) => setClRentalType(e.target.value as 'starting' | 'current')}
                      className="w-full px-3 py-2 h-12 bg-white/10 border border-green-500/30 rounded-lg text-white text-base focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="starting">Starting Cost (Year 1)</option>
                      <option value="current">Current Cost (Today's Rate)</option>
                    </select>
                  </div>

                  {/* Cost Amount */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Cost Amount (ZAR) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={clRentalAmount}
                      onChange={(e) => setClRentalAmount(e.target.value)}
                      className="w-full px-4 py-2 h-12 bg-white/10 border border-white/20 rounded-lg text-white text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter cost amount"
                    />
                  </div>

                  {/* Escalation Rate */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Escalation Rate *
                    </label>
                    <select
                      value={clEscalationRate}
                      onChange={(e) => setClEscalationRate(parseInt(e.target.value) as 0 | 5 | 10 | 15)}
                      className="w-full px-3 py-2 h-12 bg-white/10 border border-green-500/30 rounded-lg text-white text-base focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="10">10%</option>
                      <option value="15">15%</option>
                    </select>
                  </div>

                  {/* Contract Term */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Contract Term (Months) *
                    </label>
                    <select
                      value={clRentalTerm}
                      onChange={(e) => setClRentalTerm(parseInt(e.target.value) as 12 | 24 | 36 | 48 | 60)}
                      className="w-full px-3 py-2 h-12 bg-white/10 border border-green-500/30 rounded-lg text-white text-base focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="12">12 Months</option>
                      <option value="24">24 Months</option>
                      <option value="36">36 Months</option>
                      <option value="48">48 Months</option>
                      <option value="60">60 Months</option>
                    </select>
                  </div>
                </div>

                {/* Calculate Button */}
                <div className="mt-6">
                  <button
                    onClick={handleCalculateClSettlement}
                    className="w-full px-6 py-3 h-12 bg-green-600 hover:bg-green-700 text-white text-base font-semibold rounded-lg transition-colors"
                  >
                    Calculate Settlement
                  </button>
                </div>
              </div>

              {/* Settlement Breakdown Table */}
              {settlementDetails.connectivityLicensingCalculatedBreakdown && settlementDetails.connectivityLicensingCalculatedBreakdown.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-white mb-4">Settlement Breakdown</h4>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Year</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Period</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Months Remaining</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {settlementDetails.connectivityLicensingCalculatedBreakdown.map((calc) => (
                          <tr key={calc.year} className="border-b border-white/5">
                            <td className="px-4 py-3 text-sm text-white">Year {calc.year}</td>
                            <td className="px-4 py-3 text-sm text-gray-300">
                              {formatDate(calc.startDate)} - {formatDate(calc.endDate)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  calc.isCompleted
                                    ? 'bg-gray-600 text-gray-300'
                                    : 'bg-green-600 text-white'
                                }`}
                              >
                                {calc.isCompleted ? 'Completed' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-300">
                              {calc.monthsRemaining}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-white">
                              {formatCurrency(calc.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-white/20">
                          <td colSpan={4} className="px-4 py-4 text-right text-base font-bold text-white">
                            Total Settlement:
                          </td>
                          <td className="px-4 py-4 text-right text-base font-bold text-green-400">
                            {formatCurrency(settlementDetails.connectivityLicensingCalculatedTotal || 0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* END Connectivity & Licensing Settlement Calculator */}

      {/* Summary Card - Shows both settlements */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Settlement Summary</h3>
        
        <div className="space-y-4">
          {/* Hardware Settlement */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <p className="text-sm text-gray-400">Hardware Settlement</p>
              <p className="text-sm text-gray-500">
                {settlementDetails.useCalculator ? 'Calculated' : 'Manual Entry'}
              </p>
            </div>
            <p className="text-2xl font-bold text-white">
              {settlementDetails.useCalculator
                ? formatCurrency(settlementDetails.calculatedTotal || 0)
                : formatCurrency(settlementDetails.manualAmount)}
            </p>
          </div>

          {/* Connectivity & Licensing Settlement */}
          {settlementDetails.useConnectivityLicensingSettlement && (
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <p className="text-sm text-gray-400">Connectivity & Licenses Settlement</p>
                <p className="text-sm text-gray-500">
                  {settlementDetails.connectivityLicensingUseCalculator ? 'Calculated' : 'Manual Entry'}
                </p>
              </div>
              <p className="text-2xl font-bold text-white">
                {settlementDetails.connectivityLicensingUseCalculator
                  ? formatCurrency(settlementDetails.connectivityLicensingCalculatedTotal || 0)
                  : formatCurrency(settlementDetails.connectivityLicensingManualAmount)}
              </p>
            </div>
          )}

          {/* Total Settlement */}
          <div className="flex items-center justify-between pt-3">
            <div>
              <p className="text-lg font-semibold text-white">Total Settlement</p>
              <p className="text-sm text-gray-400">Combined settlement amount</p>
            </div>
            <p className="text-3xl font-bold text-green-400">
              {formatCurrency(
                (settlementDetails.useCalculator
                  ? (settlementDetails.calculatedTotal || 0)
                  : settlementDetails.manualAmount) +
                (settlementDetails.useConnectivityLicensingSettlement
                  ? (settlementDetails.connectivityLicensingUseCalculator
                      ? (settlementDetails.connectivityLicensingCalculatedTotal || 0)
                      : settlementDetails.connectivityLicensingManualAmount)
                  : 0)
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
