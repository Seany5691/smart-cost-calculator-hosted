'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { databaseHelpers } from '@/lib/databaseAdapter';
import { Calculator, Calendar, User, DollarSign, ArrowRight, Plus, FileText } from 'lucide-react';
import Link from 'next/link';

interface Deal {
  id: string;
  userId: string;
  username: string;
  userRole: string;
  customerName: string;
  term: number;
  escalation: number;
  distanceToInstall: number;
  additionalGrossProfit: number;
  settlement: number;
  sections: Record<string, unknown>[];
  factors: Record<string, unknown>;
  scales: Record<string, unknown>;
  totals: {
    totalPayout?: number;
    extensionCount?: number;
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, checkAuth } = useAuthStore();
  const router = useRouter();

  const loadDeals = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (!user?.id) {
        setDeals([]);
        return;
      }

      // Determine if user is admin
      const isAdmin = user.role === 'admin';
      
      // Fetch deals from database
      const databaseDeals = await databaseHelpers.getDeals(user.id, isAdmin);
      
      // Transform database data to match Deal interface
      const userDeals: Deal[] = databaseDeals.map((deal: any) => ({
        id: deal.id || '',
        userId: deal.userId || '',
        username: deal.username || 'Unknown User',
        userRole: deal.userRole || 'user',
        customerName: deal.customerName || deal.dealName || 'Unknown Customer',
        term: Number(deal.dealDetails?.term) || 0,
        escalation: Number(deal.dealDetails?.escalation) || 0,
        distanceToInstall: Number(deal.dealDetails?.distanceToInstall) || 0,
        additionalGrossProfit: Number(deal.dealDetails?.additionalGrossProfit) || 0,
        settlement: Number(deal.dealDetails?.settlement) || 0,
        sections: Array.isArray(deal.sectionsData) ? deal.sectionsData : [],
        factors: deal.factorsData || {},
        scales: deal.scalesData || {},
        totals: {
          totalPayout: Number(deal.totalsData?.totalPayout) || 0,
          extensionCount: Number(deal.totalsData?.extensionCount) || 0,
          ...deal.totalsData
        },
        createdAt: deal.createdAt || new Date().toISOString(),
        updatedAt: deal.updatedAt || new Date().toISOString()
      }));
      
      setDeals(userDeals);
    } catch (error) {
      console.error('Error loading deals from database:', error);
      
      // Fallback to localStorage on error
      try {
        const dealsStorage = localStorage.getItem('deals-storage');
        
        let allDeals = [];
        if (dealsStorage) {
          allDeals = JSON.parse(dealsStorage);
        }
        
        // Filter deals based on user role
        let userDeals: Deal[] = [];
        if (user?.role === 'admin') {
          userDeals = allDeals;
        } else {
          userDeals = allDeals.filter((deal: Deal) => deal.userId === user?.id);
        }
        
        setDeals(userDeals);
      } catch (fallbackError) {
        console.error('Error loading deals from localStorage:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!checkAuth()) {
      router.push('/login');
      return;
    }

    loadDeals();
  }, [checkAuth, router, loadDeals]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">My Deal Calculations</h1>
        <p className="text-gray-600">View and continue your saved deal calculations</p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-500">{deals.length} deal{deals.length !== 1 ? 's' : ''}</span>
        </div>
        <Link 
          href="/calculator" 
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Deal</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your deals...</p>
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No deals calculated yet</h3>
          <p className="text-gray-500 mb-4">Start your first deal calculation to see it appear here</p>
          <Link href="/calculator" className="btn btn-primary inline-flex items-center space-x-2">
            <Calculator className="w-4 h-4" />
            <span>Start First Deal</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deals.map((deal) => (
            <div key={deal.id} className="card hover:shadow-lg transition-shadow duration-200">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {deal.customerName || 'Unnamed Deal'}
                    </h3>
                    <p className="text-sm text-gray-500">Deal #{deal.id.slice(-6)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(deal.totals?.totalPayout || 0)}
                    </p>
                    <p className="text-xs text-gray-500">Total Payout</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{deal.term} months</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="w-4 h-4 mr-2" />
                    <span>{deal.escalation}% escalation</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="w-4 h-4 mr-2" />
                    <span>{deal.totals?.extensionCount || 0} extensions</span>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-4">
                  Created: {formatDate(deal.createdAt)}
                </div>

                <Link 
                  href={`/calculator?dealId=${deal.id}`}
                  className="btn btn-outline w-full flex items-center justify-center space-x-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Continue Deal</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 