/**
 * PostgreSQL Database Adapter for Smart Cost Calculator
 * This module provides a unified interface for PostgreSQL database operations
 */

import { postgresql, dbHelpers } from '@/lib/postgresql';

// Database adapter - PostgreSQL only
export const databaseAdapter = {
  client: postgresql,
  helpers: dbHelpers,
  type: 'postgresql'
};

/**
 * Initialize the database adapter
 */
export async function initializeDatabaseAdapter() {
  // Always use PostgreSQL
  console.log('🟢 Using PostgreSQL database adapter');
  return databaseAdapter;
}

/**
 * Get the current database adapter
 */
export function getDatabaseAdapter() {
  return databaseAdapter;
}

/**
 * Check if we're in VPS mode (always true now)
 */
export function isVPSMode(): boolean {
  return true;
}

/**
 * Database helper functions that work with PostgreSQL
 */
export const databaseHelpers = {
  async getDeals(userId?: string, isAdmin: boolean = false) {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.getDeals(userId, isAdmin);
  },

  async getDealById(dealId: string) {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.getDealById(dealId);
  },

  async createDeal(deal: any) {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.createDeal(deal);
  },

  async updateDeal(dealId: string, updates: any) {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.updateDeal(dealId, updates);
  },

  async deleteDeal(dealId: string) {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.deleteDeal(dealId);
  },

  async getHardwareItems() {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.getHardwareItems();
  },

  async updateHardwareItems(items: any[]) {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.updateHardwareItems(items);
  },

  async getConnectivityItems() {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.getConnectivityItems();
  },

  async updateConnectivityItems(items: any[]) {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.updateConnectivityItems(items);
  },

  async getLicensingItems() {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.getLicensingItems();
  },

  async updateLicensingItems(items: any[]) {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.updateLicensingItems(items);
  },

  async getFactors() {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.getFactors();
  },

  async updateFactors(factors: any) {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.updateFactors(factors);
  },

  async getScales() {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.getScales();
  },

  async updateScales(scales: any) {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.updateScales(scales);
  },

  async getActivityLogs(userId?: string, limit?: number) {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.getActivityLogs(userId, limit);
  },

  async createActivityLog(log: any) {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.createActivityLog(log);
  },

  async getAllUsers() {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.getAllUsers();
  },

  async createUser(user: any) {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.createUser(user);
  },

  async updateUser(id: string, updates: any) {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.updateUser(id, updates);
  },

  async deleteUser(id: string) {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.deleteUser(id);
  },

  // Import session management
  async createImportSession(session: any) {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.createImportSession(session);
  },

  async updateImportSession(id: string, updates: any) {
    const adapter = getDatabaseAdapter();
    return adapter.helpers.updateImportSession(id, updates);
  }
};
