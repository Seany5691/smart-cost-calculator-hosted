'use client';

import { useState, useRef } from 'react';
import { useCalculatorStore } from '@/lib/store/calculator';
import { useAuthStore } from '@/lib/store/auth-simple';
import { useConfigStore } from '@/lib/store/config';

interface PDFGeneratorProps {
  onGenerate?: () => void;
}

export default function PDFGenerator({ onGenerate }: PDFGeneratorProps) {
  const { sectionsData, dealDetails, totalsData } = useCalculatorStore();
  const { user } = useAuthStore();
  const { scales } = useConfigStore();
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

  const formatCurrency = (amount: number): string => {
    return `R ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
  };

  const getItemCost = (item: any, userRole: string): number => {
    if (userRole === 'admin' || userRole === 'manager') {
      return item.managerCost || item.cost || 0;
    }
    return item.userCost || item.cost || 0;
  };

  const getScaleCost = (scaleData: any, userRole: string, fieldSuffix?: string): number => {
    if (!scaleData || typeof scaleData !== 'object') return 0;
    
    if (fieldSuffix) {
      const managerField = `manager_${fieldSuffix}`;
      const userField = `user_${fieldSuffix}`;
      const baseField = fieldSuffix;
      
      if ((userRole === 'admin' || userRole === 'manager') && scaleData[managerField] !== undefined) {
        return typeof scaleData[managerField] === 'string' ? parseFloat(scaleData[managerField]) : scaleData[managerField];
      } else if (userRole === 'user' && scaleData[userField] !== undefined) {
        return typeof scaleData[userField] === 'string' ? parseFloat(scaleData[userField]) : scaleData[userField];
      } else if (scaleData[baseField] !== undefined) {
        return typeof scaleData[baseField] === 'string' ? parseFloat(scaleData[baseField]) : scaleData[baseField];
      }
    }
    
    return 0;
  };

  const generatePDF = async () => {
    try {
      setIsGenerating(true);

      const userRole = user?.role || 'user';
      const extensionCount = totalsData?.extensionCount || 0;
      
      // Get the breakdown from totalsData (matches TotalCostsStep display)
      const installationBase = totalsData?.installationBase || 0;
      const extensionTotal = totalsData?.extensionTotal || 0;
      const fuelTotal = totalsData?.fuelTotal || 0;
      const totalInstallationCost = installationBase + extensionTotal + fuelTotal;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const customerName = dealDetails.customerName || 'Unknown_Customer';
      const filename = `Deal_Breakdown_${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.html`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Deal Breakdown - ${dealDetails.customerName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
              color: #e2e8f0;
              padding: 40px;
              line-height: 1.6;
            }
            
            .container {
              max-width: 1200px;
              margin: 0 auto;
            }
            
            .header { 
              text-align: center;
              margin-bottom: 40px;
              padding: 30px;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 16px;
              backdrop-filter: blur(10px);
            }
            
            .header h1 {
              font-size: 36px;
              font-weight: 700;
              background: linear-gradient(135deg, #a78bfa 0%, #ec4899 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              margin-bottom: 10px;
            }
            
            .header h2 {
              font-size: 24px;
              color: #cbd5e1;
              font-weight: 600;
              margin-bottom: 20px;
            }
            
            .header-info {
              display: flex;
              justify-content: space-around;
              flex-wrap: wrap;
              gap: 20px;
              margin-top: 20px;
            }
            
            .header-info-item {
              text-align: center;
            }
            
            .header-info-label {
              font-size: 12px;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 5px;
            }
            
            .header-info-value {
              font-size: 16px;
              color: #e2e8f0;
              font-weight: 600;
            }
            
            .section { 
              margin-bottom: 30px;
              padding: 25px;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 16px;
              backdrop-filter: blur(10px);
              page-break-inside: avoid;
            }
            
            .section-title {
              font-size: 20px;
              font-weight: 700;
              color: #e2e8f0;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 2px solid rgba(167, 139, 250, 0.3);
              display: flex;
              align-items: center;
              gap: 10px;
            }
            
            .section-icon {
              font-size: 24px;
            }
            
            .table { 
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              margin-bottom: 15px;
            }
            
            .table th, .table td { 
              padding: 12px 16px;
              text-align: left;
            }
            
            .table th { 
              background: rgba(167, 139, 250, 0.1);
              color: #c4b5fd;
              font-weight: 600;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-bottom: 2px solid rgba(167, 139, 250, 0.3);
            }
            
            .table tbody tr {
              border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .table tbody tr:hover {
              background: rgba(255, 255, 255, 0.02);
            }
            
            .table td {
              color: #cbd5e1;
              font-size: 14px;
            }
            
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: 700; color: #e2e8f0; }
            
            .highlight { 
              background: rgba(167, 139, 250, 0.1);
              border-top: 2px solid rgba(167, 139, 250, 0.3);
              border-bottom: 2px solid rgba(167, 139, 250, 0.3);
            }
            
            .highlight td {
              font-weight: 600;
              color: #e2e8f0;
              padding: 16px;
            }
            
            .monthly-section { 
              background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%);
              border: 1px solid rgba(16, 185, 129, 0.2);
            }
            
            .monthly-section .section-title {
              border-bottom-color: rgba(16, 185, 129, 0.3);
              color: #6ee7b7;
            }
            
            .subsection-title {
              font-size: 16px;
              font-weight: 600;
              color: #cbd5e1;
              margin: 20px 0 15px 0;
              padding-left: 10px;
              border-left: 3px solid rgba(167, 139, 250, 0.5);
            }
            
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 30px;
              margin-top: 20px;
            }
            
            .summary-item {
              padding: 20px;
              background: rgba(255, 255, 255, 0.03);
              border-radius: 12px;
              border: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .summary-item h3 {
              font-size: 14px;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 15px;
            }
            
            .summary-item p {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
              font-size: 14px;
            }
            
            .summary-item strong {
              color: #e2e8f0;
              font-weight: 600;
            }
            
            .footer {
              margin-top: 40px;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #64748b;
              border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              background: rgba(167, 139, 250, 0.2);
              color: #c4b5fd;
              margin-left: 10px;
            }
            
            @media print {
              body { background: white; color: black; }
              .section { border: 1px solid #ddd; }
              .header h1 { color: #7c3aed; }
            }
          </style>
        </head>
        <body>
          <div class="container">
          <div class="header">
            <h1>📋 Deal Cost Breakdown</h1>
            <h2>${dealDetails.customerName}</h2>
            <div class="header-info">
              <div class="header-info-item">
                <div class="header-info-label">Representative</div>
                <div class="header-info-value">${user?.name || user?.username || 'Unknown'}</div>
              </div>
              <div class="header-info-item">
                <div class="header-info-label">Role</div>
                <div class="header-info-value">${userRole}</div>
              </div>
              <div class="header-info-item">
                <div class="header-info-label">Contract Term</div>
                <div class="header-info-value">${dealDetails.term} months</div>
              </div>
              <div class="header-info-item">
                <div class="header-info-label">Escalation</div>
                <div class="header-info-value">${dealDetails.escalation}%</div>
              </div>
              <div class="header-info-item">
                <div class="header-info-label">Extensions</div>
                <div class="header-info-value">${extensionCount}</div>
              </div>
              <div class="header-info-item">
                <div class="header-info-label">Settlement</div>
                <div class="header-info-value">${formatCurrency(dealDetails.settlement)}</div>
              </div>
              <div class="header-info-item">
                <div class="header-info-label">Distance</div>
                <div class="header-info-value">${dealDetails.distance} km</div>
              </div>
            </div>
          </div>

          <!-- HARDWARE BREAKDOWN -->
          <div class="section">
            <h2 class="section-title"><span class="section-icon">🖥️</span> Hardware Analysis (One-Time Costs)</h2>
            <table class="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th class="text-center">Qty</th>
                  <th class="text-right">${userRole === 'admin' || userRole === 'manager' ? 'Manager' : 'User'} Price</th>
                  <th class="text-right">Total ${userRole === 'admin' || userRole === 'manager' ? 'Manager' : 'User'}</th>
                </tr>
              </thead>
              <tbody>
                ${sectionsData.hardware.filter(item => item.selectedQuantity > 0).map(item => {
                  const itemCost = getItemCost(item, userRole);
                  const totalCost = itemCost * item.selectedQuantity;
                  return `
                    <tr>
                      <td>${item.name}</td>
                      <td class="text-center">${item.selectedQuantity}</td>
                      <td class="text-right">${formatCurrency(itemCost)}</td>
                      <td class="text-right">${formatCurrency(totalCost)}</td>
                    </tr>
                  `;
                }).join('') || '<tr><td colspan="4" class="text-center">No hardware items selected</td></tr>'}
                <tr class="highlight">
                  <td colspan="3" class="font-bold">HARDWARE TOTAL:</td>
                  <td class="text-right font-bold">${formatCurrency(totalsData?.hardwareTotal || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- MONTHLY RECURRING COSTS -->
          <div class="section monthly-section">
            <h2 class="section-title"><span class="section-icon">📅</span> Monthly Recurring Revenue Analysis</h2>
            
            <h3 class="subsection-title">🌐 Connectivity (Monthly)</h3>
            <table class="table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th class="text-center">Qty</th>
                  <th class="text-right">${userRole === 'admin' || userRole === 'manager' ? 'Manager' : 'User'} Price</th>
                  <th class="text-right">Total Monthly</th>
                </tr>
              </thead>
              <tbody>
                ${sectionsData.connectivity.filter(item => item.selectedQuantity > 0).map(item => {
                  const itemCost = getItemCost(item, userRole);
                  const totalCost = itemCost * item.selectedQuantity;
                  return `
                    <tr>
                      <td>${item.name}</td>
                      <td class="text-center">${item.selectedQuantity}</td>
                      <td class="text-right">${formatCurrency(itemCost)}</td>
                      <td class="text-right">${formatCurrency(totalCost)}</td>
                    </tr>
                  `;
                }).join('') || '<tr><td colspan="4" class="text-center">No connectivity services selected</td></tr>'}
                <tr class="highlight">
                  <td colspan="3" class="font-bold">CONNECTIVITY TOTAL:</td>
                  <td class="text-right font-bold">${formatCurrency(totalsData?.connectivityTotal || 0)}</td>
                </tr>
              </tbody>
            </table>

            <h3 class="subsection-title">📄 Licensing (Monthly)</h3>
            <table class="table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th class="text-center">Qty</th>
                  <th class="text-right">${userRole === 'admin' || userRole === 'manager' ? 'Manager' : 'User'} Price</th>
                  <th class="text-right">Total Monthly</th>
                </tr>
              </thead>
              <tbody>
                ${sectionsData.licensing.filter(item => item.selectedQuantity > 0).map(item => {
                  const itemCost = getItemCost(item, userRole);
                  const totalCost = itemCost * item.selectedQuantity;
                  return `
                    <tr>
                      <td>${item.name}</td>
                      <td class="text-center">${item.selectedQuantity}</td>
                      <td class="text-right">${formatCurrency(itemCost)}</td>
                      <td class="text-right">${formatCurrency(totalCost)}</td>
                    </tr>
                  `;
                }).join('') || '<tr><td colspan="4" class="text-center">No licensing services selected</td></tr>'}
                <tr class="highlight">
                  <td colspan="3" class="font-bold">LICENSING TOTAL:</td>
                  <td class="text-right font-bold">${formatCurrency(totalsData?.licensingTotal || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- COST SUMMARY -->
          <div class="section">
            <h2 class="section-title"><span class="section-icon">💰</span> Cost Summary</h2>
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
                  <td class="text-right">${extensionCount}</td>
                </tr>
                <tr>
                  <td>Hardware Total</td>
                  <td class="text-right">${formatCurrency(totalsData?.hardwareTotal || 0)}</td>
                </tr>
                <tr>
                  <td>Installation Base</td>
                  <td class="text-right">${formatCurrency(installationBase)}</td>
                </tr>
                <tr>
                  <td>Extension Cost</td>
                  <td class="text-right">${formatCurrency(extensionTotal)}</td>
                </tr>
                <tr>
                  <td>Fuel Cost</td>
                  <td class="text-right">${formatCurrency(fuelTotal)}</td>
                </tr>
                <tr class="highlight">
                  <td class="font-bold">Total Hardware Installed</td>
                  <td class="text-right font-bold">${formatCurrency((totalsData?.hardwareTotal || 0) + totalInstallationCost)}</td>
                </tr>
                <tr>
                  <td>Gross Profit</td>
                  <td class="text-right">${formatCurrency(totalsData?.grossProfit || 0)}</td>
                </tr>
                <tr>
                  <td>Settlement Amount</td>
                  <td class="text-right">${formatCurrency(totalsData?.actualSettlement || 0)}</td>
                </tr>
                <tr>
                  <td>Finance Fee</td>
                  <td class="text-right">${formatCurrency(totalsData?.financeFee || 0)}</td>
                </tr>
                <tr class="highlight">
                  <td class="font-bold">Total Payout</td>
                  <td class="text-right font-bold">${formatCurrency(totalsData?.totalPayout || 0)}</td>
                </tr>
                <tr>
                  <td>Hardware Rental (Monthly)</td>
                  <td class="text-right">${formatCurrency(totalsData?.hardwareRental || 0)}</td>
                </tr>
                <tr>
                  <td>Connectivity Cost (Monthly)</td>
                  <td class="text-right">${formatCurrency(totalsData?.connectivityTotal || 0)}</td>
                </tr>
                <tr>
                  <td>Licensing Cost (Monthly)</td>
                  <td class="text-right">${formatCurrency(totalsData?.licensingTotal || 0)}</td>
                </tr>
                <tr class="highlight">
                  <td class="font-bold">Total MRC (Ex VAT)</td>
                  <td class="text-right font-bold">${formatCurrency(totalsData?.totalMRC || 0)}</td>
                </tr>
                <tr>
                  <td>VAT (15%)</td>
                  <td class="text-right">${formatCurrency((totalsData?.totalWithVAT || 0) - (totalsData?.totalExVAT || 0))}</td>
                </tr>
                <tr class="highlight">
                  <td class="font-bold">Total MRC (Inc VAT)</td>
                  <td class="text-right font-bold">${formatCurrency(totalsData?.totalWithVAT || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- DEAL SUMMARY -->
          <div class="section">
            <h2 class="section-title"><span class="section-icon">📊</span> Deal Summary</h2>
            <div class="summary-grid">
              <div class="summary-item">
                <h3>Deal Details</h3>
                <p><span>Customer:</span> <strong>${dealDetails.customerName}</strong></p>
                <p><span>Term:</span> <strong>${dealDetails.term} months</strong></p>
                <p><span>Escalation:</span> <strong>${dealDetails.escalation}%</strong></p>
                <p><span>Extensions:</span> <strong>${extensionCount}</strong></p>
                <p><span>Distance:</span> <strong>${dealDetails.distance} km</strong></p>
              </div>
              <div class="summary-item">
                <h3>Financial Summary</h3>
                <p><span>Total Payout:</span> <strong>${formatCurrency(totalsData?.totalPayout || 0)}</strong></p>
                <p><span>Monthly Rental:</span> <strong>${formatCurrency(totalsData?.totalMRC || 0)}</strong></p>
                <p><span>Factor Used:</span> <strong>${(totalsData?.factor || 0).toFixed(5)}</strong></p>
                <p><span>Pricing Level:</span> <strong>${userRole === 'admin' || userRole === 'manager' ? 'Manager' : 'User'}</strong></p>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')} by ${user?.name || user?.username || 'Unknown'}</p>
            <p style="margin-top: 10px;">Smart Cost Calculator - Professional Deal Breakdown Report</p>
          </div>
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

      // Open in new window for viewing (user can print manually if needed)
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      }

      showToast(
        'Report Generated Successfully',
        'Your deal breakdown HTML report has been downloaded and opened in a new tab',
        'success'
      );

      if (onGenerate) {
        onGenerate();
      }
    } catch (error) {
      console.error('Error generating HTML report:', error);
      showToast(
        'Report Generation Failed',
        'Failed to generate HTML report. Please try again.',
        'error'
      );
    } finally {
      setIsGenerating(false);
    }
  };

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
      
      <button
        onClick={generatePDF}
        disabled={isGenerating}
        className="px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Generating PDF...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Generate PDF</span>
          </>
        )}
      </button>
    </>
  );
}
