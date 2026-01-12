'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConfigStore } from '@/store/config';
import { EnhancedScales, isEnhancedScales } from '@/lib/types';
import { Save, AlertCircle } from 'lucide-react';

export default function ScalesConfig() {
  const { scales, updateScales } = useConfigStore();
  const [scalesData, setScalesData] = useState<EnhancedScales>({
    installation: { cost: {}, managerCost: {}, userCost: {} },
    finance_fee: { cost: {}, managerCost: {}, userCost: {} },
    gross_profit: { cost: {}, managerCost: {}, userCost: {} },
    additional_costs: { 
      cost_per_kilometer: 0, 
      cost_per_point: 0,
      manager_cost_per_kilometer: 0,
      manager_cost_per_point: 0,
      user_cost_per_kilometer: 0,
      user_cost_per_point: 0
    }
  });
  const [activeTab, setActiveTab] = useState<'cost' | 'managerCost' | 'userCost'>('cost');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastSaveTime, setLastSaveTime] = useState<number>(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalScalesData, setOriginalScalesData] = useState<EnhancedScales>({
    installation: { cost: {}, managerCost: {}, userCost: {} },
    finance_fee: { cost: {}, managerCost: {}, userCost: {} },
    gross_profit: { cost: {}, managerCost: {}, userCost: {} },
    additional_costs: { 
      cost_per_kilometer: 0, 
      cost_per_point: 0,
      manager_cost_per_kilometer: 0,
      manager_cost_per_point: 0,
      user_cost_per_kilometer: 0,
      user_cost_per_point: 0
    }
  });

  // Deep comparison function to check if scales data has changed
  const deepEqual = useCallback((obj1: any, obj2: any): boolean => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }, []);

  useEffect(() => {
    // Don't override local changes if we just saved within the last 5 seconds
    const timeSinceLastSave = Date.now() - lastSaveTime;
    if (timeSinceLastSave < 5000) {
      return;
    }
    
    // Use scales data directly (assuming it's already in enhanced format)
    let processedScales: EnhancedScales;
    if (isEnhancedScales(scales)) {
      processedScales = scales;
    } else {
      // Initialize with empty enhanced structure if not properly formatted
      processedScales = {
        installation: { cost: {}, managerCost: {}, userCost: {} },
        finance_fee: { cost: {}, managerCost: {}, userCost: {} },
        gross_profit: { cost: {}, managerCost: {}, userCost: {} },
        additional_costs: { 
          cost_per_kilometer: 0, 
          cost_per_point: 0,
          manager_cost_per_kilometer: 0,
          manager_cost_per_point: 0,
          user_cost_per_kilometer: 0,
          user_cost_per_point: 0
        }
      };
    }
    
    setScalesData(processedScales);
    setOriginalScalesData(JSON.parse(JSON.stringify(processedScales))); // Deep copy
    setHasUnsavedChanges(false);
  }, [scales, lastSaveTime]);

  // Track changes to detect unsaved modifications
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
      // Save the complete enhanced scales data structure
      await updateScales(scalesData);
      setLastSaveTime(Date.now());
      setOriginalScalesData(JSON.parse(JSON.stringify(scalesData))); // Update original data
      setHasUnsavedChanges(false);
      setMessage({ type: 'success', text: 'All scale changes saved successfully!' });
    } catch (error) {
      console.error('Error saving scales config:', error);
      setMessage({ type: 'error', text: 'An error occurred while saving. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle browser navigation with unsaved changes
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

  // Helper function to check if a specific field has changed
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

  // Helper function to get input class with change indicator
  const getInputClassName = useCallback((section: string, key: string, tab: string) => {
    const baseClass = "input w-32";
    const isChanged = isFieldChanged(section, key, tab);
    return isChanged ? `${baseClass} border-amber-400 bg-amber-50` : baseClass;
  }, [isFieldChanged]);

  // Reset changes to original values
  const handleDiscardChanges = () => {
    setScalesData(JSON.parse(JSON.stringify(originalScalesData)));
    setHasUnsavedChanges(false);
    setMessage({ type: 'success', text: 'All changes have been discarded.' });
  };

  // Count total number of changed fields
  const getChangedFieldsCount = useCallback(() => {
    let count = 0;
    
    // Check installation fields
    installationBands.forEach(band => {
      ['cost', 'managerCost', 'userCost'].forEach(tab => {
        if (isFieldChanged('installation', band, tab)) count++;
      });
    });
    
    // Check finance fee fields
    financeFeeRanges.forEach(range => {
      ['cost', 'managerCost', 'userCost'].forEach(tab => {
        if (isFieldChanged('finance_fee', range, tab)) count++;
      });
    });
    
    // Check gross profit fields
    grossProfitBands.forEach(band => {
      ['cost', 'managerCost', 'userCost'].forEach(tab => {
        if (isFieldChanged('gross_profit', band, tab)) count++;
      });
    });
    
    // Check additional costs fields
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

  const installationBands = ['0-4', '5-8', '9-16', '17-32', '33+'];
  const financeFeeRanges = ['0-20000', '20001-50000', '50001-100000', '100001+'];
  const grossProfitBands = ['0-4', '5-8', '9-16', '17-32', '33+'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold gradient-text">Scales Configuration</h2>
          {hasUnsavedChanges && (
            <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-sm">
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
              className="btn btn-outline text-gray-600 hover:text-gray-800"
            >
              Discard Changes
            </button>
          )}
          <button
            onClick={handleBatchSave}
            disabled={isLoading || !hasUnsavedChanges}
            className={`btn flex items-center space-x-2 ${
              hasUnsavedChanges 
                ? 'btn-success' 
                : 'btn-secondary opacity-50 cursor-not-allowed'
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
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {hasUnsavedChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800">Pending Changes Summary</h3>
          </div>
          <p className="text-amber-700 text-sm">
            You have <strong>{getChangedFieldsCount()} unsaved changes</strong> across your scales configuration. 
            Fields with changes are highlighted in amber. Use "Save All Changes" to persist all modifications 
            or "Discard Changes" to revert to the last saved state.
          </p>
        </div>
      )}

      {/* Role-based tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('cost')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            activeTab === 'cost'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          Cost Pricing (Admin)
        </button>
        <button
          onClick={() => setActiveTab('managerCost')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            activeTab === 'managerCost'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          Manager Pricing
        </button>
        <button
          onClick={() => setActiveTab('userCost')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            activeTab === 'userCost'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          User Pricing
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Installation Costs */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Installation Costs</h3>
          <div className="space-y-3">
            {installationBands.map(band => (
              <div key={band} className="flex justify-between items-center">
                <span className="font-medium">{band} extensions</span>
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

        {/* Finance Fees */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Finance Fees</h3>
          <div className="space-y-3">
            {financeFeeRanges.map(range => (
              <div key={range} className="flex justify-between items-center">
                <span className="font-medium">{range}</span>
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

        {/* Gross Profit */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Gross Profit</h3>
          <div className="space-y-3">
            {grossProfitBands.map(band => (
              <div key={band} className="flex justify-between items-center">
                <span className="font-medium">{band} extensions</span>
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

        {/* Additional Costs */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Additional Costs</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Cost per kilometer</span>
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
            <div className="flex justify-between items-center">
              <span className="font-medium">Cost per point</span>
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

      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Scales Information</h3>
        <ul className="text-blue-800 text-sm space-y-1">
          <li><strong>Installation Costs:</strong> Based on the number of extensions in the deal</li>
          <li><strong>Finance Fees:</strong> Based on the total finance amount</li>
          <li><strong>Gross Profit:</strong> Base profit based on the number of extensions</li>
          <li><strong>Additional Costs:</strong> Distance and point-based costs</li>
          <li><strong>Cost Pricing:</strong> Used for admin pricing calculations</li>
          <li><strong>Manager Pricing:</strong> Used when managers access the calculator</li>
          <li><strong>User Pricing:</strong> Used when regular users access the calculator</li>
          <li><strong>Changes are saved to database:</strong> All updates are persisted across browsers</li>
        </ul>
      </div>
    </div>
  );
} 