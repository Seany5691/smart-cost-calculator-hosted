'use client';

import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCalculatorStore } from '@/lib/store/calculator';
import { HtmlProposalData } from './ProposalModal';
import { HtmlTemplateManager } from '@/lib/services/htmlTemplateManager';

interface HtmlProposalGeneratorProps {
  onGenerate?: () => void;
}

export interface HtmlProposalGeneratorRef {
  generateHtmlProposal: (data: HtmlProposalData) => Promise<void>;
}

const HtmlProposalGenerator = forwardRef<HtmlProposalGeneratorRef, HtmlProposalGeneratorProps>(({ onGenerate }, ref) => {
  const { sectionsData, dealDetails, totalsData, settlementDetails } = useCalculatorStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; title: string; message: string; type: 'success' | 'error' }>({ 
    show: false, 
    title: '', 
    message: '', 
    type: 'success' 
  });

  // Set mounted state on client side only
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const showToast = (title: string, message: string, type: 'success' | 'error') => {
    setToast({ show: true, title, message, type });
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  useImperativeHandle(ref, () => ({
    generateHtmlProposal: async (proposalData: HtmlProposalData) => {
      try {
        setIsGenerating(true);
        
        // Prepare calculator data
        const calculatorData = {
          sectionsData,
          dealDetails,
          totalsData,
          settlementDetails
        };

        // Process the HTML template
        const processedHtml = await HtmlTemplateManager.processTemplate(proposalData, calculatorData);

        // Check if this proposal should be attached to a lead
        const leadId = localStorage.getItem('proposal-lead-id');
        const leadName = localStorage.getItem('proposal-lead-name');
        
        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const customerName = proposalData.customerName.replace(/[^a-z0-9]/gi, '_');
        const fileName = `proposal-${customerName}-${timestamp}.pdf`;

        // Send to server for PDF generation
        const response = await fetch('/api/calculator/html-to-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            html: processedHtml,
            leadId: leadId || null,
            leadName: leadName || null,
            fileName,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || errorData.error || 'Failed to generate PDF');
        }

        const result = await response.json();

        // Download the PDF
        const link = document.createElement('a');
        link.href = result.pdfUrl;
        link.download = result.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Open PDF in new tab
        window.open(result.pdfUrl, '_blank');

        // Show success message
        if (leadId && leadName) {
          showToast(
            'Proposal Generated & Attached',
            `PDF generated, downloaded, and attached to ${leadName}!`,
            'success'
          );
          
          // Clear the lead ID from localStorage
          localStorage.removeItem('proposal-lead-id');
          localStorage.removeItem('proposal-lead-name');
        } else {
          showToast(
            'Proposal Generated',
            'PDF generated and downloaded successfully!',
            'success'
          );
        }

        if (onGenerate) {
          onGenerate();
        }
      } catch (error) {
        console.error('Error generating HTML proposal:', error);
        showToast(
          'Proposal Generation Failed',
          error instanceof Error ? error.message : 'Failed to generate proposal. Please try again.',
          'error'
        );
      } finally {
        setIsGenerating(false);
      }
    }
  }), [sectionsData, dealDetails, totalsData, settlementDetails, onGenerate]);

  // Don't render portals until mounted (prevents SSR hydration issues)
  if (!mounted) return null;

  return (
    <>
      {/* Toast notification - rendered at document.body level */}
      {toast.show && createPortal(
        <div 
          className={`fixed top-4 right-4 p-4 rounded-lg shadow-2xl z-[99999] max-w-sm animate-slide-up ${
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
        </div>,
        document.body
      )}
      
      {/* Loading overlay - rendered at document.body level to appear above modal */}
      {isGenerating && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999999] flex items-center justify-center">
          <div 
            className="p-6 flex flex-col items-center space-y-3 rounded-xl bg-gradient-to-br from-slate-900/95 to-purple-900/95 border border-purple-500/30 shadow-2xl max-w-md"
            style={{
              backdropFilter: 'blur(50px) saturate(180%)',
              WebkitBackdropFilter: 'blur(50px) saturate(180%)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            }}
          >
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
              <span className="text-white font-medium">Generating PDF Proposal...</span>
            </div>
            <p className="text-purple-200 text-sm text-center">
              Our server is converting your HTML to a professional PDF. This may take a few moments...
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
});

HtmlProposalGenerator.displayName = 'HtmlProposalGenerator';

export default HtmlProposalGenerator;