export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'manager' | 'user';
  name: string;
  email: string;
  isActive: boolean;
  requiresPasswordChange: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Item {
  id: string;
  name: string;
  cost: number;
  costPrice?: number;
  managerCost?: number;
  userCost?: number;
  quantity: number;
  locked?: boolean;
  isExtension?: boolean;
  displayOrder?: number;
  showOnProposal?: boolean;
  isTemporary?: boolean;
}

export interface Section {
  id: string;
  name: string;
  items: Item[];
}

export interface DealDetails {
  customerName: string;
  term: number;
  escalation: number;
  distanceToInstall: number;
  settlement: number;
  settlementStartDate?: string;
  settlementRentalAmount?: number;
  settlementEscalationRate?: number;
  settlementRentalType?: 'starting' | 'current';
  customGrossProfit?: number | null;
}

export interface FactorData {
  [term: string]: {
    [escalation: string]: {
      [financeRange: string]: number;
    };
  };
}

export interface EnhancedFactorData {
  cost: {
    [term: string]: {
      [escalation: string]: {
        [financeRange: string]: number;
      };
    };
  };
  managerFactors: {
    [term: string]: {
      [escalation: string]: {
        [financeRange: string]: number;
      };
    };
  };
  userFactors: {
    [term: string]: {
      [escalation: string]: {
        [financeRange: string]: number;
      };
    };
  };
}

export interface Scales {
  installation: { [band: string]: number; };
  finance_fee: { [range: string]: number; };
  gross_profit: { [band: string]: number; };
  additional_costs: { cost_per_kilometer: number; cost_per_point: number; };
}

export interface EnhancedScales {
  installation: {
    cost: { [band: string]: number; };
    managerCost: { [band: string]: number; };
    userCost: { [band: string]: number; };
  };
  finance_fee: {
    cost: { [range: string]: number; };
    managerCost: { [range: string]: number; };
    userCost: { [range: string]: number; };
  };
  gross_profit: {
    cost: { [band: string]: number; };
    managerCost: { [band: string]: number; };
    userCost: { [band: string]: number; };
  };
  additional_costs: {
    cost_per_kilometer: number;
    cost_per_point: number;
    manager_cost_per_kilometer?: number;
    manager_cost_per_point?: number;
    user_cost_per_kilometer?: number;
    user_cost_per_point?: number;
  };
}

export interface TotalCosts {
  extensionCount: number;
  hardwareTotal: number;
  hardwareInstallTotal: number;
  totalGrossProfit: number;
  financeFee: number;
  settlementAmount: number;
  financeAmount: number;
  totalPayout: number;
  hardwareRental: number;
  connectivityCost: number;
  licensingCost: number;
  totalMRC: number;
  totalExVat: number;
  totalIncVat: number;
  factorUsed: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  users: User[];
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => boolean;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  changePassword: (userId: string, newPassword: string) => Promise<void>;
  resetPassword: (userId: string, newPassword: string) => Promise<void>;
  syncUsersToGlobalStorage: () => void;
  loadUsersFromGlobalStorage: () => boolean;
  initializeUsers: () => void;
}

export interface CalculatorState {
  sections: Section[];
  dealDetails: DealDetails;
  originalUserContext: { role: string; username: string; userId?: string } | null;
  currentDealId: string | null;
  initializeStore: () => Promise<void>;
  updateSectionItem: (sectionId: string, itemId: string, updates: Partial<Item>) => void;
  addTemporaryItem: (sectionId: string, item: Item) => void;
  updateDealDetails: (updates: Partial<DealDetails>) => void;
  saveDeal: () => Promise<boolean>;
  loadDeal: (dealId: string) => Promise<any>;
  resetDeal: () => void;
  clearTemporaryItems: () => void;
  calculateTotalCosts: () => TotalCosts;
  migrateDealsToDatabase: () => Promise<boolean>;
}

export interface OfflineState {
  isOnline: boolean;
  setOnlineStatus: (status: boolean) => void;
}

export interface Toast {
  show: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

// Type guards for enhanced structures
export function isEnhancedFactorData(data: any): data is EnhancedFactorData {
  return data && 
         typeof data === 'object' && 
         'cost' in data && 
         'managerFactors' in data && 
         'userFactors' in data;
}

export function isEnhancedScales(data: any): data is EnhancedScales {
  return data && 
         typeof data === 'object' && 
         data.installation && 
         typeof data.installation === 'object' && 
         'cost' in data.installation && 
         'managerCost' in data.installation && 
         'userCost' in data.installation;
}

// Utility types for role-based access
export type UserRole = 'admin' | 'manager' | 'user';

export interface RoleBasedValue<T> {
  cost: T;
  managerCost: T;
  userCost: T;
}

// Helper function to get role-appropriate value
export function getRoleBasedValue<T>(
  roleBasedValue: RoleBasedValue<T> | T,
  userRole: UserRole
): T {
  if (typeof roleBasedValue === 'object' && roleBasedValue !== null && 'cost' in roleBasedValue) {
    const rbv = roleBasedValue as RoleBasedValue<T>;
    switch (userRole) {
      case 'admin':
        return rbv.cost;
      case 'manager':
        return rbv.managerCost;
      case 'user':
        return rbv.userCost;
      default:
        return rbv.cost;
    }
  }
  return roleBasedValue as T;
}