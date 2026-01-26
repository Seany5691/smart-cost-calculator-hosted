'use client';

import { useState } from 'react';
import { Deal } from '@/lib/store/deals';
import { ExternalLink, DollarSign, Calendar, User, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface DealsCardsProps {
  deals: Deal[];
  onOpenDeal: (id: string) => void;
  onGenerateCostings: (id: string) => void;
  onDeleteDeal: (id: string) => void;
  isAdmin: boolean;
  currentUserId: string;
}

/**
 * DealsCards Component
 * 
 * Mobile card view for deals list
 * - Stacked vertical cards
 * - Touch-friendly button sizes (min 44px)
 * - All deal information displayed
 * - Role badge with color coding
 * - Currency formatting
 * 
 * Requirements: AC-4.1 through AC-4.4
 */
export default function DealsCards({ deals, onOpenDeal, onGenerateCostings, onDeleteDeal, isAdmin, currentUserId }: DealsCardsProps) {
  const [loadingDealId, setLoadingDealId] = useState<string | null>(null);
  const [loadingCostingsId, setLoadingCostingsId] = useState<string | null>(null);
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null);

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

  const handleDeleteDeal = async (id: string, dealName: string) => {
    if (!confirm(`Are you sure you want to delete "${dealName}"? This action cannot be undone.`)) {
      return;
    }
    
    setDeletingDealId(id);
    try {
      await onDeleteDeal(id);
    } finally {
      setDeletingDealId(null);
    }
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
    <div className="space-y-4">
      {deals.map((deal) => (
        <div key={deal.id} className="glass-card p-6 rounded-2xl space-y-4">
          {/* Header */}
          <div>
            <h3 className="text-xl font-bold text-white mb-1">{deal.deal_name}</h3>
            <p className="text-lg text-gray-300">{deal.customer_name}</p>
          </div>

          {/* Created By and Role */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-300">
              <User className="w-4 h-4" />
              <span className="text-sm">{deal.username}</span>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeClass(deal.user_role)}`}>
              {deal.user_role.charAt(0).toUpperCase() + deal.user_role.slice(1)}
            </span>
          </div>

          {/* Created Date */}
          <div className="flex items-center gap-2 text-gray-300">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">{formatDate(deal.created_at)}</span>
          </div>

          {/* Financial Info */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
            <div>
              <p className="text-sm text-gray-400 mb-1">Total Payout</p>
              <p className="text-xl font-bold text-white">{formatCurrency(deal.totals_data.totalPayout)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Monthly MRC</p>
              <p className="text-xl font-bold text-white">{formatCurrency(deal.totals_data.totalMRC)}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4 border-t border-white/10">
            {/* Open Deal Button */}
            <button
              onClick={() => handleOpenDeal(deal.id)}
              disabled={loadingDealId === deal.id}
              className="w-full min-h-[44px] px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all duration-300 flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingDealId === deal.id ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <ExternalLink className="w-5 h-5" />
                  <span>Open Deal</span>
                </>
              )}
            </button>

            {/* Generate Costings Button (Admin Only) */}
            {isAdmin && (
              <button
                onClick={() => handleGenerateCostings(deal.id)}
                disabled={loadingCostingsId === deal.id}
                className="w-full min-h-[44px] px-4 py-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingCostingsId === deal.id ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <DollarSign className="w-5 h-5" />
                    <span>Generate Costings</span>
                  </>
                )}
              </button>
            )}

            {/* Delete Button (Admin or Own Deal) */}
            {(isAdmin || deal.user_id === currentUserId) && (
              <button
                onClick={() => handleDeleteDeal(deal.id, deal.deal_name)}
                disabled={deletingDealId === deal.id}
                className="w-full min-h-[44px] px-4 py-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-500/30 transition-all duration-300 flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingDealId === deal.id ? (
                  <div className="w-5 h-5 border-2 border-red-300 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    <span>Delete Deal</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
