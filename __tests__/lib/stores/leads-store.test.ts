/**
 * Unit Tests for Leads Store
 * 
 * Tests the Zustand leads store functionality including:
 * - State management
 * - Selection operations
 * - Filter operations
 * - Async actions
 */

import { useLeadsStore } from '@/lib/store/leads';
import type { Lead } from '@/lib/leads/types';

// Mock fetch globally
global.fetch = jest.fn();

describe('useLeadsStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useLeadsStore.getState().reset();
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Basic State Management', () => {
    it('should initialize with empty state', () => {
      const state = useLeadsStore.getState();
      
      expect(state.leads).toEqual([]);
      expect(state.allLeads).toEqual([]);
      expect(state.selectedLeads).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
    });

    it('should set leads', () => {
      const mockLeads: Lead[] = [
        {
          id: '1',
          number: 1,
          name: 'Test Lead',
          status: 'new',
          user_id: 'user1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ];

      useLeadsStore.getState().setLeads(mockLeads);
      
      expect(useLeadsStore.getState().leads).toEqual(mockLeads);
    });

    it('should set all leads separately', () => {
      const mockLeads: Lead[] = [
        {
          id: '1',
          number: 1,
          name: 'Test Lead',
          status: 'new',
          user_id: 'user1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ];

      useLeadsStore.getState().setAllLeads(mockLeads);
      
      expect(useLeadsStore.getState().allLeads).toEqual(mockLeads);
      expect(useLeadsStore.getState().leads).toEqual([]); // leads should remain empty
    });

    it('should add a lead to both leads and allLeads', () => {
      const newLead: Lead = {
        id: '2',
        number: 2,
        name: 'New Lead',
        status: 'new',
        user_id: 'user1',
        created_at: '2024-01-02',
        updated_at: '2024-01-02'
      };

      useLeadsStore.getState().addLead(newLead);
      
      expect(useLeadsStore.getState().leads).toContainEqual(newLead);
      expect(useLeadsStore.getState().allLeads).toContainEqual(newLead);
      expect(useLeadsStore.getState().total).toBe(1);
    });

    it('should remove a lead from both leads and allLeads', () => {
      const mockLead: Lead = {
        id: '1',
        number: 1,
        name: 'Test Lead',
        status: 'new',
        user_id: 'user1',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      useLeadsStore.getState().setLeads([mockLead]);
      useLeadsStore.getState().setAllLeads([mockLead]);
      useLeadsStore.getState().removeLead('1');
      
      expect(useLeadsStore.getState().leads).toEqual([]);
      expect(useLeadsStore.getState().allLeads).toEqual([]);
    });
  });

  describe('Selection Management', () => {
    const mockLeads: Lead[] = [
      {
        id: '1',
        number: 1,
        name: 'Lead 1',
        status: 'new',
        user_id: 'user1',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      },
      {
        id: '2',
        number: 2,
        name: 'Lead 2',
        status: 'new',
        user_id: 'user1',
        created_at: '2024-01-02',
        updated_at: '2024-01-02'
      }
    ];

    beforeEach(() => {
      useLeadsStore.getState().setLeads(mockLeads);
    });

    it('should select a lead', () => {
      useLeadsStore.getState().selectLead('1');
      
      expect(useLeadsStore.getState().selectedLeads).toContain('1');
    });

    it('should not duplicate selection', () => {
      useLeadsStore.getState().selectLead('1');
      useLeadsStore.getState().selectLead('1');
      
      expect(useLeadsStore.getState().selectedLeads).toEqual(['1']);
    });

    it('should deselect a lead', () => {
      useLeadsStore.getState().selectLead('1');
      useLeadsStore.getState().deselectLead('1');
      
      expect(useLeadsStore.getState().selectedLeads).not.toContain('1');
    });

    it('should toggle lead selection', () => {
      useLeadsStore.getState().toggleLeadSelection('1');
      expect(useLeadsStore.getState().selectedLeads).toContain('1');
      
      useLeadsStore.getState().toggleLeadSelection('1');
      expect(useLeadsStore.getState().selectedLeads).not.toContain('1');
    });

    it('should set multiple selected leads', () => {
      useLeadsStore.getState().setSelectedLeads(['1', '2']);
      
      expect(useLeadsStore.getState().selectedLeads).toEqual(['1', '2']);
    });

    it('should clear all selections', () => {
      useLeadsStore.getState().setSelectedLeads(['1', '2']);
      useLeadsStore.getState().clearSelection();
      
      expect(useLeadsStore.getState().selectedLeads).toEqual([]);
    });

    it('should remove lead from selection when lead is removed', () => {
      useLeadsStore.getState().selectLead('1');
      useLeadsStore.getState().removeLead('1');
      
      expect(useLeadsStore.getState().selectedLeads).not.toContain('1');
    });
  });

  describe('Filter and Pagination', () => {
    it('should set filters', () => {
      useLeadsStore.getState().setFilters({ status: ['new'], provider: ['Telkom'] });
      
      expect(useLeadsStore.getState().filters).toEqual({
        status: ['new'],
        provider: ['Telkom']
      });
    });

    it('should merge filters', () => {
      useLeadsStore.getState().setFilters({ status: ['new'] });
      useLeadsStore.getState().setFilters({ provider: ['Telkom'] });
      
      expect(useLeadsStore.getState().filters).toEqual({
        status: ['new'],
        provider: ['Telkom']
      });
    });

    it('should reset to page 1 when filters change', () => {
      useLeadsStore.getState().setCurrentPage(3);
      useLeadsStore.getState().setFilters({ status: ['new'] });
      
      expect(useLeadsStore.getState().currentPage).toBe(1);
    });

    it('should clear filters', () => {
      useLeadsStore.getState().setFilters({ status: ['new'], provider: ['Telkom'] });
      useLeadsStore.getState().clearFilters();
      
      expect(useLeadsStore.getState().filters).toEqual({});
      expect(useLeadsStore.getState().currentPage).toBe(1);
    });

    it('should set current page', () => {
      useLeadsStore.getState().setCurrentPage(5);
      
      expect(useLeadsStore.getState().currentPage).toBe(5);
    });

    it('should set pagination', () => {
      useLeadsStore.getState().setPagination(2, 10, 100);
      
      expect(useLeadsStore.getState().currentPage).toBe(2);
      expect(useLeadsStore.getState().totalPages).toBe(10);
      expect(useLeadsStore.getState().total).toBe(100);
    });
  });

  describe('Loading and Error States', () => {
    it('should set loading state', () => {
      useLeadsStore.getState().setLoading(true);
      expect(useLeadsStore.getState().loading).toBe(true);
      
      useLeadsStore.getState().setLoading(false);
      expect(useLeadsStore.getState().loading).toBe(false);
    });

    it('should set error state', () => {
      useLeadsStore.getState().setError('Test error');
      expect(useLeadsStore.getState().error).toBe('Test error');
      
      useLeadsStore.getState().setError(null);
      expect(useLeadsStore.getState().error).toBe(null);
    });
  });

  describe('List Management', () => {
    it('should set list names', () => {
      const listNames = ['List 1', 'List 2', 'List 3'];
      useLeadsStore.getState().setListNames(listNames);
      
      expect(useLeadsStore.getState().listNames).toEqual(listNames);
    });
  });

  describe('Async Actions', () => {
    it('should fetch leads successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            number: 1,
            name: 'Test Lead',
            status: 'new',
            user_id: 'user1',
            created_at: '2024-01-01',
            updated_at: '2024-01-01'
          }
        ],
        pagination: {
          page: 1,
          totalPages: 1,
          total: 1
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await useLeadsStore.getState().fetchLeads();

      expect(useLeadsStore.getState().leads).toEqual(mockResponse.data);
      expect(useLeadsStore.getState().total).toBe(1);
      expect(useLeadsStore.getState().loading).toBe(false);
      expect(useLeadsStore.getState().error).toBe(null);
    });

    it('should handle fetch leads error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to fetch' })
      });

      await useLeadsStore.getState().fetchLeads();

      expect(useLeadsStore.getState().error).toBe('Failed to fetch');
      expect(useLeadsStore.getState().loading).toBe(false);
    });

    it('should fetch all leads for stats', async () => {
      const mockLeads = [
        {
          id: '1',
          number: 1,
          name: 'Lead 1',
          status: 'new',
          user_id: 'user1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        },
        {
          id: '2',
          number: 2,
          name: 'Lead 2',
          status: 'leads',
          user_id: 'user1',
          created_at: '2024-01-02',
          updated_at: '2024-01-02'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockLeads })
      });

      await useLeadsStore.getState().fetchAllLeadsForStats();

      expect(useLeadsStore.getState().allLeads).toEqual(mockLeads);
    });
  });

  describe('Reset', () => {
    it('should reset store to initial state', () => {
      // Set some state
      useLeadsStore.getState().setLeads([
        {
          id: '1',
          number: 1,
          name: 'Test',
          status: 'new',
          user_id: 'user1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ]);
      useLeadsStore.getState().selectLead('1');
      useLeadsStore.getState().setFilters({ status: ['new'] });
      useLeadsStore.getState().setError('Test error');

      // Reset
      useLeadsStore.getState().reset();

      // Verify reset
      const state = useLeadsStore.getState();
      expect(state.leads).toEqual([]);
      expect(state.allLeads).toEqual([]);
      expect(state.selectedLeads).toEqual([]);
      expect(state.filters).toEqual({});
      expect(state.error).toBe(null);
      expect(state.loading).toBe(false);
    });
  });
});
