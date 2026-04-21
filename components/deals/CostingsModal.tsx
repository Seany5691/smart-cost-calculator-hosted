'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Costings } from '@/lib/store/deals';
import { X } from 'lucide-react';
import HardwareBreakdown from './costings/HardwareBreakdown';
import ConnectivityBreakdown from './costings/ConnectivityBreakdown';
import LicensingBreakdown from './costings/LicensingBreakdown';
import TotalsComparison from './costings/TotalsComparison';
import GrossProfitAnalysis from './costings/GrossProfitAnalysis';
import TermAnalysis from './costings/TermAnalysis';
import { useAuthStore } from '@/lib/store/auth-simple';

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
 * - Uses portal to render above all content
 * - Admin can edit actual costs per item
 * 
 * Requirements: AC-6.1 through AC-9.6
 */
export default function CostingsModal({ isOpen, onClose, costings, isLoading }: CostingsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [localCostings, setLocalCostings] = useState<Costings | null>(costings);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLocalCostings(costings);
  }, [costings]);

  if (!isOpen || !mounted) return null;

  const handleCostUpdate = async (
    category: 'hardware' | 'connectivity' | 'licensing',
    itemName: string,
    newCost: number | null
  ) => {
    if (!localCostings) return;

    // Update local state immediately for responsive UI
    const updatedCostings = { ...localCostings };
    const section = updatedCostings[category];
    
    // Find and update the item
    const itemIndex = section.items.findIndex(item => item.name === itemName);
    if (itemIndex === -1) return;

    const item = section.items[itemIndex];
    const oldActualCost = item.actualCost;
    
    // If newCost is null, we need to reset to original (remove custom cost)
    // For now, we'll just update the actualCost and mark hasCustomCost
    if (newCost !== null) {
      item.actualCost = newCost;
      item.profit = item.repCost - newCost;
      item.hasCustomCost = true;
    } else {
      // Reset would require fetching original cost from config
      // For now, we'll handle this in the backend
      item.hasCustomCost = false;
    }

    // Recalculate section totals
    section.totalActual = section.items.reduce((sum, i) => sum + (i.actualCost * i.quantity), 0);
    section.totalProfit = section.items.reduce((sum, i) => sum + (i.profit * i.quantity), 0);

    // Recalculate overall totals
    updatedCostings.totals.hardwareTotal.actual = updatedCostings.hardware.totalActual;
    updatedCostings.totals.connectivityTotal.actual = updatedCostings.connectivity.totalActual;
    updatedCostings.totals.licensingTotal.actual = updatedCostings.licensing.totalActual;

    // Recalculate Total MRC
    updatedCostings.totals.totalMRC.actual = 
      updatedCostings.totals.hardwareRental.actual +
      updatedCostings.connectivity.totalActual +
      updatedCostings.licensing.totalActual;

    // Recalculate Actual GP
    updatedCostings.grossProfit.actualGP = 
      updatedCostings.totals.totalPayout.actual -
      updatedCostings.totals.financeFee.actual -
      updatedCostings.totals.totalSettlement.actual -
      updatedCostings.totals.installationTotal.actual -
      updatedCostings.hardware.totalActual;

    updatedCostings.grossProfit.difference = 
      updatedCostings.grossProfit.actualGP - updatedCostings.grossProfit.repGP;

    // Recalculate term analysis
    updatedCostings.termAnalysis.connectivityOverTerm.actual = 
      updatedCostings.connectivity.totalActual * updatedCostings.term;
    updatedCostings.termAnalysis.licensingOverTerm.actual = 
      updatedCostings.licensing.totalActual * updatedCostings.term;
    updatedCostings.termAnalysis.totalRecurringOverTerm.actual = 
      updatedCostings.termAnalysis.connectivityOverTerm.actual +
      updatedCostings.termAnalysis.licensingOverTerm.actual;
    updatedCostings.termAnalysis.gpOverTerm = 
      updatedCostings.termAnalysis.totalRecurringOverTerm.rep -
      updatedCostings.termAnalysis.totalRecurringOverTerm.actual;

    setLocalCostings(updatedCostings);

    // Save to backend
    try {
      setIsSaving(true);
      
      // Build custom costs payload
      const customCosts: any = {
        hardware: updatedCostings.hardware.items
          .filter(i => i.hasCustomCost)
          .map(i => ({ name: i.name, customActualCost: i.actualCost })),
        connectivity: updatedCostings.connectivity.items
          .filter(i => i.hasCustomCost)
          .map(i => ({ name: i.name, customActualCost: i.actualCost })),
        licensing: updatedCostings.licensing.items
          .filter(i => i.hasCustomCost)
          .map(i => ({ name: i.name, customActualCost: i.actualCost })),
      };

      const response = await fetch(`/api/deals/${updatedCostings.dealId}/custom-costs`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customCosts),
      });

      if (!response.ok) {
        throw new Error('Failed to save custom costs');
      }

      console.log('[COSTINGS-MODAL] Custom costs saved successfully');
    } catch (error) {
      console.error('[COSTINGS-MODAL] Error saving custom costs:', error);
      // Revert to original costings on error
      setLocalCostings(costings);
    } finally {
      setIsSaving(false);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="costings-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-6xl bg-gradient-to-br from-slate-900 via-orange-900/20 to-slate-900 rounded-2xl shadow-2xl border border-orange-500/30 max-h-[90vh] overflow-hidden">
        {/* Header with Close Button */}
        <div className="flex items-center justify-between p-6 border-b border-orange-500/20 sticky top-0 bg-gradient-to-br from-slate-900 via-orange-900/20 to-slate-900 z-10">
          <div className="flex items-center gap-4">
            <h2 id="costings-modal-title" className="text-2xl font-bold text-white bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              Cost Breakdown Analysis
            </h2>
            {isSaving && (
              <span className="text-sm text-blue-400 flex items-center gap-2">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                Saving...
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6 text-orange-200" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar">

          {/* Loading State */}
          {isLoading && (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mb-4"></div>
              <p className="text-white">Generating cost breakdown...</p>
            </div>
          )}

          {/* Content */}
          {!isLoading && localCostings && (
            <div className="p-8 space-y-8">
              {/* Deal Info */}
              <div className="border-b border-orange-500/20 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Deal Name</p>
                    <p className="text-white font-semibold">{localCostings.dealName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Customer</p>
                    <p className="text-white font-semibold">{localCostings.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Created By</p>
                    <p className="text-white font-semibold">{localCostings.createdBy}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">User Role</p>
                    <p className="text-white font-semibold capitalize">{localCostings.userRole}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Term</p>
                    <p className="text-white font-semibold">{localCostings.term} months</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Escalation</p>
                    <p className="text-white font-semibold">{localCostings.escalation}%</p>
                  </div>
                </div>
              </div>

              {/* Hardware Breakdown */}
              <HardwareBreakdown 
                hardware={localCostings.hardware} 
                dealId={localCostings.dealId}
                isAdmin={user?.role === 'admin'}
                onCostUpdate={handleCostUpdate}
              />

              {/* Connectivity Breakdown */}
              <ConnectivityBreakdown 
                connectivity={localCostings.connectivity} 
                dealId={localCostings.dealId}
                isAdmin={user?.role === 'admin'}
                onCostUpdate={handleCostUpdate}
              />

              {/* Licensing Breakdown */}
              <LicensingBreakdown 
                licensing={localCostings.licensing} 
                dealId={localCostings.dealId}
                isAdmin={user?.role === 'admin'}
                onCostUpdate={handleCostUpdate}
              />

              {/* Totals Comparison */}
              <TotalsComparison totals={localCostings.totals} />

              {/* Gross Profit Analysis */}
              <GrossProfitAnalysis grossProfit={localCostings.grossProfit} />

              {/* Term Analysis */}
              <TermAnalysis termAnalysis={localCostings.termAnalysis} />

              {/* Print Button */}
              <div className="flex justify-center pt-6 border-t border-orange-500/20">
                <button
                  onClick={() => generateCostingsHTML(localCostings)}
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

  // Use createPortal to render at document.body level - ensures modal appears above ALL content
  return createPortal(modalContent, document.body);
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
                <td>Hardware Settlement</td>
                <td class="text-right">${formatCurrency(costings.totals.hardwareSettlement.actual)}</td>
                <td class="text-right">${formatCurrency(costings.totals.hardwareSettlement.rep)}</td>
                <td class="text-right ${(costings.totals.hardwareSettlement.rep - costings.totals.hardwareSettlement.actual) > 0 ? 'positive' : (costings.totals.hardwareSettlement.rep - costings.totals.hardwareSettlement.actual) < 0 ? 'negative' : 'neutral'}">${formatCurrency(costings.totals.hardwareSettlement.rep - costings.totals.hardwareSettlement.actual)}</td>
              </tr>
              <tr>
                <td>Connectivity & Licenses Settlement</td>
                <td class="text-right">${formatCurrency(costings.totals.connectivityLicensingSettlement.actual)}</td>
                <td class="text-right">${formatCurrency(costings.totals.connectivityLicensingSettlement.rep)}</td>
                <td class="text-right ${(costings.totals.connectivityLicensingSettlement.rep - costings.totals.connectivityLicensingSettlement.actual) > 0 ? 'positive' : (costings.totals.connectivityLicensingSettlement.rep - costings.totals.connectivityLicensingSettlement.actual) < 0 ? 'negative' : 'neutral'}">${formatCurrency(costings.totals.connectivityLicensingSettlement.rep - costings.totals.connectivityLicensingSettlement.actual)}</td>
              </tr>
              <tr>
                <td>Total Settlement</td>
                <td class="text-right">${formatCurrency(costings.totals.totalSettlement.actual)}</td>
                <td class="text-right">${formatCurrency(costings.totals.totalSettlement.rep)}</td>
                <td class="text-right ${(costings.totals.totalSettlement.rep - costings.totals.totalSettlement.actual) > 0 ? 'positive' : (costings.totals.totalSettlement.rep - costings.totals.totalSettlement.actual) < 0 ? 'negative' : 'neutral'}">${formatCurrency(costings.totals.totalSettlement.rep - costings.totals.totalSettlement.actual)}</td>
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
