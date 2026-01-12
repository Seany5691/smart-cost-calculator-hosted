'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConfigStore } from '@/store/config';
import { EnhancedFactorData, isEnhancedFactorData } from '@/lib/types';
import { Save, AlertCircle } from 'lucide-react';

export default function FactorSheetConfig() {
  const { factors, updateFactors } = useConfigStore();
  const [factorData, setFactorData] = useState<EnhancedFactorData>({
    cost: {},
    managerFactors: {},
    userFactors: {}
  });
  const [activeTab, setActiveTab] = useState<'cost' | 'managerFactors' | 'userFactors'>('cost');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastSaveTime, setLastSaveTime] = useState<number>(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalFactorData, setOriginalFactorData] = useState<EnhancedFactorData>({
    cost: {},
    managerFactors: {},
    userFactors: {}
  });

  // Deep comparison function to check if factor data has changed
  const deepEqual = useCallback((obj1: any, obj2: any): boolean => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }, []);

  useEffect(() => {
    // Don't override local changes if we just saved within the last 5 seconds
    const timeSinceLastSave = Date.now() - lastSaveTime;
    if (timeSinceLastSave < 5000) {
      return;
    }
    
    // Use factors data directly (assuming it's already in enhanced format)
    let processedFactors: EnhancedFactorData;
    if (isEnhancedFactorData(factors)) {
      processedFactors = factors;
    } else {
      // Initialize with empty enhanced structure if not properly formatted
      processedFactors = {
        cost: {},
        managerFactors: {},
        userFactors: {}
      };
    }
    
    setFactorData(processedFactors);
    setOriginalFactorData(JSON.parse(JSON.stringify(processedFactors))); // Deep copy
    setHasUnsavedChanges(false);
  }, [factors, lastSaveTime]);

  // Track changes to detect unsaved modifications
  useEffect(() => {
    const hasChanges = !deepEqual(factorData, originalFactorData);
    setHasUnsavedChanges(hasChanges);
  }, [factorData, originalFactorData, deepEqual]);

  const handleBatchSave = async () => {
    if (!hasUnsavedChanges) {
      setMessage({ type: 'success', text: 'No changes to save.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Save the complete enhanced factor data structure
      await updateFactors(factorData);
      setLastSaveTime(Date.now());
      setOriginalFactorData(JSON.parse(JSON.stringify(factorData))); // Update original data
      setHasUnsavedChanges(false);
      setMessage({ type: 'success', text: 'All factor changes saved successfully!' });
    } catch (error) {
      console.error('Error saving factors config:', error);
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
  const isFieldChanged = useCallback((term: string, escalation: string, range: string, tab: string) => {
    const currentValue = factorData[tab as keyof EnhancedFactorData][term]?.[escalation]?.[range] || 0;
    const originalValue = originalFactorData[tab as keyof EnhancedFactorData][term]?.[escalation]?.[range] || 0;
    return currentValue !== originalValue;
  }, [factorData, originalFactorData]);

  // Helper function to get input class with change indicator
  const getInputClassName = useCallback((term: string, escalation: string, range: string, tab: string) => {
    const baseClass = "input w-32 text-sm";
    const isChanged = isFieldChanged(term, escalation, range, tab);
    return isChanged ? `${baseClass} border-amber-400 bg-amber-50` : baseClass;
  }, [isFieldChanged]);

  // Reset changes to original values
  const handleDiscardChanges = () => {
    setFactorData(JSON.parse(JSON.stringify(originalFactorData)));
    setHasUnsavedChanges(false);
    setMessage({ type: 'success', text: 'All changes have been discarded.' });
  };

  // Count total number of changed fields
  const getChangedFieldsCount = useCallback(() => {
    let count = 0;
    
    terms.forEach(term => {
      escalations.forEach(escalation => {
        ranges.forEach(range => {
          ['cost', 'managerFactors', 'userFactors'].forEach(tab => {
            if (isFieldChanged(term, escalation, range, tab)) count++;
          });
        });
      });
    });
    
    return count;
  }, [isFieldChanged]);

  const updateFactor = (term: string, escalation: string, range: string, value: number) => {
    setFactorData(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [term]: {
          ...prev[activeTab][term],
          [escalation]: {
            ...prev[activeTab][term]?.[escalation],
            [range]: value
          }
        }
      }
    }));
  };

  const terms = ['36_months', '48_months', '60_months'];
  const escalations = ['0%', '10%', '15%'];
  const ranges = ['0-20000', '20001-50000', '50001-100000', '100000+'];

  const copyFactors = (
    sourceTier: 'cost' | 'managerFactors' | 'userFactors',
    targetTier: 'cost' | 'managerFactors' | 'userFactors',
    multiplierInputId: string
  ) => {
    const multiplierInput = document.getElementById(multiplierInputId) as HTMLInputElement;
    const multiplier = parseFloat(multiplierInput?.value || '1.0');
    
    if (isNaN(multiplier) || multiplier < 0) {
      setMessage({ type: 'error', text: 'Please enter a valid positive multiplier value.' });
      return;
    }

    const sourceData = factorData[sourceTier];
    const copiedData: { [term: string]: { [escalation: string]: { [range: string]: number } } } = {};

    // Deep copy and apply multiplier
    terms.forEach(term => {
      copiedData[term] = {};
      escalations.forEach(escalation => {
        copiedData[term][escalation] = {};
        ranges.forEach(range => {
          const originalValue = sourceData[term]?.[escalation]?.[range] || 0;
          copiedData[term][escalation][range] = parseFloat((originalValue * multiplier).toFixed(6));
        });
      });
    });

    setFactorData(prev => ({
      ...prev,
      [targetTier]: copiedData
    }));

    const tierNames = {
      cost: 'Cost',
      managerFactors: 'Manager',
      userFactors: 'User'
    };

    setMessage({ 
      type: 'success', 
      text: `Successfully copied ${tierNames[sourceTier]} factors to ${tierNames[targetTier]} factors with ${multiplier}× multiplier.` 
    });

    // Clear the message after 3 seconds
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold gradient-text">Factor Sheet Configuration</h2>
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
            You have <strong>{getChangedFieldsCount()} unsaved changes</strong> across your factor configuration. 
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
          Cost Factors (Admin)
        </button>
        <button
          onClick={() => setActiveTab('managerFactors')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            activeTab === 'managerFactors'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          Manager Factors
        </button>
        <button
          onClick={() => setActiveTab('userFactors')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            activeTab === 'userFactors'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          User Factors
        </button>
      </div>

      {/* Bulk Operations Section */}
      <div className="card bg-gray-50">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Bulk Operations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Copy Cost to Manager */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Copy Cost Factors to Manager Factors</h4>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                id="costToManagerMultiplier"
                className="input w-24"
                placeholder="1.0"
                step="0.01"
                min="0"
                defaultValue="1.0"
              />
              <span className="text-sm text-gray-600">× multiplier</span>
              <button
                onClick={() => copyFactors('cost', 'managerFactors', 'costToManagerMultiplier')}
                className="btn btn-secondary text-sm"
              >
                Copy to Manager
              </button>
            </div>
          </div>

          {/* Copy Cost to User */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Copy Cost Factors to User Factors</h4>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                id="costToUserMultiplier"
                className="input w-24"
                placeholder="1.0"
                step="0.01"
                min="0"
                defaultValue="1.0"
              />
              <span className="text-sm text-gray-600">× multiplier</span>
              <button
                onClick={() => copyFactors('cost', 'userFactors', 'costToUserMultiplier')}
                className="btn btn-secondary text-sm"
              >
                Copy to User
              </button>
            </div>
          </div>

          {/* Copy Manager to User */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Copy Manager Factors to User Factors</h4>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                id="managerToUserMultiplier"
                className="input w-24"
                placeholder="1.0"
                step="0.01"
                min="0"
                defaultValue="1.0"
              />
              <span className="text-sm text-gray-600">× multiplier</span>
              <button
                onClick={() => copyFactors('managerFactors', 'userFactors', 'managerToUserMultiplier')}
                className="btn btn-secondary text-sm"
              >
                Copy to User
              </button>
            </div>
          </div>

          {/* Copy User to Manager */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Copy User Factors to Manager Factors</h4>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                id="userToManagerMultiplier"
                className="input w-24"
                placeholder="1.0"
                step="0.01"
                min="0"
                defaultValue="1.0"
              />
              <span className="text-sm text-gray-600">× multiplier</span>
              <button
                onClick={() => copyFactors('userFactors', 'managerFactors', 'userToManagerMultiplier')}
                className="btn btn-secondary text-sm"
              >
                Copy to Manager
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Use multipliers to adjust factors when copying. For example, use 1.1 to increase factors by 10%, 
            or 0.9 to decrease by 10%. This helps maintain pricing relationships between tiers.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold min-w-[120px]">Term</th>
                <th className="text-left py-3 px-4 font-semibold min-w-[100px]">Escalation</th>
                {ranges.map(range => (
                  <th key={range} className="text-left py-3 px-4 font-semibold min-w-[140px]">{range}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {terms.map(term => 
                escalations.map((escalation, escalationIndex) => (
                  <tr key={`${term}-${escalation}`} className="border-b border-gray-100 hover:bg-gray-50">
                    {escalationIndex === 0 && (
                      <td className="py-3 px-4 font-medium" rowSpan={escalations.length}>
                        {term.replace('_', ' ')}
                      </td>
                    )}
                    <td className="py-3 px-4 font-medium">{escalation}</td>
                    {ranges.map(range => (
                      <td key={range} className="py-3 px-4">
                        <input
                          type="number"
                          value={factorData[activeTab][term]?.[escalation]?.[range] || 0}
                          onChange={(e) => updateFactor(term, escalation, range, parseFloat(e.target.value) || 0)}
                          className={getInputClassName(term, escalation, range, activeTab)}
                          step="0.00001"
                          min="0"
                          placeholder="0.00000"
                        />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Factor Sheet Information</h3>
        <ul className="text-blue-800 text-sm space-y-1">
          <li><strong>Term:</strong> Contract duration in months</li>
          <li><strong>Escalation:</strong> Annual price increase percentage</li>
          <li><strong>Finance Range:</strong> Total finance amount range</li>
          <li><strong>Factor:</strong> Monthly rental rate multiplier (e.g., 0.03814 = 3.814% per month)</li>
          <li><strong>Cost Factors:</strong> Used for admin pricing calculations</li>
          <li><strong>Manager Factors:</strong> Used when managers access the calculator</li>
          <li><strong>User Factors:</strong> Used when regular users access the calculator</li>
          <li><strong>Changes are saved to database:</strong> All updates are persisted across browsers</li>
        </ul>
      </div>
    </div>
  );
} 