'use client';

import { useState, useEffect, useRef } from 'react';
import { useCalculatorStore } from '@/lib/store/calculator';
import { useAuthStore } from '@/lib/store/auth-simple';
import { useConfigStore } from '@/lib/store/config';
import { getRolePrice } from '@/lib/pricing';
import { useToast } from '@/components/ui/Toast/useToast';
import ProposalModal, { ProposalData } from './ProposalModal';
import ProposalGenerator, { ProposalGeneratorRef } from './ProposalGenerator';
import PDFGenerator from './PDFGenerator';
import {
  calculateInstallation,
  calculateExtensionCost,
  calculateFuelCost,
  calculateRepresentativeSettlement,
  calculateActualSettlement,
  calculateGrossProfit,
  calculateFinanceFeeIterative,
  getFinanceFeeBand,
  lookupFactor,
  calculateHardwareRental,
  calculateConnectivityTotal,
  calculateTotalMRC,
} from '@/lib/calculator';

export default function TotalCostsStep() {
  const { 
    totalsData, 
    dealDetails,
    sectionsData,
    settlementDetails,
    saveDeal, 
    generatePDF, 
    isSaving, 
    isGeneratingPDF,
    setCustomGrossProfit,
    setTotalsData,
    originalUserRole,
    savedFactors,
    savedScales,
  } = useCalculatorStore();
  
  const { user } = useAuthStore();
  const { factors, scales } = useConfigStore();
  const { toast } = useToast();
  
  const [isEditingGrossProfit, setIsEditingGrossProfit] = useState(false);
  const [customGrossProfitInput, setCustomGrossProfitInput] = useState(
    totalsData?.customGrossProfit?.toString() || ''
  );
  const [isEditingFinanceFee, setIsEditingFinanceFee] = useState(false);
  const [customFinanceFeeInput, setCustomFinanceFeeInput] = useState('');
  const [isEditingInstallationBase, setIsEditingInstallationBase] = useState(false);
  const [customInstallationBaseInput, setCustomInstallationBaseInput] = useState('');
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const proposalGeneratorRef = useRef<ProposalGeneratorRef>(null);
  const customGrossProfitRef = useRef(totalsData?.customGrossProfit);

  // Update ref when customGrossProfit changes
  useEffect(() => {
    customGrossProfitRef.current = totalsData?.customGrossProfit;
  }, [totalsData?.customGrossProfit]);

  // Calculate totals when component mounts or when data changes
  useEffect(() => {
    const calculateTotals = () => {
      console.log('[TOTAL COSTS] Starting calculation...');
      console.log('[TOTAL COSTS] sectionsData:', sectionsData);
      console.log('[TOTAL COSTS] dealDetails:', dealDetails);
      console.log('[TOTAL COSTS] factors:', factors);
      console.log('[TOTAL COSTS] scales:', scales);
      console.log('[TOTAL COSTS] savedFactors:', savedFactors);
      console.log('[TOTAL COSTS] savedScales:', savedScales);
      
      try {
        // Use saved factors/scales if available (for loaded deals), otherwise use current config
        const activeFactors = savedFactors || factors;
        const activeScales = savedScales || scales;
        
        // Check if we have the required data structures
        if (!activeFactors || !activeScales) {
          console.log('[TOTAL COSTS] Waiting for factors and scales to load...');
          console.log('[TOTAL COSTS] activeFactors:', activeFactors);
          console.log('[TOTAL COSTS] activeScales:', activeScales);
          return;
        }
        
        // Validate scales structure with detailed logging
        console.log('[TOTAL COSTS] ===== SCALES STRUCTURE DEBUG =====');
        console.log('[TOTAL COSTS] activeScales:', JSON.stringify(activeScales, null, 2));
        console.log('[TOTAL COSTS] activeScales.installation:', activeScales.installation);
        console.log('[TOTAL COSTS] activeScales.finance_fee:', activeScales.finance_fee);
        console.log('[TOTAL COSTS] activeScales.gross_profit:', activeScales.gross_profit);
        console.log('[TOTAL COSTS] activeScales.additional_costs:', activeScales.additional_costs);
        
        if (!activeScales.installation || !activeScales.finance_fee || !activeScales.gross_profit || !activeScales.additional_costs) {
          console.log('[TOTAL COSTS] Scales structure incomplete:', activeScales);
          return;
        }
        
        // Validate factors structure with detailed logging
        console.log('[TOTAL COSTS] ===== FACTORS STRUCTURE DEBUG =====');
        console.log('[TOTAL COSTS] activeFactors:', JSON.stringify(activeFactors, null, 2));
        console.log('[TOTAL COSTS] activeFactors keys:', Object.keys(activeFactors || {}));
        
        if (!activeFactors || Object.keys(activeFactors).length === 0) {
          console.log('[TOTAL COSTS] Factors structure incomplete:', activeFactors);
          return;
        }

        // Determine effective role for pricing
        const effectiveRole = originalUserRole || user?.role || 'user';
        console.log('[TOTAL COSTS] Effective role:', effectiveRole);
        
        // Wrap all calculations in try-catch for error handling
        // Requirement 16.6, 18.5: Calculation error handling with fallback values
        
        // 1. Calculate extension count (sum of hardware quantities WHERE isExtension = true)
        const extensionCount = sectionsData.hardware.reduce(
          (sum, item) => {
            // Only count items marked as extensions
            if (item.isExtension) {
              const qty = item.selectedQuantity || 0;
              return sum + (isNaN(qty) ? 0 : qty);
            }
            return sum;
          },
          0
        );

        // 2. Calculate hardware total
        const hardwareTotal = sectionsData.hardware.reduce((sum, item) => {
          try {
            const price = getRolePrice(item, effectiveRole);
            const qty = item.selectedQuantity || 0;
            const itemTotal = price * qty;
            return sum + (isNaN(itemTotal) ? 0 : itemTotal);
          } catch (error) {
            console.error('[TOTAL COSTS] Error calculating hardware item:', error);
            return sum;
          }
        }, 0);

        // 3. Calculate installation components
        let installationBase = 0;
        let extensionTotal = 0;
        let fuelTotal = 0;
        let installationTotal = 0;
        
        // Check if there's a custom installation base (set by admin)
        const hasCustomInstallationBase = totalsData?.customInstallationBase !== undefined;
        
        try {
          console.log('[TOTAL COSTS] Calculating installation base for', extensionCount, 'extensions');
          console.log('[TOTAL COSTS] activeScales.installation:', activeScales.installation);
          console.log('[TOTAL COSTS] Has custom installation base:', hasCustomInstallationBase);
          
          if (hasCustomInstallationBase) {
            // Use custom installation base set by admin
            installationBase = totalsData.customInstallationBase!;
            console.log('[TOTAL COSTS] Using custom installation base:', installationBase);
          } else {
            // Calculate installation base from scales
            installationBase = calculateInstallation(extensionCount, activeScales, effectiveRole);
            console.log('[TOTAL COSTS] Installation base calculated:', installationBase);
          }
          
          if (isNaN(installationBase) || !isFinite(installationBase)) {
            console.error('[TOTAL COSTS] Invalid installation base:', installationBase);
            installationBase = 0;
          }
        } catch (error) {
          console.error('[TOTAL COSTS] Error calculating installation base:', error);
          installationBase = 0;
        }
        
        try {
          console.log('[TOTAL COSTS] Calculating extension cost for', extensionCount, 'extensions');
          extensionTotal = calculateExtensionCost(extensionCount, activeScales, effectiveRole);
          console.log('[TOTAL COSTS] Extension cost calculated:', extensionTotal);
          if (isNaN(extensionTotal) || !isFinite(extensionTotal)) {
            console.error('[TOTAL COSTS] Invalid extension total:', extensionTotal);
            extensionTotal = 0;
          }
        } catch (error) {
          console.error('[TOTAL COSTS] Error calculating extension cost:', error);
          extensionTotal = 0;
        }
        
        try {
          console.log('[TOTAL COSTS] Calculating fuel cost for', dealDetails.distance, 'km');
          fuelTotal = calculateFuelCost(dealDetails.distance, activeScales, effectiveRole);
          console.log('[TOTAL COSTS] Fuel cost calculated:', fuelTotal);
          if (isNaN(fuelTotal) || !isFinite(fuelTotal)) {
            console.error('[TOTAL COSTS] Invalid fuel total:', fuelTotal);
            fuelTotal = 0;
          }
        } catch (error) {
          console.error('[TOTAL COSTS] Error calculating fuel cost:', error);
          fuelTotal = 0;
        }
        
        // Total Installation = Installation Base + Extension Cost + Fuel Cost
        installationTotal = installationBase + extensionTotal + fuelTotal;
        console.log('[TOTAL COSTS] Total installation calculated:', installationTotal);

        // 4. Calculate connectivity total
        let connectivityTotal = 0;
        try {
          connectivityTotal = calculateConnectivityTotal(sectionsData.connectivity, effectiveRole);
          if (isNaN(connectivityTotal) || !isFinite(connectivityTotal)) {
            console.error('[TOTAL COSTS] Invalid connectivity total:', connectivityTotal);
            connectivityTotal = 0;
          }
        } catch (error) {
          console.error('[TOTAL COSTS] Error calculating connectivity total:', error);
          connectivityTotal = 0;
        }

        // 5. Calculate licensing total
        const licensingTotal = sectionsData.licensing.reduce((sum, item) => {
          try {
            const price = getRolePrice(item, effectiveRole);
            const qty = item.selectedQuantity || 0;
            const itemTotal = price * qty;
            return sum + (isNaN(itemTotal) ? 0 : itemTotal);
          } catch (error) {
            console.error('[TOTAL COSTS] Error calculating licensing item:', error);
            return sum;
          }
        }, 0);

        // 6. Calculate total MRC
        let totalMRC = 0;
        try {
          totalMRC = calculateTotalMRC(connectivityTotal, licensingTotal, 0); // 0 for hardware rental initially
          if (isNaN(totalMRC) || !isFinite(totalMRC)) {
            console.error('[TOTAL COSTS] Invalid total MRC:', totalMRC);
            totalMRC = 0;
          }
        } catch (error) {
          console.error('[TOTAL COSTS] Error calculating total MRC:', error);
          totalMRC = 0;
        }

        // 7. Calculate representative settlement
        let representativeSettlement = 0;
        try {
          representativeSettlement = calculateRepresentativeSettlement(
            hardwareTotal,
            installationTotal,
            dealDetails.term,
            dealDetails.escalation
          );
          if (isNaN(representativeSettlement) || !isFinite(representativeSettlement)) {
            console.error('[TOTAL COSTS] Invalid representative settlement:', representativeSettlement);
            representativeSettlement = 0;
          }
        } catch (error) {
          console.error('[TOTAL COSTS] Error calculating representative settlement:', error);
          representativeSettlement = 0;
        }

        // 8. Determine actual settlement (manual or calculated)
        let actualSettlement: number;
        if (settlementDetails.useCalculator && settlementDetails.calculatedTotal) {
          actualSettlement = settlementDetails.calculatedTotal;
        } else {
          actualSettlement = settlementDetails.manualAmount || dealDetails.settlement || 0;
        }
        
        if (isNaN(actualSettlement) || !isFinite(actualSettlement)) {
          console.error('[TOTAL COSTS] Invalid actual settlement:', actualSettlement);
          actualSettlement = 0;
        }

        // 9. Calculate gross profit
        let grossProfit = 0;
        try {
          grossProfit = calculateGrossProfit(
            extensionCount,
            activeScales,
            effectiveRole,
            customGrossProfitRef.current
          );
          if (isNaN(grossProfit) || !isFinite(grossProfit)) {
            console.error('[TOTAL COSTS] Invalid gross profit:', grossProfit);
            grossProfit = 0;
          }
        } catch (error) {
          console.error('[TOTAL COSTS] Error calculating gross profit:', error);
          grossProfit = 0;
        }

        // 10. Calculate finance fee iteratively
        // The old app includes settlement in the base calculation
        let financeFee = 0;
        let totalPayout = 0;
        let financeAmount = 0;
        
        // Check if there's a custom finance fee (set by admin)
        const hasCustomFinanceFee = totalsData?.customFinanceFee !== undefined;
        
        try {
          // Base total payout = hardware + installation + gross profit + settlement
          const baseTotalPayout = hardwareTotal + installationTotal + grossProfit + actualSettlement;
          
          console.log('[TOTAL COSTS] ===== FINANCE FEE CALCULATION =====');
          console.log('[TOTAL COSTS] Hardware Total:', hardwareTotal);
          console.log('[TOTAL COSTS] Installation Total:', installationTotal);
          console.log('[TOTAL COSTS] Gross Profit:', grossProfit);
          console.log('[TOTAL COSTS] Settlement:', actualSettlement);
          console.log('[TOTAL COSTS] Base total payout (before finance fee):', baseTotalPayout);
          console.log('[TOTAL COSTS] Has custom finance fee:', hasCustomFinanceFee);
          console.log('[TOTAL COSTS] activeScales.finance_fee:', activeScales.finance_fee);
          
          if (hasCustomFinanceFee) {
            // Use custom finance fee set by admin
            financeFee = totalsData.customFinanceFee!;
            console.log('[TOTAL COSTS] Using custom finance fee:', financeFee);
          } else {
            // Iteratively calculate finance fee until it stabilizes
            let previousFinanceFee = -1;
            let iterations = 0;
            const maxIterations = 10;
            
            while (financeFee !== previousFinanceFee && iterations < maxIterations) {
              previousFinanceFee = financeFee;
              const totalPayoutForFeeCalculation = baseTotalPayout + financeFee;
              
              console.log('[TOTAL COSTS] Iteration', iterations, '- Total for fee calc:', totalPayoutForFeeCalculation);
              
              // Get finance fee based on current total payout
              financeFee = getFinanceFeeBand(totalPayoutForFeeCalculation, activeScales.finance_fee, effectiveRole);
              
              console.log('[TOTAL COSTS] Iteration', iterations, '- Finance fee:', financeFee);
              iterations++;
            }
            
            console.log('[TOTAL COSTS] Finance fee stabilized after', iterations, 'iterations:', financeFee);
          }
          
          // Calculate final totals
          // Total Payout = Hardware + Installation + Gross Profit + Settlement + Finance Fee
          totalPayout = baseTotalPayout + financeFee;
          // Finance Amount = Total Payout (SAME VALUE)
          financeAmount = totalPayout;
          
          console.log('[TOTAL COSTS] Final Total Payout:', totalPayout);
          console.log('[TOTAL COSTS] Final Finance Amount:', financeAmount);
          
          if (isNaN(financeFee) || !isFinite(financeFee)) {
            console.error('[TOTAL COSTS] Invalid finance fee:', financeFee);
            financeFee = 0;
          }
          if (isNaN(financeAmount) || !isFinite(financeAmount)) {
            console.error('[TOTAL COSTS] Invalid finance amount:', financeAmount);
            financeAmount = baseTotalPayout;
          }
          if (isNaN(totalPayout) || !isFinite(totalPayout)) {
            console.error('[TOTAL COSTS] Invalid total payout:', totalPayout);
            totalPayout = financeAmount;
          }
        } catch (error) {
          console.error('[TOTAL COSTS] Error calculating finance fee:', error);
          financeFee = 0;
          financeAmount = hardwareTotal + installationTotal + grossProfit + actualSettlement;
          totalPayout = financeAmount;
        }

        // 11. Look up factor using finance amount
        let factor = 0;
        try {
          factor = lookupFactor(
            dealDetails.term,
            dealDetails.escalation,
            financeAmount,
            activeFactors,
            effectiveRole
          );
          if (isNaN(factor) || !isFinite(factor)) {
            console.error('[TOTAL COSTS] Invalid factor:', factor);
            factor = 0;
          }
        } catch (error) {
          console.error('[TOTAL COSTS] Error looking up factor:', error);
          factor = 0;
        }

        // 12. Calculate hardware rental using finance amount
        let hardwareRental = 0;
        try {
          hardwareRental = calculateHardwareRental(financeAmount, factor);
          if (isNaN(hardwareRental) || !isFinite(hardwareRental)) {
            console.error('[TOTAL COSTS] Invalid hardware rental:', hardwareRental);
            hardwareRental = 0;
          }
        } catch (error) {
          console.error('[TOTAL COSTS] Error calculating hardware rental:', error);
          hardwareRental = 0;
        }

        // 13. Recalculate total MRC with hardware rental
        let finalTotalMRC = 0;
        try {
          finalTotalMRC = calculateTotalMRC(connectivityTotal, licensingTotal, hardwareRental);
          if (isNaN(finalTotalMRC) || !isFinite(finalTotalMRC)) {
            console.error('[TOTAL COSTS] Invalid final total MRC:', finalTotalMRC);
            finalTotalMRC = 0;
          }
        } catch (error) {
          console.error('[TOTAL COSTS] Error calculating final total MRC:', error);
          finalTotalMRC = 0;
        }

        // 15. Calculate VAT
        const totalExVAT = finalTotalMRC;
        let vat = totalExVAT * 0.15;
        let totalWithVAT = totalExVAT + vat;
        
        if (isNaN(vat) || !isFinite(vat)) {
          console.error('[TOTAL COSTS] Invalid VAT:', vat);
          vat = 0;
        }
        if (isNaN(totalWithVAT) || !isFinite(totalWithVAT)) {
          console.error('[TOTAL COSTS] Invalid total with VAT:', totalWithVAT);
          totalWithVAT = totalExVAT;
        }

        // Update totals in store
        setTotalsData({
          extensionCount,
          hardwareTotal,
          installationTotal,
          installationBase, // Store separately for display
          extensionTotal,
          fuelTotal,
          representativeSettlement,
          actualSettlement,
          financeFee,
          customFinanceFee: hasCustomFinanceFee ? totalsData.customFinanceFee : undefined,
          totalPayout,
          grossProfit,
          customGrossProfit: customGrossProfitRef.current,
          customInstallationBase: hasCustomInstallationBase ? totalsData.customInstallationBase : undefined,
          financeAmount,
          factor,
          hardwareRental,
          connectivityTotal,
          licensingTotal,
          totalMRC: finalTotalMRC,
          totalExVAT,
          totalWithVAT,
        });

        console.log('[TOTAL COSTS] Calculations complete:', {
          extensionCount,
          hardwareTotal,
          installationTotal,
          financeAmount,
          factor,
          hardwareRental,
          totalMRC: finalTotalMRC,
        });
      } catch (error) {
        console.error('[TOTAL COSTS] Error calculating totals:', error);
        // Display generic error message to user
        toast.error('Calculation Error', {
          message: 'Some values may be incorrect. Please check your inputs and try again.',
          section: 'calculator'
        });
      }
    };

    calculateTotals();
  }, [
    sectionsData,
    dealDetails,
    settlementDetails,
    factors,
    scales,
    savedFactors,
    savedScales,
    user?.role,
    originalUserRole,
    totalsData?.customGrossProfit,
    setTotalsData,
  ]);

  // Safety check - if totalsData is not initialized, show loading state
  if (!totalsData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white text-lg">Loading totals data...</div>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Handle save deal
  const handleSaveDeal = async () => {
    try {
      const dealId = await saveDeal();
      toast.success('Deal Saved Successfully', {
        message: `Deal ID: ${dealId}`,
        section: 'calculator'
      });
    } catch (error: any) {
      console.error('[TOTAL COSTS] Error saving deal:', error);
      // Requirement 16.8: Display specific error messages based on error type
      let errorMessage = 'Please try again.';
      
      if (error.message?.includes('Not authenticated')) {
        errorMessage = 'Please log in again.';
      } else if (error.message?.includes('Network')) {
        errorMessage = 'Please check your connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error('Failed to Save Deal', {
        message: errorMessage,
        section: 'calculator'
      });
    }
  };

  // Handle generate PDF
  const handleGeneratePDF = async () => {
    try {
      // Auto-save deal before generating PDF (AC-2.3)
      try {
        await saveDeal();
        console.log('[TOTAL COSTS] Deal auto-saved before PDF generation');
      } catch (saveError) {
        console.warn('[TOTAL COSTS] Auto-save failed, continuing with PDF generation:', saveError);
        // Don't block PDF generation if auto-save fails
      }
      
      const pdfUrl = await generatePDF();
      toast.success('PDF Generated Successfully', {
        message: 'Opening PDF in new tab...',
        section: 'calculator'
      });
      // Open PDF in new tab
      window.open(pdfUrl, '_blank');
    } catch (error: any) {
      console.error('[TOTAL COSTS] Error generating PDF:', error);
      // Requirement 12.7: Display error message for PDF generation failure
      let errorMessage = 'Please try again.';
      
      if (error.message?.includes('Not authenticated')) {
        errorMessage = 'Please log in again.';
      } else if (error.message?.includes('Network')) {
        errorMessage = 'Please check your connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error('Failed to Generate PDF', {
        message: errorMessage,
        section: 'calculator'
      });
    }
  };

  // Handle generate proposal
  const handleGenerateProposal = async () => {
    // Auto-save deal before generating proposal (AC-2.1)
    try {
      await saveDeal();
      console.log('[TOTAL COSTS] Deal auto-saved before proposal generation');
    } catch (saveError) {
      console.warn('[TOTAL COSTS] Auto-save failed, continuing with proposal generation:', saveError);
      // Don't block proposal generation if auto-save fails
    }
    
    setIsProposalModalOpen(true);
  };
  
  // Handle proposal submission
  const handleProposalSubmit = async (proposalData: ProposalData) => {
    if (proposalGeneratorRef.current) {
      await proposalGeneratorRef.current.generateProposal(proposalData);
      setIsProposalModalOpen(false);
    }
  };

  // Handle custom gross profit edit
  const handleEditGrossProfit = () => {
    setIsEditingGrossProfit(true);
    setCustomGrossProfitInput(totalsData.customGrossProfit?.toString() || totalsData.grossProfit.toString());
  };

  const handleSaveGrossProfit = () => {
    const value = parseFloat(customGrossProfitInput);
    if (!isNaN(value) && value >= 0) {
      setCustomGrossProfit(value);
      setIsEditingGrossProfit(false);
    } else {
      toast.error('Invalid Input', {
        message: 'Please enter a valid positive number',
        section: 'calculator'
      });
    }
  };

  const handleCancelGrossProfitEdit = () => {
    setIsEditingGrossProfit(false);
    setCustomGrossProfitInput(totalsData.customGrossProfit?.toString() || '');
  };

  const handleResetGrossProfit = () => {
    setCustomGrossProfit(undefined);
    setIsEditingGrossProfit(false);
    setCustomGrossProfitInput('');
  };

  // Handle custom finance fee edit
  const handleEditFinanceFee = () => {
    setIsEditingFinanceFee(true);
    setCustomFinanceFeeInput(totalsData.financeFee.toString());
  };

  const handleSaveFinanceFee = () => {
    const value = parseFloat(customFinanceFeeInput);
    if (!isNaN(value) && value >= 0) {
      // Store custom finance fee in totalsData
      setTotalsData({
        ...totalsData,
        financeFee: value,
        customFinanceFee: value,
      });
      setIsEditingFinanceFee(false);
    } else {
      toast.error('Invalid Input', {
        message: 'Please enter a valid positive number',
        section: 'calculator'
      });
    }
  };

  const handleCancelFinanceFeeEdit = () => {
    setIsEditingFinanceFee(false);
    setCustomFinanceFeeInput('');
  };

  const handleResetFinanceFee = () => {
    // Recalculate finance fee by removing custom value
    const { customFinanceFee, ...rest } = totalsData;
    setTotalsData(rest);
    setIsEditingFinanceFee(false);
    setCustomFinanceFeeInput('');
  };

  // Handle custom installation base edit
  const handleEditInstallationBase = () => {
    setIsEditingInstallationBase(true);
    setCustomInstallationBaseInput((totalsData.installationBase || 0).toString());
  };

  const handleSaveInstallationBase = () => {
    const value = parseFloat(customInstallationBaseInput);
    if (!isNaN(value) && value >= 0) {
      // Store custom installation base in totalsData
      setTotalsData({
        ...totalsData,
        installationBase: value,
        customInstallationBase: value,
      });
      setIsEditingInstallationBase(false);
    } else {
      toast.error('Invalid Input', {
        message: 'Please enter a valid positive number',
        section: 'calculator'
      });
    }
  };

  const handleCancelInstallationBaseEdit = () => {
    setIsEditingInstallationBase(false);
    setCustomInstallationBaseInput('');
  };

  const handleResetInstallationBase = () => {
    // Recalculate installation base by removing custom value
    const { customInstallationBase, ...rest } = totalsData;
    setTotalsData(rest);
    setIsEditingInstallationBase(false);
    setCustomInstallationBaseInput('');
  };

  // Determine which role is being used for pricing
  const effectiveRole = originalUserRole || user?.role || 'user';
  const roleName = effectiveRole === 'admin' ? 'Admin' : effectiveRole === 'manager' ? 'Manager' : 'User';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-4">Total Costs Summary</h2>
      
      {/* Pricing Information Banner */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-center gap-2 text-blue-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="font-semibold">Pricing Tier: {roleName} Pricing</span>
            {originalUserRole && originalUserRole !== user?.role && (
              <span className="ml-2 text-sm">(Original deal creator's pricing)</span>
            )}
          </div>
        </div>
        <div className="mt-2 text-sm text-blue-200">
          Factor Used: {totalsData?.factor?.toFixed(5) || '0.00000'}
        </div>
      </div>

      {/* Hardware & Installation Section */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Hardware & Installation</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Extension Count:</span>
            <span className="text-white font-semibold">{totalsData.extensionCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Hardware Total:</span>
            <span className="text-white font-semibold">{formatCurrency(totalsData.hardwareTotal)}</span>
          </div>
          
          {/* Installation Base - Editable by Admin */}
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Installation Base:</span>
            {isEditingInstallationBase && user?.role === 'admin' ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={customInstallationBaseInput}
                  onChange={(e) => setCustomInstallationBaseInput(e.target.value)}
                  className="w-32 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  min="0"
                  step="0.01"
                />
                <button
                  onClick={handleSaveInstallationBase}
                  className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelInstallationBaseEdit}
                  className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetInstallationBase}
                  className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                  Reset
                </button>
              </div>
            ) : (
              <span className="text-white font-semibold flex items-center gap-2">
                {formatCurrency(totalsData.installationBase || 0)}
                {user?.role === 'admin' && (
                  <button
                    onClick={handleEditInstallationBase}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    Edit
                  </button>
                )}
              </span>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Extension Cost:</span>
            <span className="text-white font-semibold">{formatCurrency(totalsData.extensionTotal)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Fuel Cost:</span>
            <span className="text-white font-semibold">{formatCurrency(totalsData.fuelTotal)}</span>
          </div>
          <div className="border-t border-white/10 pt-3 flex justify-between items-center">
            <span className="text-gray-300 font-semibold">Total Hardware Installed:</span>
            <span className="text-white font-bold">{formatCurrency(totalsData.hardwareTotal + (totalsData.installationBase || 0) + totalsData.extensionTotal + totalsData.fuelTotal)}</span>
          </div>
        </div>
      </div>

      {/* Gross Profit Section */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">Gross Profit</h3>
          {!isEditingGrossProfit && (
            <button
              onClick={handleEditGrossProfit}
              className="px-3 py-1 text-sm bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 transition-colors"
            >
              Edit
            </button>
          )}
        </div>
        
        {isEditingGrossProfit ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Custom Gross Profit</label>
              <input
                type="number"
                value={customGrossProfitInput}
                onChange={(e) => setCustomGrossProfitInput(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter custom gross profit"
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveGrossProfit}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleCancelGrossProfitEdit}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetGrossProfit}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Reset to Default
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">
                {totalsData.customGrossProfit !== undefined ? 'Custom Gross Profit:' : 'Gross Profit (Sliding Scale):'}
              </span>
              <span className="text-white font-bold">{formatCurrency(totalsData.grossProfit)}</span>
            </div>
            {totalsData.customGrossProfit !== undefined && (
              <div className="text-sm text-blue-300">
                Custom value applied
              </div>
            )}
          </div>
        )}
      </div>

      {/* Finance & Settlement Section */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Finance & Settlement</h3>
        <div className="space-y-3">
          {/* Finance Fee - Editable by Admin */}
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Finance Fee:</span>
            {isEditingFinanceFee && user?.role === 'admin' ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={customFinanceFeeInput}
                  onChange={(e) => setCustomFinanceFeeInput(e.target.value)}
                  className="w-32 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  min="0"
                  step="0.01"
                />
                <button
                  onClick={handleSaveFinanceFee}
                  className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelFinanceFeeEdit}
                  className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetFinanceFee}
                  className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                  Reset
                </button>
              </div>
            ) : (
              <span className="text-white font-semibold flex items-center gap-2">
                {formatCurrency(totalsData.financeFee)}
                {user?.role === 'admin' && (
                  <button
                    onClick={handleEditFinanceFee}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    Edit
                  </button>
                )}
              </span>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Settlement Amount:</span>
            <span className="text-white font-semibold">{formatCurrency(totalsData.actualSettlement)}</span>
          </div>
          <div className="border-t border-white/10 pt-3 flex justify-between items-center">
            <span className="text-gray-300 font-semibold">Total Payout:</span>
            <span className="text-white font-bold">{formatCurrency(totalsData.totalPayout)}</span>
          </div>
        </div>
      </div>

      {/* Monthly Recurring Costs Section */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Monthly Recurring Costs</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Hardware Rental:</span>
            <span className="text-white font-semibold">{formatCurrency(totalsData.hardwareRental)}</span>
          </div>
          <div className="flex justify-between items-center pl-4">
            <span className="text-gray-400 text-sm">Factor Used:</span>
            <span className="text-gray-300 text-sm font-mono">{totalsData?.factor?.toFixed(5) || '0.00000'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Connectivity:</span>
            <span className="text-white font-semibold">{formatCurrency(totalsData.connectivityTotal)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Licensing:</span>
            <span className="text-white font-semibold">{formatCurrency(totalsData.licensingTotal)}</span>
          </div>
          <div className="border-t border-white/10 pt-3 flex justify-between items-center">
            <span className="text-gray-300 font-semibold">Total MRC (Ex VAT):</span>
            <span className="text-white font-bold">{formatCurrency(totalsData.totalMRC)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">VAT (15%):</span>
            <span className="text-white font-semibold">{formatCurrency(totalsData.totalWithVAT - totalsData.totalExVAT)}</span>
          </div>
          <div className="border-t border-white/10 pt-3 flex justify-between items-center">
            <span className="text-green-300 font-bold text-lg">Total MRC (Inc VAT):</span>
            <span className="text-green-400 font-bold text-lg">{formatCurrency(totalsData.totalWithVAT)}</span>
          </div>
        </div>
      </div>

      {/* Deal Information Section */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Deal Information</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Customer Name:</span>
            <span className="text-white font-semibold">{dealDetails.customerName || 'Not set'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Contract Term:</span>
            <span className="text-white font-semibold">{dealDetails.term} months</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Escalation Rate:</span>
            <span className="text-white font-semibold">{dealDetails.escalation}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Distance:</span>
            <span className="text-white font-semibold">{dealDetails.distance} km</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={handleSaveDeal}
          disabled={isSaving}
          className="px-6 py-3 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-base rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {isSaving ? 'Saving...' : 'Save Deal'}
        </button>
        
        {/* PDF Generator Component */}
        <PDFGenerator />
        
        <button
          onClick={handleGenerateProposal}
          className="px-6 py-3 h-12 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-base rounded-lg hover:shadow-lg transition-all font-semibold"
        >
          Generate Proposal
        </button>
      </div>
      
      {/* Proposal Modal */}
      <ProposalModal
        isOpen={isProposalModalOpen}
        onClose={() => setIsProposalModalOpen(false)}
        onSubmit={handleProposalSubmit}
      />
      
      {/* Proposal Generator */}
      <ProposalGenerator ref={proposalGeneratorRef} />
    </div>
  );
}
