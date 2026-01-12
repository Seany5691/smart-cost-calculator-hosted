// Client-side leads adapter (API-based)
import { Lead, Route, LeadNote, LeadInteraction, LeadStatus, LeadSearchFilters } from './types';

// Client-side adapter that uses API calls instead of direct PostgreSQL
export const leadsAdapter = {
  // LEADS OPERATIONS
  async getLeads(userId: string, isAdmin: boolean = false): Promise<Lead[]> {
    try {
      const response = await fetch(`/api/leads${isAdmin ? '?admin=true' : ''}`);
      if (!response.ok) throw new Error('Failed to fetch leads');
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching leads:', error);
      return [];
    }
  },

  async createLead(userId: string, leadData: any): Promise<Lead> {
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData),
      });
      if (!response.ok) throw new Error('Failed to create lead');
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error creating lead:', error);
      throw error;
    }
  },

  async updateLead(userId: string, leadId: string, updates: any): Promise<Lead> {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update lead');
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error updating lead:', error);
      throw error;
    }
  },

  async deleteLead(userId: string, leadId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete lead');
      return true;
    } catch (error) {
      console.error('Error deleting lead:', error);
      throw error;
    }
  },

  // ROUTES OPERATIONS
  async getRoutes(userId: string): Promise<Route[]> {
    try {
      const response = await fetch('/api/lead-routes');
      if (!response.ok) throw new Error('Failed to fetch routes');
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching routes:', error);
      return [];
    }
  },

  async createRoute(userId: string, routeData: any): Promise<Route> {
    try {
      const response = await fetch('/api/lead-routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routeData),
      });
      if (!response.ok) throw new Error('Failed to create route');
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error creating route:', error);
      throw error;
    }
  },

  async deleteRoute(userId: string, routeId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/lead-routes/${routeId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete route');
      return true;
    } catch (error) {
      console.error('Error deleting route:', error);
      throw error;
    }
  },

  // Additional methods needed by stores
  async getLeadsByStatus(userId: string, status: LeadStatus): Promise<Lead[]> {
    try {
      const response = await fetch(`/api/leads?status=${status}`);
      if (!response.ok) throw new Error('Failed to fetch leads by status');
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching leads by status:', error);
      return [];
    }
  },

  async getUniqueListNames(userId: string): Promise<string[]> {
    try {
      const response = await fetch('/api/leads/list-names');
      if (!response.ok) throw new Error('Failed to fetch list names');
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching list names:', error);
      return [];
    }
  },

  async renumberLeads(userId: string, status: LeadStatus): Promise<void> {
    try {
      const response = await fetch(`/api/leads/renumber`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to renumber leads');
    } catch (error) {
      console.error('Error renumbering leads:', error);
      throw error;
    }
  },

  async deleteList(userId: string, listName: string): Promise<{ deletedCount: number }> {
    try {
      const response = await fetch(`/api/leads/list/${encodeURIComponent(listName)}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete list');
      const result = await response.json();
      return result.data || { deletedCount: 0 };
    } catch (error) {
      console.error('Error deleting list:', error);
      throw error;
    }
  },
};

export async function initializeLeadsAdapter() {
  // Client adapter is ready
}

export function getLeadsAdapter() {
  return leadsAdapter;
}
