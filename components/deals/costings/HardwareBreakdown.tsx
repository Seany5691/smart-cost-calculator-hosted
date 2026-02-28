'use client';

import { useState } from 'react';
import { CostingSection } from '@/lib/store/deals';

interface HardwareBreakdownProps {
  hardware: CostingSection;
  dealId: string;
  isAdmin: boolean;
  onCostUpdate: (category: 'hardware' | 'connectivity' | 'licensing', itemName: string, newCost: number | null) => void;
}

/**
 * HardwareBreakdown Component
 * 
 * Displays hardware cost breakdown table
 * - Item name, quantity, actual cost, rep cost, profit
 * - Totals row
 * - Color-coded profit (green positive, red negative)
 * - Admin can edit actual cost per item (inline edit like Finance Fee)
 * 
 * Requirements: AC-6.3, AC-6.4
 */
export default function HardwareBreakdown({ hardware, dealId, isAdmin, onCostUpdate }: HardwareBreakdownProps) {
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getProfitClass = (profit: number): string => {
    if (profit > 0) return 'text-green-400';
    if (profit < 0) return 'text-red-400';
    return 'text-gray-300';
  };

  const handleEdit = (index: number, currentCost: number) => {
    setEditingItemIndex(index);
    setEditValue(currentCost.toString());
  };

  const handleSave = (itemName: string) => {
    const value = parseFloat(editValue);
    if (!isNaN(value) && value >= 0) {
      onCostUpdate('hardware', itemName, value);
      setEditingItemIndex(null);
      setEditValue('');
    }
  };

  const handleCancel = () => {
    setEditingItemIndex(null);
    setEditValue('');
  };

  const handleReset = (itemName: string) => {
    onCostUpdate('hardware', itemName, null); // null means reset to original
    setEditingItemIndex(null);
    setEditValue('');
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-white mb-4">Hardware Breakdown</h3>
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Item</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Qty</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Actual Cost</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Rep Cost</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Profit</th>
              </tr>
            </thead>
            <tbody>
              {hardware.items.map((item, index) => (
                <tr key={index} className="border-b border-white/5">
                  <td className="px-4 py-3 text-white">
                    {item.name}
                    {item.hasCustomCost && (
                      <span className="ml-2 text-xs text-blue-400">(Custom)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">
                    {editingItemIndex === index && isAdmin ? (
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-32 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                          min="0"
                          step="0.01"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSave(item.name)}
                          className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReset(item.name)}
                          className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                        >
                          Reset
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-300 flex items-center justify-end gap-2">
                        {formatCurrency(item.actualCost * item.quantity)}
                        {isAdmin && (
                          <button
                            onClick={() => handleEdit(index, item.actualCost)}
                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                          >
                            Edit
                          </button>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">{formatCurrency(item.repCost * item.quantity)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${getProfitClass(item.profit * item.quantity)}`}>
                    {formatCurrency(item.profit * item.quantity)}
                  </td>
                </tr>
              ))}
              {/* Totals Row */}
              <tr className="border-t-2 border-white/20 bg-white/5 font-bold">
                <td className="px-4 py-3 text-white" colSpan={2}>Total</td>
                <td className="px-4 py-3 text-right text-white">{formatCurrency(hardware.totalActual)}</td>
                <td className="px-4 py-3 text-right text-white">{formatCurrency(hardware.totalRep)}</td>
                <td className={`px-4 py-3 text-right ${getProfitClass(hardware.totalProfit)}`}>
                  {formatCurrency(hardware.totalProfit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
