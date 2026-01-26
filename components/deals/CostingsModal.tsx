'use client';

import { Costings } from '@/lib/store/deals';
import { X } from 'lucide-react';
import HardwareBreakdown from './costings/HardwareBreakdown';
import ConnectivityBreakdown from './costings/ConnectivityBreakdown';
import LicensingBreakdown from './costings/LicensingBreakdown';
import TotalsComparison from './costings/TotalsComparison';
import GrossProfitAnalysis from './costings/GrossProfitAnalysis';
import TermAnalysis from './costings/TermAnalysis';

interface CostingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  costings: Costings | null;
  isLoading?: boolean;
}

/**
 * CostingsModal Component
 * 
 * Full-screen modal displaying detailed cost breakdown for admin analysis
 * - Hardware, Connectivity, Licensing breakdowns
 * - Totals comparison (actual vs rep)
 * - Gross profit analysis
 * - Term analysis
 * - Print-friendly layout
 * 
 * Requirements: AC-6.1 through AC-9.6
 */
export default function CostingsModal({ isOpen, onClose, costings, isLoading }: CostingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative w-full max-w-6xl bg-gradient-to-br from-slate-900 via-orange-900/20 to-slate-900 rounded-2xl shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-300 z-10"
            title="Close"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Loading State */}
          {isLoading && (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mb-4"></div>
              <p className="text-white">Generating cost breakdown...</p>
            </div>
          )}

          {/* Content */}
          {!isLoading && costings && (
            <div className="p-8 space-y-8">
              {/* Header */}
              <div className="border-b border-white/10 pb-6">
                <h2 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                  Cost Breakdown Analysis
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-400">Deal Name</p>
                    <p className="text-white font-semibold">{costings.dealName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Customer</p>
                    <p className="text-white font-semibold">{costings.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Created By</p>
                    <p className="text-white font-semibold">{costings.createdBy}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">User Role</p>
                    <p className="text-white font-semibold capitalize">{costings.userRole}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Term</p>
                    <p className="text-white font-semibold">{costings.term} months</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Escalation</p>
                    <p className="text-white font-semibold">{costings.escalation}%</p>
                  </div>
                </div>
              </div>

              {/* Hardware Breakdown */}
              <HardwareBreakdown hardware={costings.hardware} />

              {/* Connectivity Breakdown */}
              <ConnectivityBreakdown connectivity={costings.connectivity} />

              {/* Licensing Breakdown */}
              <LicensingBreakdown licensing={costings.licensing} />

              {/* Totals Comparison */}
              <TotalsComparison totals={costings.totals} />

              {/* Gross Profit Analysis */}
              <GrossProfitAnalysis grossProfit={costings.grossProfit} />

              {/* Term Analysis */}
              <TermAnalysis termAnalysis={costings.termAnalysis} />

              {/* Print Button */}
              <div className="flex justify-center pt-6 border-t border-white/10">
                <button
                  onClick={() => generateCostingsHTML(costings)}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all duration-300 shadow-lg hover:shadow-orange-500/50 font-medium flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Print Cost Breakdown
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to generate HTML for costings
function generateCostingsHTML(costings: Costings) {
  const formatCurrency = (value: number): string => {
    return `R ${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
  };

  const formatNumber = (value: number): string => {
    return value.toFixed(5);
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const customerName = costings.customerName || 'Unknown_Customer';
  const filename = `Cost_Breakdown_${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.html`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cost Breakdown Analysis - ${costings.customerName}</title>
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
          max-width: 1400px;
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
          background: linear-gradient(135deg, #fb923c 0%, #f59e0b 100%);
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
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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
          border-bottom: 2px solid rgba(251, 146, 60, 0.3);
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
          background: rgba(251, 146, 60, 0.1);
          color: #fdba74;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid rgba(251, 146, 60, 0.3);
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
          background: rgba(251, 146, 60, 0.1);
          border-top: 2px solid rgba(251, 146, 60, 0.3);
          border-bottom: 2px solid rgba(251, 146, 60, 0.3);
        }
        
        .highlight td {
          font-weight: 600;
          color: #e2e8f0;
          padding: 16px;
        }
        
        .positive { color: #6ee7b7; }
        .negative { color: #fca5a5; }
        .neutral { color: #cbd5e1; }
        
        .footer {
          margin-top: 40px;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        @media print {
          body { background: white; color: black; }
          .section { border: 1px solid #ddd; }
          .header h1 { color: #ea580c; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Cost Breakdown Analysis</h1>
          <h2>${costings.customerName}</h2>
          <div class="header-info">
            <div class="header-info-item">
              <div class="header-info-label">Deal Name</div>
              <div class="header-info-value">${costings.dealName}</div>
            </div>
            <div class="header-info-item">
              <div class="header-info-label">Created By</div>
              <div class="header-info-value">${costings.createdBy}</div>
            </div>
            <div class="header-info-item">
              <div class="header-info-label">User Role</div>
              <div class="header-info-value">${costings.userRole}</div>
            </div>
            <div class="header-info-item">
              <div class="header-info-label">Term</div>
              <div class="header-info-value">${costings.term} months</div>
            </div>
            <div class="header-info-item">
              <div class="header-info-label">Escalation</div>
              <div class="header-info-value">${costings.escalation}%</div>
            </div>
          </div>
        </div>

        <!-- HARDWARE BREAKDOWN -->
        <div class="section">
          <h2 class="section-title">🖥️ Hardware Breakdown</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Item</th>
                <th class="text-center">Quantity</th>
                <th class="text-right">Actual Cost</th>
                <th class="text-right">Rep Cost</th>
                <th class="text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              ${costings.hardware.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right">${formatCurrency(item.actualCost * item.quantity)}</td>
                  <td class="text-right">${formatCurrency(item.repCost * item.quantity)}</td>
                  <td class="text-right ${item.profit > 0 ? 'positive' : item.profit < 0 ? 'negative' : 'neutral'}">${formatCurrency(item.profit * item.quantity)}</td>
                </tr>
              `).join('')}
              <tr class="highlight">
                <td colspan="2" class="font-bold">TOTAL:</td>
                <td class="text-right font-bold">${formatCurrency(costings.hardware.totalActual)}</td>
                <td class="text-right font-bold">${formatCurrency(costings.hardware.totalRep)}</td>
                <td class="text-right font-bold ${costings.hardware.totalProfit > 0 ? 'positive' : costings.hardware.totalProfit < 0 ? 'negative' : 'neutral'}">${formatCurrency(costings.hardware.totalProfit)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- CONNECTIVITY BREAKDOWN -->
        <div class="section">
          <h2 class="section-title">🌐 Connectivity Breakdown</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Service</th>
                <th class="text-center">Quantity</th>
                <th class="text-right">Actual Cost</th>
                <th class="text-right">Rep Cost</th>
                <th class="text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              ${costings.connectivity.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right">${formatCurrency(item.actualCost * item.quantity)}</td>
                  <td class="text-right">${formatCurrency(item.repCost * item.quantity)}</td>
                  <td class="text-right ${item.profit > 0 ? 'positive' : item.profit < 0 ? 'negative' : 'neutral'}">${formatCurrency(item.profit * item.quantity)}</td>
                </tr>
              `).join('')}
              <tr class="highlight">
                <td colspan="2" class="font-bold">TOTAL:</td>
                <td class="text-right font-bold">${formatCurrency(costings.connectivity.totalActual)}</td>
                <td class="text-right font-bold">${formatCurrency(costings.connectivity.totalRep)}</td>
                <td class="text-right font-bold ${costings.connectivity.totalProfit > 0 ? 'positive' : costings.connectivity.totalProfit < 0 ? 'negative' : 'neutral'}">${formatCurrency(costings.connectivity.totalProfit)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- LICENSING BREAKDOWN -->
        <div class="section">
          <h2 class="section-title">📄 Licensing Breakdown</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Service</th>
                <th class="text-center">Quantity</th>
                <th class="text-right">Actual Cost</th>
                <th class="text-right">Rep Cost</th>
                <th class="text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              ${costings.licensing.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right">${formatCurrency(item.actualCost * item.quantity)}</td>
                  <td class="text-right">${formatCurrency(item.repCost * item.quantity)}</td>
                  <td class="text-right ${item.profit > 0 ? 'positive' : item.profit < 0 ? 'negative' : 'neutral'}">${formatCurrency(item.profit * item.quantity)}</td>
                </tr>
              `).join('')}
              <tr class="highlight">
                <td colspan="2" class="font-bold">TOTAL:</td>
                <td class="text-right font-bold">${formatCurrency(costings.licensing.totalActual)}</td>
                <td class="text-right font-bold">${formatCurrency(costings.licensing.totalRep)}</td>
                <td class="text-right font-bold ${costings.licensing.totalProfit > 0 ? 'positive' : costings.licensing.totalProfit < 0 ? 'negative' : 'neutral'}">${formatCurrency(costings.licensing.totalProfit)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- TOTALS COMPARISON -->
        <div class="section">
          <h2 class="section-title">💰 Totals Comparison</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Category</th>
                <th class="text-right">Actual Cost</th>
                <th class="text-right">Rep Cost</th>
                <th class="text-right">Difference</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Hardware Total</td>
                <td class="text-right">${formatCurrency(costings.totals.hardwareTotal.actual)}</td>
                <td class="text-right">${formatCurrency(costings.totals.hardwareTotal.rep)}</td>
                <td class="text-right ${(costings.totals.hardwareTotal.rep - costings.totals.hardwareTotal.actual) > 0 ? 'positive' : (costings.totals.hardwareTotal.rep - costings.totals.hardwareTotal.actual) < 0 ? 'negative' : 'neutral'}">${formatCurrency(costings.totals.hardwareTotal.rep - costings.totals.hardwareTotal.actual)}</td>
              </tr>
              <tr>
                <td>Installation Total</td>
                <td class="text-right">${formatCurrency(costings.totals.installationTotal.actual)}</td>
                <td class="text-right">${formatCurrency(costings.totals.installationTotal.rep)}</td>
                <td class="text-right ${(costings.totals.installationTotal.rep - costings.totals.installationTotal.actual) > 0 ? 'positive' : (costings.totals.installationTotal.rep - costings.totals.installationTotal.actual) < 0 ? 'negative' : 'neutral'}">${formatCurrency(costings.totals.installationTotal.rep - costings.totals.installationTotal.actual)}</td>
              </tr>
              <tr>
                <td>Connectivity Total</td>
                <td class="text-right">${formatCurrency(costings.totals.connectivityTotal.actual)}</td>
                <td class="text-right">${formatCurrency(costings.totals.connectivityTotal.rep)}</td>
                <td class="text-right ${(costings.totals.connectivityTotal.rep - costings.totals.connectivityTotal.actual) > 0 ? 'positive' : (costings.totals.connectivityTotal.rep - costings.totals.connectivityTotal.actual) < 0 ? 'negative' : 'neutral'}">${formatCurrency(costings.totals.connectivityTotal.rep - costings.totals.connectivityTotal.actual)}</td>
              </tr>
              <tr>
                <td>Licensing Total</td>
                <td class="text-right">${formatCurrency(costings.totals.licensingTotal.actual)}</td>
                <td class="text-right">${formatCurrency(costings.totals.licensingTotal.rep)}</td>
                <td class="text-right ${(costings.totals.licensingTotal.rep - costings.totals.licensingTotal.actual) > 0 ? 'positive' : (costings.totals.licensingTotal.rep - costings.totals.licensingTotal.actual) < 0 ? 'negative' : 'neutral'}">${formatCurrency(costings.totals.licensingTotal.rep - costings.totals.licensingTotal.actual)}</td>
              </tr>
              <tr>
                <td>Settlement</td>
                <td class="text-right">${formatCurrency(costings.totals.settlement.actual)}</td>
                <td class="text-right">${formatCurrency(costings.totals.settlement.rep)}</td>
                <td class="text-right ${(costings.totals.settlement.rep - costings.totals.settlement.actual) > 0 ? 'positive' : (costings.totals.settlement.rep - costings.totals.settlement.actual) < 0 ? 'negative' : 'neutral'}">${formatCurrency(costings.totals.settlement.rep - costings.totals.settlement.actual)}</td>
              </tr>
              <tr>
                <td>Finance Fee</td>
                <td class="text-right">${formatCurrency(costings.totals.financeFee.actual)}</td>
                <td class="text-right">${formatCurrency(costings.totals.financeFee.rep)}</td>
                <td class="text-right ${(costings.totals.financeFee.rep - costings.totals.financeFee.actual) > 0 ? 'positive' : (costings.totals.financeFee.rep - costings.totals.financeFee.actual) < 0 ? 'negative' : 'neutral'}">${formatCurrency(costings.totals.financeFee.rep - costings.totals.financeFee.actual)}</td>
              </tr>
              <tr>
                <td>Factor</td>
                <td class="text-right">${formatNumber(costings.totals.factor.actual)}</td>
                <td class="text-right">${formatNumber(costings.totals.factor.rep)}</td>
                <td class="text-right ${(costings.totals.factor.actual - costings.totals.factor.rep) > 0 ? 'positive' : (costings.totals.factor.actual - costings.totals.factor.rep) < 0 ? 'negative' : 'neutral'}">${formatNumber(costings.totals.factor.actual - costings.totals.factor.rep)}</td>
              </tr>
              <tr class="highlight">
                <td class="font-bold">Total Payout</td>
                <td class="text-right font-bold">${formatCurrency(costings.totals.totalPayout.actual)}</td>
                <td class="text-right font-bold">${formatCurrency(costings.totals.totalPayout.rep)}</td>
                <td class="text-right font-bold ${(costings.totals.totalPayout.actual - costings.totals.totalPayout.rep) > 0 ? 'positive' : (costings.totals.totalPayout.actual - costings.totals.totalPayout.rep) < 0 ? 'negative' : 'neutral'}">${formatCurrency(costings.totals.totalPayout.actual - costings.totals.totalPayout.rep)}</td>
              </tr>
              <tr>
                <td>Hardware Rental (Monthly)</td>
                <td class="text-right">${formatCurrency(costings.totals.hardwareRental.actual)}</td>
                <td class="text-right">${formatCurrency(costings.totals.hardwareRental.rep)}</td>
                <td class="text-right ${(costings.totals.hardwareRental.actual - costings.totals.hardwareRental.rep) > 0 ? 'positive' : (costings.totals.hardwareRental.actual - costings.totals.hardwareRental.rep) < 0 ? 'negative' : 'neutral'}">${formatCurrency(costings.totals.hardwareRental.actual - costings.totals.hardwareRental.rep)}</td>
              </tr>
              <tr class="highlight">
                <td class="font-bold">Total MRC</td>
                <td class="text-right font-bold">${formatCurrency(costings.totals.totalMRC.actual)}</td>
                <td class="text-right font-bold">${formatCurrency(costings.totals.totalMRC.rep)}</td>
                <td class="text-right font-bold ${(costings.totals.totalMRC.actual - costings.totals.totalMRC.rep) > 0 ? 'positive' : (costings.totals.totalMRC.actual - costings.totals.totalMRC.rep) < 0 ? 'negative' : 'neutral'}">${formatCurrency(costings.totals.totalMRC.actual - costings.totals.totalMRC.rep)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- GROSS PROFIT ANALYSIS -->
        <div class="section">
          <h2 class="section-title">📈 Gross Profit Analysis</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Metric</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Actual GP (True GP)</td>
                <td class="text-right font-bold ${costings.grossProfit.actualGP > 0 ? 'positive' : costings.grossProfit.actualGP < 0 ? 'negative' : 'neutral'}">${formatCurrency(costings.grossProfit.actualGP)}</td>
              </tr>
              <tr>
                <td>Rep GP (Role Based)</td>
                <td class="text-right">${formatCurrency(costings.grossProfit.repGP)}</td>
              </tr>
              <tr class="highlight">
                <td class="font-bold">GP Difference</td>
                <td class="text-right font-bold ${costings.grossProfit.difference > 0 ? 'positive' : costings.grossProfit.difference < 0 ? 'negative' : 'neutral'}">${formatCurrency(costings.grossProfit.difference)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- TERM ANALYSIS -->
        <div class="section">
          <h2 class="section-title">📅 Term Analysis (${costings.term} months)</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Category</th>
                <th class="text-right">Actual Cost</th>
                <th class="text-right">Rep Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Connectivity Over Term</td>
                <td class="text-right">${formatCurrency(costings.termAnalysis.connectivityOverTerm.actual)}</td>
                <td class="text-right">${formatCurrency(costings.termAnalysis.connectivityOverTerm.rep)}</td>
              </tr>
              <tr>
                <td>Licensing Over Term</td>
                <td class="text-right">${formatCurrency(costings.termAnalysis.licensingOverTerm.actual)}</td>
                <td class="text-right">${formatCurrency(costings.termAnalysis.licensingOverTerm.rep)}</td>
              </tr>
              <tr class="highlight">
                <td class="font-bold">Total Recurring Over Term</td>
                <td class="text-right font-bold">${formatCurrency(costings.termAnalysis.totalRecurringOverTerm.actual)}</td>
                <td class="text-right font-bold">${formatCurrency(costings.termAnalysis.totalRecurringOverTerm.rep)}</td>
              </tr>
              <tr class="highlight">
                <td class="font-bold">GP Over Term</td>
                <td colspan="2" class="text-right font-bold ${costings.termAnalysis.gpOverTerm > 0 ? 'positive' : costings.termAnalysis.gpOverTerm < 0 ? 'negative' : 'neutral'}">${formatCurrency(costings.termAnalysis.gpOverTerm)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}</p>
          <p style="margin-top: 10px;">Smart Cost Calculator - Admin Cost Breakdown Analysis</p>
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

  // Open in new window for viewing/printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}
