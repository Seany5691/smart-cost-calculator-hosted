'use client';

import { useState } from 'react';
import { Deal } from '@/lib/store/deals';
import { ExternalLink, DollarSign, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import DeleteDealModal from './DeleteDealModal';

interface DealsTableProps {
  deals: Deal[];
  onOpenDeal: (id: string) => void;
  onGenerateCostings: (id: string) => void;
  onDeleteDeal: (id: string) => void;
  isAdmin: boolean;
  currentUserId: string;
}

/**
 * DealsTable Component
 * 
 * Desktop table view for deals list
 * - Displays all deal information in columns
 * - Role badge with color coding
 * - Currency formatting for financial values
 * - Action buttons (Open Deal, Generate Costings for admin)
 * - Hover effects and loading states
 * 
 * Requirements: AC-3.1, AC-3.2, AC-5.1, AC-6.1
 */
export default function DealsTable({ deals, onOpenDeal, onGenerateCostings, onDeleteDeal, isAdmin, currentUserId }: DealsTableProps) {
  const [loadingDealId, setLoadingDealId] = useState<string | null>(null);
  const [loadingCostingsId, setLoadingCostingsId] = useState<string | null>(null);
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<{ id: string; name: string } | null>(null);

  const handleOpenDeal = async (id: string) => {
    setLoadingDealId(id);
    try {
      await onOpenDeal(id);
    } finally {
      setLoadingDealId(null);
    }
  };

  const handleGenerateCostings = async (id: string) => {
    setLoadingCostingsId(id);
    try {
      await onGenerateCostings(id);
    } finally {
      setLoadingCostingsId(null);
    }
  };

  const handleDeleteClick = (id: string, dealName: string) => {
    setDealToDelete({ id, name: dealName });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!dealToDelete) return;
    
    setDeletingDealId(dealToDelete.id);
    try {
      await onDeleteDeal(dealToDelete.id);
      setDeleteModalOpen(false);
      setDealToDelete(null);
    } finally {
      setDeletingDealId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setDealToDelete(null);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return dateString;
    }
  };

  const getRoleBadgeClass = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'bg-purple-500/20 border-purple-500/30 text-purple-300';
      case 'manager':
        return 'bg-blue-500/20 border-blue-500/30 text-blue-300';
      case 'user':
        return 'bg-green-500/20 border-green-500/30 text-green-300';
      default:
        return 'bg-gray-500/20 border-gray-500/30 text-gray-300';
    }
  };

  return (
    <>
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Deal Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Customer Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Created By</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Role</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Created Date</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Total Payout</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Monthly MRC</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((deal) => (
              <tr
                key={deal.id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors duration-200"
              >
                <td className="px-6 py-4 text-white font-medium">{deal.deal_name}</td>
                <td className="px-6 py-4 text-white">{deal.customer_name}</td>
                <td className="px-6 py-4 text-gray-300">{deal.username}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeClass(deal.user_role)}`}>
                    {deal.user_role.charAt(0).toUpperCase() + deal.user_role.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-300">{formatDate(deal.created_at)}</td>
                <td className="px-6 py-4 text-right text-white font-semibold">
                  {formatCurrency(deal.totals_data.totalPayout)}
                </td>
                <td className="px-6 py-4 text-right text-white font-semibold">
                  {formatCurrency(deal.totals_data.totalMRC)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    {/* Open Deal Button */}
                    <button
                      onClick={() => handleOpenDeal(deal.id)}
                      disabled={loadingDealId === deal.id}
                      className="px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all duration-300 flex items-center gap-2 text-sm font-medium shadow-lg hover:shadow-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Open deal in calculator"
                    >
                      {loadingDealId === deal.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                      <span className="hidden xl:inline">Open</span>
                    </button>

                    {/* Generate Costings Button (Admin Only) */}
                    {isAdmin && (
                      <button
                        onClick={() => handleGenerateCostings(deal.id)}
                        disabled={loadingCostingsId === deal.id}
                        className="px-3 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all duration-300 flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Generate cost breakdown"
                      >
                        {loadingCostingsId === deal.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <DollarSign className="w-4 h-4" />
                        )}
                        <span className="hidden xl:inline">Costings</span>
                      </button>
                    )}

                    {/* Delete Button (Admin or Own Deal) */}
                    {(isAdmin || deal.user_id === currentUserId) && (
                      <button
                        onClick={() => handleDeleteClick(deal.id, deal.deal_name)}
                        disabled={deletingDealId === deal.id}
                        className="px-3 py-2 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-500/30 transition-all duration-300 flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete deal"
                      >
                        {deletingDealId === deal.id ? (
                          <div className="w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        <span className="hidden xl:inline">Delete</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

      {/* Delete Confirmation Modal */}
      <DeleteDealModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        dealName={dealToDelete?.name || ''}
        isDeleting={deletingDealId === dealToDelete?.id}
      />
    </>
  );
}
