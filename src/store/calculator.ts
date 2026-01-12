import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CalculatorState, Item, DealDetails, TotalCosts } from '@/lib/types';
import { getFactorForDeal, getItemCost } from '@/lib/utils';
import { useConfigStore } from './config';

const DEFAULT_DEAL_DETAILS: DealDetails = {
  customerName: '',
  term: 36,
  escalation: 0,
  distanceToInstall: 0,
  settlement: 0
};

export const useCalculatorStore = create<CalculatorState>()(
  persist(
    (set, get) => ({
      sections: [],
      dealDetails: DEFAULT_DEAL_DETAILS,
      originalUserContext: null as { role: string; username: string } | null,
      currentDealId: null,

      initializeStore: async () => {
        const configStore = useConfigStore.getState();
        
        // Ensure config store is loaded with comprehensive checks
        if (!configStore.scales || !configStore.factors || 
            !configStore.scales.additional_costs || 
            typeof configStore.scales.additional_costs.cost_per_kilometer === 'undefined' ||
            typeof configStore.scales.additional_costs.cost_per_point === 'undefined') {
          await configStore.loadFromAPI();
        }
        
        // Get fresh state after loading
        const freshConfigStore = useConfigStore.getState();
        
        // Final check to ensure we have all required data
        if (!freshConfigStore.scales?.additional_costs?.cost_per_kilometer || 
            !freshConfigStore.scales?.additional_costs?.cost_per_point) {
          console.error('Config store still missing required data after loading');
          return;
        }
        
        const sections = [
          { id: 'hardware', name: 'Hardware', items: freshConfigStore.hardware },
          { id: 'connectivity', name: 'Connectivity', items: freshConfigStore.connectivity },
          { id: 'licensing', name: 'Licensing', items: freshConfigStore.licensing }
        ];
        
        set({ sections });

        // Run migration in the background without blocking initialization
        // Handle errors gracefully to not block user
        get().migrateDealsToDatabase().catch(error => {
          console.warn('Deals migration failed, but continuing with normal operation:', error);
        });
      },

      updateSectionItem: (sectionId: string, itemId: string, updates: Partial<Item>) => {
        set((state) => ({
          sections: state.sections.map((section) =>
            section.id === sectionId
              ? {
                  ...section,
                  items: section.items.map((item) =>
                    item.id === itemId ? { ...item, ...updates } : item
                  ),
                }
              : section
          ),
        }));
      },

      addTemporaryItem: (sectionId: string, item: Item) => {
        set((state) => ({
          sections: state.sections.map((section) =>
            section.id === sectionId
              ? {
                  ...section,
                  items: [...section.items, item],
                }
              : section
          ),
        }));
      },

      updateDealDetails: (updates: Partial<DealDetails>) => {
        set((state) => ({
          dealDetails: { ...state.dealDetails, ...updates },
        }));
      },

      saveDeal: async () => {
        try {
          const { sections, dealDetails, currentDealId, originalUserContext } = get();
          const configStore = useConfigStore.getState();
          const { useAuthStore } = await import('@/store/auth');
          const { user } = useAuthStore.getState();
          const { logActivity } = await import('@/lib/activityLogger');
          const { generateDealId } = await import('@/lib/idGenerator');
                    
          if (!user) {
            return false;
          }

          const totals = get().calculateTotalCosts();
          
          // Generate new UUID for new deals, preserve existing ID for updates
          const dealId = currentDealId || generateDealId();
          
          // Prepare deal data for PostgreSQL
          const dealData = {
            id: dealId,
            userId: originalUserContext?.userId || user.id,
            username: originalUserContext?.username || user.username,
            userRole: originalUserContext?.role || user.role,
            customerName: dealDetails.customerName,
            dealName: dealDetails.customerName,
            dealDetails: {
              customerName: dealDetails.customerName,
              term: dealDetails.term,
              escalation: dealDetails.escalation,
              distanceToInstall: dealDetails.distanceToInstall,
              settlement: dealDetails.settlement,
              customGrossProfit: dealDetails.customGrossProfit
            },
            sectionsData: sections,
            totalsData: totals,
            factorsData: configStore.factors,
            scalesData: configStore.scales,
            updatedAt: new Date().toISOString()
          };

          try {
            if (currentDealId) {
              // UPDATE existing deal via API
              const response = await fetch(`/api/deals/${currentDealId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dealData),
              });
              
              if (!response.ok) {
                throw new Error('Failed to update deal');
              }

              // Log activity: deal_saved
              await logActivity({
                id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                userId: user.id,
                username: user.username,
                userRole: user.role,
                activityType: 'deal_saved',
                dealId: currentDealId,
                dealName: dealDetails.customerName,
                timestamp: new Date().toISOString()
              });
            } else {
              // CREATE new deal via API
              const newDealData = {
                ...dealData,
                createdAt: new Date().toISOString()
              };
              
              const response = await fetch('/api/deals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newDealData),
              });
              
              if (!response.ok) {
                throw new Error('Failed to create deal');
              }
              
              // Set current deal ID after creating new deal
              set({ currentDealId: dealId });

              // Log activity: deal_created
              await logActivity({
                id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                userId: user.id,
                username: user.username,
                userRole: user.role,
                activityType: 'deal_created',
                dealId: dealId,
                dealName: dealDetails.customerName,
                timestamp: new Date().toISOString()
              });
            }

            return true;
          } catch (databaseError) {
            console.warn('Failed to save deal to database, falling back to localStorage:', databaseError);
            
            // Fallback to localStorage
            const existingDeals = JSON.parse(localStorage.getItem('deals-storage') || '[]');

            if (currentDealId) {
              const dealIndex = existingDeals.findIndex((d: any) => d.id === currentDealId);
              
              if (dealIndex !== -1) {
                // UPDATE existing deal in localStorage
                // Preserve original deal ID (text or UUID) and only update updatedAt
                const existingDeal = existingDeals[dealIndex];
                const updatedDeal = {
                  ...existingDeal,
                  userId: user.id,
                  username: user.username,
                  userRole: user.role,
                  customerName: dealDetails.customerName,
                  term: dealDetails.term,
                  escalation: dealDetails.escalation,
                  distanceToInstall: dealDetails.distanceToInstall,
                  settlement: dealDetails.settlement,
                  customGrossProfit: dealDetails.customGrossProfit,
                  sections,
                  factors: configStore.factors,
                  scales: configStore.scales,
                  totals,
                  updatedAt: new Date().toISOString()
                  // Note: createdAt is preserved from existingDeal
                };
                
                existingDeals[dealIndex] = updatedDeal;
                localStorage.setItem('deals-storage', JSON.stringify(existingDeals));
                
                return true;
              }
            }
            
            // CREATE new deal in localStorage
            // Use new UUID format for deal ID
            const newDeal = {
              id: dealId,
              userId: user.id,
              username: user.username,
              userRole: user.role,
              customerName: dealDetails.customerName,
              term: dealDetails.term,
              escalation: dealDetails.escalation,
              distanceToInstall: dealDetails.distanceToInstall,
              settlement: dealDetails.settlement,
              customGrossProfit: dealDetails.customGrossProfit,
              sections,
              factors: configStore.factors,
              scales: configStore.scales,
              totals,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            
            existingDeals.push(newDeal);
            localStorage.setItem('deals-storage', JSON.stringify(existingDeals));
            
            // Set current deal ID after creating new deal
            set({ currentDealId: dealId });

            return true;
          }
        } catch (error) {
          console.error('Error saving deal:', error);
          return false;
        }
      },

      loadDeal: async (dealId: string) => {
        try {
          const { logActivity } = await import('@/lib/activityLogger');
          let deal;
          
          try {
            // Try to fetch deal from API
            const response = await fetch(`/api/deals/${dealId}`);
            if (!response.ok) {
              throw new Error('Deal not found in API');
            }
            const result = await response.json();
            deal = result.data;
            
            if (!deal) {
              throw new Error('Deal not found in API response');
            }
          } catch (apiError) {
            console.warn('Failed to load deal from API, falling back to localStorage:', apiError);
            
            // Fallback to localStorage
            const allDeals = JSON.parse(localStorage.getItem('deals-storage') || '[]');
            deal = allDeals.find((d: any) => d.id === dealId);
            
            if (!deal) {
              throw new Error('Deal not found');
            }
          }

          // Load deal data into the store
          // Handle both database format (sectionsData) and localStorage format (sections)
          const sections = deal.sectionsData || deal.sections;
          const dealDetails = deal.dealDetails || {
            customerName: deal.customerName,
            term: deal.term,
            escalation: deal.escalation,
            distanceToInstall: deal.distanceToInstall,
            settlement: deal.settlement,
            customGrossProfit: deal.customGrossProfit
          };
          
          set((state) => ({
            sections: sections,
            dealDetails: dealDetails,
            originalUserContext: {
              role: deal.userRole,
              username: deal.username,
              userId: deal.userId
            },
            currentDealId: dealId
          }));

          // Log activity: deal_loaded
          try {
            const { useAuthStore } = await import('@/store/auth');
            const { user } = useAuthStore.getState();
            
            if (user) {
              await logActivity({
                id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                userId: user.id,
                username: user.username,
                userRole: user.role,
                activityType: 'deal_loaded',
                dealId: dealId,
                dealName: dealDetails.customerName,
                timestamp: new Date().toISOString()
              });
            }
          } catch (logError) {
            console.warn('Failed to log deal_loaded activity:', logError);
          }

          return deal;
        } catch (error) {
          console.error('Error loading deal:', error);
          throw error;
        }
      },

      resetDeal: () => {
        set((state) => ({
          dealDetails: DEFAULT_DEAL_DETAILS,
          originalUserContext: null,
          currentDealId: null,
          // Clear temporary items from all sections when starting a new deal
          // This ensures temporary items from previous calculations don't carry over
          // Addresses Requirement 3.6: Clear all temporary items when starting new deal calculation
          sections: state.sections.map(section => ({
            ...section,
            items: section.items.filter(item => !item.isTemporary)
          }))
        }));
      },

      clearTemporaryItems: () => {
        // Dedicated function to clear temporary items from all sections
        // Can be called independently of resetDeal if needed
        set((state) => ({
          sections: state.sections.map(section => ({
            ...section,
            items: section.items.filter(item => !item.isTemporary)
          }))
        }));
      },

      migrateDealsToDatabase: async (): Promise<boolean> => {
        try {
          // Check if migration already done
          const migrationKey = 'deals-migrated';
          if (typeof window !== 'undefined' && localStorage.getItem(migrationKey) === 'true') {
            return true;
          }

          const localDeals = JSON.parse(localStorage.getItem('deals-storage') || '[]');
          
          if (localDeals.length === 0) {
            // No deals to migrate, mark as complete
            if (typeof window !== 'undefined') {
              localStorage.setItem(migrationKey, 'true');
            }
            return true;
          }

          // TODO: Replace with API calls to migrate deals
          console.log('Would migrate deals to database:', localDeals.length, 'deals');

          // Mark migration as complete
          if (typeof window !== 'undefined') {
            localStorage.setItem(migrationKey, 'true');
          }
          
          return true;
        } catch (error) {
          console.error('Failed to migrate deals to database:', error);
          return false;
        }
      },

      calculateTotalCosts: (): TotalCosts => {
        const { sections, dealDetails } = get();
        const configStore = useConfigStore.getState();
        
        // Ensure config store is available with comprehensive checks
        if (!configStore.scales || !configStore.factors || 
            !configStore.scales.additional_costs || 
            typeof configStore.scales.additional_costs.cost_per_kilometer === 'undefined' ||
            typeof configStore.scales.additional_costs.cost_per_point === 'undefined') {
          console.warn('Config store not fully initialized, using default values');
          return {
            extensionCount: 0,
            hardwareTotal: 0,
            hardwareInstallTotal: 0,
            totalGrossProfit: 0,
            financeFee: 0,
            settlementAmount: 0,
            financeAmount: 0,
            totalPayout: 0,
            hardwareRental: 0,
            connectivityCost: 0,
            licensingCost: 0,
            totalMRC: 0,
            totalExVat: 0,
            totalIncVat: 0,
            factorUsed: 0
          };
        }
        
        // Get user role from localStorage (auth store is not available in this context)
        const user = typeof window !== 'undefined' ? 
          JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.user : null;
        
        // Use original user context if available (for admin viewing other users' deals)
        const { originalUserContext } = get();
        const userRole: 'admin' | 'manager' | 'user' = originalUserContext?.role as 'admin' | 'manager' | 'user' || user?.role || 'user';


        // Get hardware section
        const hardwareSection = sections.find(s => s.id === 'hardware');
        const connectivitySection = sections.find(s => s.id === 'connectivity');
        const licensingSection = sections.find(s => s.id === 'licensing');

        if (!hardwareSection || !connectivitySection || !licensingSection) {
          return {
            extensionCount: 0,
            hardwareTotal: 0,
            hardwareInstallTotal: 0,
            totalGrossProfit: 0,
            financeFee: 0,
            settlementAmount: 0,
            financeAmount: 0,
            totalPayout: 0,
            hardwareRental: 0,
            connectivityCost: 0,
            licensingCost: 0,
            totalMRC: 0,
            totalExVat: 0,
            totalIncVat: 0,
            factorUsed: 0
          };
        }

        // Calculate extension count
        const extensionCount = hardwareSection.items
          .filter(item => item.isExtension)
          .reduce((sum, item) => sum + item.quantity, 0);

        // Calculate hardware total
        const hardwareTotal = hardwareSection.items
          .reduce((sum, item) => sum + (getItemCost(item, userRole) * item.quantity), 0);

        // Helper function to get cost from scales data based on user role
        const getScaleCost = (scaleData: any, userRole: 'admin' | 'manager' | 'user' = 'user', fieldSuffix?: string): any => {
          if (!scaleData || typeof scaleData !== 'object') return 0;
          
          // For additional_costs, we need to handle different field names
          if (fieldSuffix) {
            const managerField = `manager_${fieldSuffix}`;
            const userField = `user_${fieldSuffix}`;
            const baseField = fieldSuffix;
            
            // Admin and Manager should use manager_* fields
            if ((userRole === 'admin' || userRole === 'manager') && scaleData[managerField] !== undefined && scaleData[managerField] !== null) {
              return typeof scaleData[managerField] === 'string' ? parseFloat(scaleData[managerField]) : scaleData[managerField];
            } 
            // User should use user_* fields
            else if (userRole === 'user' && scaleData[userField] !== undefined && scaleData[userField] !== null) {
              return typeof scaleData[userField] === 'string' ? parseFloat(scaleData[userField]) : scaleData[userField];
            } 
            // Fallback to base field
            else if (scaleData[baseField] !== undefined && scaleData[baseField] !== null) {
              return typeof scaleData[baseField] === 'string' ? parseFloat(scaleData[baseField]) : scaleData[baseField];
            }
          } else {
            // Standard cost structure - return the appropriate role-based data (could be object or number)
            // Admin and Manager should use managerCost
            if ((userRole === 'admin' || userRole === 'manager') && scaleData.managerCost !== undefined && scaleData.managerCost !== null) {
              return scaleData.managerCost;
            } 
            // User should use userCost
            else if (userRole === 'user' && scaleData.userCost !== undefined && scaleData.userCost !== null) {
              return scaleData.userCost;
            } 
            // Fallback to regular cost if specific pricing is not available
            else if (scaleData.cost !== undefined && scaleData.cost !== null) {
              return scaleData.cost;
            }
          }
          
          return 0;
        };

        // Get installation cost based on extension count
        let installationCost = 0;
        if (configStore.scales?.installation) {
          // First get the correct role-based data
          const installationData = getScaleCost(configStore.scales.installation, userRole);
          
          // If installationData is an object with bands, parse it
          if (typeof installationData === 'object' && installationData !== null) {
            for (const [band, cost] of Object.entries(installationData)) {
              const [min, max] = band.split('-').map(Number);
              // Handle the "33+" case and other ranges properly
              const maxValue = isNaN(max) ? Infinity : max;
              if (extensionCount >= (min || 0) && extensionCount <= maxValue) {
                installationCost = typeof cost === 'string' ? parseFloat(cost) : (typeof cost === 'number' ? cost : 0);
                break;
              }
            }
          } else if (typeof installationData === 'number') {
            // If it's already a number, use it directly
            installationCost = installationData;
          }
        }

        // Get gross profit based on extension count or use custom gross profit if set
        let baseGrossProfit = 0;
        
        // Check if custom gross profit is set in deal details
        if (dealDetails.customGrossProfit !== null && dealDetails.customGrossProfit !== undefined) {
          baseGrossProfit = dealDetails.customGrossProfit;
        } else if (configStore.scales?.gross_profit) {
          // First get the correct role-based data
          const grossProfitData = getScaleCost(configStore.scales.gross_profit, userRole);
          
          // If grossProfitData is an object with bands, parse it
          if (typeof grossProfitData === 'object' && grossProfitData !== null) {
            for (const [band, profit] of Object.entries(grossProfitData)) {
              const [min, max] = band.split('-').map(Number);
              // Handle the "33+" case and other ranges properly
              const maxValue = isNaN(max) ? Infinity : max;
              if (extensionCount >= (min || 0) && extensionCount <= maxValue) {
                baseGrossProfit = typeof profit === 'string' ? parseFloat(profit) : (typeof profit === 'number' ? profit : 0);
                break;
              }
            }
          } else if (typeof grossProfitData === 'number') {
            // If it's already a number, use it directly
            baseGrossProfit = grossProfitData;
          }
        }

        // Calculate connectivity cost
        const connectivityCost = connectivitySection.items
          .reduce((sum, item) => sum + (getItemCost(item, userRole) * item.quantity), 0);

        // Calculate licensing cost
        const licensingCost = licensingSection.items
          .reduce((sum, item) => sum + (getItemCost(item, userRole) * item.quantity), 0);

        // Calculate additional costs with proper role-based pricing
        const costPerKilometer = configStore.scales?.additional_costs ? getScaleCost(configStore.scales.additional_costs, userRole, 'cost_per_kilometer') : 0;
        const costPerPoint = configStore.scales?.additional_costs ? getScaleCost(configStore.scales.additional_costs, userRole, 'cost_per_point') : 0;
        
        const additionalCosts = (dealDetails.distanceToInstall * costPerKilometer) + (extensionCount * costPerPoint);

        // Calculate totals
        const totalGrossProfit = typeof baseGrossProfit === 'number' ? baseGrossProfit : 0;
        const settlementAmount = dealDetails.settlement;
        const extensionCost = extensionCount * (typeof costPerPoint === 'number' ? costPerPoint : 0);
        
        // Calculate proper installation cost with sliding scale
        const safeInstallationCost = typeof installationCost === 'number' ? installationCost : 0;
        const totalInstallationCost = safeInstallationCost + extensionCost + (dealDetails.distanceToInstall * costPerKilometer);
        
        // Calculate base total payout (without finance fee initially)
        const safeTotalGrossProfit = typeof totalGrossProfit === 'number' ? totalGrossProfit : 0;
        let baseTotalPayout = hardwareTotal + totalInstallationCost + safeTotalGrossProfit + settlementAmount;
        
        // Iteratively calculate finance fee until it stabilizes
        let financeFee = 0;
        let previousFinanceFee = -1;
        let iterations = 0;
        const maxIterations = 10; // Prevent infinite loops
        
        while (financeFee !== previousFinanceFee && iterations < maxIterations) {
          previousFinanceFee = financeFee;
          const totalPayoutForFeeCalculation = baseTotalPayout + financeFee;
          
          // Calculate finance fee based on current total payout
          if (configStore.scales?.finance_fee) {
            const financeFeeBands = getScaleCost(configStore.scales.finance_fee, userRole);
            
            if (typeof financeFeeBands === 'object' && financeFeeBands !== null) {
              // Reset finance fee before checking
              financeFee = 0;
              
              // Use explicit range checking for finance fee bands
              if (totalPayoutForFeeCalculation >= 0 && totalPayoutForFeeCalculation <= 20000) {
                if (financeFeeBands['0-20000']) {
                  financeFee = typeof financeFeeBands['0-20000'] === 'string' ? parseFloat(financeFeeBands['0-20000']) : financeFeeBands['0-20000'];
                }
              } else if (totalPayoutForFeeCalculation >= 20001 && totalPayoutForFeeCalculation <= 50000) {
                if (financeFeeBands['20001-50000']) {
                  financeFee = typeof financeFeeBands['20001-50000'] === 'string' ? parseFloat(financeFeeBands['20001-50000']) : financeFeeBands['20001-50000'];
                }
              } else if (totalPayoutForFeeCalculation >= 50001 && totalPayoutForFeeCalculation <= 100000) {
                if (financeFeeBands['50001-100000']) {
                  financeFee = typeof financeFeeBands['50001-100000'] === 'string' ? parseFloat(financeFeeBands['50001-100000']) : financeFeeBands['50001-100000'];
                }
              } else if (totalPayoutForFeeCalculation >= 100001) {
                if (financeFeeBands['100001+']) {
                  financeFee = typeof financeFeeBands['100001+'] === 'string' ? parseFloat(financeFeeBands['100001+']) : financeFeeBands['100001+'];
                }
              }
            } else if (typeof financeFeeBands === 'number') {
              financeFee = financeFeeBands;
            }
          }
          
          iterations++;
        }
        
        // Calculate final finance amount with stabilized finance fee
        const safeFinanceFee = typeof financeFee === 'number' ? financeFee : 0;
        const financeAmount = baseTotalPayout + safeFinanceFee;
        
        // Get factor for financing (using the new finance amount)
        const factorUsed = configStore.factors ? getFactorForDeal(configStore.factors, dealDetails.term, dealDetails.escalation, financeAmount, userRole) : 0;
        
        // Total payout equals finance amount
        const totalPayout = financeAmount;
        const hardwareRental = financeAmount * factorUsed;
        const totalMRC = hardwareRental + connectivityCost + licensingCost;
        const totalExVat = totalMRC;
        const totalIncVat = totalExVat * 1.15; // 15% VAT

        return {
          extensionCount,
          hardwareTotal,
          hardwareInstallTotal: typeof totalInstallationCost === 'number' ? totalInstallationCost : 0,
          totalGrossProfit: typeof totalGrossProfit === 'number' ? totalGrossProfit : 0,
          financeFee: typeof financeFee === 'number' ? financeFee : 0,
          settlementAmount,
          financeAmount: typeof financeAmount === 'number' ? financeAmount : 0,
          totalPayout: typeof totalPayout === 'number' ? totalPayout : 0,
          hardwareRental: typeof hardwareRental === 'number' ? hardwareRental : 0,
          connectivityCost,
          licensingCost,
          totalMRC: typeof totalMRC === 'number' ? totalMRC : 0,
          totalExVat: typeof totalExVat === 'number' ? totalExVat : 0,
          totalIncVat: typeof totalIncVat === 'number' ? totalIncVat : 0,
          factorUsed: typeof factorUsed === 'number' ? factorUsed : 0
        };
      },
    }),
    {
      name: 'calculator-storage',
      partialize: (state) => ({
        sections: state.sections,
        // Don't persist dealDetails to ensure fresh start each time
      }),
    }
  )
);

// Optimized selectors for better performance
// Use simple property access to avoid creating new objects on every render
export const useCalculatorSections = () => useCalculatorStore((state) => state.sections);
export const useCalculatorDealDetails = () => useCalculatorStore((state) => state.dealDetails);

// Individual action selectors to avoid object creation
export const useUpdateSectionItem = () => useCalculatorStore((state) => state.updateSectionItem);
export const useAddTemporaryItem = () => useCalculatorStore((state) => state.addTemporaryItem);
export const useUpdateDealDetails = () => useCalculatorStore((state) => state.updateDealDetails);
export const useSaveDeal = () => useCalculatorStore((state) => state.saveDeal);
export const useLoadDeal = () => useCalculatorStore((state) => state.loadDeal);
export const useResetDeal = () => useCalculatorStore((state) => state.resetDeal);
export const useClearTemporaryItems = () => useCalculatorStore((state) => state.clearTemporaryItems);
export const useCalculateTotalCosts = () => useCalculatorStore((state) => state.calculateTotalCosts);
export const useInitializeStore = () => useCalculatorStore((state) => state.initializeStore); 