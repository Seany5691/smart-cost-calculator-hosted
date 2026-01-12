'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConfigStore } from '@/store/config';
import { Item } from '@/lib/types';
import { formatCurrency, generateId } from '@/lib/utils';
import { Plus, Trash2, Edit, Save, X, Check, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';

export default function LicensingConfig() {
  const { licensing, updateLicensing } = useConfigStore();
  const [items, setItems] = useState<Item[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalItems, setOriginalItems] = useState<Item[]>([]);
  const [lastSaveTime, setLastSaveTime] = useState<number>(0);
  const [managerMarkup, setManagerMarkup] = useState<number>(25);
  const [userMarkup, setUserMarkup] = useState<number>(50);

  // Deep comparison function to check if items have changed
  const deepEqual = useCallback((obj1: any, obj2: any): boolean => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }, []);

  useEffect(() => {
    // Don't override local changes if we just saved within the last 5 seconds
    const timeSinceLastSave = Date.now() - lastSaveTime;
    if (timeSinceLastSave < 5000) {
      return;
    }
    
    setItems(licensing);
    setOriginalItems(JSON.parse(JSON.stringify(licensing))); // Deep copy
    setHasUnsavedChanges(false);
  }, [licensing, lastSaveTime]);

  // Track changes to detect unsaved modifications
  useEffect(() => {
    const hasChanges = !deepEqual(items, originalItems);
    setHasUnsavedChanges(hasChanges);
  }, [items, originalItems, deepEqual]);

  const handleBatchSave = async () => {
    if (!hasUnsavedChanges) {
      setMessage({ type: 'success', text: 'No changes to save.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await updateLicensing(items);
      setLastSaveTime(Date.now());
      setOriginalItems(JSON.parse(JSON.stringify(items))); // Update original data
      setHasUnsavedChanges(false);
      setMessage({ type: 'success', text: 'All licensing changes saved successfully!' });
    } catch (error) {
      console.error('Error saving licensing config:', error);
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

  // Reset changes to original values
  const handleDiscardChanges = () => {
    setItems(JSON.parse(JSON.stringify(originalItems)));
    setHasUnsavedChanges(false);
    setEditingItem(null);
    setMessage({ type: 'success', text: 'All changes have been discarded.' });
  };

  // Count total number of changes
  const getChangedItemsCount = useCallback(() => {
    return items.filter((item, index) => {
      const originalItem = originalItems[index];
      return !originalItem || !deepEqual(item, originalItem);
    }).length + Math.abs(items.length - originalItems.length);
  }, [items, originalItems, deepEqual]);

  // Calculate markup prices based on cost price
  const calculateMarkupPrice = (costPrice: number, markupPercent: number) => {
    return costPrice * (1 + markupPercent / 100);
  };

  // Apply markup to all items
  const applyMarkupToAll = () => {
    const updatedItems = items.map(item => {
      if (item.cost && item.cost > 0) {
        return {
          ...item,
          managerCost: calculateMarkupPrice(item.cost, managerMarkup),
          userCost: calculateMarkupPrice(item.cost, userMarkup)
        };
      }
      return item;
    });
    setItems(updatedItems);
  };

  const handleAddItem = () => {
    const newItem: Item = {
      id: generateId(),
      name: '',
      cost: 0,
      managerCost: 0,
      userCost: 0,
      quantity: 0,
      locked: false,
      displayOrder: items.length
    };
    setItems([...items, newItem]);
    setEditingItem(newItem.id);
  };

  const handleDeleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleEditItem = (id: string) => {
    setEditingItem(id);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  const handleUpdateItem = (id: string, updates: Partial<Item>) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const handleSaveItem = (id: string) => {
    setEditingItem(null);
  };

  const handleMoveItem = (id: string, direction: 'up' | 'down') => {
    const currentIndex = items.findIndex(item => item.id === id);
    if (currentIndex === -1) return;

    const newItems = [...items];
    if (direction === 'up' && currentIndex > 0) {
      // Swap with previous item
      [newItems[currentIndex], newItems[currentIndex - 1]] = [newItems[currentIndex - 1], newItems[currentIndex]];
    } else if (direction === 'down' && currentIndex < newItems.length - 1) {
      // Swap with next item
      [newItems[currentIndex], newItems[currentIndex + 1]] = [newItems[currentIndex + 1], newItems[currentIndex]];
    }

    // Update display order values
    newItems.forEach((item, index) => {
      item.displayOrder = index;
    });

    setItems(newItems);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold gradient-text">Licensing Configuration</h2>
          {hasUnsavedChanges && (
            <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Unsaved changes</span>
            </div>
          )}
        </div>
        <button
          onClick={handleAddItem}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Markup Controls */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Markup Percentage Controls</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="label">Manager Markup (%)</label>
            <input
              type="number"
              value={managerMarkup}
              onChange={(e) => setManagerMarkup(parseFloat(e.target.value) || 0)}
              className="input"
              placeholder="e.g., 25"
              step="0.1"
            />
            <p className="text-xs text-gray-600 mt-1">Markup percentage for manager pricing</p>
          </div>
          <div>
            <label className="label">User Markup (%)</label>
            <input
              type="number"
              value={userMarkup}
              onChange={(e) => setUserMarkup(parseFloat(e.target.value) || 0)}
              className="input"
              placeholder="e.g., 50"
              step="0.1"
            />
            <p className="text-xs text-gray-600 mt-1">Markup percentage for user pricing</p>
          </div>
          <div>
            <button
              onClick={applyMarkupToAll}
              className="btn btn-success w-full"
            >
              Apply Markup to All Items
            </button>
            <p className="text-xs text-gray-600 mt-1">Calculates manager/user costs from cost prices</p>
          </div>
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
            You have <strong>{getChangedItemsCount()} unsaved changes</strong> to your licensing configuration. 
            Use "Save All Changes" to persist all modifications or "Discard Changes" to revert to the last saved state.
          </p>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold">Order</th>
                <th className="text-left py-3 px-4 font-semibold">Name</th>
                <th className="text-left py-3 px-4 font-semibold">Cost Price</th>
                <th className="text-left py-3 px-4 font-semibold">Manager Cost</th>
                <th className="text-left py-3 px-4 font-semibold">User Cost</th>
                <th className="text-left py-3 px-4 font-semibold">Locked</th>
                <th className="text-left py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-1">
                      <span className="text-sm text-gray-600 font-medium">{index + 1}</span>
                      <div className="flex flex-col">
                        <button
                          onClick={() => handleMoveItem(item.id, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 touch-manipulation"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMoveItem(item.id, 'down')}
                          disabled={index === items.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 touch-manipulation"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {editingItem === item.id ? (
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                        className="input w-full"
                      />
                    ) : (
                      <span className="font-medium">{item.name}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingItem === item.id ? (
                      <input
                        type="number"
                        value={item.cost}
                        onChange={(e) => handleUpdateItem(item.id, { cost: parseFloat(e.target.value) || 0 })}
                        className="input w-24"
                        step="0.01"
                        placeholder="Cost price"
                      />
                    ) : (
                      <span>{formatCurrency(item.cost)}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingItem === item.id ? (
                      <input
                        type="number"
                        value={item.managerCost || item.cost}
                        onChange={(e) => handleUpdateItem(item.id, { managerCost: parseFloat(e.target.value) || 0 })}
                        className="input w-24"
                        step="0.01"
                      />
                    ) : (
                      <span>{formatCurrency(item.managerCost || item.cost)}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingItem === item.id ? (
                      <input
                        type="number"
                        value={item.userCost || item.cost}
                        onChange={(e) => handleUpdateItem(item.id, { userCost: parseFloat(e.target.value) || 0 })}
                        className="input w-24"
                        step="0.01"
                      />
                    ) : (
                      <span>{formatCurrency(item.userCost || item.cost)}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingItem === item.id ? (
                      <input
                        type="checkbox"
                        checked={item.locked || false}
                        onChange={(e) => handleUpdateItem(item.id, { locked: e.target.checked })}
                        className="w-4 h-4 text-blue-600 touch-manipulation"
                      />
                    ) : (
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.locked ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.locked ? 'Locked' : 'Unlocked'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      {editingItem === item.id ? (
                        <>
                          <button
                            onClick={() => handleSaveItem(item.id)}
                            className="p-1 text-green-600 hover:text-green-800 touch-manipulation"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 text-gray-600 hover:text-gray-800 touch-manipulation"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditItem(item.id)}
                            className="p-1 text-blue-600 hover:text-blue-800 touch-manipulation"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-red-600 hover:text-red-800 touch-manipulation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {items.map((item, index) => (
          <div key={item.id} className="bg-white/60 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-gray-200">
            {/* Item Header with Order Controls */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                {editingItem === item.id ? (
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                    className="input w-full text-sm font-semibold"
                    placeholder="Item name"
                  />
                ) : (
                  <h3 className="font-semibold text-sm text-gray-900">{item.name || 'Unnamed Item'}</h3>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">Order: {index + 1}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    item.locked ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {item.locked ? 'Locked' : 'Unlocked'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col ml-2">
                <button
                  onClick={() => handleMoveItem(item.id, 'up')}
                  disabled={index === 0}
                  className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 touch-manipulation active:scale-95"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleMoveItem(item.id, 'down')}
                  disabled={index === items.length - 1}
                  className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 touch-manipulation active:scale-95"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-3 gap-2 mb-3 bg-gray-50 rounded-lg p-2">
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1">Cost Price</div>
                {editingItem === item.id ? (
                  <input
                    type="number"
                    value={item.cost}
                    onChange={(e) => handleUpdateItem(item.id, { cost: parseFloat(e.target.value) || 0 })}
                    className="input w-full text-xs text-center p-1"
                    step="0.01"
                  />
                ) : (
                  <div className="text-sm font-semibold text-gray-900">{formatCurrency(item.cost)}</div>
                )}
              </div>
              <div className="text-center border-l border-r border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Manager</div>
                {editingItem === item.id ? (
                  <input
                    type="number"
                    value={item.managerCost || item.cost}
                    onChange={(e) => handleUpdateItem(item.id, { managerCost: parseFloat(e.target.value) || 0 })}
                    className="input w-full text-xs text-center p-1"
                    step="0.01"
                  />
                ) : (
                  <div className="text-sm font-semibold text-gray-900">{formatCurrency(item.managerCost || item.cost)}</div>
                )}
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1">User</div>
                {editingItem === item.id ? (
                  <input
                    type="number"
                    value={item.userCost || item.cost}
                    onChange={(e) => handleUpdateItem(item.id, { userCost: parseFloat(e.target.value) || 0 })}
                    className="input w-full text-xs text-center p-1"
                    step="0.01"
                  />
                ) : (
                  <div className="text-sm font-semibold text-gray-900">{formatCurrency(item.userCost || item.cost)}</div>
                )}
              </div>
            </div>

            {/* Settings (when editing) */}
            {editingItem === item.id && (
              <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={item.locked || false}
                    onChange={(e) => handleUpdateItem(item.id, { locked: e.target.checked })}
                    className="w-4 h-4 text-blue-600 touch-manipulation"
                  />
                  <span className="text-xs text-gray-700">Locked</span>
                </label>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {editingItem === item.id ? (
                <>
                  <button
                    onClick={() => handleSaveItem(item.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium touch-manipulation active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium touch-manipulation active:scale-95"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleEditItem(item.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium touch-manipulation active:scale-95"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium touch-manipulation active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end space-x-3">
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
                ? `Save All Changes (${getChangedItemsCount()})` 
                : 'No Changes to Save'
            }
          </span>
        </button>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Licensing Configuration Info</h3>
        <ul className="text-blue-800 text-sm space-y-1">
          <li><strong>Cost Price:</strong> Base cost price for markup calculations (shown to admin users)</li>
          <li><strong>Manager Cost:</strong> Cost shown to manager role users (with markup)</li>
          <li><strong>User Cost:</strong> Cost shown to regular users (with markup)</li>
          <li><strong>Markup Controls:</strong> Set percentage markup and apply to all items based on cost price</li>
          <li><strong>Locked:</strong> Items that cannot be modified in the calculator</li>
          <li><strong>Changes are saved to database:</strong> All updates are persisted across browsers</li>
        </ul>
      </div>
    </div>
  );
} 