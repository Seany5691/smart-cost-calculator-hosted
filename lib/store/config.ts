import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types for configuration items
export interface HardwareItem {
  id: string;
  name: string;
  cost: number;
  managerCost: number;
  userCost: number;
  quantity: number;
  locked: boolean;
  isExtension: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectivityItem {
  id: string;
  name: string;
  cost: number;
  managerCost: number;
  userCost: number;
  quantity: number;
  locked: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LicensingItem {
  id: string;
  name: string;
  cost: number;
  managerCost: number;
  userCost: number;
  quantity: number;
  locked: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// Factor Sheet Types
export interface FactorSheet {
  [term: string]: {
    [escalation: string]: {
      [settlementBand: string]: number;
    };
  };
}

// Enhanced Factor Sheet with role-based pricing
export interface EnhancedFactorSheet {
  cost: {
    [term: string]: {
      [escalation: string]: {
        [settlementBand: string]: number;
      };
    };
  };
  managerFactors: {
    [term: string]: {
      [escalation: string]: {
        [settlementBand: string]: number;
      };
    };
  };
  userFactors: {
    [term: string]: {
      [escalation: string]: {
        [settlementBand: string]: number;
      };
    };
  };
}

// Union type for both factor sheet formats
export type AnyFactorSheet = FactorSheet | EnhancedFactorSheet;

// Scales Types
export interface Scales {
  installation: {
    [pointRange: string]: {
      cost: number;
      managerCost: number;
      userCost: number;
    };
  };
  finance_fee: {
    [amountRange: string]: {
      cost: number;
      managerCost: number;
      userCost: number;
    };
  };
  gross_profit: {
    [pointRange: string]: {
      cost: number;
      managerCost: number;
      userCost: number;
    };
  };
  additional_costs: {
    cost_per_kilometer: number;
    cost_per_point: number;
    manager_cost_per_kilometer: number;
    manager_cost_per_point: number;
    user_cost_per_kilometer: number;
    user_cost_per_point: number;
  };
}

// Cache entry type
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Configuration store state
interface ConfigState {
  hardware: HardwareItem[];
  hardwareCache: CacheEntry<HardwareItem[]> | null;
  connectivity: ConnectivityItem[];
  connectivityCache: CacheEntry<ConnectivityItem[]> | null;
  licensing: LicensingItem[];
  licensingCache: CacheEntry<LicensingItem[]> | null;
  factors: FactorSheet | null;
  factorsCache: CacheEntry<FactorSheet> | null;
  scales: Scales | null;
  scalesCache: CacheEntry<Scales> | null;
  cacheTTL: number;
  isLoadingHardware: boolean;
  isLoadingConnectivity: boolean;
  isLoadingLicensing: boolean;
  isLoadingFactors: boolean;
  isLoadingScales: boolean;
  
  setHardware: (items: HardwareItem[]) => void;
  setConnectivity: (items: ConnectivityItem[]) => void;
  setLicensing: (items: LicensingItem[]) => void;
  setFactors: (factors: FactorSheet) => void;
  setScales: (scales: Scales) => void;
  isCacheValid: (timestamp: number) => boolean;
  invalidateHardwareCache: () => void;
  invalidateConnectivityCache: () => void;
  invalidateLicensingCache: () => void;
  invalidateFactorsCache: () => void;
  invalidateScalesCache: () => void;
  invalidateAllCaches: () => void;
  fetchHardware: (token?: string | null) => Promise<HardwareItem[]>;
  fetchConnectivity: (token?: string | null) => Promise<ConnectivityItem[]>;
  fetchLicensing: (token?: string | null) => Promise<LicensingItem[]>;
  fetchFactors: (token?: string | null) => Promise<FactorSheet>;
  fetchScales: (token?: string | null) => Promise<Scales>;
  updateFactors: (factorsData: any, token: string) => Promise<void>;
  updateScales: (scalesData: any, token: string) => Promise<void>;
  initializeConfigs: (token?: string | null) => Promise<void>;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      hardware: [],
      hardwareCache: null,
      connectivity: [],
      connectivityCache: null,
      licensing: [],
      licensingCache: null,
      factors: null,
      factorsCache: null,
      scales: null,
      scalesCache: null,
      cacheTTL: 5 * 60 * 1000,
      isLoadingHardware: false,
      isLoadingConnectivity: false,
      isLoadingLicensing: false,
      isLoadingFactors: false,
      isLoadingScales: false,

      setHardware: (items) => {
        set({
          hardware: items,
          hardwareCache: { data: items, timestamp: Date.now() },
        });
      },

      setConnectivity: (items) => {
        set({
          connectivity: items,
          connectivityCache: { data: items, timestamp: Date.now() },
        });
      },

      setLicensing: (items) => {
        set({
          licensing: items,
          licensingCache: { data: items, timestamp: Date.now() },
        });
      },

      setFactors: (factors) => {
        set({
          factors,
          factorsCache: { data: factors, timestamp: Date.now() },
        });
      },

      setScales: (scales) => {
        set({
          scales,
          scalesCache: { data: scales, timestamp: Date.now() },
        });
      },

      isCacheValid: (timestamp) => {
        const { cacheTTL } = get();
        return Date.now() - timestamp < cacheTTL;
      },

      invalidateHardwareCache: () => set({ hardwareCache: null }),
      invalidateConnectivityCache: () => set({ connectivityCache: null }),
      invalidateLicensingCache: () => set({ licensingCache: null }),
      invalidateFactorsCache: () => set({ factorsCache: null }),
      invalidateScalesCache: () => set({ scalesCache: null }),
      invalidateAllCaches: () => {
        set({
          hardwareCache: null,
          connectivityCache: null,
          licensingCache: null,
          factorsCache: null,
          scalesCache: null,
        });
      },

      fetchHardware: async (token?: string | null) => {
        const { hardwareCache, isCacheValid, setHardware } = get();
        if (hardwareCache && isCacheValid(hardwareCache.timestamp)) {
          return hardwareCache.data;
        }

        set({ isLoadingHardware: true });
        try {
          const headers: HeadersInit = { 'Content-Type': 'application/json' };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const response = await fetch('/api/config/hardware', { headers });
          if (!response.ok) {
            console.error(`Hardware fetch failed: ${response.status} ${response.statusText}`);
            throw new Error('Failed to fetch hardware items');
          }
          const rawData = await response.json();
          // Ensure numeric fields are properly typed
          const data = rawData.map((item: any) => ({
            ...item,
            cost: parseFloat(item.cost) || 0,
            managerCost: parseFloat(item.managerCost) || 0,
            userCost: parseFloat(item.userCost) || 0,
            quantity: parseInt(item.quantity) || 0,
            displayOrder: parseInt(item.displayOrder) || 0,
          }));
          setHardware(data);
          return data;
        } catch (error) {
          console.error('Error fetching hardware:', error);
          const stored = localStorage.getItem('hardware-items');
          if (stored) {
            const data = JSON.parse(stored);
            setHardware(data);
            return data;
          }
          throw error;
        } finally {
          set({ isLoadingHardware: false });
        }
      },

      fetchConnectivity: async (token?: string | null) => {
        const { connectivityCache, isCacheValid, setConnectivity } = get();
        if (connectivityCache && isCacheValid(connectivityCache.timestamp)) {
          return connectivityCache.data;
        }

        set({ isLoadingConnectivity: true });
        try {
          const headers: HeadersInit = { 'Content-Type': 'application/json' };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const response = await fetch('/api/config/connectivity', { headers });
          if (!response.ok) throw new Error('Failed to fetch connectivity items');
          const rawData = await response.json();
          // Ensure numeric fields are properly typed
          const data = rawData.map((item: any) => ({
            ...item,
            cost: parseFloat(item.cost) || 0,
            managerCost: parseFloat(item.managerCost) || 0,
            userCost: parseFloat(item.userCost) || 0,
            quantity: parseInt(item.quantity) || 0,
            displayOrder: parseInt(item.displayOrder) || 0,
          }));
          setConnectivity(data);
          return data;
        } catch (error) {
          console.error('Error fetching connectivity:', error);
          const stored = localStorage.getItem('connectivity-items');
          if (stored) {
            const data = JSON.parse(stored);
            setConnectivity(data);
            return data;
          }
          throw error;
        } finally {
          set({ isLoadingConnectivity: false });
        }
      },

      fetchLicensing: async (token?: string | null) => {
        const { licensingCache, isCacheValid, setLicensing } = get();
        if (licensingCache && isCacheValid(licensingCache.timestamp)) {
          return licensingCache.data;
        }

        set({ isLoadingLicensing: true });
        try {
          const headers: HeadersInit = { 'Content-Type': 'application/json' };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const response = await fetch('/api/config/licensing', { headers });
          if (!response.ok) throw new Error('Failed to fetch licensing items');
          const rawData = await response.json();
          // Ensure numeric fields are properly typed
          const data = rawData.map((item: any) => ({
            ...item,
            cost: parseFloat(item.cost) || 0,
            managerCost: parseFloat(item.managerCost) || 0,
            userCost: parseFloat(item.userCost) || 0,
            quantity: parseInt(item.quantity) || 0,
            displayOrder: parseInt(item.displayOrder) || 0,
          }));
          setLicensing(data);
          return data;
        } catch (error) {
          console.error('Error fetching licensing:', error);
          const stored = localStorage.getItem('licensing-items');
          if (stored) {
            const data = JSON.parse(stored);
            setLicensing(data);
            return data;
          }
          throw error;
        } finally {
          set({ isLoadingLicensing: false });
        }
      },

      fetchFactors: async (token?: string | null) => {
        const { factorsCache, isCacheValid, setFactors } = get();
        if (factorsCache && isCacheValid(factorsCache.timestamp)) {
          return factorsCache.data;
        }

        set({ isLoadingFactors: true });
        
        // Requirement 11.2: Retry up to 3 times with 1 second delay between attempts
        const maxRetries = 3;
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) {
              headers['Authorization'] = `Bearer ${token}`;
            }
            
            console.log(`[CONFIG] Fetching factors (attempt ${attempt}/${maxRetries})...`);
            const response = await fetch('/api/config/factors', { headers });
            if (!response.ok) throw new Error('Failed to fetch factors');
            const data = await response.json();
            setFactors(data);
            console.log('[CONFIG] Factors loaded successfully');
            return data;
          } catch (error) {
            console.error(`[CONFIG] Error fetching factors (attempt ${attempt}/${maxRetries}):`, error);
            lastError = error as Error;
            
            // If not the last attempt, wait 1 second before retrying
            if (attempt < maxRetries) {
              console.log(`[CONFIG] Retrying in 1 second...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        // All retries failed, try localStorage fallback
        console.log('[CONFIG] All retries failed, checking localStorage...');
        const stored = localStorage.getItem('factors-data');
        if (stored) {
          console.log('[CONFIG] Using cached factors from localStorage');
          const data = JSON.parse(stored);
          setFactors(data);
          set({ isLoadingFactors: false });
          return data;
        }
        
        // No fallback available
        set({ isLoadingFactors: false });
        throw new Error('Failed to load factors after 3 attempts. Please refresh the page.');
      },

      fetchScales: async (token?: string | null) => {
        const { scalesCache, isCacheValid, setScales } = get();
        if (scalesCache && isCacheValid(scalesCache.timestamp)) {
          return scalesCache.data;
        }

        set({ isLoadingScales: true });
        
        // Requirement 11.2: Retry up to 3 times with 1 second delay between attempts
        const maxRetries = 3;
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) {
              headers['Authorization'] = `Bearer ${token}`;
            }
            
            console.log(`[CONFIG] Fetching scales (attempt ${attempt}/${maxRetries})...`);
            const response = await fetch('/api/config/scales', { headers });
            if (!response.ok) throw new Error('Failed to fetch scales');
            const data = await response.json();
            
            // Requirement 11.4: Verify required fields exist (allow zero values)
            if (data.additional_costs?.cost_per_kilometer === undefined || 
                data.additional_costs?.cost_per_kilometer === null ||
                data.additional_costs?.cost_per_point === undefined ||
                data.additional_costs?.cost_per_point === null) {
              throw new Error('Scales data is missing required fields: cost_per_kilometer or cost_per_point');
            }
            
            setScales(data);
            console.log('[CONFIG] Scales loaded successfully');
            return data;
          } catch (error) {
            console.error(`[CONFIG] Error fetching scales (attempt ${attempt}/${maxRetries}):`, error);
            lastError = error as Error;
            
            // If not the last attempt, wait 1 second before retrying
            if (attempt < maxRetries) {
              console.log(`[CONFIG] Retrying in 1 second...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        // All retries failed, try localStorage fallback
        console.log('[CONFIG] All retries failed, checking localStorage...');
        const stored = localStorage.getItem('scales-data');
        if (stored) {
          console.log('[CONFIG] Using cached scales from localStorage');
          const data = JSON.parse(stored);
          setScales(data);
          set({ isLoadingScales: false });
          return data;
        }
        
        // No fallback available
        set({ isLoadingScales: false });
        throw new Error('Failed to load scales after 3 attempts. Please refresh the page.');
      },

      updateFactors: async (factorsData: any, token: string) => {
        try {
          console.log('[CONFIG] Updating factors...');
          const response = await fetch('/api/config/factors', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(factorsData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update factors');
          }

          const updatedData = await response.json();
          
          // Update the store with the new data
          set({
            factors: updatedData,
            factorsCache: { data: updatedData, timestamp: Date.now() },
          });
          
          console.log('[CONFIG] Factors updated successfully');
        } catch (error) {
          console.error('[CONFIG] Error updating factors:', error);
          throw error;
        }
      },

      updateScales: async (scalesData: any, token: string) => {
        try {
          console.log('[CONFIG] Updating scales...');
          const response = await fetch('/api/config/scales', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(scalesData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update scales');
          }

          const updatedData = await response.json();
          
          // Update the store with the new data
          set({
            scales: updatedData,
            scalesCache: { data: updatedData, timestamp: Date.now() },
          });
          
          console.log('[CONFIG] Scales updated successfully');
        } catch (error) {
          console.error('[CONFIG] Error updating scales:', error);
          throw error;
        }
      },

      initializeConfigs: async (token?: string | null) => {
        const { fetchHardware, fetchConnectivity, fetchLicensing, fetchFactors, fetchScales } = get();
        try {
          await Promise.all([
            fetchHardware(token),
            fetchConnectivity(token),
            fetchLicensing(token),
            fetchFactors(token),
            fetchScales(token),
          ]);
        } catch (error) {
          console.error('Error initializing configs:', error);
          throw error;
        }
      },
    }),
    {
      name: 'config-storage',
      partialize: (state) => ({
        hardware: state.hardware,
        connectivity: state.connectivity,
        licensing: state.licensing,
        factors: state.factors,
        scales: state.scales,
      }),
    }
  )
);
