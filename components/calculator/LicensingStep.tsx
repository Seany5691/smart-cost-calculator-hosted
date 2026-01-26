'use client';

import { useState, useEffect } from 'react';
import { useCalculatorStore } from '@/lib/store/calculator';
import { useConfigStore } from '@/lib/store/config';
import { useAuthStore } from '@/lib/store/auth-simple';
import { getRolePrice } from '@/lib/pricing';
import { useToast } from '@/components/ui/Toast/useToast';

// Inline SVG icons to avoid lucide-react webpack issues
const Plus = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const Minus = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const X = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default function LicensingStep() {
  const { sectionsData, addLicensingItem, removeLicensingItem, updateLicensingQuantity } = useCalculatorStore();
  const { licensing, fetchLicensing, isLoadingLicensing } = useConfigStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isMobile, setIsMobile] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customItem, setCustomItem] = useState({
    name: '',
    monthlyCost: 0,
    showOnProposal: true,
  });

  useEffect(() => {
    // Don't fetch on mount - let the calculator page initialize configs
    // fetchLicensing();
  }, [fetchLicensing]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show all active items (including locked ones) - locked items should appear on proposals when selected
  const availableLicensing = licensing.filter((item) => item.isActive);
  const selectedLicensing = sectionsData.licensing;

  // Calculate total licensing cost
  const totalLicensingCost = selectedLicensing.reduce((sum, item) => {
    const price = getRolePrice(item, user?.role || 'user');
    return sum + (price * item.selectedQuantity);
  }, 0);

  // Handle quantity increment
  const handleIncrement = (itemId: string) => {
    const item = selectedLicensing.find(l => l.id === itemId);
    if (item) {
      updateLicensingQuantity(itemId, item.selectedQuantity + 1);
    }
  };

  // Handle quantity decrement (boundary at 0)
  const handleDecrement = (itemId: string) => {
    const item = selectedLicensing.find(l => l.id === itemId);
    if (item && item.selectedQuantity > 0) {
      updateLicensingQuantity(itemId, item.selectedQuantity - 1);
    }
  };

  // Handle custom item submission
  const handleAddCustomItem = () => {
    if (!customItem.name || customItem.monthlyCost < 0) {
      toast.error('Invalid Custom License', {
        message: 'Please enter a valid name and monthly cost (0 or greater)',
        section: 'calculator'
      });
      return;
    }

    const newItem = {
      id: `custom-${Date.now()}`,
      name: customItem.name,
      cost: customItem.monthlyCost,
      managerCost: customItem.monthlyCost,
      userCost: customItem.monthlyCost,
      quantity: 1,
      locked: false,
      isActive: true,
      displayOrder: 999,
      createdAt: new Date(),
      updatedAt: new Date(),
      isTemporary: true,
      showOnProposal: customItem.showOnProposal,
    };

    addLicensingItem(newItem, 1);
    
    // Reset form
    setCustomItem({
      name: '',
      monthlyCost: 0,
      showOnProposal: true,
    });
    setShowCustomForm(false);
  };

  if (isLoadingLicensing) {
    return (
      <div className="text-center py-12">
        <div className="text-white text-xl">Loading licensing packages...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Licensing Selection</h2>
        <button
          onClick={() => setShowCustomForm(!showCustomForm)}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all"
        >
          {showCustomForm ? 'Cancel' : 'Add Custom License'}
        </button>
      </div>

      {/* Custom License Form */}
      {showCustomForm && (
        <div className="bg-white/10 border border-white/20 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white mb-3">Add Custom License</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              License Name *
            </label>
            <input
              type="text"
              value={customItem.name}
              onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
              placeholder="Enter license name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Monthly Cost (R) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={customItem.monthlyCost || ''}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                setCustomItem({ ...customItem, monthlyCost: isNaN(value) ? 0 : value });
              }}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
              placeholder="Enter monthly cost"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={customItem.showOnProposal}
                onChange={(e) => setCustomItem({ ...customItem, showOnProposal: e.target.checked })}
                className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500"
              />
              <span>Show on Proposal</span>
            </label>
          </div>

          <button
            onClick={handleAddCustomItem}
            className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg transition-all"
          >
            Add Custom License
          </button>
        </div>
      )}

      {/* Available Licensing */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Available Licensing Packages</h3>
        
        {isMobile ? (
          /* Mobile Card Layout */
          <div className="grid grid-cols-1 gap-4">
            {availableLicensing.map((item) => (
              <div key={item.id} className="bg-white/10 border border-white/20 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-white flex-1">{item.name}</h4>
                  <div className="text-lg font-bold text-white">
                    R {getRolePrice(item, user?.role || 'user').toFixed(2)}/mo
                  </div>
                </div>
                <button
                  onClick={() => addLicensingItem(item, 1)}
                  className="w-full mt-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  Add to Selection
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* Desktop Table Layout */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Name</th>
                  <th className="text-right py-3 px-4 text-gray-300 font-medium">Monthly Cost</th>
                  <th className="text-center py-3 px-4 text-gray-300 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {availableLicensing.map((item) => (
                  <tr key={item.id} className="border-b border-white/10 hover:bg-white/5">
                    <td className="py-3 px-4 text-white">{item.name}</td>
                    <td className="py-3 px-4 text-right text-white font-medium">
                      R {getRolePrice(item, user?.role || 'user').toFixed(2)}/mo
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => addLicensingItem(item, 1)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all"
                      >
                        Add
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Licensing */}
      {selectedLicensing.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Selected Licensing</h3>
          
          {isMobile ? (
            /* Mobile Card Layout */
            <div className="grid grid-cols-1 gap-4">
              {selectedLicensing.map((item) => {
                const unitPrice = getRolePrice(item, user?.role || 'user');
                const totalPrice = unitPrice * item.selectedQuantity;
                
                return (
                  <div key={item.id} className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{item.name}</h4>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {item.isTemporary && (
                            <span className="inline-block px-2 py-1 text-xs bg-yellow-500/20 text-yellow-300 rounded">
                              Temporary
                            </span>
                          )}
                          {!item.showOnProposal && (
                            <span className="inline-block px-2 py-1 text-xs bg-gray-500/20 text-gray-300 rounded">
                              Hidden
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">
                          R {totalPrice.toFixed(2)}/mo
                        </div>
                        <div className="text-sm text-gray-400">
                          R {unitPrice.toFixed(2)} each
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleDecrement(item.id)}
                        disabled={item.selectedQuantity === 0}
                        className="w-11 h-11 flex items-center justify-center bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={item.selectedQuantity || ''}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10);
                          if (!isNaN(value) && value >= 0) {
                            updateLicensingQuantity(item.id, value);
                          } else if (e.target.value === '') {
                            updateLicensingQuantity(item.id, 0);
                          }
                        }}
                        className="flex-1 px-3 py-2 h-11 bg-white/10 border border-white/20 rounded-lg text-white text-center text-base"
                      />
                      <button
                        onClick={() => handleIncrement(item.id)}
                        className="w-11 h-11 flex items-center justify-center bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeLicensingItem(item.id)}
                        className="w-11 h-11 flex items-center justify-center bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Desktop Table Layout */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Name</th>
                    <th className="text-right py-3 px-4 text-gray-300 font-medium">Unit Cost/mo</th>
                    <th className="text-center py-3 px-4 text-gray-300 font-medium">Quantity</th>
                    <th className="text-right py-3 px-4 text-gray-300 font-medium">Total/mo</th>
                    <th className="text-center py-3 px-4 text-gray-300 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedLicensing.map((item) => {
                    const unitPrice = getRolePrice(item, user?.role || 'user');
                    const totalPrice = unitPrice * item.selectedQuantity;
                    
                    return (
                      <tr key={item.id} className="border-b border-white/10 hover:bg-white/5">
                        <td className="py-3 px-4 text-white">
                          <div className="flex flex-col">
                            <span>{item.name}</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {item.isTemporary && (
                                <span className="inline-block px-2 py-1 text-xs bg-yellow-500/20 text-yellow-300 rounded">
                                  Temporary
                                </span>
                              )}
                              {!item.showOnProposal && (
                                <span className="inline-block px-2 py-1 text-xs bg-gray-500/20 text-gray-300 rounded">
                                  Hidden
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-white">
                          R {unitPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleDecrement(item.id)}
                              disabled={item.selectedQuantity === 0}
                              className="w-8 h-8 flex items-center justify-center bg-white/10 border border-white/20 rounded text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={item.selectedQuantity || ''}
                              onChange={(e) => {
                                const value = parseInt(e.target.value, 10);
                                if (!isNaN(value) && value >= 0) {
                                  updateLicensingQuantity(item.id, value);
                                } else if (e.target.value === '') {
                                  updateLicensingQuantity(item.id, 0);
                                }
                              }}
                              className="w-20 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-center"
                            />
                            <button
                              onClick={() => handleIncrement(item.id)}
                              className="w-8 h-8 flex items-center justify-center bg-white/10 border border-white/20 rounded text-white hover:bg-white/20 transition-all"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-white font-medium">
                          R {totalPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => removeLicensingItem(item.id)}
                            className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Total Licensing Cost */}
          <div className="mt-4 p-4 bg-white/10 border border-white/20 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-white">Total Monthly Licensing Cost:</span>
              <span className="text-2xl font-bold text-white">R {totalLicensingCost.toFixed(2)}/mo</span>
            </div>
            <div className="mt-2 text-sm text-gray-400">
              Pricing: {user?.role === 'admin' ? 'Admin' : user?.role === 'manager' ? 'Manager' : 'User'} Pricing
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
