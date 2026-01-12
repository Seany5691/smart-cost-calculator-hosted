'use client';

import { useState, useEffect } from 'react';
import { useCalculatorStore } from '@/store/calculator';
import { useAuthStore } from '@/store/auth';
import { useConfigStore } from '@/store/config';
import { formatCurrency, getItemCost } from '@/lib/utils';
import { FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { TotalCosts } from '@/lib/types';

// Type for color arrays to fix TypeScript errors
type RGBColor = [number, number, number];

interface PDFGeneratorProps {
  onGenerate?: () => void;
  customTotals?: TotalCosts;
}

export default function PDFGenerator({ onGenerate, customTotals }: PDFGeneratorProps) {
  const { sections, dealDetails, calculateTotalCosts } = useCalculatorStore();
  const { user } = useAuthStore();
  const { scales } = useConfigStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; title: string; message: string; type: 'success' | 'error' }>({ 
    show: false, 
    title: '', 
    message: '', 
    type: 'success' 
  });
  
  // Auto-hide toast after specified duration
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ ...toast, show: false });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const generatePDF = async () => {
    try {
      setIsGenerating(true);
      
      // Auto-save the deal before generating HTML report
      const { saveDeal, updateDealDetails } = useCalculatorStore.getState();
      
      // If custom totals are provided, save the custom gross profit to deal details
      if (customTotals) {
        updateDealDetails({ customGrossProfit: customTotals.totalGrossProfit });
      }
      
      await saveDeal();
      
      // Use custom totals if provided, otherwise fall back to calculated totals
      const totals = customTotals || calculateTotalCosts();
      
      // Helper function to get cost from scales data based on user role
      const getScaleCost = (scaleData: any, userRole: 'admin' | 'manager' | 'user' = 'user', fieldSuffix?: string): any => {
        if (!scaleData || typeof scaleData !== 'object') return 0;
        
        // For additional_costs, we need to handle different field names
        if (fieldSuffix) {
          const managerField = `manager_${fieldSuffix}`;
          const userField = `user_${fieldSuffix}`;
          const baseField = fieldSuffix;
          
          // Admin and Manager should use manager_* fields
          if ((userRole === 'admin' || userRole === 'manager') && scaleData[managerField] !== undefined && scaleData[managerField] !== null) {
            return typeof scaleData[managerField] === 'string' ? parseFloat(scaleData[managerField]) : scaleData[managerField];
          } 
          // User should use user_* fields
          else if (userRole === 'user' && scaleData[userField] !== undefined && scaleData[userField] !== null) {
            return typeof scaleData[userField] === 'string' ? parseFloat(scaleData[userField]) : scaleData[userField];
          } 
          // Fallback to base field
          else if (scaleData[baseField] !== undefined && scaleData[baseField] !== null) {
            return typeof scaleData[baseField] === 'string' ? parseFloat(scaleData[baseField]) : scaleData[baseField];
          }
        } else {
          // Standard cost structure - return the appropriate role-based data (could be object or number)
          // Admin and Manager should use managerCost
          if ((userRole === 'admin' || userRole === 'manager') && scaleData.managerCost !== undefined && scaleData.managerCost !== null) {
            return scaleData.managerCost;
          } 
          // User should use userCost
          else if (userRole === 'user' && scaleData.userCost !== undefined && scaleData.userCost !== null) {
            return scaleData.userCost;
          } 
          // Fallback to regular cost if specific pricing is not available
          else if (scaleData.cost !== undefined && scaleData.cost !== null) {
            return scaleData.cost;
          }
        }
        
        return 0;
      };

      // Calculate extension and fuel costs with proper role-based pricing
      const extensionPointCost = totals.extensionCount * (scales?.additional_costs ? getScaleCost(scales.additional_costs, user?.role || 'user', 'cost_per_point') : 0);
      const fuelCost = dealDetails.distanceToInstall * (scales?.additional_costs ? getScaleCost(scales.additional_costs, user?.role || 'user', 'cost_per_kilometer') : 0);
      const totalInstallationCost = totals.hardwareInstallTotal + extensionPointCost + fuelCost;

      // Get hardware section for detailed breakdown
      const hardwareSection = sections.find(s => s.id === 'hardware');
      const connectivitySection = sections.find(s => s.id === 'connectivity');
      const licensingSection = sections.find(s => s.id === 'licensing');

      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const customerName = dealDetails.customerName || 'Unknown_Customer';
      const filename = `Deal_Breakdown_${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.html`;

      // Create the HTML content for the deal breakdown
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Deal Breakdown - ${dealDetails.customerName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 25px; page-break-inside: avoid; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f2f2f2; font-weight: bold; }
            .summary { background-color: #f8f9fa; padding: 15px; border-radius: 5px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .highlight { background-color: #fff3cd; }
            .monthly-section { background-color: #e8f5e8; padding: 15px; border-radius: 5px; }
            h1 { color: #1976d2; margin-bottom: 10px; }
            h2 { color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 5px; margin-top: 30px; }
            h3 { color: #424242; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📋 Deal Cost Breakdown</h1>
            <h2>${dealDetails.customerName}</h2>
            <p><strong>Rep:</strong> ${user?.name || user?.username || 'Unknown'} (${user?.role || 'user'}) | 
               <strong>Term:</strong> ${dealDetails.term} months | 
               <strong>Escalation:</strong> ${dealDetails.escalation}% | 
               <strong>Extensions:</strong> ${totals.extensionCount}</p>
            <p><strong>Settlement:</strong> ${formatCurrency(dealDetails.settlement)} | 
               <strong>Distance:</strong> ${dealDetails.distanceToInstall} km</p>
          </div>

          <!-- HARDWARE BREAKDOWN -->
          <div class="section">
            <h2>🖥️ Hardware Analysis (One-Time Costs)</h2>
            <table class="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th class="text-center">Qty</th>
                  <th class="text-right">${user?.role === 'admin' || user?.role === 'manager' ? 'Manager' : 'User'} Price</th>
                  <th class="text-right">Total ${user?.role === 'admin' || user?.role === 'manager' ? 'Manager' : 'User'}</th>
                </tr>
              </thead>
              <tbody>
                ${hardwareSection?.items.filter(item => item.quantity > 0).map((item: any) => {
                  const itemCost = getItemCost(item, user?.role || 'user');
                  const totalCost = itemCost * item.quantity;
                  return `
                    <tr>
                      <td>${item.name}</td>
                      <td class="text-center">${item.quantity}</td>
                      <td class="text-right">${formatCurrency(itemCost)}</td>
                      <td class="text-right">${formatCurrency(totalCost)}</td>
                    </tr>
                  `;
                }).join('') || '<tr><td colspan="4" class="text-center">No hardware items selected</td></tr>'}
                <tr class="font-bold highlight">
                  <td colspan="3">HARDWARE TOTAL:</td>
                  <td class="text-right">${formatCurrency(totals.hardwareTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- MONTHLY RECURRING COSTS -->
          <div class="section monthly-section">
            <h2>📅 Monthly Recurring Revenue Analysis</h2>
            
            <h3>🌐 Connectivity (Monthly)</h3>
            <table class="table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th class="text-center">Qty</th>
                  <th class="text-right">${user?.role === 'admin' || user?.role === 'manager' ? 'Manager' : 'User'} Price</th>
                  <th class="text-right">Total Monthly</th>
                </tr>
              </thead>
              <tbody>
                ${connectivitySection?.items.filter(item => item.quantity > 0).map((item: any) => {
                  const itemCost = getItemCost(item, user?.role || 'user');
                  const totalCost = itemCost * item.quantity;
                  return `
                    <tr>
                      <td>${item.name}</td>
                      <td class="text-center">${item.quantity}</td>
                      <td class="text-right">${formatCurrency(itemCost)}</td>
                      <td class="text-right">${formatCurrency(totalCost)}</td>
                    </tr>
                  `;
                }).join('') || '<tr><td colspan="4" class="text-center">No connectivity services selected</td></tr>'}
                <tr class="font-bold highlight">
                  <td colspan="3">CONNECTIVITY TOTAL:</td>
                  <td class="text-right">${formatCurrency(totals.connectivityCost)}</td>
                </tr>
              </tbody>
            </table>

            <h3>📄 Licensing (Monthly)</h3>
            <table class="table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th class="text-center">Qty</th>
                  <th class="text-right">${user?.role === 'admin' || user?.role === 'manager' ? 'Manager' : 'User'} Price</th>
                  <th class="text-right">Total Monthly</th>
                </tr>
              </thead>
              <tbody>
                ${licensingSection?.items.filter(item => item.quantity > 0).map((item: any) => {
                  const itemCost = getItemCost(item, user?.role || 'user');
                  const totalCost = itemCost * item.quantity;
                  return `
                    <tr>
                      <td>${item.name}</td>
                      <td class="text-center">${item.quantity}</td>
                      <td class="text-right">${formatCurrency(itemCost)}</td>
                      <td class="text-right">${formatCurrency(totalCost)}</td>
                    </tr>
                  `;
                }).join('') || '<tr><td colspan="4" class="text-center">No licensing services selected</td></tr>'}
                <tr class="font-bold highlight">
                  <td colspan="3">LICENSING TOTAL:</td>
                  <td class="text-right">${formatCurrency(totals.licensingCost)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- COST SUMMARY -->
          <div class="section">
            <h2>💰 Cost Summary</h2>
            <table class="table">
              <thead>
                <tr>
                  <th>Cost Type</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Number of Extensions</td>
                  <td class="text-right">${totals.extensionCount}</td>
                </tr>
                <tr>
                  <td>Hardware Total</td>
                  <td class="text-right">${formatCurrency(totals.hardwareTotal)}</td>
                </tr>
                <tr>
                  <td>Installation Cost (Inc. Extensions & Fuel)</td>
                  <td class="text-right">${formatCurrency(totalInstallationCost)}</td>
                </tr>
                <tr class="highlight">
                  <td class="font-bold">Subtotal (Hardware + Installation)</td>
                  <td class="text-right font-bold">${formatCurrency(totals.hardwareTotal + totalInstallationCost)}</td>
                </tr>
                <tr>
                  <td>Total Gross Profit</td>
                  <td class="text-right">${formatCurrency(totals.totalGrossProfit)}</td>
                </tr>
                <tr>
                  <td>Finance Fee</td>
                  <td class="text-right">${formatCurrency(totals.financeFee)}</td>
                </tr>
                <tr>
                  <td>Settlement Amount</td>
                  <td class="text-right">${formatCurrency(totals.settlementAmount)}</td>
                </tr>
                <tr class="highlight">
                  <td class="font-bold">Total Payout</td>
                  <td class="text-right font-bold">${formatCurrency(totals.totalPayout)}</td>
                </tr>
                <tr>
                  <td>Hardware Rental (Monthly)</td>
                  <td class="text-right">${formatCurrency(totals.hardwareRental)}</td>
                </tr>
                <tr>
                  <td>Connectivity Cost (Monthly)</td>
                  <td class="text-right">${formatCurrency(totals.connectivityCost)}</td>
                </tr>
                <tr>
                  <td>Licensing Cost (Monthly)</td>
                  <td class="text-right">${formatCurrency(totals.licensingCost)}</td>
                </tr>
                <tr class="highlight">
                  <td class="font-bold">Total MRC</td>
                  <td class="text-right font-bold">${formatCurrency(totals.totalMRC)}</td>
                </tr>
                <tr>
                  <td>Total Excluding VAT</td>
                  <td class="text-right">${formatCurrency(totals.totalExVat)}</td>
                </tr>
                <tr>
                  <td>VAT (15%)</td>
                  <td class="text-right">${formatCurrency(totals.totalIncVat - totals.totalExVat)}</td>
                </tr>
                <tr class="highlight">
                  <td class="font-bold">Total Including VAT</td>
                  <td class="text-right font-bold">${formatCurrency(totals.totalIncVat)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- DEAL SUMMARY -->
          <div class="section summary">
            <h2>📊 Deal Summary</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                <h3>Deal Details</h3>
                <p><strong>Customer:</strong> ${dealDetails.customerName}</p>
                <p><strong>Term:</strong> ${dealDetails.term} months</p>
                <p><strong>Escalation:</strong> ${dealDetails.escalation}%</p>
                <p><strong>Extensions:</strong> ${totals.extensionCount}</p>
                <p><strong>Distance:</strong> ${dealDetails.distanceToInstall} km</p>
              </div>
              <div>
                <h3>Financial Summary</h3>
                <p><strong>Total Payout:</strong> ${formatCurrency(totals.totalPayout)}</p>
                <p><strong>Monthly Rental:</strong> ${formatCurrency(totals.totalMRC)}</p>
                <p><strong>Factor Used:</strong> ${totals.factorUsed.toFixed(5)}</p>
                <p><strong>Pricing Level:</strong> ${user?.role === 'admin' || user?.role === 'manager' ? 'Manager' : 'User'}</p>
              </div>
            </div>
          </div>

          <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #666;">
            <p>Generated on ${new Date().toLocaleDateString('en-GB')} by ${user?.name || user?.username || 'Unknown'}</p>
            <p>Smart Cost Calculator - Deal Breakdown Report</p>
          </div>
        </body>
        </html>
      `;

      // Create and download the HTML file
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Open in new window for print preview
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        
        // Wait a moment for content to load, then trigger print dialog
        setTimeout(() => {
          printWindow.print();
        }, 1000);
      }

      // Log activity: pdf_generated
      try {
        const { logActivity } = await import('@/lib/activityLogger');
        const { currentDealId } = useCalculatorStore.getState();
        
        if (user) {
          logActivity({
            userId: user.id,
            username: user.username,
            userRole: user.role,
            activityType: 'pdf_generated',
            dealId: currentDealId || undefined,
            dealName: dealDetails.customerName
          });
        }
      } catch (logError) {
        console.warn('Failed to log pdf_generated activity:', logError);
      }

      setToast({
        show: true,
        title: 'Report Generated Successfully',
        message: 'Your deal breakdown HTML report has been downloaded and opened for printing',
        type: 'success'
      });

      if (onGenerate) {
        onGenerate();
      }
    } catch (error) {
      console.error('Error generating HTML report:', error);
      setToast({
        show: true,
        title: 'Report Generation Failed',
        message: 'Failed to generate HTML report. Please try again.',
        type: 'error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Toast notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${
          toast.type === 'error' 
            ? 'bg-red-50 border border-red-200 text-red-800' 
            : 'bg-green-50 border border-green-200 text-green-800'
        }`}>
          <div className="flex items-start space-x-3">
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-semibold">{toast.title}</div>
              <div className="text-sm mt-1">{toast.message}</div>
            </div>
          </div>
        </div>
      )}
      
      <button
        className="btn btn-primary flex items-center space-x-2"
        onClick={generatePDF}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Generating PDF...</span>
          </>
        ) : (
          <>
            <FileText className="w-4 h-4" />
            <span>Generate PDF</span>
          </>
        )}
      </button>
    </>
  );
}
