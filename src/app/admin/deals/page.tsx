'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { getFactorForDeal } from '@/lib/utils';
import { Calendar, User, DollarSign, Plus, FileText, Users, Shield, TrendingUp, Download, Eye, Trash2 } from 'lucide-react';
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
  settlement: number;
  sections: Record<string, unknown>[];
  factors: Record<string, unknown>;
  scales: Record<string, unknown>;
  totals: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedDealForAnalysis, setSelectedDealForAnalysis] = useState<Deal | null>(null);
  const [showCostAnalysis, setShowCostAnalysis] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<string | null>(null);
  const { user, checkAuth } = useAuthStore();
  const router = useRouter();

  const loadDeals = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Admin can see all deals
      const response = await fetch('/api/deals');
      const databaseDeals = await response.json();
      
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
        totals: deal.totalsData || {},
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

        let allDeals: Deal[] = [];
        if (dealsStorage) {
          const parsedDeals = JSON.parse(dealsStorage);
          allDeals = Array.isArray(parsedDeals) ? parsedDeals.map((deal: any) => ({
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
            totals: deal.totals || {},
            createdAt: deal.createdAt || new Date().toISOString(),
            updatedAt: deal.updatedAt || new Date().toISOString()
          })) : [];
        }

        setDeals(allDeals);
        setFilteredDeals(allDeals);
      } catch (fallbackError) {
        console.error('Error loading deals from localStorage:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteDeal = useCallback(async (dealId: string) => {
    setIsDeleting(dealId);
    try {
      // Delete from database
      await fetch(`/api/deals/${dealId}`, { method: 'DELETE' });

      // Reload deals to update the UI
      await loadDeals();

      return true;
    } catch (error) {
      console.error('Error deleting deal from database:', error);
      
      // Fallback to localStorage on error
      try {
        const dealsStorage = localStorage.getItem('deals-storage');
        let allDeals = [];

        if (dealsStorage) {
          allDeals = JSON.parse(dealsStorage);
        }

        // Remove the deal with the specified ID
        const updatedDeals = allDeals.filter((deal: any) => deal.id !== dealId);

        // Save back to localStorage
        localStorage.setItem('deals-storage', JSON.stringify(updatedDeals));

        // Reload deals to update the UI
        await loadDeals();

        return true;
      } catch (fallbackError) {
        console.error('Error deleting deal from localStorage:', fallbackError);
        return false;
      }
    } finally {
      setIsDeleting(null);
    }
  }, [loadDeals]);

  useEffect(() => {
    if (!checkAuth()) {
      router.push('/login');
      return;
    }

    // Only allow admin access
    if (user?.role !== 'admin') {
      router.push('/');
      return;
    }

    loadDeals();
  }, [checkAuth, router, loadDeals, user?.role]);

  // Filter deals based on search term and selected user
  useEffect(() => {
    let filtered = deals;

    // Filter by user
    if (selectedUser !== 'all') {
      filtered = filtered.filter(deal => deal.userId === selectedUser);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(deal =>
        deal.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredDeals(filtered);
  }, [deals, searchTerm, selectedUser]);

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

  // Calculate comprehensive cost analysis for a deal
  // KEY PRINCIPLE: Use saved totals for customer pricing (what they were quoted)
  // Only calculate cost pricing fresh for GP analysis
  const calculateCostAnalysis = (deal: Deal) => {
    const sections = deal.sections || [];
    const savedTotals = deal.totals as any || {}; // ✅ USE SAVED TOTALS
    const scales = deal.scales as any || {};

    // ===== CUSTOMER PRICING (FROM SAVED TOTALS) =====
    // These are what the customer was actually quoted - DO NOT RECALCULATE
    const customerHardwareTotal = Number(savedTotals.hardwareTotal) || 0;
    const customerInstallationCost = Number(savedTotals.hardwareInstallTotal) || 0;
    const customerGrossProfit = Number(savedTotals.totalGrossProfit) || 0;
    const customerFinanceFee = Number(savedTotals.financeFee) || 0;
    const customerSettlement = Number(savedTotals.settlementAmount) || 0;
    const customerTotalPayout = Number(savedTotals.totalPayout) || 0;
    const customerHardwareRental = Number(savedTotals.hardwareRental) || 0;
    const customerConnectivityCost = Number(savedTotals.connectivityCost) || 0;
    const customerLicensingCost = Number(savedTotals.licensingCost) || 0;
    const customerFactorUsed = Number(savedTotals.factorUsed) || 0;
    const extensionCount = Number(savedTotals.extensionCount) || 0;

    // ===== COST PRICING (CALCULATE FROM SECTIONS) =====
    // Calculate actual costs using admin cost pricing
    let hardwareCostPrice = 0;
    let hardwareItems: any[] = [];
    let connectivityCostPrice = 0;
    let connectivityItems: any[] = [];
    let licensingCostPrice = 0;
    let licensingItems: any[] = [];

    sections.forEach((section: any) => {
      if (section?.items && Array.isArray(section.items)) {
        section.items.forEach((item: any) => {
          if (item && (item.quantity || 0) > 0) {
            const itemCost = Number(item.cost) || 0; // Admin cost price
            const itemQuantity = Number(item.quantity) || 0;
            const costPrice = itemCost * itemQuantity;

            // Get user/manager price for this item
            let itemUserManagerPrice = itemCost; // Default fallback
            if (deal.userRole === 'manager' || deal.userRole === 'admin') {
              itemUserManagerPrice = Number(item.managerCost) || Number(item.cost) || 0;
            } else {
              itemUserManagerPrice = Number(item.userCost) || Number(item.cost) || 0;
            }
            const userManagerPrice = itemUserManagerPrice * itemQuantity;

            const itemBreakdown = {
              name: item.name || 'Unknown Item',
              quantity: itemQuantity,
              costPrice: itemCost,
              userManagerPrice: itemUserManagerPrice,
              totalCostPrice: costPrice,
              totalUserManagerPrice: userManagerPrice
            };

            if (section.id === 'hardware') {
              hardwareCostPrice += costPrice;
              hardwareItems.push(itemBreakdown);
            } else if (section.id === 'connectivity') {
              connectivityCostPrice += costPrice;
              connectivityItems.push(itemBreakdown);
            } else if (section.id === 'licensing') {
              licensingCostPrice += costPrice;
              licensingItems.push(itemBreakdown);
            }
          }
        });
      }
    });

    // ===== REP'S INSTALLATION BREAKDOWN (User/Manager Pricing) =====
    // Calculate what the rep quoted using user/manager pricing
    let repInstallationSlidingScale = 0;
    const userRole = deal.userRole || 'user';

    if (scales?.installation) {
      let installationData;
      if (userRole === 'manager' || userRole === 'admin') {
        installationData = scales.installation.managerCost || scales.installation.cost;
      } else {
        installationData = scales.installation.userCost || scales.installation.cost;
      }

      if (typeof installationData === 'object' && installationData !== null) {
        if (extensionCount >= 0 && extensionCount <= 4 && installationData['0-4']) {
          repInstallationSlidingScale = typeof installationData['0-4'] === 'string' ? parseFloat(installationData['0-4']) : installationData['0-4'];
        } else if (extensionCount >= 5 && extensionCount <= 8 && installationData['5-8']) {
          repInstallationSlidingScale = typeof installationData['5-8'] === 'string' ? parseFloat(installationData['5-8']) : installationData['5-8'];
        } else if (extensionCount >= 9 && extensionCount <= 16 && installationData['9-16']) {
          repInstallationSlidingScale = typeof installationData['9-16'] === 'string' ? parseFloat(installationData['9-16']) : installationData['9-16'];
        } else if (extensionCount >= 17 && extensionCount <= 32 && installationData['17-32']) {
          repInstallationSlidingScale = typeof installationData['17-32'] === 'string' ? parseFloat(installationData['17-32']) : installationData['17-32'];
        } else if (extensionCount >= 33 && installationData['33+']) {
          repInstallationSlidingScale = typeof installationData['33+'] === 'string' ? parseFloat(installationData['33+']) : installationData['33+'];
        }
      } else if (typeof installationData === 'number') {
        repInstallationSlidingScale = installationData;
      }
    }

    // Rep's extension and fuel costs (user/manager pricing)
    let repExtensionCost = 0;
    let repFuelCost = 0;
    if (scales?.additional_costs) {
      if (userRole === 'manager' || userRole === 'admin') {
        repExtensionCost = extensionCount * (Number(scales.additional_costs.manager_cost_per_point) || Number(scales.additional_costs.cost_per_point) || 0);
        repFuelCost = Number(deal.distanceToInstall) * (Number(scales.additional_costs.manager_cost_per_kilometer) || Number(scales.additional_costs.cost_per_kilometer) || 0);
      } else {
        repExtensionCost = extensionCount * (Number(scales.additional_costs.user_cost_per_point) || Number(scales.additional_costs.cost_per_point) || 0);
        repFuelCost = Number(deal.distanceToInstall) * (Number(scales.additional_costs.user_cost_per_kilometer) || Number(scales.additional_costs.cost_per_kilometer) || 0);
      }
    }
    const repInstallationTotal = repInstallationSlidingScale + repExtensionCost + repFuelCost;

    // ===== ACTUAL INSTALLATION BREAKDOWN (Cost Pricing) =====
    // Calculate actual costs using admin cost pricing
    let costInstallationSlidingScale = 0;
    if (scales?.installation?.cost) {
      const installationData = scales.installation.cost;

      if (typeof installationData === 'object' && installationData !== null) {
        if (extensionCount >= 0 && extensionCount <= 4 && installationData['0-4']) {
          costInstallationSlidingScale = typeof installationData['0-4'] === 'string' ? parseFloat(installationData['0-4']) : installationData['0-4'];
        } else if (extensionCount >= 5 && extensionCount <= 8 && installationData['5-8']) {
          costInstallationSlidingScale = typeof installationData['5-8'] === 'string' ? parseFloat(installationData['5-8']) : installationData['5-8'];
        } else if (extensionCount >= 9 && extensionCount <= 16 && installationData['9-16']) {
          costInstallationSlidingScale = typeof installationData['9-16'] === 'string' ? parseFloat(installationData['9-16']) : installationData['9-16'];
        } else if (extensionCount >= 17 && extensionCount <= 32 && installationData['17-32']) {
          costInstallationSlidingScale = typeof installationData['17-32'] === 'string' ? parseFloat(installationData['17-32']) : installationData['17-32'];
        } else if (extensionCount >= 33 && installationData['33+']) {
          costInstallationSlidingScale = typeof installationData['33+'] === 'string' ? parseFloat(installationData['33+']) : installationData['33+'];
        }
      } else if (typeof installationData === 'number') {
        costInstallationSlidingScale = installationData;
      }
    }

    const costExtensionCost = extensionCount * (Number(scales?.additional_costs?.cost_per_point) || 0);
    const costFuelCost = Number(deal.distanceToInstall) * (Number(scales?.additional_costs?.cost_per_kilometer) || 0);
    const costInstallationTotal = costInstallationSlidingScale + costExtensionCost + costFuelCost;

    // ===== HARDWARE DEAL ANALYSIS =====
    // Calculate GP for both Rep and Actual
    // Rep GP = Payout - Rep Stock - Rep Installation - Settlement - Finance Fee
    const repGP = customerTotalPayout - customerHardwareTotal - repInstallationTotal - customerSettlement - customerFinanceFee;

    // Actual GP = Payout - Actual Stock - Actual Installation - Settlement - Finance Fee
    const actualGP = customerTotalPayout - hardwareCostPrice - costInstallationTotal - customerSettlement - customerFinanceFee;

    const hardwareDealAnalysis = {
      customer: {
        hardwareTotal: customerHardwareTotal,
        installationCost: customerInstallationCost,
        installationBreakdown: {
          slidingScale: repInstallationSlidingScale,
          extensionCost: repExtensionCost,
          fuelCost: repFuelCost,
          total: repInstallationTotal
        },
        grossProfit: customerGrossProfit,
        financeFee: customerFinanceFee,
        settlement: customerSettlement,
        totalPayout: customerTotalPayout,
        factorUsed: customerFactorUsed
      },
      cost: {
        hardwareTotal: hardwareCostPrice,
        installationCost: costInstallationTotal,
        installationBreakdown: {
          slidingScale: costInstallationSlidingScale,
          extensionCost: costExtensionCost,
          fuelCost: costFuelCost,
          total: costInstallationTotal
        },
        totalCosts: hardwareCostPrice + costInstallationTotal
      },
      grossProfit: {
        repGP: repGP,
        actualGP: actualGP,
        gpDifference: actualGP - repGP,
        gpPercentage: customerTotalPayout > 0
          ? (actualGP / customerTotalPayout) * 100
          : 0
      }
    };

    // ===== MONTHLY RECURRING ANALYSIS (SEPARATE FROM HARDWARE) =====
    // Connectivity and Licensing ONLY - Hardware Rental is part of hardware deal
    const monthlyRecurringAnalysis = {
      customer: {
        connectivity: customerConnectivityCost,
        licensing: customerLicensingCost,
        total: customerConnectivityCost + customerLicensingCost
      },
      cost: {
        connectivity: connectivityCostPrice,
        licensing: licensingCostPrice,
        total: connectivityCostPrice + licensingCostPrice
      },
      grossProfit: {
        connectivity: customerConnectivityCost - connectivityCostPrice,
        licensing: customerLicensingCost - licensingCostPrice,
        total: (customerConnectivityCost - connectivityCostPrice) + (customerLicensingCost - licensingCostPrice),
        gpPercentage: (customerConnectivityCost + customerLicensingCost) > 0
          ? (((customerConnectivityCost - connectivityCostPrice) + (customerLicensingCost - licensingCostPrice)) / (customerConnectivityCost + customerLicensingCost)) * 100
          : 0
      }
    };

    // ===== TERM ANALYSIS (OPTIONAL - FOR FULL DEAL VIEW) =====
    const dealTerm = Number(deal.term) || 0;
    const termConnectivityRevenue = customerConnectivityCost * dealTerm;
    const termConnectivityCost = connectivityCostPrice * dealTerm;
    const termLicensingRevenue = customerLicensingCost * dealTerm;
    const termLicensingCost = licensingCostPrice * dealTerm;



    // ===== BACKWARD COMPATIBILITY LAYER =====
    // Map new structure to old structure for existing JSX
    const backwardCompatibleStructure = {
      rep: {
        factorUsed: customerFactorUsed,
        payout: customerTotalPayout,
        hardwareRental: customerHardwareRental,
        stockCost: customerHardwareTotal,
        installationCost: repInstallationTotal,
        installationSlidingScale: repInstallationSlidingScale,
        extensionCost: repExtensionCost,
        fuelCost: repFuelCost,
        financeFee: customerFinanceFee,
        settlement: customerSettlement,
        grossProfit: repGP
      },
      actual: {
        factorUsed: customerFactorUsed,
        payout: customerTotalPayout,
        hardwareRental: customerHardwareRental,
        stockCost: hardwareCostPrice,
        installationCost: costInstallationTotal,
        installationSlidingScale: costInstallationSlidingScale,
        extensionCost: costExtensionCost,
        fuelCost: costFuelCost,
        financeFee: customerFinanceFee,
        settlement: customerSettlement,
        grossProfit: actualGP
      },
      userManager: {
        factorUsed: customerFactorUsed,
        payout: customerTotalPayout,
        hardwareRental: customerHardwareRental,
        stockCost: customerHardwareTotal,
        installationCost: repInstallationTotal,
        financeFee: customerFinanceFee,
        settlement: customerSettlement,
        grossProfit: repGP
      },
      differences: {
        payoutDifference: 0,
        stockCostDifference: customerHardwareTotal - hardwareCostPrice,
        installCostDifference: repInstallationTotal - costInstallationTotal,
        installSlidingScaleDiff: repInstallationSlidingScale - costInstallationSlidingScale,
        extensionCostDiff: repExtensionCost - costExtensionCost,
        fuelCostDiff: repFuelCost - costFuelCost,
        grossProfitDifference: actualGP - repGP
      }
    };

    return {
      dealInfo: {
        customerName: deal.customerName || 'Unknown Customer',
        username: deal.username || 'Unknown User',
        userRole: deal.userRole || 'user',
        term: dealTerm,
        escalation: Number(deal.escalation) || 0,
        settlement: customerSettlement,
        extensionCount: extensionCount
      },

      // New simplified structure
      hardwareDeal: {
        ...hardwareDealAnalysis,
        // Backward compatibility
        ...backwardCompatibleStructure
      },

      // Monthly Recurring Analysis (separate from hardware)
      monthlyRecurring: monthlyRecurringAnalysis,

      // Backward compatibility for recurring services
      recurringServices: {
        monthly: {
          connectivityProfit: monthlyRecurringAnalysis.grossProfit.connectivity,
          licensingProfit: monthlyRecurringAnalysis.grossProfit.licensing,
          totalProfit: monthlyRecurringAnalysis.grossProfit.total
        },
        annual: {
          connectivityProfit: monthlyRecurringAnalysis.grossProfit.connectivity * 12,
          licensingProfit: monthlyRecurringAnalysis.grossProfit.licensing * 12,
          totalProfit: monthlyRecurringAnalysis.grossProfit.total * 12
        },
        fullTerm: {
          connectivityProfit: (termConnectivityRevenue - termConnectivityCost),
          licensingProfit: (termLicensingRevenue - termLicensingCost),
          totalProfit: (termConnectivityRevenue - termConnectivityCost) + (termLicensingRevenue - termLicensingCost)
        },
        dealTerm: dealTerm
      },

      // Combined Summary
      combined: {
        totalDealValue: customerTotalPayout,
        totalMonthlyValue: customerConnectivityCost + customerLicensingCost,
        totalActualCosts: hardwareCostPrice + costInstallationTotal + connectivityCostPrice + licensingCostPrice,
        totalActualGP: hardwareDealAnalysis.grossProfit.actualGP + monthlyRecurringAnalysis.grossProfit.total,
        overallGPPercentage: (customerTotalPayout + (customerConnectivityCost + customerLicensingCost)) > 0
          ? ((hardwareDealAnalysis.grossProfit.actualGP + monthlyRecurringAnalysis.grossProfit.total) / (customerTotalPayout + (customerConnectivityCost + customerLicensingCost))) * 100
          : 0
      },

      // Term Analysis
      termAnalysis: {
        dealTerm: dealTerm,
        connectivity: {
          revenue: termConnectivityRevenue,
          cost: termConnectivityCost,
          profit: termConnectivityRevenue - termConnectivityCost
        },
        licensing: {
          revenue: termLicensingRevenue,
          cost: termLicensingCost,
          profit: termLicensingRevenue - termLicensingCost
        },
        totalRecurring: {
          revenue: termConnectivityRevenue + termLicensingRevenue,
          cost: termConnectivityCost + termLicensingCost,
          profit: (termConnectivityRevenue + termLicensingRevenue) - (termConnectivityCost + termLicensingCost)
        },
        completeDeal: {
          actual: {
            revenue: customerTotalPayout + (termConnectivityRevenue + termLicensingRevenue),
            cost: (hardwareCostPrice + costInstallationTotal + customerSettlement) + (termConnectivityCost + termLicensingCost),
            profit: (customerTotalPayout - hardwareCostPrice - costInstallationTotal - customerSettlement) + ((termConnectivityRevenue + termLicensingRevenue) - (termConnectivityCost + termLicensingCost)),
            margin: (customerTotalPayout + (termConnectivityRevenue + termLicensingRevenue)) > 0
              ? (((customerTotalPayout - hardwareCostPrice - costInstallationTotal - customerSettlement) + ((termConnectivityRevenue + termLicensingRevenue) - (termConnectivityCost + termLicensingCost))) / (customerTotalPayout + (termConnectivityRevenue + termLicensingRevenue))) * 100
              : 0
          }
        }
      },

      // Item Breakdowns
      breakdown: {
        hardware: {
          items: hardwareItems,
          costPrice: hardwareCostPrice,
          userManagerPrice: customerHardwareTotal
        },
        connectivity: {
          items: connectivityItems,
          costPrice: connectivityCostPrice,
          userManagerPrice: customerConnectivityCost
        },
        licensing: {
          items: licensingItems,
          costPrice: licensingCostPrice,
          userManagerPrice: customerLicensingCost
        }
      }
    };
  };

  // Generate comprehensive admin cost analysis HTML file
  const generateCostAnalysisPDF = async (deal: Deal) => {
    try {
      const analysis = calculateCostAnalysis(deal);

      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const customerName = analysis.dealInfo.customerName || 'Unknown_Customer';
      const filename = `Admin_Analysis_${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.html`;

      // Create the HTML content for the analysis
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Complete Deal Analysis - ${analysis.dealInfo.customerName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 25px; page-break-inside: avoid; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f2f2f2; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .text-green { color: #28a745; font-weight: bold; }
            .text-red { color: #dc3545; font-weight: bold; }
            .text-blue { color: #1976d2; font-weight: bold; }
            .bg-purple { background: linear-gradient(to right, #f3e8ff, #fce7f3); padding: 20px; border-radius: 8px; }
            .bg-gray { background-color: #f8f9fa; padding: 20px; border-radius: 8px; }
            .bg-yellow { background: linear-gradient(to right, #fef3c7, #fed7aa); padding: 20px; border-radius: 8px; }
            .bg-blue-light { background-color: #e3f2fd; }
            .bg-gray-light { background-color: #f5f5f5; }
            .bg-green-light { background-color: #e8f5e8; }
            .border { border: 1px solid #ddd; padding: 15px; border-radius: 5px; margin: 10px 0; }
            .grid { display: grid; gap: 20px; margin: 15px 0; }
            .grid-2 { grid-template-columns: 1fr 1fr; }
            .grid-4 { grid-template-columns: repeat(4, 1fr); }
            h1 { color: #1976d2; margin-bottom: 10px; }
            h2 { color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 5px; margin-top: 30px; }
            h3 { color: #424242; margin: 15px 0 10px 0; }
            h4 { color: #666; margin: 10px 0 5px 0; }
            .highlight-box { background: linear-gradient(to right, #e1f5fe, #f3e5f5); padding: 15px; border-radius: 8px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 Complete Deal Analysis</h1>
            <h2>${analysis.dealInfo.customerName}</h2>
            <p><strong>Rep:</strong> ${analysis.dealInfo.username} (${analysis.dealInfo.userRole}) | 
               <strong>Term:</strong> ${analysis.dealInfo.term} months | 
               <strong>Escalation:</strong> ${analysis.dealInfo.escalation}% | 
               <strong>Extensions:</strong> ${analysis.dealInfo.extensionCount}</p>
            <p><strong>Settlement:</strong> ${formatCurrency(analysis.dealInfo.settlement)}</p>
          </div>

          <!-- BRIEF SUMMARY -->
          <div class="section bg-gray">
            <h2>📈 Deal Summary Comparison</h2>
            <div class="grid grid-2">
              <div class="border bg-blue-light">
                <h4 class="text-center">Rep's Calculation</h4>
                <div style="margin: 10px 0;">
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Deal Payout:</span>
                    <span class="font-bold text-blue">${formatCurrency(analysis.hardwareDeal.rep.payout)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Gross Profit:</span>
                    <span class="font-bold text-blue">${formatCurrency(analysis.hardwareDeal.rep.grossProfit)}</span>
                  </div>
                </div>
              </div>
              <div class="border bg-green-light">
                <h4 class="text-center">Admin's Actual</h4>
                <div style="margin: 10px 0;">
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Deal Payout:</span>
                    <span class="font-bold text-green">${formatCurrency(analysis.hardwareDeal.actual.payout)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Gross Profit:</span>
                    <span class="font-bold text-green">${formatCurrency(analysis.hardwareDeal.actual.grossProfit)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="border bg-yellow text-center">
              <div class="grid grid-2">
                <div>
                  <span class="font-bold">Payout Difference:</span>
                  <span class="${analysis.hardwareDeal.differences.payoutDifference >= 0 ? 'text-green' : 'text-red'}" style="font-size: 18px; margin-left: 10px;">
                    ${formatCurrency(analysis.hardwareDeal.differences.payoutDifference)}
                  </span>
                </div>
                <div>
                  <span class="font-bold">GP Difference:</span>
                  <span class="${analysis.hardwareDeal.differences.grossProfitDifference >= 0 ? 'text-green' : 'text-red'}" style="font-size: 18px; margin-left: 10px;">
                    ${formatCurrency(analysis.hardwareDeal.differences.grossProfitDifference)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- COMPLETE DEAL ANALYSIS -->
          <div class="section bg-purple">
            <h2>📈 Complete Deal Analysis (${analysis.termAnalysis.dealTerm} Month Term)</h2>
            
            <!-- One-time vs Recurring Breakdown -->
            <div class="grid grid-2">
              <!-- One-time Hardware -->
              <div class="border" style="background-color: white;">
                <h4>One-Time Hardware</h4>
                <div style="margin: 10px 0;">
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Cost Price:</span>
                    <span class="font-bold">${formatCurrency(analysis.breakdown.hardware.costPrice)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>${analysis.dealInfo.userRole === 'manager' || analysis.dealInfo.userRole === 'admin' ? 'Manager' : 'User'} Price:</span>
                    <span class="font-bold">${formatCurrency(analysis.breakdown.hardware.userManagerPrice)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 10px 0; padding-top: 8px; border-top: 1px solid #ddd;">
                    <span class="font-bold">Hardware Profit:</span>
                    <span class="${(analysis.breakdown.hardware.userManagerPrice - analysis.breakdown.hardware.costPrice) >= 0 ? 'text-green' : 'text-red'}">${formatCurrency(analysis.breakdown.hardware.userManagerPrice - analysis.breakdown.hardware.costPrice)}</span>
                  </div>
                </div>
              </div>

              <!-- Recurring Services Over Full Term -->
              <div class="border" style="background-color: white;">
                <h4>Recurring Services (Full Term)</h4>
                <div style="margin: 10px 0;">
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Total Cost:</span>
                    <span class="font-bold">${formatCurrency(analysis.termAnalysis.totalRecurring.cost)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Total Revenue:</span>
                    <span class="font-bold">${formatCurrency(analysis.termAnalysis.totalRecurring.revenue)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 10px 0; padding-top: 8px; border-top: 1px solid #ddd;">
                    <span class="font-bold">Recurring Profit:</span>
                    <span class="${analysis.termAnalysis.totalRecurring.profit >= 0 ? 'text-green' : 'text-red'}">${formatCurrency(analysis.termAnalysis.totalRecurring.profit)}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Complete Deal Totals -->
            <div class="highlight-box">
              <h4 style="text-align: center; margin-bottom: 15px;">Complete Deal Totals (Hardware + ${analysis.termAnalysis.dealTerm} Months Recurring)</h4>
              <div class="grid grid-4">
                <div style="text-align: center;">
                  <p style="margin: 5px 0; color: #666;">Total Deal Cost</p>
                  <p class="text-red" style="font-size: 18px; margin: 5px 0;">${formatCurrency(analysis.termAnalysis.completeDeal.actual.cost)}</p>
                </div>
                <div style="text-align: center;">
                  <p style="margin: 5px 0; color: #666;">Total Deal Revenue</p>
                  <p class="text-blue" style="font-size: 18px; margin: 5px 0;">${formatCurrency(analysis.termAnalysis.completeDeal.actual.revenue)}</p>
                </div>
                <div style="text-align: center;">
                  <p style="margin: 5px 0; color: #666;">Total Deal Profit</p>
                  <p class="${analysis.termAnalysis.completeDeal.actual.profit >= 0 ? 'text-green' : 'text-red'}" style="font-size: 18px; margin: 5px 0;">${formatCurrency(analysis.termAnalysis.completeDeal.actual.profit)}</p>
                </div>
                <div style="text-align: center;">
                  <p style="margin: 5px 0; color: #666;">Deal Margin</p>
                  <p class="${analysis.termAnalysis.completeDeal.actual.margin >= 0 ? 'text-green' : 'text-red'}" style="font-size: 18px; margin: 5px 0;">${analysis.termAnalysis.completeDeal.actual.margin.toFixed(2)}%</p>
                </div>
              </div>
            </div>
          </div>

          <!-- HARDWARE DEAL BREAKDOWN -->
          <div class="section">
            <h2>🔍 Hardware Deal Breakdown</h2>
            <div class="grid" style="grid-template-columns: 1fr 1fr 1fr;">
              <!-- Rep's Calculation -->
              <div class="border bg-blue-light">
                <h4 class="text-center">Rep's Calculation</h4>
                <div style="margin: 10px 0;">
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Factor Used:</span>
                    <span class="font-bold">${analysis.hardwareDeal.rep.factorUsed.toFixed(5)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Hardware Rental:</span>
                    <span class="font-bold">${formatCurrency(analysis.hardwareDeal.rep.hardwareRental)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Payout:</span>
                    <span class="font-bold">${formatCurrency(analysis.hardwareDeal.rep.payout)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Stock Cost:</span>
                    <span class="font-bold">${formatCurrency(analysis.hardwareDeal.rep.stockCost)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Installation:</span>
                    <span class="font-bold">${formatCurrency(analysis.hardwareDeal.rep.installationCost)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Finance Fee:</span>
                    <span class="font-bold">${formatCurrency(analysis.hardwareDeal.rep.financeFee)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Settlement:</span>
                    <span class="font-bold">${formatCurrency(analysis.hardwareDeal.rep.settlement)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 10px 0; padding-top: 8px; border-top: 1px solid #ddd;">
                    <span class="font-bold">Gross Profit:</span>
                    <span class="font-bold text-blue">${formatCurrency(analysis.hardwareDeal.rep.grossProfit)}</span>
                  </div>
                </div>
              </div>

              <!-- Admin's Actual -->
              <div class="border bg-green-light">
                <h4 class="text-center">Admin's Actual</h4>
                <div style="margin: 10px 0;">
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Factor Used:</span>
                    <span class="font-bold">${analysis.hardwareDeal.actual.factorUsed.toFixed(5)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Hardware Rental:</span>
                    <span class="font-bold">${formatCurrency(analysis.hardwareDeal.actual.hardwareRental)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Payout:</span>
                    <span class="font-bold">${formatCurrency(analysis.hardwareDeal.actual.payout)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Stock Cost:</span>
                    <span class="font-bold">${formatCurrency(analysis.hardwareDeal.actual.stockCost)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Installation:</span>
                    <span class="font-bold">${formatCurrency(analysis.hardwareDeal.actual.installationCost)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Finance Fee:</span>
                    <span class="font-bold">${formatCurrency(analysis.hardwareDeal.actual.financeFee)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Settlement:</span>
                    <span class="font-bold">${formatCurrency(analysis.hardwareDeal.actual.settlement)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 10px 0; padding-top: 8px; border-top: 1px solid #ddd;">
                    <span class="font-bold">Gross Profit:</span>
                    <span class="font-bold text-green">${formatCurrency(analysis.hardwareDeal.actual.grossProfit)}</span>
                  </div>
                </div>
              </div>

              <!-- Differences -->
              <div class="border" style="background-color: #f8f4ff;">
                <h4 class="text-center">Difference (Actual - Rep)</h4>
                <div style="margin: 10px 0;">
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Factor Diff:</span>
                    <span class="${(analysis.hardwareDeal.actual.factorUsed - analysis.hardwareDeal.rep.factorUsed) >= 0 ? 'text-green' : 'text-red'}">${(analysis.hardwareDeal.actual.factorUsed - analysis.hardwareDeal.rep.factorUsed).toFixed(5)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Hardware Rental:</span>
                    <span style="color: #666;">-</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Payout Diff:</span>
                    <span class="${analysis.hardwareDeal.differences.payoutDifference >= 0 ? 'text-green' : 'text-red'}">${formatCurrency(analysis.hardwareDeal.differences.payoutDifference)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Stock Cost Diff:</span>
                    <span class="${analysis.hardwareDeal.differences.stockCostDifference <= 0 ? 'text-green' : 'text-red'}">${formatCurrency(analysis.hardwareDeal.differences.stockCostDifference)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Install Cost Diff:</span>
                    <span class="${analysis.hardwareDeal.differences.installCostDifference <= 0 ? 'text-green' : 'text-red'}">${formatCurrency(analysis.hardwareDeal.differences.installCostDifference)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Finance Fee Diff:</span>
                    <span class="${(analysis.hardwareDeal.actual.financeFee - analysis.hardwareDeal.rep.financeFee) <= 0 ? 'text-green' : 'text-red'}">${formatCurrency(analysis.hardwareDeal.actual.financeFee - analysis.hardwareDeal.rep.financeFee)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Settlement:</span>
                    <span style="color: #666;">-</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 10px 0; padding-top: 8px; border-top: 1px solid #ddd;">
                    <span class="font-bold">GP Difference:</span>
                    <span class="font-bold ${analysis.hardwareDeal.differences.grossProfitDifference >= 0 ? 'text-green' : 'text-red'}">${formatCurrency(analysis.hardwareDeal.differences.grossProfitDifference)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- MONTHLY RECURRING SERVICES -->
          <div class="section">
            <h2>📊 Monthly Recurring Services Analysis</h2>
            <div class="grid" style="grid-template-columns: 1fr 1fr 1fr;">
              <div class="border bg-blue-light">
                <h4 class="text-center">Monthly Profit</h4>
                <div style="margin: 10px 0;">
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Connectivity:</span>
                    <span class="font-bold">${formatCurrency(analysis.recurringServices.monthly.connectivityProfit)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Licensing:</span>
                    <span class="font-bold">${formatCurrency(analysis.recurringServices.monthly.licensingProfit)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 10px 0; padding-top: 8px; border-top: 1px solid #ddd;">
                    <span class="font-bold">Total Monthly:</span>
                    <span class="font-bold text-blue">${formatCurrency(analysis.recurringServices.monthly.totalProfit)}</span>
                  </div>
                </div>
              </div>

              <div class="border bg-green-light">
                <h4 class="text-center">Annual Profit</h4>
                <div style="margin: 10px 0;">
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Connectivity:</span>
                    <span class="font-bold">${formatCurrency(analysis.recurringServices.annual.connectivityProfit)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Licensing:</span>
                    <span class="font-bold">${formatCurrency(analysis.recurringServices.annual.licensingProfit)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 10px 0; padding-top: 8px; border-top: 1px solid #ddd;">
                    <span class="font-bold">Total Annual:</span>
                    <span class="font-bold text-green">${formatCurrency(analysis.recurringServices.annual.totalProfit)}</span>
                  </div>
                </div>
              </div>

              <div class="border" style="background-color: #f8f4ff;">
                <h4 class="text-center">Full Term Profit (${analysis.recurringServices.dealTerm}m)</h4>
                <div style="margin: 10px 0;">
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Connectivity:</span>
                    <span class="font-bold">${formatCurrency(analysis.recurringServices.fullTerm.connectivityProfit)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Licensing:</span>
                    <span class="font-bold">${formatCurrency(analysis.recurringServices.fullTerm.licensingProfit)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 10px 0; padding-top: 8px; border-top: 1px solid #ddd;">
                    <span class="font-bold">Total Term:</span>
                    <span class="font-bold" style="color: #7c3aed;">${formatCurrency(analysis.recurringServices.fullTerm.totalProfit)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ITEM COST BREAKDOWN -->
          <div class="section">
            <h2>📋 Item Cost Breakdown</h2>
            ${['hardware', 'connectivity', 'licensing'].map((sectionKey) => {
        const section = analysis.breakdown[sectionKey as keyof typeof analysis.breakdown];
        if (!section || !section.items || !section.items.length) return '';

        return `
                <div style="margin-bottom: 25px;">
                  <h3 style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; text-transform: capitalize;">${sectionKey} Items</h3>
                  <table class="table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Admin Cost</th>
                        <th>User/Manager Price</th>
                        <th>Total Cost</th>
                        <th>Total Price</th>
                        <th>Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${section.items.map((item: any) => `
                        <tr>
                          <td class="font-bold">${item.name}</td>
                          <td class="text-center">${item.quantity}</td>
                          <td>${formatCurrency(item.costPrice)}</td>
                          <td>${formatCurrency(item.userManagerPrice)}</td>
                          <td class="font-bold">${formatCurrency(item.totalCostPrice)}</td>
                          <td class="font-bold">${formatCurrency(item.totalUserManagerPrice)}</td>
                          <td class="font-bold ${(item.totalUserManagerPrice - item.totalCostPrice) >= 0 ? 'text-green' : 'text-red'}">
                            ${formatCurrency(item.totalUserManagerPrice - item.totalCostPrice)}
                          </td>
                        </tr>
                      `).join('')}
                      <tr style="background-color: #f0f0f0; font-weight: bold;">
                        <td colspan="4"><strong>${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)} Section Total:</strong></td>
                        <td class="font-bold">${formatCurrency(section.costPrice)}</td>
                        <td class="font-bold">${formatCurrency(section.userManagerPrice)}</td>
                        <td class="font-bold ${(section.userManagerPrice - section.costPrice) >= 0 ? 'text-green' : 'text-red'}">
                          ${formatCurrency(section.userManagerPrice - section.costPrice)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              `;
      }).join('')}
          </div>

          <div style="text-align: center; font-style: italic; color: #666; margin-top: 30px;">
            <p><strong>🔒 CONFIDENTIAL:</strong> This report contains sensitive financial information and is for authorized admin personnel only.</p>
            <p>Generated on ${new Date().toLocaleString()} | Report ID: ${deal.id}</p>
          </div>
        </body>
        </html>
      `;

      // Create and download the HTML file
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Open in new window for print preview
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();

        // Wait a moment for content to load, then trigger print dialog
        setTimeout(() => {
          printWindow.print();
        }, 1000);
      }

    } catch (error) {
      console.error('Error generating HTML report:', error);
      alert('Error generating report. Please try again.');
    }
  };

  // Get unique users for filter
  const uniqueUsers = Array.from(new Set(deals.map(deal => deal.userId))).map(userId => {
    const userDeal = deals.find(deal => deal.userId === userId);
    return {
      id: userId,
      username: userDeal?.username || 'Unknown User',
      role: userDeal?.userRole || 'user'
    };
  });

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h1 className="mt-2 text-xl font-semibold text-gray-900">Access Denied</h1>
          <p className="mt-1 text-gray-600">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="h-10 bg-gray-200 rounded w-1/3 mb-2 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
                <div className="h-24 bg-gray-200 rounded mb-4"></div>
                <div className="flex gap-2">
                  <div className="flex-1 h-10 bg-gray-200 rounded"></div>
                  <div className="flex-1 h-10 bg-gray-200 rounded"></div>
                  <div className="flex-1 h-10 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Shield className="h-8 w-8 text-blue-600" />
                Admin Deal Management
              </h1>
              <p className="mt-2 text-gray-600">
                Comprehensive view of all deals with cost analysis and management tools
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white px-4 py-2 rounded-lg shadow-sm border">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{deals.length}</span>
                  <span className="text-gray-500">Total Deals</span>
                </div>
              </div>
              <Link
                href="/calculator"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Deal
              </Link>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Deals
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search by customer, user, or deal ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="userFilter" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by User
              </label>
              <select
                id="userFilter"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Users</option>
                {uniqueUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Deals Grid */}
        {filteredDeals.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No deals found</h3>
            <p className="mt-2 text-gray-600">
              {searchTerm || selectedUser !== 'all'
                ? 'Try adjusting your search criteria or filters.'
                : 'No deals have been created yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredDeals.map((deal) => {
              const analysis = calculateCostAnalysis(deal);

              return (
                <div key={deal.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                  <div className="p-6">
                    {/* Deal Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {deal.customerName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          ID: {deal.id.slice(-8)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${deal.userRole === 'admin' ? 'bg-purple-100 text-purple-800' :
                          deal.userRole === 'manager' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                          {deal.userRole}
                        </span>
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-2 mb-4">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-700">{deal.username}</span>
                    </div>

                    {/* Deal Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Term
                        </span>
                        <span className="font-medium">{deal.term} months</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Escalation
                        </span>
                        <span className="font-medium">{deal.escalation}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Settlement
                        </span>
                        <span className="font-medium">{formatCurrency(deal.settlement)}</span>
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Financial Overview</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Hardware Deal GP:</span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(analysis.hardwareDeal.actual.grossProfit)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Monthly Recurring:</span>
                          <span className="font-medium text-blue-600">
                            {formatCurrency(analysis.recurringServices.monthly.totalProfit)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm border-t pt-1">
                          <span className="text-gray-600 font-medium">Total Deal Value:</span>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(analysis.termAnalysis.completeDeal.actual.profit)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedDealForAnalysis(deal);
                          setShowCostAnalysis(true);
                        }}
                        className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Eye className="h-4 w-4" />
                        Analyze
                      </button>
                      <button
                        onClick={() => {
                          setIsGeneratingPDF(deal.id);
                          generateCostAnalysisPDF(deal);
                          setTimeout(() => setIsGeneratingPDF(null), 2000);
                        }}
                        disabled={isGeneratingPDF === deal.id}
                        className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingPDF === deal.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            PDF
                          </>
                        )}
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to delete this deal? This action cannot be undone.')) {
                            const success = await deleteDeal(deal.id);
                            if (!success) {
                              alert('Failed to delete deal. Please try again.');
                            }
                          }
                        }}
                        disabled={isDeleting === deal.id}
                        className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeleting === deal.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Created Date */}
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-gray-500">
                        Created: {formatDate(deal.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cost Analysis Modal */}
        {showCostAnalysis && selectedDealForAnalysis && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Complete Deal Analysis - {selectedDealForAnalysis.customerName}
                  </h2>
                  <button
                    onClick={() => {
                      setShowCostAnalysis(false);
                      setSelectedDealForAnalysis(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {(() => {
                  const analysis = calculateCostAnalysis(selectedDealForAnalysis);

                  return (
                    <div className="space-y-6">
                      {/* Deal Header Info */}
                      <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-blue-600 mb-2">📊 Complete Deal Analysis</h3>
                        <h4 className="text-lg font-semibold text-gray-900">{analysis.dealInfo.customerName}</h4>
                        <p className="text-sm text-gray-600 mt-2">
                          <strong>Rep:</strong> {analysis.dealInfo.username} ({analysis.dealInfo.userRole}) |
                          <strong> Term:</strong> {analysis.dealInfo.term} months |
                          <strong> Escalation:</strong> {analysis.dealInfo.escalation}% |
                          <strong> Extensions:</strong> {analysis.dealInfo.extensionCount}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Settlement:</strong> {formatCurrency(analysis.dealInfo.settlement)}
                        </p>
                      </div>

                      {/* Brief Summary */}
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border-2 border-blue-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">📈 Deal Summary Comparison</h3>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="bg-white rounded-lg p-4 border">
                            <h4 className="font-medium text-blue-900 mb-3 text-center">Rep's Calculation</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Deal Payout:</span>
                                <span className="font-semibold text-blue-700">{formatCurrency(analysis.hardwareDeal.rep.payout)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Gross Profit:</span>
                                <span className="font-semibold text-blue-700">{formatCurrency(analysis.hardwareDeal.rep.grossProfit)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-4 border">
                            <h4 className="font-medium text-green-900 mb-3 text-center">Admin's Actual</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Deal Payout:</span>
                                <span className="font-semibold text-green-700">{formatCurrency(analysis.hardwareDeal.actual.payout)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Gross Profit:</span>
                                <span className="font-semibold text-green-700">{formatCurrency(analysis.hardwareDeal.actual.grossProfit)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-white rounded-lg border-2 border-green-200 text-center">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-sm font-medium text-gray-700">Payout Difference:</span>
                              <span className={`ml-2 font-bold text-lg ${analysis.hardwareDeal.differences.payoutDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(analysis.hardwareDeal.differences.payoutDifference)}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-700">GP Difference:</span>
                              <span className={`ml-2 font-bold text-lg ${analysis.hardwareDeal.differences.grossProfitDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(analysis.hardwareDeal.differences.grossProfitDifference)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Complete Deal Analysis */}
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border">
                        <h3 className="text-lg font-semibold text-blue-600 mb-4 border-b-2 border-blue-600 pb-2">📈 Complete Deal Analysis ({analysis.termAnalysis.dealTerm} Month Term)</h3>

                        {/* One-time vs Recurring Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          {/* One-time Hardware */}
                          <div className="bg-white rounded-lg p-4 border">
                            <h4 className="font-medium text-gray-700 mb-3">One-Time Hardware</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Cost Price:</span>
                                <span className="font-medium">{formatCurrency(analysis.breakdown.hardware.costPrice)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>{analysis.dealInfo.userRole === 'manager' || analysis.dealInfo.userRole === 'admin' ? 'Manager' : 'User'} Price:</span>
                                <span className="font-medium">{formatCurrency(analysis.breakdown.hardware.userManagerPrice)}</span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span className="font-semibold">Hardware Profit:</span>
                                <span className={`font-semibold ${(analysis.breakdown.hardware.userManagerPrice - analysis.breakdown.hardware.costPrice) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(analysis.breakdown.hardware.userManagerPrice - analysis.breakdown.hardware.costPrice)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Recurring Services Over Full Term */}
                          <div className="bg-white rounded-lg p-4 border">
                            <h4 className="font-medium text-gray-700 mb-3">Recurring Services (Full Term)</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Total Cost:</span>
                                <span className="font-medium">{formatCurrency(analysis.termAnalysis.totalRecurring.cost)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Revenue:</span>
                                <span className="font-medium">{formatCurrency(analysis.termAnalysis.totalRecurring.revenue)}</span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span className="font-semibold">Recurring Profit:</span>
                                <span className={`font-semibold ${analysis.termAnalysis.totalRecurring.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(analysis.termAnalysis.totalRecurring.profit)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Complete Deal Totals */}
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border-2 border-blue-200">
                          <h4 className="font-semibold text-center mb-4">Complete Deal Totals (Hardware + {analysis.termAnalysis.dealTerm} Months Recurring)</h4>
                          <div className="grid grid-cols-4 gap-4 text-center">
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Total Deal Cost</p>
                              <p className="font-bold text-red-600 text-lg">{formatCurrency(analysis.termAnalysis.completeDeal.actual.cost)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Total Deal Revenue</p>
                              <p className="font-bold text-blue-600 text-lg">{formatCurrency(analysis.termAnalysis.completeDeal.actual.revenue)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Total Deal Profit</p>
                              <p className={`font-bold text-lg ${analysis.termAnalysis.completeDeal.actual.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(analysis.termAnalysis.completeDeal.actual.profit)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Deal Margin</p>
                              <p className={`font-bold text-lg ${analysis.termAnalysis.completeDeal.actual.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {analysis.termAnalysis.completeDeal.actual.margin.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Hardware Deal Breakdown - Full Comparison */}
                      <div className="bg-white border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-blue-600 mb-4 border-b-2 border-blue-600 pb-2">🔍 Hardware Deal Breakdown</h3>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Rep's Calculation */}
                          <div className="bg-blue-50 rounded-lg p-4 border">
                            <h4 className="font-medium text-blue-900 mb-3 text-center">Rep's Calculation</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Factor Used:</span>
                                <span className="font-medium">{analysis.hardwareDeal.rep.factorUsed.toFixed(5)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Hardware Rental:</span>
                                <span className="font-medium">{formatCurrency(analysis.hardwareDeal.rep.hardwareRental)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Payout:</span>
                                <span className="font-medium">{formatCurrency(analysis.hardwareDeal.rep.payout)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Stock Cost:</span>
                                <span className="font-medium">{formatCurrency(analysis.hardwareDeal.rep.stockCost)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Installation:</span>
                                <span className="font-medium">{formatCurrency(analysis.hardwareDeal.rep.installationCost)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Finance Fee:</span>
                                <span className="font-medium">{formatCurrency(analysis.hardwareDeal.rep.financeFee)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Settlement:</span>
                                <span className="font-medium">{formatCurrency(analysis.hardwareDeal.rep.settlement)}</span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span className="font-semibold">Gross Profit:</span>
                                <span className="font-bold text-blue-700">{formatCurrency(analysis.hardwareDeal.rep.grossProfit)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Admin's Actual */}
                          <div className="bg-green-50 rounded-lg p-4 border">
                            <h4 className="font-medium text-green-900 mb-3 text-center">Admin's Actual</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Factor Used:</span>
                                <span className="font-medium">{analysis.hardwareDeal.actual.factorUsed.toFixed(5)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Hardware Rental:</span>
                                <span className="font-medium">{formatCurrency(analysis.hardwareDeal.actual.hardwareRental)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Payout:</span>
                                <span className="font-medium">{formatCurrency(analysis.hardwareDeal.actual.payout)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Stock Cost:</span>
                                <span className="font-medium">{formatCurrency(analysis.hardwareDeal.actual.stockCost)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Installation:</span>
                                <span className="font-medium">{formatCurrency(analysis.hardwareDeal.actual.installationCost)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Finance Fee:</span>
                                <span className="font-medium">{formatCurrency(analysis.hardwareDeal.actual.financeFee)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Settlement:</span>
                                <span className="font-medium">{formatCurrency(analysis.hardwareDeal.actual.settlement)}</span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span className="font-semibold">Gross Profit:</span>
                                <span className="font-bold text-green-700">{formatCurrency(analysis.hardwareDeal.actual.grossProfit)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Differences */}
                          <div className="bg-purple-50 rounded-lg p-4 border">
                            <h4 className="font-medium text-purple-900 mb-3 text-center">Difference (Actual - Rep)</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Factor Diff:</span>
                                <span className={`font-medium ${(analysis.hardwareDeal.actual.factorUsed - analysis.hardwareDeal.rep.factorUsed) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {(analysis.hardwareDeal.actual.factorUsed - analysis.hardwareDeal.rep.factorUsed).toFixed(5)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Hardware Rental:</span>
                                <span className="font-medium text-gray-600">-</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Payout Diff:</span>
                                <span className={`font-medium ${analysis.hardwareDeal.differences.payoutDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(analysis.hardwareDeal.differences.payoutDifference)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Stock Cost Diff:</span>
                                <span className={`font-medium ${analysis.hardwareDeal.differences.stockCostDifference <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(analysis.hardwareDeal.differences.stockCostDifference)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Install Cost Diff:</span>
                                <span className={`font-medium ${analysis.hardwareDeal.differences.installCostDifference <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(analysis.hardwareDeal.differences.installCostDifference)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Finance Fee Diff:</span>
                                <span className={`font-medium ${(analysis.hardwareDeal.actual.financeFee - analysis.hardwareDeal.rep.financeFee) <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(analysis.hardwareDeal.actual.financeFee - analysis.hardwareDeal.rep.financeFee)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Settlement:</span>
                                <span className="font-medium text-gray-600">-</span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span className="font-semibold">GP Difference:</span>
                                <span className={`font-bold ${analysis.hardwareDeal.differences.grossProfitDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(analysis.hardwareDeal.differences.grossProfitDifference)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Monthly Recurring Services Analysis */}
                      <div className="bg-white border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-blue-600 mb-4 border-b-2 border-blue-600 pb-2">📊 Monthly Recurring Services Analysis</h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-blue-50 rounded-lg p-4 border">
                            <h4 className="font-medium text-blue-900 mb-3 text-center">Monthly Profit</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Connectivity:</span>
                                <span className="font-medium">{formatCurrency(analysis.recurringServices.monthly.connectivityProfit)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Licensing:</span>
                                <span className="font-medium">{formatCurrency(analysis.recurringServices.monthly.licensingProfit)}</span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span className="font-semibold">Total Monthly:</span>
                                <span className="font-bold text-blue-700">{formatCurrency(analysis.recurringServices.monthly.totalProfit)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-green-50 rounded-lg p-4 border">
                            <h4 className="font-medium text-green-900 mb-3 text-center">Annual Profit</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Connectivity:</span>
                                <span className="font-medium">{formatCurrency(analysis.recurringServices.annual.connectivityProfit)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Licensing:</span>
                                <span className="font-medium">{formatCurrency(analysis.recurringServices.annual.licensingProfit)}</span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span className="font-semibold">Total Annual:</span>
                                <span className="font-bold text-green-700">{formatCurrency(analysis.recurringServices.annual.totalProfit)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-purple-50 rounded-lg p-4 border">
                            <h4 className="font-medium text-purple-900 mb-3 text-center">Full Term Profit ({analysis.recurringServices.dealTerm}m)</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Connectivity:</span>
                                <span className="font-medium">{formatCurrency(analysis.recurringServices.fullTerm.connectivityProfit)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Licensing:</span>
                                <span className="font-medium">{formatCurrency(analysis.recurringServices.fullTerm.licensingProfit)}</span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span className="font-semibold">Total Term:</span>
                                <span className="font-bold text-purple-700">{formatCurrency(analysis.recurringServices.fullTerm.totalProfit)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Item Cost Breakdown */}
                      <div className="bg-white border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-blue-600 mb-4 border-b-2 border-blue-600 pb-2">📋 Item Cost Breakdown</h3>

                        {['hardware', 'connectivity', 'licensing'].map((sectionKey) => {
                          const section = analysis.breakdown[sectionKey as keyof typeof analysis.breakdown];
                          if (!section || !section.items || !section.items.length) return null;

                          return (
                            <div key={sectionKey} className="mb-6">
                              <h4 className="font-medium text-gray-900 mb-3 capitalize bg-gray-50 p-2 rounded">{sectionKey} Items</h4>
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Cost</th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User/Manager Price</th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {section.items.map((item: any, index: number) => (
                                      <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 text-center">{item.quantity}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item.costPrice)}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item.userManagerPrice)}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{formatCurrency(item.totalCostPrice)}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{formatCurrency(item.totalUserManagerPrice)}</td>
                                        <td className={`px-4 py-3 text-sm font-semibold ${(item.totalUserManagerPrice - item.totalCostPrice) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {formatCurrency(item.totalUserManagerPrice - item.totalCostPrice)}
                                        </td>
                                      </tr>
                                    ))}
                                    <tr className="bg-gray-100 font-semibold">
                                      <td className="px-4 py-3 text-sm text-gray-900" colSpan={4}>
                                        <strong>{sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)} Section Total:</strong>
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-900 font-bold">{formatCurrency(section.costPrice)}</td>
                                      <td className="px-4 py-3 text-sm text-gray-900 font-bold">{formatCurrency(section.userManagerPrice)}</td>
                                      <td className={`px-4 py-3 text-sm font-bold ${(section.userManagerPrice - section.costPrice) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(section.userManagerPrice - section.costPrice)}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Confidential Footer */}
                      <div className="text-center text-xs text-gray-500 italic mt-6 p-4 bg-gray-50 rounded-lg border">
                        <p><strong>🔒 CONFIDENTIAL:</strong> This report contains sensitive financial information and is for authorized admin personnel only.</p>
                        <p>Generated on {new Date().toLocaleString()} | Report ID: {selectedDealForAnalysis.id}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}