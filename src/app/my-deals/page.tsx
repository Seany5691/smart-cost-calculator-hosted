'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { databaseHelpers } from '@/lib/databaseAdapter';
import { Calculator, Calendar, User, DollarSign, ArrowRight, FileText, Trash2, Download } from 'lucide-react';
import Link from 'next/link';
import { Button, Card, CardContent, Input, Label } from '@/components/ui';

interface Deal {
  id: string;
  userId: string;
  username: string;
  userRole: string;
  customerName: string;
  term: number;
  escalation: number;
  distanceToInstall: number;
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

export default function MyDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { user, checkAuth } = useAuthStore();
  const router = useRouter();

  const loadMyDeals = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (!user?.id) {
        setDeals([]);
        setFilteredDeals([]);
        return;
      }

      // Fetch deals from database
      const databaseDeals = await databaseHelpers.getDeals(user.id, false);
      
      // Transform database data to match Deal interface
      const allDeals: Deal[] = databaseDeals.map((deal: any) => ({
        id: deal.id || '',
        userId: deal.userId || '',
        username: deal.username || 'Unknown User',
        userRole: deal.userRole || 'user',
        customerName: deal.customerName || deal.dealName || 'Unknown Customer',
        term: Number(deal.dealDetails?.term) || 0,
        escalation: Number(deal.dealDetails?.escalation) || 0,
        distanceToInstall: Number(deal.dealDetails?.distanceToInstall) || 0,
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
      
      setDeals(allDeals);
      setFilteredDeals(allDeals);
    } catch (error) {
      console.error('Error loading deals from database:', error);
      
      // Fallback to localStorage on error
      try {
        const dealsStorage = localStorage.getItem('deals-storage');
        if (dealsStorage) {
          const parsedDeals = JSON.parse(dealsStorage);
          const localDeals = Array.isArray(parsedDeals) ? parsedDeals
            .filter((deal: any) => deal.userId === user?.id)
            .map((deal: any) => ({
              id: deal.id || '',
              userId: deal.userId || '',
              username: deal.username || 'Unknown User',
              userRole: deal.userRole || 'user',
              customerName: deal.customerName || 'Unknown Customer',
              term: Number(deal.term) || 0,
              escalation: Number(deal.escalation) || 0,
              distanceToInstall: Number(deal.distanceToInstall) || 0,
              settlement: Number(deal.settlement) || 0,
              sections: Array.isArray(deal.sections) ? deal.sections : [],
              factors: deal.factors || {},
              scales: deal.scales || {},
              totals: {
                totalPayout: Number(deal.totals?.totalPayout) || 0,
                extensionCount: Number(deal.totals?.extensionCount) || 0,
                ...deal.totals
              },
              createdAt: deal.createdAt || new Date().toISOString(),
              updatedAt: deal.updatedAt || new Date().toISOString()
            })) : [];
          
          setDeals(localDeals);
          setFilteredDeals(localDeals);
        }
      } catch (fallbackError) {
        console.error('Error loading deals from localStorage:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const deleteMyDeal = useCallback(async (dealId: string) => {
    setIsDeleting(dealId);
    try {
      // Delete from database
      await databaseHelpers.deleteDeal(dealId);
      
      // Reload deals to update the UI
      await loadMyDeals();
      
      return true;
    } catch (error) {
      console.error('Error deleting deal from database:', error);
      
      // Fallback to localStorage on error
      try {
        const dealsStorage = localStorage.getItem('deals-storage');
        let allDeals: any[] = [];
        
        if (dealsStorage) {
          allDeals = JSON.parse(dealsStorage);
        }
        
        // Remove the deal with the specified ID (only if it belongs to current user)
        const updatedDeals = allDeals.filter((deal: any) => 
          !(deal.id === dealId && deal.userId === user?.id)
        );
        
        // Save back to localStorage
        localStorage.setItem('deals-storage', JSON.stringify(updatedDeals));
        
        // Reload deals to update the UI
        await loadMyDeals();
        
        return true;
      } catch (fallbackError) {
        console.error('Error deleting deal from localStorage:', fallbackError);
        return false;
      }
    } finally {
      setIsDeleting(null);
    }
  }, [user?.id, loadMyDeals]);

  useEffect(() => {
    if (!checkAuth()) {
      router.push('/login');
      return;
    }

    loadMyDeals();
  }, [checkAuth, router, loadMyDeals]);

  // Filter deals based on search term
  useEffect(() => {
    let filtered = deals;

    if (searchTerm) {
      filtered = filtered.filter(deal => 
        deal.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredDeals(filtered);
  }, [deals, searchTerm]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number | undefined | null) => {
    const numAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(numAmount);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Deals</h1>
          <p className="text-gray-600">View and manage your saved deals</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-500 text-white">
                <FileText className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Deals</p>
                <p className="text-2xl font-bold text-gray-900">{deals.length}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center">
              <div className="p-3 rounded-lg bg-green-500 text-white">
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(deals.reduce((sum, deal) => sum + (deal.totals?.totalPayout || 0), 0))}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-500 text-white">
                <User className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">User Role</p>
                <p className="text-2xl font-bold text-gray-900 capitalize">{user?.role}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label>Search My Deals</Label>
              <Input
                type="text"
                placeholder="Search by customer name or deal ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Link href="/calculator">
                <Button className="flex items-center space-x-2">
                  <Calculator className="w-4 h-4" />
                  <span>New Deal</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-8 bg-gray-200 rounded"></div>
                      <div className="h-8 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDeals.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No deals found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm 
                ? 'Try adjusting your search criteria' 
                : 'You haven\'t saved any deals yet'
              }
            </p>
            {!searchTerm && (
              <Link href="/calculator">
                <Button className="inline-flex items-center space-x-2">
                  <Calculator className="w-4 h-4" />
                  <span>Create Your First Deal</span>
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDeals.map((deal) => (
              <Card key={deal.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardContent>
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
                      <Calculator className="w-4 h-4 mr-2" />
                      <span>{deal.totals?.extensionCount || 0} extensions</span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-4">
                    Created: {formatDate(deal.createdAt)}
                  </div>

                  <div className="space-y-2">
                    <Link href={`/calculator?dealId=${deal.id}`}>
                      <Button variant="outline" className="w-full flex items-center justify-center space-x-2">
                        <ArrowRight className="w-4 h-4" />
                        <span>View Deal</span>
                      </Button>
                    </Link>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Link href={`/calculator?dealId=${deal.id}`}>
                        <Button size="sm" className="w-full flex items-center justify-center space-x-1">
                          <Download className="w-3 h-3" />
                          <span>Generate PDF</span>
                        </Button>
                      </Link>
                      
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete the deal for ${deal.customerName}? This action cannot be undone.`)) {
                            deleteMyDeal(deal.id);
                          }
                        }}
                        loading={isDeleting === deal.id}
                        disabled={isDeleting === deal.id}
                        className="w-full flex items-center justify-center space-x-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}