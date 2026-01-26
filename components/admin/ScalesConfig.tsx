'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConfigStore } from '@/lib/store/config';
import { useAuthStore } from '@/lib/store/auth-simple';
import { Save, AlertCircle } from 'lucide-react';

interface EnhancedScales {
  installation: { cost: { [key: string]: number }; managerCost: { [key: string]: number }; userCost: { [key: string]: number } };
  finance_fee: { cost: { [key: string]: number }; managerCost: { [key: string]: number }; userCost: { [key: string]: number } };
  gross_profit: { cost: { [key: string]: number }; managerCost: { [key: string]: number }; userCost: { [key: string]: number } };
  additional_costs: {
    cost_per_kilometer: number;
    cost_per_point: number;
    manager_cost_per_kilometer: number;
    manager_cost_per_point: number;
    user_cost_per_kilometer: number;
    user_cost_per_point: number;
  };
}

function isEnhancedScales(data: any): data is EnhancedScales {
  return data && typeof data === 'object' && 
         'installation' in data && 'finance_fee' in data && 'gross_profit' in data && 'additional_costs' in data;
}

// Define bands outside component to prevent recreation on every render
const INSTALLATION_BANDS = ['0-4', '5-8', '9-16', '17-32', '33+'];
const FINANCE_FEE_RANGES = ['0-20000', '20001-50000', '50001-100000', '100001+'];
const GROSS_PROFIT_BANDS = ['0-4', '5-8', '9-16', '17-32', '33+'];

export default function ScalesConfig() {
  const { scales, fetchScales, updateScales } = useConfigStore();
  
  // Create initial state with all bands populated
  const createEmptyScalesData = (): EnhancedScales => {
    const emptyInstallation = { cost: {} as { [key: string]: number }, managerCost: {} as { [key: string]: number }, userCost: {} as { [key: string]: number } };
    const emptyFinanceFee = { cost: {} as { [key: string]: number }, managerCost: {} as { [key: string]: number }, userCost: {} as { [key: string]: number } };
    const emptyGrossProfit = { cost: {} as { [key: string]: number }, managerCost: {} as { [key: string]: number }, userCost: {} as { [key: string]: number } };
    
    // Initialize all bands with 0
    INSTALLATION_BANDS.forEach(band => {
      emptyInstallation.cost[band] = 0;
      emptyInstallation.managerCost[band] = 0;
      emptyInstallation.userCost[band] = 0;
    });
    
    FINANCE_FEE_RANGES.forEach(range => {
      emptyFinanceFee.cost[range] = 0;
      emptyFinanceFee.managerCost[range] = 0;
      emptyFinanceFee.userCost[range] = 0;
    });
    
    GROSS_PROFIT_BANDS.forEach(band => {
      emptyGrossProfit.cost[band] = 0;
      emptyGrossProfit.managerCost[band] = 0;
      emptyGrossProfit.userCost[band] = 0;
    });
    
    return {
      installation: emptyInstallation,
      finance_fee: emptyFinanceFee,
      gross_profit: emptyGrossProfit,
      additional_costs: { 
        cost_per_kilometer: 0, 
        cost_per_point: 0,
        manager_cost_per_kilometer: 0,
        manager_cost_per_point: 0,
        user_cost_per_kilometer: 0,
        user_cost_per_point: 0
      }
    };
  };
  
  const [scalesData, setScalesData] = useState<EnhancedScales>(createEmptyScalesData());
  const [activeTab, setActiveTab] = useState<'cost' | 'managerCost' | 'userCost'>('cost');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastSaveTime, setLastSaveTime] = useState<number>(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalScalesData, setOriginalScalesData] = useState<EnhancedScales>(createEmptyScalesData());

  const deepEqual = useCallback((obj1: any, obj2: any): boolean => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }, []);

  useEffect(() => {
    const loadScales = async () => {
      const token = useAuthStore.getState().token;
      if (!token) return;
      
      try {
        await fetchScales(token);
      } catch (error) {
        console.error('Error loading scales:', error);
      }
    };
    
    loadScales();
  }, [fetchScales]);

  useEffect(() => {
    const timeSinceLastSave = Date.now() - lastSaveTime;
    if (timeSinceLastSave < 5000) {
      return;
    }
    
    let processedScales: EnhancedScales;
    if (isEnhancedScales(scales)) {
      // Already in enhanced format
      processedScales = scales;
    } else if (scales && typeof scales === 'object') {
      // Convert simple format to enhanced format
      const simpleScales = scales as any;
      processedScales = createEmptyScalesData();
      
      // Populate installation costs
      if (simpleScales.installation) {
        INSTALLATION_BANDS.forEach(band => {
          const value = simpleScales.installation[band] || 0;
          processedScales.installation.cost[band] = value;
          processedScales.installation.managerCost[band] = value;
          processedScales.installation.userCost[band] = value;
        });
      }
      
      // Populate finance fees
      if (simpleScales.finance_fee) {
        FINANCE_FEE_RANGES.forEach(range => {
          const value = simpleScales.finance_fee[range] || 0;
          processedScales.finance_fee.cost[range] = value;
          processedScales.finance_fee.managerCost[range] = value;
          processedScales.finance_fee.userCost[range] = value;
        });
      }
      
      // Populate gross profit
      if (simpleScales.gross_profit) {
        GROSS_PROFIT_BANDS.forEach(band => {
          const value = simpleScales.gross_profit[band] || 0;
          processedScales.gross_profit.cost[band] = value;
          processedScales.gross_profit.managerCost[band] = value;
          processedScales.gross_profit.userCost[band] = value;
        });
      }
      
      // Populate additional costs
      if (simpleScales.additional_costs) {
        processedScales.additional_costs.cost_per_kilometer = simpleScales.additional_costs.cost_per_kilometer || 0;
        processedScales.additional_costs.cost_per_point = simpleScales.additional_costs.cost_per_point || 0;
        processedScales.additional_costs.manager_cost_per_kilometer = simpleScales.additional_costs.cost_per_kilometer || 0;
        processedScales.additional_costs.manager_cost_per_point = simpleScales.additional_costs.cost_per_point || 0;
        processedScales.additional_costs.user_cost_per_kilometer = simpleScales.additional_costs.cost_per_kilometer || 0;
        processedScales.additional_costs.user_cost_per_point = simpleScales.additional_costs.cost_per_point || 0;
      }
    } else {
      // Empty/invalid data
      processedScales = createEmptyScalesData();
    }
    
    setScalesData(processedScales);
    setOriginalScalesData(JSON.parse(JSON.stringify(processedScales)));
    setHasUnsavedChanges(false);
  }, [scales, lastSaveTime]);

  useEffect(() => {
    const hasChanges = !deepEqual(scalesData, originalScalesData);
    setHasUnsavedChanges(hasChanges);
  }, [scalesData, originalScalesData, deepEqual]);

  const handleBatchSave = async () => {
    if (!hasUnsavedChanges) {
      setMessage({ type: 'success', text: 'No changes to save.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const token = useAuthStore.getState().token;
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found' });
        return;
      }

      await updateScales(scalesData, token);
      setLastSaveTime(Date.now());
      setOriginalScalesData(JSON.parse(JSON.stringify(scalesData)));
      setHasUnsavedChanges(false);
      setMessage({ type: 'success', text: 'All scale changes saved successfully!' });
    } catch (error) {
      console.error('Error saving scales config:', error);
      setMessage({ type: 'error', text: 'An error occurred while saving. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const isFieldChanged = useCallback((section: string, key: string, tab: string) => {
    if (section === 'additional_costs') {
      const fieldMap = {
        'cost_per_kilometer': tab === 'cost' ? 'cost_per_kilometer' : 
                             tab === 'managerCost' ? 'manager_cost_per_kilometer' : 'user_cost_per_kilometer',
        'cost_per_point': tab === 'cost' ? 'cost_per_point' : 
                         tab === 'managerCost' ? 'manager_cost_per_point' : 'user_cost_per_point'
      };
      const mappedKey = fieldMap[key as keyof typeof fieldMap];
      return (scalesData.additional_costs as any)[mappedKey] !== (originalScalesData.additional_costs as any)[mappedKey];
    } else {
      return (scalesData as any)[section][tab][key] !== (originalScalesData as any)[section][tab][key];
    }
  }, [scalesData, originalScalesData]);

  const getInputClassName = useCallback((section: string, key: string, tab: string) => {
    const baseClass = "w-full sm:w-32 px-3 py-3 sm:py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[44px] sm:min-h-0";
    const isChanged = isFieldChanged(section, key, tab);
    return isChanged ? `${baseClass} border-amber-400 bg-amber-500/20` : baseClass;
  }, [isFieldChanged]);

  const handleDiscardChanges = () => {
    setScalesData(JSON.parse(JSON.stringify(originalScalesData)));
    setHasUnsavedChanges(false);
    setMessage({ type: 'success', text: 'All changes have been discarded.' });
  };

  const getChangedFieldsCount = useCallback(() => {
    let count = 0;
    
    INSTALLATION_BANDS.forEach(band => {
      ['cost', 'managerCost', 'userCost'].forEach(tab => {
        if (isFieldChanged('installation', band, tab)) count++;
      });
    });
    
    FINANCE_FEE_RANGES.forEach(range => {
      ['cost', 'managerCost', 'userCost'].forEach(tab => {
        if (isFieldChanged('finance_fee', range, tab)) count++;
      });
    });
    
    GROSS_PROFIT_BANDS.forEach(band => {
      ['cost', 'managerCost', 'userCost'].forEach(tab => {
        if (isFieldChanged('gross_profit', band, tab)) count++;
      });
    });
    
    ['cost_per_kilometer', 'cost_per_point'].forEach(field => {
      ['cost', 'managerCost', 'userCost'].forEach(tab => {
        if (isFieldChanged('additional_costs', field, tab)) count++;
      });
    });
    
    return count;
  }, [isFieldChanged]);

  const updateInstallationBand = (band: string, value: number) => {
    setScalesData(prev => ({
      ...prev,
      installation: { 
        ...prev.installation, 
        [activeTab]: { ...prev.installation[activeTab], [band]: value }
      }
    }));
  };

  const updateFinanceFeeRange = (range: string, value: number) => {
    setScalesData(prev => ({
      ...prev,
      finance_fee: { 
        ...prev.finance_fee, 
        [activeTab]: { ...prev.finance_fee[activeTab], [range]: value }
      }
    }));
  };

  const updateGrossProfitBand = (band: string, value: number) => {
    setScalesData(prev => ({
      ...prev,
      gross_profit: { 
        ...prev.gross_profit, 
        [activeTab]: { ...prev.gross_profit[activeTab], [band]: value }
      }
    }));
  };

  const updateAdditionalCosts = (field: string, value: number) => {
    const fieldMap = {
      'cost_per_kilometer': activeTab === 'cost' ? 'cost_per_kilometer' : 
                           activeTab === 'managerCost' ? 'manager_cost_per_kilometer' : 'user_cost_per_kilometer',
      'cost_per_point': activeTab === 'cost' ? 'cost_per_point' : 
                       activeTab === 'managerCost' ? 'manager_cost_per_point' : 'user_cost_per_point'
    };
    
    setScalesData(prev => ({
      ...prev,
      additional_costs: { 
        ...prev.additional_costs, 
        [fieldMap[field as keyof typeof fieldMap]]: value 
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Scales Configuration
          </h2>
          {hasUnsavedChanges && (
            <div className="flex items-center space-x-2 text-amber-300 bg-amber-500/20 backdrop-blur-md px-3 py-1 rounded-full text-sm border border-amber-500/30">
              <AlertCircle className="w-4 h-4" />
              <span>Unsaved changes</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {hasUnsavedChanges && (
            <button
              onClick={handleDiscardChanges}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all"
            >
              Discard Changes
            </button>
          )}
          <button
            onClick={handleBatchSave}
            disabled={isLoading || !hasUnsavedChanges}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all ${
              hasUnsavedChanges 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600' 
                : 'bg-white/5 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>
              {isLoading 
                ? 'Saving All Changes...' 
                : hasUnsavedChanges 
                  ? `Save All Changes (${getChangedFieldsCount()})` 
                  : 'No Changes to Save'
              }
            </span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg backdrop-blur-md border ${
          message.type === 'success' 
            ? 'bg-green-500/20 border-green-500/30 text-green-100' 
            : 'bg-red-500/20 border-red-500/30 text-red-100'
        }`}>
          {message.text}
        </div>
      )}

      {hasUnsavedChanges && (
        <div className="bg-amber-500/10 backdrop-blur-md border border-amber-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-5 h-5 text-amber-300" />
            <h3 className="font-semibold text-amber-200">Pending Changes Summary</h3>
          </div>
          <p className="text-amber-100 text-sm">
            You have <strong>{getChangedFieldsCount()} unsaved changes</strong> across your scales configuration. 
            Fields with changes are highlighted in amber. Use "Save All Changes" to persist all modifications 
            or "Discard Changes" to revert to the last saved state.
          </p>
        </div>
      )}

      <div className="flex space-x-1 bg-white/5 backdrop-blur-md p-1 rounded-lg border border-white/10">
        <button
          onClick={() => setActiveTab('cost')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            activeTab === 'cost'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          Cost Pricing
        </button>
        <button
          onClick={() => setActiveTab('managerCost')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            activeTab === 'managerCost'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          Manager Pricing
        </button>
        <button
          onClick={() => setActiveTab('userCost')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            activeTab === 'userCost'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          User Pricing
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Installation Costs</h3>
          <div className="space-y-3">
            {INSTALLATION_BANDS.map(band => (
              <div key={band} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <span className="font-medium text-gray-300">{band} extensions</span>
                <input
                  type="number"
                  value={scalesData.installation[activeTab][band] || 0}
                  onChange={(e) => updateInstallationBand(band, parseFloat(e.target.value) || 0)}
                  className={getInputClassName('installation', band, activeTab)}
                  step="0.01"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Finance Fees</h3>
          <div className="space-y-3">
            {FINANCE_FEE_RANGES.map(range => (
              <div key={range} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <span className="font-medium text-gray-300">{range}</span>
                <input
                  type="number"
                  value={scalesData.finance_fee[activeTab][range] || 0}
                  onChange={(e) => updateFinanceFeeRange(range, parseFloat(e.target.value) || 0)}
                  className={getInputClassName('finance_fee', range, activeTab)}
                  step="0.01"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Gross Profit</h3>
          <div className="space-y-3">
            {GROSS_PROFIT_BANDS.map(band => (
              <div key={band} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <span className="font-medium text-gray-300">{band} extensions</span>
                <input
                  type="number"
                  value={scalesData.gross_profit[activeTab][band] || 0}
                  onChange={(e) => updateGrossProfitBand(band, parseFloat(e.target.value) || 0)}
                  className={getInputClassName('gross_profit', band, activeTab)}
                  step="0.01"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Additional Costs</h3>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <span className="font-medium text-gray-300">Cost per kilometer</span>
              <input
                type="number"
                value={
                  activeTab === 'cost' ? scalesData.additional_costs.cost_per_kilometer :
                  activeTab === 'managerCost' ? scalesData.additional_costs.manager_cost_per_kilometer :
                  scalesData.additional_costs.user_cost_per_kilometer || 0
                }
                onChange={(e) => updateAdditionalCosts('cost_per_kilometer', parseFloat(e.target.value) || 0)}
                className={getInputClassName('additional_costs', 'cost_per_kilometer', activeTab)}
                step="0.01"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <span className="font-medium text-gray-300">Cost per point</span>
              <input
                type="number"
                value={
                  activeTab === 'cost' ? scalesData.additional_costs.cost_per_point :
                  activeTab === 'managerCost' ? scalesData.additional_costs.manager_cost_per_point :
                  scalesData.additional_costs.user_cost_per_point || 0
                }
                onChange={(e) => updateAdditionalCosts('cost_per_point', parseFloat(e.target.value) || 0)}
                className={getInputClassName('additional_costs', 'cost_per_point', activeTab)}
                step="0.01"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-500/10 backdrop-blur-md border border-blue-500/20 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-200 mb-2">Scales Information</h3>
        <ul className="text-blue-100 text-sm space-y-1">
          <li><strong>Installation Costs:</strong> Based on the number of extensions in the deal</li>
          <li><strong>Finance Fees:</strong> Based on the total finance amount</li>
          <li><strong>Gross Profit:</strong> Base profit based on the number of extensions</li>
          <li><strong>Additional Costs:</strong> Distance and point-based costs</li>
          <li><strong>Cost Pricing:</strong> Used for admin pricing calculations</li>
          <li><strong>Manager Pricing:</strong> Used when managers access the calculator</li>
          <li><strong>User Pricing:</strong> Used when regular users access the calculator</li>
        </ul>
      </div>
    </div>
  );
}
