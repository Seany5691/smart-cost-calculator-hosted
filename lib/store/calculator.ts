import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HardwareItem, ConnectivityItem, LicensingItem, FactorSheet, Scales } from './config';

// Helper function to get auth token directly from localStorage
// This bypasses Zustand hydration timing issues
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const data = JSON.parse(stored);
      return data.token || null;
    }
  } catch (error) {
    console.error('[CALCULATOR] Error reading auth token from localStorage:', error);
  }
  return null;
}

// Deal Details Types
export interface DealDetails {
  customerName: string;
  dealName: string;
  term: 36 | 48 | 60;
  escalation: 0 | 10 | 15;
  distance: number;
  settlement: number;
  customGrossProfit?: number;
}

// Settlement Calculation Types
export interface SettlementCalculation {
  year: number;
  amount: number;
  monthsRemaining: number;
  isCompleted: boolean;
  startDate: Date;
  endDate: Date;
}

export interface SettlementDetails {
  useCalculator: boolean;
  manualAmount: number;
  calculatorInputs?: {
    startDate: Date;
    rentalType: 'starting' | 'current';
    rentalAmount: number;
    escalationRate: 0 | 5 | 10 | 15;
    rentalTerm: 12 | 24 | 36 | 48 | 60;
  };
  calculatedBreakdown?: SettlementCalculation[];
  calculatedTotal?: number;
}

// Selected Items (with quantities)
export interface SelectedHardwareItem extends HardwareItem {
  selectedQuantity: number;
  isTemporary?: boolean;
  showOnProposal?: boolean;
}

export interface SelectedConnectivityItem extends ConnectivityItem {
  selectedQuantity: number;
  isTemporary?: boolean;
  showOnProposal?: boolean;
}

export interface SelectedLicensingItem extends LicensingItem {
  selectedQuantity: number;
  isTemporary?: boolean;
  showOnProposal?: boolean;
}

// Sections Data
export interface SectionsData {
  hardware: SelectedHardwareItem[];
  connectivity: SelectedConnectivityItem[];
  licensing: SelectedLicensingItem[];
}

// Totals Data
export interface TotalsData {
  extensionCount: number;
  hardwareTotal: number;
  installationTotal: number;
  installationBase?: number; // Added for display purposes
  extensionTotal: number;
  fuelTotal: number;
  representativeSettlement: number;
  actualSettlement: number;
  financeFee: number;
  customFinanceFee?: number; // Custom finance fee set by admin
  totalPayout: number;
  grossProfit: number;
  customGrossProfit?: number;
  customInstallationBase?: number; // Custom installation base set by admin
  financeAmount: number;
  factor: number;
  hardwareRental: number;
  connectivityTotal: number;
  licensingTotal: number;
  totalMRC: number;
  totalExVAT: number;
  totalWithVAT: number;
}

// Calculator Step
export type CalculatorStep = 
  | 'deal-details'
  | 'hardware'
  | 'connectivity'
  | 'licensing'
  | 'settlement'
  | 'total-costs';

// Calculator State
interface CalculatorState {
  // Current step
  currentStep: CalculatorStep;
  
  // Deal ID (for persistence)
  dealId: string | null;
  
  // Deal data
  dealDetails: DealDetails;
  sectionsData: SectionsData;
  totalsData: TotalsData;
  settlementDetails: SettlementDetails;
  
  // Saved factors and scales (for deal persistence)
  savedFactors: FactorSheet | null;
  savedScales: Scales | null;
  
  // Original user context (for role preservation)
  originalUserId: string | null;
  originalUsername: string | null;
  originalUserRole: 'admin' | 'manager' | 'user' | null;
  
  // PDF URL
  pdfUrl: string | null;
  
  // Loading states
  isCalculating: boolean;
  isSaving: boolean;
  isGeneratingPDF: boolean;
  
  // Actions - Navigation
  setCurrentStep: (step: CalculatorStep) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (stepNumber: number) => void;
  
  // Actions - Deal Details
  setDealDetails: (details: Partial<DealDetails>) => void;
  
  // Actions - Settlement
  setSettlementDetails: (details: Partial<SettlementDetails>) => void;
  
  // Actions - Hardware
  addHardwareItem: (item: HardwareItem, quantity?: number) => void;
  removeHardwareItem: (itemId: string) => void;
  updateHardwareQuantity: (itemId: string, quantity: number) => void;
  
  // Actions - Connectivity
  addConnectivityItem: (item: ConnectivityItem, quantity?: number) => void;
  removeConnectivityItem: (itemId: string) => void;
  updateConnectivityQuantity: (itemId: string, quantity: number) => void;
  
  // Actions - Licensing
  addLicensingItem: (item: LicensingItem, quantity?: number) => void;
  removeLicensingItem: (itemId: string) => void;
  updateLicensingQuantity: (itemId: string, quantity: number) => void;
  
  // Actions - Totals
  setTotalsData: (totals: Partial<TotalsData>) => void;
  setCustomGrossProfit: (profit: number | undefined) => void;
  
  // Actions - Deal Management
  saveDeal: () => Promise<string | null>; // Returns deal ID or null if not saved
  loadDeal: (dealId: string) => Promise<void>;
  resetCalculator: () => void;
  removeTemporaryItems: () => void;
  
  // Actions - PDF
  generatePDF: () => Promise<string>; // Returns PDF URL
  
  // Actions - Factors and Scales
  setSavedFactors: (factors: FactorSheet) => void;
  setSavedScales: (scales: Scales) => void;
  
  // Actions - Original User Context
  setOriginalUserContext: (userId: string, username: string, role: 'admin' | 'manager' | 'user') => void;
}

// Step order for navigation
const STEP_ORDER: CalculatorStep[] = [
  'deal-details',
  'hardware',
  'connectivity',
  'licensing',
  'settlement',
  'total-costs',
];

// Initial state
const initialDealDetails: DealDetails = {
  customerName: '',
  dealName: '',
  term: 36,
  escalation: 0,
  distance: 0,
  settlement: 0,
};

const initialSectionsData: SectionsData = {
  hardware: [],
  connectivity: [],
  licensing: [],
};

const initialTotalsData: TotalsData = {
  extensionCount: 0,
  hardwareTotal: 0,
  installationTotal: 0,
  extensionTotal: 0,
  fuelTotal: 0,
  representativeSettlement: 0,
  actualSettlement: 0,
  financeFee: 0,
  totalPayout: 0,
  grossProfit: 0,
  customGrossProfit: undefined,
  financeAmount: 0,
  factor: 0,
  hardwareRental: 0,
  connectivityTotal: 0,
  licensingTotal: 0,
  totalMRC: 0,
  totalExVAT: 0,
  totalWithVAT: 0,
};

const initialSettlementDetails: SettlementDetails = {
  useCalculator: false,
  manualAmount: 0,
  calculatorInputs: undefined,
  calculatedBreakdown: undefined,
  calculatedTotal: undefined,
};

export const useCalculatorStore = create<CalculatorState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentStep: 'deal-details',
      dealId: null,
      dealDetails: initialDealDetails,
      sectionsData: initialSectionsData,
      totalsData: initialTotalsData,
      settlementDetails: initialSettlementDetails,
      savedFactors: null,
      savedScales: null,
      originalUserId: null,
      originalUsername: null,
      originalUserRole: null,
      pdfUrl: null,
      isCalculating: false,
      isSaving: false,
      isGeneratingPDF: false,

      // Navigation actions
      setCurrentStep: (step) => {
        set({ currentStep: step });
      },

      nextStep: () => {
        const { currentStep } = get();
        const currentIndex = STEP_ORDER.indexOf(currentStep);
        if (currentIndex < STEP_ORDER.length - 1) {
          set({ currentStep: STEP_ORDER[currentIndex + 1] });
        }
      },

      previousStep: () => {
        const { currentStep } = get();
        const currentIndex = STEP_ORDER.indexOf(currentStep);
        if (currentIndex > 0) {
          set({ currentStep: STEP_ORDER[currentIndex - 1] });
        }
      },

      goToStep: (stepNumber) => {
        if (stepNumber >= 1 && stepNumber <= STEP_ORDER.length) {
          set({ currentStep: STEP_ORDER[stepNumber - 1] });
        }
      },

      // Deal Details actions
      setDealDetails: (details) => {
        set((state) => ({
          dealDetails: { ...state.dealDetails, ...details },
        }));
      },

      // Settlement actions
      setSettlementDetails: (details) => {
        set((state) => ({
          settlementDetails: { ...state.settlementDetails, ...details },
        }));
      },

      // Hardware actions
      addHardwareItem: (item, quantity = 1) => {
        set((state) => {
          // Check if item already exists
          const existingIndex = state.sectionsData.hardware.findIndex(
            (h) => h.id === item.id
          );

          if (existingIndex >= 0) {
            // Update quantity if exists
            const updated = [...state.sectionsData.hardware];
            updated[existingIndex] = {
              ...updated[existingIndex],
              selectedQuantity: updated[existingIndex].selectedQuantity + quantity,
            };
            return {
              sectionsData: {
                ...state.sectionsData,
                hardware: updated,
              },
            };
          } else {
            // Add new item
            return {
              sectionsData: {
                ...state.sectionsData,
                hardware: [
                  ...state.sectionsData.hardware,
                  { ...item, selectedQuantity: quantity },
                ],
              },
            };
          }
        });
      },

      removeHardwareItem: (itemId) => {
        set((state) => ({
          sectionsData: {
            ...state.sectionsData,
            hardware: state.sectionsData.hardware.filter((h) => h.id !== itemId),
          },
        }));
      },

      updateHardwareQuantity: (itemId, quantity) => {
        set((state) => ({
          sectionsData: {
            ...state.sectionsData,
            hardware: state.sectionsData.hardware.map((h) =>
              h.id === itemId ? { ...h, selectedQuantity: quantity } : h
            ),
          },
        }));
      },

      // Connectivity actions
      addConnectivityItem: (item, quantity = 1) => {
        set((state) => {
          const existingIndex = state.sectionsData.connectivity.findIndex(
            (c) => c.id === item.id
          );

          if (existingIndex >= 0) {
            const updated = [...state.sectionsData.connectivity];
            updated[existingIndex] = {
              ...updated[existingIndex],
              selectedQuantity: updated[existingIndex].selectedQuantity + quantity,
            };
            return {
              sectionsData: {
                ...state.sectionsData,
                connectivity: updated,
              },
            };
          } else {
            return {
              sectionsData: {
                ...state.sectionsData,
                connectivity: [
                  ...state.sectionsData.connectivity,
                  { ...item, selectedQuantity: quantity },
                ],
              },
            };
          }
        });
      },

      removeConnectivityItem: (itemId) => {
        set((state) => ({
          sectionsData: {
            ...state.sectionsData,
            connectivity: state.sectionsData.connectivity.filter((c) => c.id !== itemId),
          },
        }));
      },

      updateConnectivityQuantity: (itemId, quantity) => {
        set((state) => ({
          sectionsData: {
            ...state.sectionsData,
            connectivity: state.sectionsData.connectivity.map((c) =>
              c.id === itemId ? { ...c, selectedQuantity: quantity } : c
            ),
          },
        }));
      },

      // Licensing actions
      addLicensingItem: (item, quantity = 1) => {
        set((state) => {
          const existingIndex = state.sectionsData.licensing.findIndex(
            (l) => l.id === item.id
          );

          if (existingIndex >= 0) {
            const updated = [...state.sectionsData.licensing];
            updated[existingIndex] = {
              ...updated[existingIndex],
              selectedQuantity: updated[existingIndex].selectedQuantity + quantity,
            };
            return {
              sectionsData: {
                ...state.sectionsData,
                licensing: updated,
              },
            };
          } else {
            return {
              sectionsData: {
                ...state.sectionsData,
                licensing: [
                  ...state.sectionsData.licensing,
                  { ...item, selectedQuantity: quantity },
                ],
              },
            };
          }
        });
      },

      removeLicensingItem: (itemId) => {
        set((state) => ({
          sectionsData: {
            ...state.sectionsData,
            licensing: state.sectionsData.licensing.filter((l) => l.id !== itemId),
          },
        }));
      },

      updateLicensingQuantity: (itemId, quantity) => {
        set((state) => ({
          sectionsData: {
            ...state.sectionsData,
            licensing: state.sectionsData.licensing.map((l) =>
              l.id === itemId ? { ...l, selectedQuantity: quantity } : l
            ),
          },
        }));
      },

      // Totals actions
      setTotalsData: (totals) => {
        set((state) => ({
          totalsData: { ...state.totalsData, ...totals },
        }));
      },

      setCustomGrossProfit: (profit) => {
        set((state) => ({
          totalsData: { ...state.totalsData, customGrossProfit: profit },
        }));
      },

      // Deal Management actions
      saveDeal: async () => {
        set({ isSaving: true });
        try {
          const state = get();
          
          // Get auth token directly from localStorage (bypasses Zustand hydration issues)
          const token = getAuthToken();
          
          if (!token) {
            throw new Error('Not authenticated');
          }

          const dealData = {
            dealDetails: state.dealDetails,
            sectionsData: state.sectionsData,
            totalsData: state.totalsData,
            settlementDetails: state.settlementDetails,
            factorsData: state.savedFactors,
            scalesData: state.savedScales,
            pdfUrl: state.pdfUrl,
          };

          let response;
          let dealId = state.dealId;

          if (dealId) {
            // Update existing deal (preserves original deal ID)
            response = await fetch(`/api/calculator/deals/${dealId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(dealData),
            });
          } else {
            // Create new deal (generates UUID)
            response = await fetch('/api/calculator/deals', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(dealData),
            });
          }

          if (!response.ok) {
            const error = await response.json();
            // Requirement 16.8: Provide specific error messages
            throw new Error(error.error?.message || `Failed to save deal (${response.status})`);
          }

          const data = await response.json();
          
          // Store the deal ID for future updates
          if (!dealId) {
            dealId = data.id;
            set({ dealId });
          }
          
          console.log('[CALCULATOR] Deal saved successfully:', dealId);
          return dealId;
        } catch (error: any) {
          console.error('[CALCULATOR] Error saving deal:', error);
          // Requirement 16.8: Preserve calculator state on failure
          // State is automatically preserved since we don't clear it on error
          throw error;
        } finally {
          set({ isSaving: false });
        }
      },

      loadDeal: async (dealId) => {
        set({ isCalculating: true });
        try {
          // Get auth token directly from localStorage (bypasses Zustand hydration issues)
          const token = getAuthToken();
          
          if (!token) {
            throw new Error('Not authenticated');
          }

          const response = await fetch(`/api/calculator/deals/${dealId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            const error = await response.json();
            // Requirement 16.8: Provide specific error messages
            if (response.status === 404) {
              throw new Error('Deal not found. The deal may have been deleted or you may not have permission to view it.');
            } else if (response.status === 403) {
              throw new Error('Permission denied. You do not have access to this deal.');
            } else {
              throw new Error(error.error?.message || `Failed to load deal (${response.status})`);
            }
          }

          const data = await response.json();
          
          // Restore calculator state (including deal ID for future saves)
          set({
            dealId: data.id,
            dealDetails: data.dealDetails,
            sectionsData: data.sectionsData,
            totalsData: data.totalsData,
            settlementDetails: data.settlementDetails || initialSettlementDetails,
            savedFactors: data.factorsData,
            savedScales: data.scalesData,
            originalUserId: data.userId,
            originalUsername: data.username,
            originalUserRole: data.userRole,
            pdfUrl: data.pdfUrl || null,
          });
          
          console.log('[CALCULATOR] Deal loaded successfully:', dealId);
        } catch (error: any) {
          console.error('[CALCULATOR] Error loading deal:', error);
          throw error;
        } finally {
          set({ isCalculating: false });
        }
      },

      resetCalculator: () => {
        set({
          currentStep: 'deal-details',
          dealId: null,
          dealDetails: initialDealDetails,
          sectionsData: initialSectionsData,
          totalsData: initialTotalsData,
          settlementDetails: initialSettlementDetails,
          savedFactors: null,
          savedScales: null,
          originalUserId: null,
          originalUsername: null,
          originalUserRole: null,
          pdfUrl: null,
        });
      },

      // Helper function to remove temporary items from all sections
      removeTemporaryItems: () => {
        set((state) => ({
          sectionsData: {
            hardware: state.sectionsData.hardware.filter((item) => !item.isTemporary),
            connectivity: state.sectionsData.connectivity.filter((item) => !item.isTemporary),
            licensing: state.sectionsData.licensing.filter((item) => !item.isTemporary),
          },
        }));
      },

      // PDF actions
      generatePDF: async () => {
        set({ isGeneratingPDF: true });
        try {
          const state = get();
          
          // Get auth token directly from localStorage (bypasses Zustand hydration issues)
          const token = getAuthToken();
          
          if (!token) {
            throw new Error('Not authenticated');
          }

          const response = await fetch('/api/calculator/pdf', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              dealDetails: state.dealDetails,
              sectionsData: state.sectionsData,
              totalsData: state.totalsData,
              settlementDetails: state.settlementDetails,
              factorsData: state.savedFactors,
              scalesData: state.savedScales,
              originalUserRole: state.originalUserRole,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            // Requirement 12.7: Provide specific error messages for PDF generation
            throw new Error(error.error?.message || `Failed to generate PDF (${response.status})`);
          }

          const data = await response.json();
          set({ pdfUrl: data.pdfUrl });
          console.log('[CALCULATOR] PDF generated successfully:', data.pdfUrl);
          return data.pdfUrl;
        } catch (error: any) {
          console.error('[CALCULATOR] Error generating PDF:', error);
          throw error;
        } finally {
          set({ isGeneratingPDF: false });
        }
      },

      // Factors and Scales actions
      setSavedFactors: (factors) => {
        set({ savedFactors: factors });
      },

      setSavedScales: (scales) => {
        set({ savedScales: scales });
      },

      // Original User Context actions
      setOriginalUserContext: (userId, username, role) => {
        set({
          originalUserId: userId,
          originalUsername: username,
          originalUserRole: role,
        });
      },
    }),
    {
      name: 'calculator-storage',
      partialize: (state) => ({
        // Persist calculator state
        currentStep: state.currentStep,
        dealId: state.dealId,
        dealDetails: state.dealDetails,
        sectionsData: state.sectionsData,
        totalsData: state.totalsData,
        settlementDetails: state.settlementDetails,
        savedFactors: state.savedFactors,
        savedScales: state.savedScales,
        originalUserId: state.originalUserId,
        originalUsername: state.originalUsername,
        originalUserRole: state.originalUserRole,
        pdfUrl: state.pdfUrl,
      }),
    }
  )
);

// Keyboard shortcut handler
export const setupCalculatorKeyboardShortcuts = () => {
  if (typeof window === 'undefined') return;

  const handleKeyDown = (event: KeyboardEvent) => {
    const store = useCalculatorStore.getState();
    
    // Arrow keys for navigation
    if (event.key === 'ArrowRight' && !event.ctrlKey && !event.metaKey) {
      // Check if not in an input field
      const target = event.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        store.nextStep();
      }
    } else if (event.key === 'ArrowLeft' && !event.ctrlKey && !event.metaKey) {
      const target = event.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        store.previousStep();
      }
    }
    
    // Number keys 1-6 for direct navigation
    if (event.key >= '1' && event.key <= '6' && !event.ctrlKey && !event.metaKey) {
      const target = event.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        store.goToStep(parseInt(event.key));
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
};
