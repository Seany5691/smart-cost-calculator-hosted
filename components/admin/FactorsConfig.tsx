'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useConfigStore } from '@/lib/store/config';
import { useAuthStore } from '@/lib/store/auth-simple';
import { Save, AlertCircle, Upload, Download } from 'lucide-react';
import ScrollableTable from '@/components/ui/ScrollableTable';
import ConfigExcelImporter from './ConfigExcelImporter';
import { exportFactorsToExcel } from '@/lib/admin/excel-export';

interface EnhancedFactorData {
  cost: { [term: string]: { [escalation: string]: { [range: string]: number } } };
  managerFactors: { [term: string]: { [escalation: string]: { [range: string]: number } } };
  userFactors: { [term: string]: { [escalation: string]: { [range: string]: number } } };
}

function isEnhancedFactorData(data: any): data is EnhancedFactorData {
  return data && typeof data === 'object' && 
         'cost' in data && 'managerFactors' in data && 'userFactors' in data;
}

export default function FactorsConfig() {
  const { factors, fetchFactors, updateFactors } = useConfigStore();
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
  const [showImportModal, setShowImportModal] = useState(false);

  const deepEqual = useCallback((obj1: any, obj2: any): boolean => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }, []);

  useEffect(() => {
    const loadFactors = async () => {
      const token = useAuthStore.getState().token;
      if (!token) return;
      
      try {
        await fetchFactors(token);
      } catch (error) {
        console.error('Error loading factors:', error);
      }
    };
    
    loadFactors();
  }, [fetchFactors]);

  useEffect(() => {
    const timeSinceLastSave = Date.now() - lastSaveTime;
    if (timeSinceLastSave < 5000) {
      return;
    }
    
    let processedFactors: EnhancedFactorData;
    if (isEnhancedFactorData(factors)) {
      // Already in enhanced format
      processedFactors = factors;
    } else if (factors && typeof factors === 'object') {
      // Convert simple format to enhanced format
      processedFactors = {
        cost: factors as any,
        managerFactors: JSON.parse(JSON.stringify(factors)),
        userFactors: JSON.parse(JSON.stringify(factors))
      };
    } else {
      // Empty/invalid data
      processedFactors = {
        cost: {},
        managerFactors: {},
        userFactors: {}
      };
    }
    
    setFactorData(processedFactors);
    setOriginalFactorData(JSON.parse(JSON.stringify(processedFactors)));
    setHasUnsavedChanges(false);
  }, [factors, lastSaveTime]);

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
      const token = useAuthStore.getState().token;
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found' });
        return;
      }

      await updateFactors(factorData, token);
      setLastSaveTime(Date.now());
      setOriginalFactorData(JSON.parse(JSON.stringify(factorData)));
      setHasUnsavedChanges(false);
      setMessage({ type: 'success', text: 'All factor changes saved successfully!' });
    } catch (error) {
      console.error('Error saving factors config:', error);
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

  const isFieldChanged = useCallback((term: string, escalation: string, range: string, tab: string) => {
    const currentValue = factorData[tab as keyof EnhancedFactorData][term]?.[escalation]?.[range] || 0;
    const originalValue = originalFactorData[tab as keyof EnhancedFactorData][term]?.[escalation]?.[range] || 0;
    return currentValue !== originalValue;
  }, [factorData, originalFactorData]);

  const getInputClassName = useCallback((term: string, escalation: string, range: string, tab: string) => {
    const baseClass = "w-full sm:w-32 px-3 py-3 sm:py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[44px] sm:min-h-0";
    const isChanged = isFieldChanged(term, escalation, range, tab);
    return isChanged ? `${baseClass} border-amber-400 bg-amber-500/20` : baseClass;
  }, [isFieldChanged]);

  const handleDiscardChanges = () => {
    setFactorData(JSON.parse(JSON.stringify(originalFactorData)));
    setHasUnsavedChanges(false);
    setMessage({ type: 'success', text: 'All changes have been discarded.' });
  };

  const handleExport = () => {
    try {
      exportFactorsToExcel(factorData);
    } catch (error) {
      console.error('Failed to export factors:', error);
      setMessage({ type: 'error', text: 'Failed to export factors configuration' });
    }
  };

  const handleImportComplete = async () => {
    setShowImportModal(false);
    const token = useAuthStore.getState().token;
    if (token) {
      await fetchFactors(token);
    }
    setMessage({ type: 'success', text: 'Factors configuration imported successfully' });
  };

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

    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Factor Sheet Configuration
          </h2>
          {hasUnsavedChanges && (
            <div className="flex items-center space-x-2 text-amber-300 bg-amber-500/20 backdrop-blur-md px-3 py-1 rounded-full text-sm border border-amber-500/30">
              <AlertCircle className="w-4 h-4" />
              <span>Unsaved changes</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-all inline-flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-all inline-flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
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
            You have <strong>{getChangedFieldsCount()} unsaved changes</strong> across your factor configuration. 
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
          Cost Factors
        </button>
        <button
          onClick={() => setActiveTab('managerFactors')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            activeTab === 'managerFactors'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          Manager Factors
        </button>
        <button
          onClick={() => setActiveTab('userFactors')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            activeTab === 'userFactors'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          User Factors
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold mb-4 text-white">Bulk Operations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="font-medium text-gray-300">Copy Cost Factors to Manager Factors</h4>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="number"
                id="costToManagerMultiplier"
                className="w-full sm:w-24 px-3 py-3 sm:py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[44px] sm:min-h-0"
                placeholder="1.0"
                step="0.01"
                min="0"
                defaultValue="1.0"
              />
              <span className="text-sm text-gray-400 hidden sm:inline">× multiplier</span>
              <button
                onClick={() => copyFactors('cost', 'managerFactors', 'costToManagerMultiplier')}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all text-sm min-h-[44px] sm:min-h-0"
              >
                Copy to Manager
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-300">Copy Cost Factors to User Factors</h4>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="number"
                id="costToUserMultiplier"
                className="w-full sm:w-24 px-3 py-3 sm:py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[44px] sm:min-h-0"
                placeholder="1.0"
                step="0.01"
                min="0"
                defaultValue="1.0"
              />
              <span className="text-sm text-gray-400 hidden sm:inline">× multiplier</span>
              <button
                onClick={() => copyFactors('cost', 'userFactors', 'costToUserMultiplier')}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all text-sm min-h-[44px] sm:min-h-0"
              >
                Copy to User
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-300">Copy Manager Factors to User Factors</h4>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="number"
                id="managerToUserMultiplier"
                className="w-full sm:w-24 px-3 py-3 sm:py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[44px] sm:min-h-0"
                placeholder="1.0"
                step="0.01"
                min="0"
                defaultValue="1.0"
              />
              <span className="text-sm text-gray-400 hidden sm:inline">× multiplier</span>
              <button
                onClick={() => copyFactors('managerFactors', 'userFactors', 'managerToUserMultiplier')}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all text-sm min-h-[44px] sm:min-h-0"
              >
                Copy to User
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-300">Copy User Factors to Manager Factors</h4>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="number"
                id="userToManagerMultiplier"
                className="w-full sm:w-24 px-3 py-3 sm:py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[44px] sm:min-h-0"
                placeholder="1.0"
                step="0.01"
                min="0"
                defaultValue="1.0"
              />
              <span className="text-sm text-gray-400 hidden sm:inline">× multiplier</span>
              <button
                onClick={() => copyFactors('userFactors', 'managerFactors', 'userToManagerMultiplier')}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all text-sm min-h-[44px] sm:min-h-0"
              >
                Copy to Manager
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-500/10 backdrop-blur-md border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-200">
            <strong>Tip:</strong> Use multipliers to adjust factors when copying. For example, use 1.1 to increase factors by 10%, 
            or 0.9 to decrease by 10%. This helps maintain pricing relationships between tiers.
          </p>
        </div>
      </div>

      <ScrollableTable minWidth="800px">
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
          <div className="overflow-x-auto max-w-full">
            <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 font-semibold text-white min-w-[120px]">Term</th>
                <th className="text-left py-3 px-4 font-semibold text-white min-w-[100px]">Escalation</th>
                {ranges.map(range => (
                  <th key={range} className="text-left py-3 px-4 font-semibold text-white min-w-[140px]">{range}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {terms.map(term => 
                escalations.map((escalation, escalationIndex) => (
                  <tr key={`${term}-${escalation}`} className="border-b border-white/5 hover:bg-white/5">
                    {escalationIndex === 0 && (
                      <td className="py-3 px-4 font-medium text-gray-300" rowSpan={escalations.length}>
                        {term.replace('_', ' ')}
                      </td>
                    )}
                    <td className="py-3 px-4 font-medium text-gray-300">{escalation}</td>
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
    </ScrollableTable>

      <div className="bg-blue-500/10 backdrop-blur-md border border-blue-500/20 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-200 mb-2">Factor Sheet Information</h3>
        <ul className="text-blue-100 text-sm space-y-1">
          <li><strong>Term:</strong> Contract duration in months</li>
          <li><strong>Escalation:</strong> Annual price increase percentage</li>
          <li><strong>Finance Range:</strong> Total finance amount range</li>
          <li><strong>Factor:</strong> Monthly rental rate multiplier (e.g., 0.03814 = 3.814% per month)</li>
          <li><strong>Cost Factors:</strong> Used for admin pricing calculations</li>
          <li><strong>Manager Factors:</strong> Used when managers access the calculator</li>
          <li><strong>User Factors:</strong> Used when regular users access the calculator</li>
        </ul>
      </div>

      {/* Import Modal */}
      {showImportModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl shadow-2xl max-w-4xl w-full border border-purple-500/30 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <ConfigExcelImporter
                configType="factors"
                onImportComplete={handleImportComplete}
                onCancel={() => setShowImportModal(false)}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
