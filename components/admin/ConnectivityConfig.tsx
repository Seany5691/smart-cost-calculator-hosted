'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useConfigStore } from '@/lib/store/config';
import { useAuthStore } from '@/lib/store/auth-simple';
import { X, AlertTriangle, Upload, Download } from 'lucide-react';
import ScrollableTable from '@/components/ui/ScrollableTable';
import ConfigExcelImporter from './ConfigExcelImporter';
import { exportConnectivityToExcel } from '@/lib/admin/excel-export';

interface ConnectivityItem {
  id: string;
  name: string;
  cost: number;
  managerCost: number;
  userCost: number;
  quantity: number;
  locked: boolean;
  isActive: boolean;
  displayOrder: number;
}

// Confirm Modal Component
function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string; 
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl shadow-2xl max-w-md w-full border border-purple-500/30">
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <AlertTriangle className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-purple-200" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-white">{message}</p>
        </div>
        <div className="flex justify-end space-x-3 p-6 border-t border-purple-500/20">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold"
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Prompt Modal Component
function PromptModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  title, 
  label1,
  label2,
  placeholder1,
  placeholder2
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (value1: string, value2: string) => void; 
  title: string; 
  label1: string;
  label2: string;
  placeholder1: string;
  placeholder2: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [value1, setValue1] = useState('');
  const [value2, setValue2] = useState('');

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setValue1('');
      setValue2('');
    }
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value1 && value2) {
      onSubmit(value1, value2);
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl shadow-2xl max-w-md w-full border border-purple-500/30 sm:max-w-full sm:h-screen sm:m-0 sm:rounded-none md:max-w-md md:h-auto md:m-4 md:rounded-2xl">
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5 text-purple-200" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-white font-medium mb-2">{label1}</label>
            <input
              type="number"
              value={value1}
              onChange={(e) => setValue1(e.target.value)}
              placeholder={placeholder1}
              className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500 min-h-[44px]"
              required
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-white font-medium mb-2">{label2}</label>
            <input
              type="number"
              value={value2}
              onChange={(e) => setValue2(e.target.value)}
              placeholder={placeholder2}
              className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500 min-h-[44px]"
              required
              step="0.01"
            />
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold min-h-[44px]"
            >
              Apply
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// Alert Modal Component
function AlertModal({ 
  isOpen, 
  onClose, 
  title, 
  message,
  type = 'error'
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  message: string;
  type?: 'error' | 'success';
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl shadow-2xl max-w-md w-full border border-purple-500/30">
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-purple-200" />
          </button>
        </div>
        <div className="p-6">
          <div className={`${type === 'error' ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'} border rounded-lg p-4`}>
            <p className={type === 'error' ? 'text-red-400' : 'text-green-400'}>{message}</p>
          </div>
        </div>
        <div className="flex justify-end p-6 border-t border-purple-500/20">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold"
          >
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ConnectivityConfig() {
  const { connectivity, fetchConnectivity } = useConfigStore();
  const [items, setItems] = useState<ConnectivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ConnectivityItem>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', type: 'error' as 'error' | 'success' });
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = useAuthStore.getState().token;
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const token = useAuthStore.getState().token;
      await fetchConnectivity(token);
      const response = await fetch('/api/config/connectivity', {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        // Ensure numeric fields are properly typed
        const typedData = data.map((item: any) => ({
          ...item,
          cost: parseFloat(item.cost) || 0,
          managerCost: parseFloat(item.managerCost) || 0,
          userCost: parseFloat(item.userCost) || 0,
          quantity: parseInt(item.quantity) || 0,
          displayOrder: parseInt(item.displayOrder) || 0,
        }));
        setItems(typedData.sort((a: ConnectivityItem, b: ConnectivityItem) => a.displayOrder - b.displayOrder));
      }
    } catch (error) {
      console.error('Failed to load connectivity items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/config/connectivity', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...editForm,
          displayOrder: items.length,
        }),
      });

      if (response.ok) {
        await loadItems();
        setShowAddForm(false);
        setEditForm({});
      } else {
        const error = await response.json();
        setAlertConfig({
          title: 'Error',
          message: `Failed to create item: ${error.error || 'Unknown error'}`,
          type: 'error'
        });
        setShowAlertModal(true);
      }
    } catch (error) {
      console.error('Failed to create item:', error);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const response = await fetch(`/api/config/connectivity/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        await loadItems();
        setEditingId(null);
        setEditForm({});
      }
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteItemId(id);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteItemId) return;

    try {
      const response = await fetch(`/api/config/connectivity/${deleteItemId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        await loadItems();
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
    } finally {
      setDeleteItemId(null);
    }
  };

  const handleBulkMarkup = async () => {
    setShowPromptModal(true);
  };

  const applyBulkMarkup = async (managerMarkup: string, userMarkup: string) => {
    try {
      const updatedItems = items.map((item) => ({
        ...item,
        managerCost: item.cost * (1 + parseFloat(managerMarkup) / 100),
        userCost: item.cost * (1 + parseFloat(userMarkup) / 100),
      }));

      for (const item of updatedItems) {
        await fetch(`/api/config/connectivity/${item.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            managerCost: item.managerCost,
            userCost: item.userCost,
          }),
        });
      }

      await loadItems();
    } catch (error) {
      console.error('Failed to apply bulk markup:', error);
    }
  };

  const handleExport = () => {
    try {
      exportConnectivityToExcel(items);
    } catch (error) {
      console.error('Failed to export connectivity:', error);
      setAlertConfig({
        title: 'Export Error',
        message: 'Failed to export connectivity configuration',
        type: 'error'
      });
      setShowAlertModal(true);
    }
  };

  const handleImportComplete = async () => {
    setShowImportModal(false);
    await loadItems();
    setAlertConfig({
      title: 'Import Complete',
      message: 'Connectivity configuration imported successfully',
      type: 'success'
    });
    setShowAlertModal(true);
  };

  if (loading) {
    return <div className="text-white text-center py-8">Loading...</div>;
  }

  // Mobile Card View
  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Connectivity Items</h2>
          <div className="space-x-2">
            <button
              onClick={handleBulkMarkup}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              Bulk Markup
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
              Add Item
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="bg-white/20 p-4 rounded-lg space-y-3">
            <h3 className="text-white font-semibold">Add New Item</h3>
            <input
              type="text"
              placeholder="Name"
              value={editForm.name || ''}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
            />
            <input
              type="number"
              placeholder="Cost"
              value={editForm.cost || ''}
              onChange={(e) => {
                const costValue = parseFloat(e.target.value);
                setEditForm({ 
                  ...editForm, 
                  cost: costValue,
                  managerCost: costValue,
                  userCost: costValue
                });
              }}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
            />
            <input
              type="number"
              placeholder="Manager Cost"
              value={editForm.managerCost || ''}
              onChange={(e) => setEditForm({ ...editForm, managerCost: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
            />
            <input
              type="number"
              placeholder="User Cost"
              value={editForm.userCost || ''}
              onChange={(e) => setEditForm({ ...editForm, userCost: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleCreate}
                className="flex-1 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditForm({});
                }}
                className="flex-1 px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {items.filter((item) => item.isActive).map((item) => (
          <div key={item.id} className="bg-white/10 p-4 rounded-lg space-y-2">
            {editingId === item.id ? (
              <>
                <input
                  type="text"
                  value={editForm.name || item.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                />
                <input
                  type="number"
                  value={editForm.cost !== undefined ? editForm.cost : item.cost}
                  onChange={(e) => {
                    const costValue = parseFloat(e.target.value);
                    setEditForm({ 
                      ...editForm, 
                      cost: costValue,
                      managerCost: costValue,
                      userCost: costValue
                    });
                  }}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                />
                <input
                  type="number"
                  value={editForm.managerCost !== undefined ? editForm.managerCost : item.managerCost}
                  onChange={(e) => setEditForm({ ...editForm, managerCost: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                />
                <input
                  type="number"
                  value={editForm.userCost !== undefined ? editForm.userCost : item.userCost}
                  onChange={(e) => setEditForm({ ...editForm, userCost: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                />
                <label className="flex items-center text-white">
                  <input
                    type="checkbox"
                    checked={editForm.locked !== undefined ? editForm.locked : item.locked}
                    onChange={(e) => setEditForm({ ...editForm, locked: e.target.checked })}
                    className="mr-2"
                  />
                  Locked
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleUpdate(item.id)}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditForm({});
                    }}
                    className="flex-1 px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-white font-semibold">{item.name}</div>
                <div className="text-sm text-slate-300">
                  Cost: R{item.cost.toFixed(2)} | Manager: R{item.managerCost.toFixed(2)} | User: R{item.userCost.toFixed(2)}
                </div>
                <div className="text-sm text-slate-300">
                  {item.locked && <span className="bg-red-500 px-2 py-1 rounded">Locked</span>}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingId(item.id);
                      setEditForm(item);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex-1 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Desktop Table View
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Connectivity Items</h2>
        <div className="space-x-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 inline-flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 inline-flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={handleBulkMarkup}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Bulk Markup
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Add Item
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white/20 p-4 rounded-lg mb-4">
          <h3 className="text-white font-semibold mb-3">Add New Item</h3>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <input
              type="text"
              placeholder="Name"
              value={editForm.name || ''}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
            />
            <input
              type="number"
              placeholder="Cost"
              value={editForm.cost || ''}
              onChange={(e) => {
                const costValue = parseFloat(e.target.value);
                setEditForm({ 
                  ...editForm, 
                  cost: costValue,
                  managerCost: costValue,
                  userCost: costValue
                });
              }}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
            />
            <input
              type="number"
              placeholder="Manager Cost"
              value={editForm.managerCost || ''}
              onChange={(e) => setEditForm({ ...editForm, managerCost: parseFloat(e.target.value) })}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
            />
            <input
              type="number"
              placeholder="User Cost"
              value={editForm.userCost || ''}
              onChange={(e) => setEditForm({ ...editForm, userCost: parseFloat(e.target.value) })}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditForm({});
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ScrollableTable minWidth="600px">
        <table className="w-full text-white">
          <thead>
            <tr className="border-b border-white/20">
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-right py-3 px-4">Cost</th>
              <th className="text-right py-3 px-4">Manager Cost</th>
              <th className="text-right py-3 px-4">User Cost</th>
              <th className="text-center py-3 px-4">Locked</th>
              <th className="text-center py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.filter((item) => item.isActive).map((item) => (
              <tr key={item.id} className="border-b border-white/10 hover:bg-white/5">
                {editingId === item.id ? (
                  <>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={editForm.name || item.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        value={editForm.cost !== undefined ? editForm.cost : item.cost}
                        onChange={(e) => {
                          const costValue = parseFloat(e.target.value);
                          setEditForm({ 
                            ...editForm, 
                            cost: costValue,
                            managerCost: costValue,
                            userCost: costValue
                          });
                        }}
                        className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-right"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        value={editForm.managerCost !== undefined ? editForm.managerCost : item.managerCost}
                        onChange={(e) => setEditForm({ ...editForm, managerCost: parseFloat(e.target.value) })}
                        className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-right"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        value={editForm.userCost !== undefined ? editForm.userCost : item.userCost}
                        onChange={(e) => setEditForm({ ...editForm, userCost: parseFloat(e.target.value) })}
                        className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-right"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={editForm.locked !== undefined ? editForm.locked : item.locked}
                        onChange={(e) => setEditForm({ ...editForm, locked: e.target.checked })}
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleUpdate(item.id)}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditForm({});
                        }}
                        className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3 px-4">{item.name}</td>
                    <td className="py-3 px-4 text-right">R{item.cost.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">R{item.managerCost.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">R{item.userCost.toFixed(2)}</td>
                    <td className="py-3 px-4 text-center">
                      {item.locked ? '🔒' : ''}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setEditingId(item.id);
                          setEditForm(item);
                        }}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollableTable>
      
      {/* Modals */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setDeleteItemId(null);
        }}
        onConfirm={confirmDelete}
        title="Confirm Delete"
        message="Are you sure you want to delete this item? This action cannot be undone."
      />
      
      <PromptModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        onSubmit={applyBulkMarkup}
        title="Bulk Markup"
        label1="Manager Markup Percentage"
        label2="User Markup Percentage"
        placeholder1="e.g., 20 for 20%"
        placeholder2="e.g., 50 for 50%"
      />
      
      <AlertModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />

      {/* Import Modal */}
      {showImportModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl shadow-2xl max-w-4xl w-full border border-purple-500/30 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <ConfigExcelImporter
                configType="connectivity"
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
