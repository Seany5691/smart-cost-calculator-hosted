'use client';

import { useState, forwardRef, useImperativeHandle } from 'react';
import { useCalculatorStore } from '@/lib/store/calculator';
import { ProposalData } from './ProposalModal';

interface ProposalGeneratorProps {
  onGenerate?: () => void;
}

export interface ProposalGeneratorRef {
  generateProposal: (data: ProposalData) => Promise<void>;
}

const ProposalGenerator = forwardRef<ProposalGeneratorRef, ProposalGeneratorProps>(({ onGenerate }, ref) => {
  const { sectionsData, dealDetails, totalsData, settlementDetails } = useCalculatorStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; title: string; message: string; type: 'success' | 'error' }>({ 
    show: false, 
    title: '', 
    message: '', 
    type: 'success' 
  });

  const showToast = (title: string, message: string, type: 'success' | 'error') => {
    setToast({ show: true, title, message, type });
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  useImperativeHandle(ref, () => ({
    generateProposal: async (proposalData: ProposalData) => {
      try {
        setIsGenerating(true);
        
        // Dynamically import PDF-lib for form filling
        const { PDFDocument } = await import('pdf-lib');
        
        // Determine which PDF template to use based on proposal type
        let pdfFileName = 'Proposal.pdf'; // Default: Normal Proposal
        if (proposalData.proposalType === 'comparative') {
          pdfFileName = 'Proposal1.pdf';
        } else if (proposalData.proposalType === 'cash') {
          pdfFileName = 'Proposal2.pdf';
        }
        
        const response = await fetch(`/${pdfFileName}`);
        if (!response.ok) {
          throw new Error('Failed to fetch PDF template');
        }
        
        const pdfBytes = await response.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();

        const currentYear = new Date().getFullYear();

        // Calculate current hardware rental from settlement details
        let currentHardwareRental = 0;
        
        console.log('[ProposalGenerator] Settlement Details:', {
          settlement: dealDetails.settlement,
          hasCalculatorInputs: !!settlementDetails.calculatorInputs,
          calculatorInputs: settlementDetails.calculatorInputs
        });
        
        if (dealDetails.settlement > 0 && settlementDetails.calculatorInputs) {
          const inputs = settlementDetails.calculatorInputs;
          
          console.log('[ProposalGenerator] Calculator Inputs:', {
            rentalType: inputs.rentalType,
            rentalAmount: inputs.rentalAmount,
            startDate: inputs.startDate,
            escalationRate: inputs.escalationRate
          });
          
          if (inputs.rentalType === 'current') {
            // If current rental is selected, use the rental amount directly
            currentHardwareRental = inputs.rentalAmount;
            console.log('[ProposalGenerator] Using current rental:', currentHardwareRental);
          } else if (inputs.rentalType === 'starting' && inputs.startDate && inputs.escalationRate) {
            // If starting rental is selected, calculate the current rental based on escalation
            const startDate = new Date(inputs.startDate);
            const currentDate = new Date();
            const escalation = inputs.escalationRate / 100;
            
            // Calculate years elapsed since start date
            const yearsElapsed = Math.floor(
              (currentDate.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
            );
            
            console.log('[ProposalGenerator] Escalation calculation:', {
              startDate: startDate.toISOString(),
              currentDate: currentDate.toISOString(),
              yearsElapsed,
              escalationRate: inputs.escalationRate,
              startingRental: inputs.rentalAmount
            });
            
            // Apply escalation for each year
            currentHardwareRental = inputs.rentalAmount * Math.pow(1 + escalation, yearsElapsed);
            
            console.log('[ProposalGenerator] Calculated current rental with escalation:', currentHardwareRental);
          }
        } else {
          console.log('[ProposalGenerator] Settlement not configured or no calculator inputs');
        }

        // Calculate projections
        const currentEscalation = (settlementDetails.calculatorInputs?.escalationRate || 0) / 100; // Use settlement escalation rate for current projections
        const newEscalation = dealDetails.escalation / 100; // Use new deal escalation rate for new projections
        const contractYears = Math.ceil(dealDetails.term / 12);

        // Current projections (current rental + current MRC + escalation)
        const projectionCurrent1 = currentHardwareRental + proposalData.currentMRC;
        const projectionCurrent2 = projectionCurrent1 * (1 + currentEscalation);
        const projectionCurrent3 = projectionCurrent2 * (1 + currentEscalation);
        const projectionCurrent4 = projectionCurrent3 * (1 + currentEscalation);
        const projectionCurrent5 = projectionCurrent4 * (1 + currentEscalation);

        // Calculate hardware rentals based on contract term
        const hardwareRentals = [];
        let currentRental = totalsData?.hardwareRental || 0;
        
        for (let year = 1; year <= 5; year++) {
          if (year <= contractYears) {
            // Hardware rental applies for contract duration
            hardwareRentals.push(currentRental);
            currentRental = currentRental * (1 + newEscalation);
          } else {
            // No hardware rental after contract ends
            hardwareRentals.push(0);
          }
        }

        // New projections (hardware rental + licensing + connectivity)
        const connectivityCost = totalsData?.connectivityTotal || 0;
        const licensingCost = totalsData?.licensingTotal || 0;
        
        const projectionNew1 = hardwareRentals[0] + connectivityCost + licensingCost;
        const projectionNew2 = hardwareRentals[1] + connectivityCost + licensingCost;
        const projectionNew3 = hardwareRentals[2] + connectivityCost + licensingCost;
        const projectionNew4 = hardwareRentals[3] + connectivityCost + licensingCost;
        const projectionNew5 = hardwareRentals[4] + connectivityCost + licensingCost;

        // Get hardware items (only locked items that are selected by user)
        const hardwareItems = sectionsData.hardware.filter(item => {
          if (item.selectedQuantity === 0) return false;
          
          // For temporary items, check showOnProposal
          if (item.isTemporary) {
            return item.showOnProposal === true;
          }
          
          // For permanent items, check locked (existing behavior)
          return item.locked === true;
        }).slice(0, 9);

        // Get connectivity and licensing items
        const connectivityItems = sectionsData.connectivity.filter(item => item.selectedQuantity > 0);
        const licensingItems = sectionsData.licensing.filter(item => item.selectedQuantity > 0);

        // Format monthly service items
        const formatServiceItems = (items: any[]) => {
          return items.map((item: any) => `${item.selectedQuantity} x ${item.name}`).join(', ');
        };

        const monthlyServiceItem1 = formatServiceItems(licensingItems);
        const monthlyServiceItem2 = formatServiceItems(connectivityItems);
        const monthlyServiceItem3 = 'All Calls at a blended fixed rate of 59c per minute, on a per second billing basis.';

        // Helper function to format currency with R prefix and proper spacing (matches old app exactly)
        const formatCurrencyWithR = (amount: number): string => {
          const formatted = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
          return `R ${formatted}`;
        };

        // Calculate totals
        const proposedCurrentTotalCost = currentHardwareRental + proposalData.currentMRC;
        const proposedNewTotalCost = (totalsData?.hardwareRental || 0) + licensingCost + connectivityCost;
        const projectionCurrentTotal = (projectionCurrent1 * 12) + (projectionCurrent2 * 12) + (projectionCurrent3 * 12) + (projectionCurrent4 * 12) + (projectionCurrent5 * 12);
        const projectionTotal = (projectionNew1 * 12) + (projectionNew2 * 12) + (projectionNew3 * 12) + (projectionNew4 * 12) + (projectionNew5 * 12);
        const monthlyServiceTotal = licensingCost + connectivityCost;

        // Fill form fields
        const fields: Record<string, string> = {
          'Customer Name': proposalData.customerName,
          'Current Hardware': formatCurrencyWithR(currentHardwareRental),
          'Current MRC': formatCurrencyWithR(proposalData.currentMRC),
          'Proposed New Cost 1': formatCurrencyWithR(totalsData?.hardwareRental || 0),
          'Proposed New Cost 2': formatCurrencyWithR(connectivityCost + licensingCost),
          
          'Proposed Current Total Cost': formatCurrencyWithR(proposedCurrentTotalCost),
          'Proposed New Total Cost': formatCurrencyWithR(proposedNewTotalCost),
          
          'Projection Current 1': formatCurrencyWithR(projectionCurrent1),
          'Projection Current 2': formatCurrencyWithR(projectionCurrent2),
          'Projection Current 3': formatCurrencyWithR(projectionCurrent3),
          'Projection Current 4': formatCurrencyWithR(projectionCurrent4),
          'Projection Current 5': formatCurrencyWithR(projectionCurrent5),
          'Projection Current Total': formatCurrencyWithR(projectionCurrentTotal),
          
          'Projection Year 1': currentYear.toString(),
          'Projection Year 2': (currentYear + 1).toString(),
          'Projection Year 3': (currentYear + 2).toString(),
          'Projection Year 4': (currentYear + 3).toString(),
          'Projection Year 5': (currentYear + 4).toString(),
          
          'Projection New 1': formatCurrencyWithR(projectionNew1),
          'Projection New 2': formatCurrencyWithR(projectionNew2),
          'Projection New 3': formatCurrencyWithR(projectionNew3),
          'Projection New 4': formatCurrencyWithR(projectionNew4),
          'Projection New 5': formatCurrencyWithR(projectionNew5),
          'Projection Total': formatCurrencyWithR(projectionTotal),
          
          'Total Hardware Cost': formatCurrencyWithR(totalsData?.hardwareRental || 0),
          'Total Hardware Term': `${dealDetails.term} Months`,
          'Total Hardware Escalation': `${dealDetails.escalation}% Escalation`,
          
          'Monthly Service Item 1': monthlyServiceItem1,
          'Monthly Service Item 2': monthlyServiceItem2,
          'Monthly Service Item 3': monthlyServiceItem3,
          'Monthly Service Cost 1': formatCurrencyWithR(licensingCost),
          'Monthly Service Cost 2': formatCurrencyWithR(connectivityCost),
          'Monthly Service Total': formatCurrencyWithR(monthlyServiceTotal),
          'Monthly Service Term 1': 'Month-To-Month',
          'Monthly Service Term 2': 'Month-To-Month',
          'Total Monthly Service Term': 'Month-To-Month',
          
          'Total Payout': formatCurrencyWithR(totalsData?.totalPayout || 0),
          
          'Specialist Email Address': proposalData.specialistEmail,
          'Specialist Phone Number': proposalData.specialistPhone,
        };

        // Fill hardware items (only consecutive items, no gaps)
        for (let i = 0; i < 9; i++) {
          const item = hardwareItems[i];
          if (item) {
            fields[`Hardware Qty ${i + 1}`] = item.selectedQuantity.toString();
            fields[`Hardware Item ${i + 1}`] = item.name;
          } else {
            fields[`Hardware Qty ${i + 1}`] = '';
            fields[`Hardware Item ${i + 1}`] = '';
          }
        }

        // Fill all form fields
        for (const [fieldName, value] of Object.entries(fields)) {
          try {
            const field = form.getTextField(fieldName);
            if (field) {
              field.setText(value);
            }
          } catch (error) {
            console.warn(`Field "${fieldName}" not found in PDF form`);
          }
        }

        // Save the filled PDF
        const filledPdfBytes = await pdfDoc.save();
        
        // Create download link
        const blob = new Blob([filledPdfBytes as BlobPart], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Generate filename with timestamp (matches old app format exactly)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `${proposalData.customerName.replace(/[^a-zA-Z0-9]/g, '_')} - Proposal${timestamp}.pdf`;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Check if this proposal should be attached to a lead
        const leadId = localStorage.getItem('proposal-lead-id');
        const leadName = localStorage.getItem('proposal-lead-name');
        
        if (leadId && leadName) {
          try {
            // Get auth token
            const token = localStorage.getItem('auth-storage');
            let authToken = null;
            if (token) {
              const data = JSON.parse(token);
              authToken = data.state?.token || data.token;
            }

            if (authToken) {
              // Create a File object from the blob
              const file = new File([blob], filename, { type: 'application/pdf' });
              
              // Create FormData to upload the file
              const formData = new FormData();
              formData.append('file', file);

              // Upload as attachment to the lead
              const uploadResponse = await fetch(`/api/leads/${leadId}/attachments`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`
                },
                body: formData
              });

              if (uploadResponse.ok) {
                console.log('Proposal attached to lead successfully');
                showToast(
                  'Proposal Generated & Attached',
                  `Proposal has been downloaded and attached to ${leadName}`,
                  'success'
                );
              } else {
                console.error('Failed to attach proposal to lead');
                showToast(
                  'Proposal Generated',
                  'Proposal downloaded but could not be attached to lead',
                  'success'
                );
              }
            }
            
            // Clear the lead ID from localStorage
            localStorage.removeItem('proposal-lead-id');
            localStorage.removeItem('proposal-lead-name');
          } catch (attachError) {
            console.error('Error attaching proposal to lead:', attachError);
            // Still show success for the download
            showToast(
              'Proposal Generated',
              'Proposal downloaded but could not be attached to lead',
              'success'
            );
          }
        } else {
          showToast(
            'Proposal Generated Successfully',
            'Your proposal PDF has been downloaded',
            'success'
          );
        }

        if (onGenerate) {
          onGenerate();
        }
      } catch (error) {
        console.error('Error generating proposal:', error);
        showToast(
          'Proposal Generation Failed',
          'Failed to generate proposal. Please try again.',
          'error'
        );
      } finally {
        setIsGenerating(false);
      }
    }
  }), [sectionsData, dealDetails, totalsData, settlementDetails, onGenerate]);

  return (
    <>
      {/* Toast notification - Updated with proper z-index and purple theme */}
      {toast.show && (
        <div 
          className={`fixed top-4 right-4 p-4 rounded-lg shadow-2xl z-[9999] max-w-sm animate-slide-up ${
            toast.type === 'error' 
              ? 'border border-red-500/30 bg-gradient-to-br from-slate-900/95 to-red-900/95' 
              : 'border border-purple-500/30 bg-gradient-to-br from-slate-900/95 to-purple-900/95'
          }`}
          style={{
            backdropFilter: 'blur(50px) saturate(180%)',
            WebkitBackdropFilter: 'blur(50px) saturate(180%)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          }}
        >
          <div className="flex items-start space-x-3">
            {toast.type === 'error' ? (
              <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-purple-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div className="flex-1">
              <div className={`font-semibold ${toast.type === 'error' ? 'text-red-300' : 'text-purple-300'}`}>
                {toast.title}
              </div>
              <div className={`text-sm mt-1 ${toast.type === 'error' ? 'text-red-200' : 'text-purple-200'}`}>
                {toast.message}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Loading overlay - Updated with proper z-index and purple theme */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div 
            className="p-6 flex items-center space-x-3 rounded-xl bg-gradient-to-br from-slate-900/95 to-purple-900/95 border border-purple-500/30 shadow-2xl"
            style={{
              backdropFilter: 'blur(50px) saturate(180%)',
              WebkitBackdropFilter: 'blur(50px) saturate(180%)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            }}
          >
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
            <span className="text-white font-medium">Generating Proposal...</span>
          </div>
        </div>
      )}
    </>
  );
});

ProposalGenerator.displayName = 'ProposalGenerator';

export default ProposalGenerator;
