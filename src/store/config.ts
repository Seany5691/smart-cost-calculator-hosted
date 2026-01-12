import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Item, FactorData, EnhancedFactorData, Scales, EnhancedScales } from '@/lib/types';

interface ConfigState {
  hardware: Item[];
  connectivity: Item[];
  licensing: Item[];
  factors: FactorData | EnhancedFactorData;
  scales: Scales | EnhancedScales;
  
  // Actions
  updateHardware: (items: Item[]) => Promise<void>;
  updateConnectivity: (items: Item[]) => Promise<void>;
  updateLicensing: (items: Item[]) => Promise<void>;
  updateFactors: (factors: FactorData | EnhancedFactorData) => Promise<void>;
  updateScales: (scales: Scales | EnhancedScales) => Promise<void>;
  
  // Load from API (read-only)
  loadFromAPI: () => Promise<void>;
  
  // Force refresh from database
  refreshFromDatabase: () => Promise<void>;
  
  // Global sync functions (for backward compatibility)
  syncToGlobalStorage: () => void;
  loadFromGlobalStorage: () => boolean;
}

// Default configurations
const DEFAULT_HARDWARE: Item[] = [
  { id: "hw1", name: "Desk Phone B&W", cost: 1054, quantity: 0, isExtension: true, displayOrder: 0 },
  { id: "hw2", name: "Desk Phone Colour", cost: 1378, quantity: 0, isExtension: true, displayOrder: 1 },
  { id: "hw3", name: "Switchboard Colour", cost: 2207, quantity: 0, isExtension: true, displayOrder: 2 },
  { id: "hw4", name: "Cordless Phone", cost: 2420, quantity: 0, isExtension: true, displayOrder: 3 },
  { id: "hw5", name: "Bluetooth Headset Mono", cost: 1996, quantity: 0, isExtension: false, displayOrder: 4 },
  { id: "hw6", name: "Bluetooth Headset Dual", cost: 2340, quantity: 0, isExtension: false, displayOrder: 5 },
  { id: "hw7", name: "Corded Headset Dual", cost: 1467, quantity: 0, isExtension: false, displayOrder: 6 },
  { id: "hw8", name: "Cellphone", cost: 7500, quantity: 0, isExtension: false, displayOrder: 7 },
  { id: "hw9", name: "4 Port PoE", cost: 644, quantity: 0, isExtension: false, displayOrder: 8 },
  { id: "hw10", name: "8 Port PoE", cost: 813, quantity: 0, isExtension: false, displayOrder: 9 },
  { id: "hw11", name: "16 Port PoE", cost: 2282, quantity: 0, isExtension: false, displayOrder: 10 },
  { id: "hw12", name: "8 Port Managed PoE", cost: 1657, quantity: 0, isExtension: false, displayOrder: 11 },
  { id: "hw13", name: "16 Port Managed PoE", cost: 2994, quantity: 0, isExtension: false, displayOrder: 12 },
  { id: "hw14", name: "Access Point Gigabit", cost: 1350, quantity: 0, isExtension: false, displayOrder: 13 },
  { id: "hw15", name: "Cloud Router WAN2", cost: 1613, quantity: 0, isExtension: false, displayOrder: 14 },
  { id: "hw16", name: "5G/LTE Router", cost: 1800, quantity: 0, isExtension: false, displayOrder: 15 },
  { id: "hw17", name: "PC", cost: 9000, quantity: 0, isExtension: false, displayOrder: 16 },
  { id: "hw18", name: "A4 Copier", cost: 17000, quantity: 0, isExtension: false, displayOrder: 17 },
  { id: "hw19", name: "Server Cabinet", cost: 1466.25, quantity: 0, isExtension: false, displayOrder: 18 },
  { id: "hw20", name: "Additional Mobile App", cost: 0, quantity: 0, isExtension: false, displayOrder: 19 },
  { id: "hw21", name: "Additional App on Own Device", cost: 0, quantity: 0, isExtension: false, displayOrder: 20 },
  { id: "hw22", name: "Number Porting Per Number", cost: 200, quantity: 0, isExtension: false, displayOrder: 21 }
];

const DEFAULT_CONNECTIVITY: Item[] = [
  { id: "conn1", name: "LTE", cost: 599, managerCost: 599, userCost: 599, quantity: 0, displayOrder: 0 },
  { id: "conn2", name: "Fibre", cost: 599, managerCost: 599, userCost: 599, quantity: 0, displayOrder: 1 },
  { id: "conn3", name: "Melon Sim Card", cost: 350, managerCost: 350, userCost: 350, quantity: 0, displayOrder: 2 }
];

const DEFAULT_LICENSING: Item[] = [
  { id: "lic1", name: "Premium License", cost: 90, managerCost: 90, userCost: 90, quantity: 0, displayOrder: 0 },
  { id: "lic2", name: "Service Level Agreement (0 - 5 users)", cost: 299, managerCost: 299, userCost: 299, quantity: 0, displayOrder: 1 },
  { id: "lic3", name: "Service Level Agreement (6 - 10 users)", cost: 399, managerCost: 399, userCost: 399, quantity: 0, displayOrder: 2 },
  { id: "lic4", name: "Service Level Agreement (11 users or more)", cost: 499, managerCost: 499, userCost: 499, quantity: 0, displayOrder: 3 }
];

const DEFAULT_FACTORS: FactorData = {
  "36_months": {
    "0%": {
      "0-20000": 0.03814,
      "20001-50000": 0.03814,
      "50001-100000": 0.03755,
      "100000+": 0.03707
    },
    "10%": {
      "0-20000": 0.03511,
      "20001-50000": 0.03511,
      "50001-100000": 0.03454,
      "100000+": 0.03409
    },
    "15%": {
      "0-20000": 0.04133,
      "20001-50000": 0.04003,
      "50001-100000": 0.03883,
      "100000+": 0.03803
    }
  },
  "48_months": {
    "0%": {
      "0-20000": 0.03155,
      "20001-50000": 0.03155,
      "50001-100000": 0.03093,
      "100000+": 0.03043
    },
    "10%": {
      "0-20000": 0.02805,
      "20001-50000": 0.02805,
      "50001-100000": 0.02741,
      "100000+": 0.02694
    },
    "15%": {
      "0-20000": 0.03375,
      "20001-50000": 0.03245,
      "50001-100000": 0.03125,
      "100000+": 0.03045
    }
  },
  "60_months": {
    "0%": {
      "0-20000": 0.02772,
      "20001-50000": 0.02772,
      "50001-100000": 0.02705,
      "100000+": 0.02658
    },
    "10%": {
      "0-20000": 0.02327,
      "20001-50000": 0.02327,
      "50001-100000": 0.02315,
      "100000+": 0.02267
    },
    "15%": {
      "0-20000": 0.02937,
      "20001-50000": 0.02807,
      "50001-100000": 0.02687,
      "100000+": 0.02607
    }
  }
};

const DEFAULT_SCALES: Scales = {
  installation: {
    "0-4": 3500,
    "5-8": 3500,
    "9-16": 7000,
    "17-32": 10500,
    "33+": 15000
  },
  finance_fee: {
    "0-20000": 1800,
    "20001-50000": 1800,
    "50001-100000": 2800,
    "100001+": 3800
  },
  gross_profit: {
    "0-4": 10000,
    "5-8": 15000,
    "9-16": 20000,
    "17-32": 25000,
    "33+": 30000
  },
  additional_costs: {
    cost_per_kilometer: 1.5,
    cost_per_point: 750
  }
};

// Global storage key for cross-browser synchronization (backward compatibility)
const GLOBAL_CONFIG_KEY = 'smart-cost-calculator-global-config';

// Enhanced validation function
const validateConfigData = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;
  
  // Check if all required properties exist
  const requiredProps = ['hardware', 'connectivity', 'licensing', 'factors', 'scales'];
  for (const prop of requiredProps) {
    if (!data[prop]) return false;
  }
  
  // Validate scales structure
  if (!data.scales.additional_costs || 
      typeof data.scales.additional_costs.cost_per_kilometer !== 'number' ||
      typeof data.scales.additional_costs.cost_per_point !== 'number') {
    return false;
  }
  
  // Validate arrays
  if (!Array.isArray(data.hardware) || !Array.isArray(data.connectivity) || !Array.isArray(data.licensing)) {
    return false;
  }
  
  return true;
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      hardware: DEFAULT_HARDWARE,
      connectivity: DEFAULT_CONNECTIVITY,
      licensing: DEFAULT_LICENSING,
      factors: DEFAULT_FACTORS,
      scales: DEFAULT_SCALES,

      updateHardware: async (items: Item[]) => {
        try {
          // Update database
          const response = await fetch('/api/config/hardware', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(items),
          });
          
          if (!response.ok) {
            throw new Error('Failed to save hardware config to database');
          }
          
          // Update local state
          set({ hardware: items });
          
          // Sync to global storage for backward compatibility
          get().syncToGlobalStorage();
        } catch (error) {
          console.error('Error updating hardware config:', error);
          throw error;
        }
      },
      
      updateConnectivity: async (items: Item[]) => {
        try {
          // Update database
          const response = await fetch('/api/config/connectivity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(items),
          });
          
          if (!response.ok) {
            throw new Error('Failed to save connectivity config to database');
          }
          
          // Update local state
          set({ connectivity: items });
          
          // Sync to global storage for backward compatibility
          get().syncToGlobalStorage();
        } catch (error) {
          console.error('Error updating connectivity config:', error);
          throw error;
        }
      },
      
      updateLicensing: async (items: Item[]) => {
        try {
          // Update database
          const response = await fetch('/api/config/licensing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(items),
          });
          
          if (!response.ok) {
            throw new Error('Failed to save licensing config to database');
          }
          
          // Update local state
          set({ licensing: items });
          
          // Sync to global storage for backward compatibility
          get().syncToGlobalStorage();
        } catch (error) {
          console.error('Error updating licensing config:', error);
          throw error;
        }
      },
      
      updateFactors: async (factors: FactorData | EnhancedFactorData) => {
        try {
          // Update database
          const response = await fetch('/api/config/factors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(factors),
          });
          
          if (!response.ok) {
            throw new Error('Failed to save factors config to database');
          }
          
          // Update local state
          set({ factors });
          
          // Sync to global storage for backward compatibility
          get().syncToGlobalStorage();
        } catch (error) {
          console.error('Error updating factors config:', error);
          throw error;
        }
      },
      
      updateScales: async (scales: Scales | EnhancedScales) => {
        try {
          // Update database
          const response = await fetch('/api/config/scales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(scales),
          });
          
          if (!response.ok) {
            throw new Error('Failed to save scales config to database');
          }
          
          // Sync to global storage for backward compatibility
          get().syncToGlobalStorage();
          
          // Update local state
          set({ scales });
        } catch (error) {
          console.error('Error updating scales config:', error);
          throw error;
        }
      },
      
      loadFromAPI: async () => {
        try {
          
          // Always load from database API first for real-time data
          // Only fall back to global storage if database fails
          
          // Load from database API
          const [hardwareRes, connectivityRes, licensingRes, factorsRes, scalesRes] = await Promise.allSettled([
            fetch('/api/config/hardware'),
            fetch('/api/config/connectivity'),
            fetch('/api/config/licensing'),
            fetch('/api/config/factors'),
            fetch('/api/config/scales')
          ]);

          // Log any API failures
          if (connectivityRes.status === 'rejected') {
            console.error('Connectivity API failed:', connectivityRes.reason);
          }
          if (hardwareRes.status === 'rejected') {
            console.error('Hardware API failed:', hardwareRes.reason);
          }
          if (licensingRes.status === 'rejected') {
            console.error('Licensing API failed:', licensingRes.reason);
          }

          let hardware = DEFAULT_HARDWARE;
          let connectivity = DEFAULT_CONNECTIVITY;
          let licensing = DEFAULT_LICENSING;
          let factors = DEFAULT_FACTORS;
          let scales = DEFAULT_SCALES;

          // Process API responses
          if (hardwareRes.status === 'fulfilled' && hardwareRes.value.ok) {
            try {
              const apiHardware = await hardwareRes.value.json();
              if (Array.isArray(apiHardware) && apiHardware.length > 0) {
                // Sort by displayOrder, then by name
                hardware = apiHardware.sort((a, b) => {
                  const orderA = a.displayOrder ?? 0;
                  const orderB = b.displayOrder ?? 0;
                  if (orderA !== orderB) return orderA - orderB;
                  return a.name.localeCompare(b.name);
                });
              }
            } catch (e) {
              console.warn('Invalid hardware data from database API, using defaults');
            }
          }
          
          if (connectivityRes.status === 'fulfilled' && connectivityRes.value.ok) {
            try {
              const apiConnectivity = await connectivityRes.value.json();
              
              if (Array.isArray(apiConnectivity) && apiConnectivity.length > 0) {
                // Sort by displayOrder, then by name
                connectivity = apiConnectivity.sort((a, b) => {
                  const orderA = a.displayOrder ?? 0;
                  const orderB = b.displayOrder ?? 0;
                  if (orderA !== orderB) return orderA - orderB;
                  return a.name.localeCompare(b.name);
                });
              }
            } catch (e) {
              console.warn('Invalid connectivity data from database API, using defaults');
            }
          }
          
          if (licensingRes.status === 'fulfilled' && licensingRes.value.ok) {
            try {
              const apiLicensing = await licensingRes.value.json();
              if (Array.isArray(apiLicensing) && apiLicensing.length > 0) {
                // Sort by displayOrder, then by name
                licensing = apiLicensing.sort((a, b) => {
                  const orderA = a.displayOrder ?? 0;
                  const orderB = b.displayOrder ?? 0;
                  if (orderA !== orderB) return orderA - orderB;
                  return a.name.localeCompare(b.name);
                });
              }
            } catch (e) {
              console.warn('Invalid licensing data from database API, using defaults');
            }
          }
          
          if (factorsRes.status === 'fulfilled' && factorsRes.value.ok) {
            try {
              const apiFactors = await factorsRes.value.json();
              if (apiFactors && typeof apiFactors === 'object') {
                factors = apiFactors;
              }
            } catch (e) {
              console.warn('Invalid factors data from database API, using defaults');
            }
          }
          
          if (scalesRes.status === 'fulfilled' && scalesRes.value.ok) {
            try {
              const apiScales = await scalesRes.value.json();
              if (apiScales && typeof apiScales === 'object') {
                // Validate that we have the required structure
                if (apiScales.additional_costs && 
                    typeof apiScales.additional_costs.cost_per_kilometer === 'number' &&
                    typeof apiScales.additional_costs.cost_per_point === 'number') {
                  scales = apiScales;
                } else {
                  console.warn('Scales data missing required additional_costs, using defaults');
                }
              }
            } catch (e) {
              console.warn('Invalid scales data from database API, using defaults');
            }
          }

          set({
            hardware,
            connectivity,
            licensing,
            factors,
            scales
          });
          
          // Sync the loaded data to global storage for backward compatibility
          get().syncToGlobalStorage();
        } catch (error) {
          console.error('Error loading config from database API:', error);
          
          // Try to load from global storage as fallback
          const globalLoaded = get().loadFromGlobalStorage();
          if (!globalLoaded) {
            // Set defaults if both database and global storage fail
            set({
              hardware: DEFAULT_HARDWARE,
              connectivity: DEFAULT_CONNECTIVITY,
              licensing: DEFAULT_LICENSING,
              factors: DEFAULT_FACTORS,
              scales: DEFAULT_SCALES
            });
          }
        }
      },

      refreshFromDatabase: async () => {
        // Clear localStorage to force fresh load from database
        if (typeof window !== 'undefined') {
          localStorage.removeItem('config-storage');
        }
        await get().loadFromAPI();
      },
      
      syncToGlobalStorage: () => {
        if (typeof window !== 'undefined') {
          try {
            const state = get();
            const globalData = {
              hardware: state.hardware,
              connectivity: state.connectivity,
              licensing: state.licensing,
              factors: state.factors,
              scales: state.scales,
              lastUpdated: new Date().toISOString(),
              version: '1.0'
            };
            
            // Validate data before saving
            if (validateConfigData(globalData)) {
              localStorage.setItem(GLOBAL_CONFIG_KEY, JSON.stringify(globalData));
            } else {
              console.error('Invalid config data, not syncing to global storage');
            }
          } catch (error) {
            console.error('Error syncing to global storage:', error);
          }
        }
      },

      loadFromGlobalStorage: () => {
        if (typeof window !== 'undefined') {
          try {
            const globalData = localStorage.getItem(GLOBAL_CONFIG_KEY);
            if (globalData) {
              const parsed = JSON.parse(globalData);
              
              // Validate the loaded data
              if (validateConfigData(parsed)) {
                set({
                  hardware: parsed.hardware || DEFAULT_HARDWARE,
                  connectivity: parsed.connectivity || DEFAULT_CONNECTIVITY,
                  licensing: parsed.licensing || DEFAULT_LICENSING,
                  factors: parsed.factors || DEFAULT_FACTORS,
                  scales: parsed.scales || DEFAULT_SCALES
                });
                return true;
              } else {
                console.warn('Invalid config data in global storage, using defaults');
                return false;
              }
            }
          } catch (error) {
            console.error('Error loading from global storage:', error);
          }
        }
        return false;
      },
    }),
    {
      name: 'config-storage',
    }
  )
);

// Optimized selectors for better performance
// Use simple property access to avoid creating new objects on every render
export const useConfigHardware = () => useConfigStore((state) => state.hardware);
export const useConfigConnectivity = () => useConfigStore((state) => state.connectivity);
export const useConfigLicensing = () => useConfigStore((state) => state.licensing);
export const useConfigFactors = () => useConfigStore((state) => state.factors);
export const useConfigScales = () => useConfigStore((state) => state.scales);

// Individual action selectors to avoid object creation
export const useConfigUpdateHardware = () => useConfigStore((state) => state.updateHardware);
export const useConfigUpdateConnectivity = () => useConfigStore((state) => state.updateConnectivity);
export const useConfigUpdateLicensing = () => useConfigStore((state) => state.updateLicensing);
export const useConfigUpdateFactors = () => useConfigStore((state) => state.updateFactors);
export const useConfigUpdateScales = () => useConfigStore((state) => state.updateScales);
export const useConfigLoadFromAPI = () => useConfigStore((state) => state.loadFromAPI);
export const useConfigRefreshFromDatabase = () => useConfigStore((state) => state.refreshFromDatabase); 