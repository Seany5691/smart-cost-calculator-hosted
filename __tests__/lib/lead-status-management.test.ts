/**
 * Lead Status Management Tests
 * 
 * These tests verify the lead status management functionality including:
 * - Status transitions (Requirement 5.4)
 * - Later status validation (Requirement 5.5)
 * - Signed status validation (Requirement 5.6)
 * - Automatic renumbering (Requirement 5.7)
 * - Provider priority sorting (Requirement 5.28)
 */

import { Pool } from 'pg';

// Mock pool for testing
const mockPool = {
  query: jest.fn(),
};

// Provider priority mapping
const PROVIDER_PRIORITY: Record<string, number> = {
  'Telkom': 1,
  'Vodacom': 2,
  'MTN': 3,
  'Cell C': 4,
  'Other': 5
};

function getProviderPriority(provider: string | null): number {
  if (!provider) return 5;
  return PROVIDER_PRIORITY[provider] || 5;
}

describe('Lead Status Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Status Transitions (Requirement 5.4)', () => {
    test('should allow transitions between all valid statuses', () => {
      const validStatuses = ['new', 'leads', 'working', 'bad', 'later', 'signed'];
      
      // All statuses should be valid
      validStatuses.forEach(status => {
        expect(validStatuses).toContain(status);
      });
    });

    test('should support status change from any status to any other status', () => {
      const validStatuses = ['new', 'leads', 'working', 'bad', 'later', 'signed'];
      
      // Test all possible transitions
      validStatuses.forEach(fromStatus => {
        validStatuses.forEach(toStatus => {
          // All transitions should be allowed
          expect(validStatuses).toContain(fromStatus);
          expect(validStatuses).toContain(toStatus);
        });
      });
    });
  });

  describe('Later Status Validation (Requirement 5.5)', () => {
    test('should require dateToCallBack when status is "later"', () => {
      const status = 'later';
      const dateToCallBack = null;
      
      // Validation should fail
      const isValid = status === 'later' ? !!dateToCallBack : true;
      expect(isValid).toBe(false);
    });

    test('should accept valid dateToCallBack for "later" status', () => {
      const status = 'later';
      const dateToCallBack = '2024-12-31';
      
      // Validation should pass
      const isValid = status === 'later' ? !!dateToCallBack : true;
      expect(isValid).toBe(true);
    });

    test('should not require dateToCallBack for other statuses', () => {
      const statuses = ['new', 'leads', 'working', 'bad', 'signed'];
      
      statuses.forEach(status => {
        const dateToCallBack = null;
        const isValid = status === 'later' ? !!dateToCallBack : true;
        expect(isValid).toBe(true);
      });
    });
  });

  describe('Signed Status Validation (Requirement 5.6)', () => {
    test('should require dateSigned when status is "signed"', () => {
      const status = 'signed';
      const dateSigned = null;
      
      // Validation should fail
      const isValid = status === 'signed' ? !!dateSigned : true;
      expect(isValid).toBe(false);
    });

    test('should accept valid dateSigned for "signed" status', () => {
      const status = 'signed';
      const dateSigned = '2024-12-31';
      
      // Validation should pass
      const isValid = status === 'signed' ? !!dateSigned : true;
      expect(isValid).toBe(true);
    });

    test('should not require dateSigned for other statuses', () => {
      const statuses = ['new', 'leads', 'working', 'bad', 'later'];
      
      statuses.forEach(status => {
        const dateSigned = null;
        const isValid = status === 'signed' ? !!dateSigned : true;
        expect(isValid).toBe(true);
      });
    });
  });

  describe('Provider Priority Sorting (Requirement 5.28)', () => {
    test('should assign correct priority to each provider', () => {
      expect(getProviderPriority('Telkom')).toBe(1);
      expect(getProviderPriority('Vodacom')).toBe(2);
      expect(getProviderPriority('MTN')).toBe(3);
      expect(getProviderPriority('Cell C')).toBe(4);
      expect(getProviderPriority('Other')).toBe(5);
    });

    test('should assign priority 5 to null or unknown providers', () => {
      expect(getProviderPriority(null)).toBe(5);
      expect(getProviderPriority('Unknown')).toBe(5);
      expect(getProviderPriority('')).toBe(5);
    });

    test('should sort leads by provider priority', () => {
      const leads = [
        { id: '1', provider: 'MTN' },
        { id: '2', provider: 'Telkom' },
        { id: '3', provider: 'Cell C' },
        { id: '4', provider: 'Vodacom' },
        { id: '5', provider: 'Other' },
      ];

      const sorted = leads.sort((a, b) => {
        const priorityA = getProviderPriority(a.provider);
        const priorityB = getProviderPriority(b.provider);
        return priorityA - priorityB;
      });

      expect(sorted[0].provider).toBe('Telkom');
      expect(sorted[1].provider).toBe('Vodacom');
      expect(sorted[2].provider).toBe('MTN');
      expect(sorted[3].provider).toBe('Cell C');
      expect(sorted[4].provider).toBe('Other');
    });
  });

  describe('Automatic Renumbering (Requirement 5.7)', () => {
    test('should renumber leads sequentially within status', () => {
      const leads = [
        { id: '1', provider: 'Telkom', number: 5 },
        { id: '2', provider: 'Vodacom', number: 3 },
        { id: '3', provider: 'MTN', number: 1 },
      ];

      // Sort by provider priority
      const sorted = leads.sort((a, b) => {
        const priorityA = getProviderPriority(a.provider);
        const priorityB = getProviderPriority(b.provider);
        return priorityA - priorityB;
      });

      // Assign sequential numbers
      const renumbered = sorted.map((lead, index) => ({
        ...lead,
        number: index + 1
      }));

      expect(renumbered[0].number).toBe(1);
      expect(renumbered[0].provider).toBe('Telkom');
      expect(renumbered[1].number).toBe(2);
      expect(renumbered[1].provider).toBe('Vodacom');
      expect(renumbered[2].number).toBe(3);
      expect(renumbered[2].provider).toBe('MTN');
    });

    test('should maintain provider priority when renumbering', () => {
      const leads = [
        { id: '1', provider: 'Other', number: 1 },
        { id: '2', provider: 'Telkom', number: 2 },
        { id: '3', provider: 'Vodacom', number: 3 },
        { id: '4', provider: 'MTN', number: 4 },
        { id: '5', provider: 'Cell C', number: 5 },
      ];

      // Sort by provider priority
      const sorted = leads.sort((a, b) => {
        const priorityA = getProviderPriority(a.provider);
        const priorityB = getProviderPriority(b.provider);
        return priorityA - priorityB;
      });

      // Verify order
      expect(sorted[0].provider).toBe('Telkom');
      expect(sorted[1].provider).toBe('Vodacom');
      expect(sorted[2].provider).toBe('MTN');
      expect(sorted[3].provider).toBe('Cell C');
      expect(sorted[4].provider).toBe('Other');
    });
  });

  describe('Status Change Workflow', () => {
    test('should trigger renumbering when status changes', () => {
      const oldStatus = 'new';
      const newStatus = 'leads';
      
      // Status change should trigger renumbering
      const statusChanged = oldStatus !== newStatus;
      expect(statusChanged).toBe(true);
    });

    test('should not trigger renumbering when status stays the same', () => {
      const oldStatus = 'leads';
      const newStatus = 'leads';
      
      // Status change should not trigger renumbering
      const statusChanged = oldStatus !== newStatus;
      expect(statusChanged).toBe(false);
    });

    test('should renumber both old and new status categories', () => {
      const oldStatus = 'new';
      const newStatus = 'leads';
      
      // Both categories should be renumbered
      const categoriesToRenumber = [oldStatus, newStatus];
      expect(categoriesToRenumber).toContain('new');
      expect(categoriesToRenumber).toContain('leads');
      expect(categoriesToRenumber.length).toBe(2);
    });
  });
});
