import fc from 'fast-check';
import { isSuperAdmin, validateSuperAdminProtection } from '@/lib/auth';

describe('Super Admin Protection', () => {
  describe('Property 60: Super admin protection', () => {
    /**
     * Feature: vps-hosted-calculator, Property 60: Super admin protection
     * For any operation attempting to delete, change the role of, or change the username
     * of the super admin user (Camryn), the system should reject the operation
     * Validates: Requirements 10.5, 6.9
     */
    test('should identify super admin correctly', () => {
      // Super admin username is always "Camryn"
      expect(isSuperAdmin('Camryn')).toBe(true);

      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (username) => {
            // Any username other than "Camryn" should not be super admin
            fc.pre(username !== 'Camryn');
            expect(isSuperAdmin(username)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should prevent deletion of super admin', () => {
      // Should throw error for super admin
      expect(() => validateSuperAdminProtection('Camryn', 'delete')).toThrow(
        'Cannot delete for super admin user'
      );

      // Should not throw for any other username
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (username) => {
            fc.pre(username !== 'Camryn');

            // Should not throw
            expect(() =>
              validateSuperAdminProtection(username, 'delete')
            ).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should prevent role change of super admin', () => {
      // Should throw error for super admin
      expect(() =>
        validateSuperAdminProtection('Camryn', 'role_change')
      ).toThrow('Cannot role change for super admin user');

      // Should not throw for any other username
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (username) => {
            fc.pre(username !== 'Camryn');

            // Should not throw
            expect(() =>
              validateSuperAdminProtection(username, 'role_change')
            ).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should prevent username change of super admin', () => {
      // Should throw error for super admin
      expect(() =>
        validateSuperAdminProtection('Camryn', 'username_change')
      ).toThrow('Cannot username change for super admin user');

      // Should not throw for any other username
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (username) => {
            fc.pre(username !== 'Camryn');

            // Should not throw
            expect(() =>
              validateSuperAdminProtection(username, 'username_change')
            ).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should protect super admin from all operations', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('delete', 'role_change', 'username_change'),
          (operation) => {
            // Super admin should be protected from all operations
            expect(() =>
              validateSuperAdminProtection(
                'Camryn',
                operation as 'delete' | 'role_change' | 'username_change'
              )
            ).toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should allow all operations for non-super-admin users', () => {
      fc.assert(
        fc.property(
          fc.record({
            username: fc.string({ minLength: 1, maxLength: 50 }),
            operation: fc.constantFrom('delete', 'role_change', 'username_change'),
          }),
          (data) => {
            // Ensure it's not the super admin
            fc.pre(data.username !== 'Camryn');

            // Should not throw for any operation on non-super-admin users
            expect(() =>
              validateSuperAdminProtection(
                data.username,
                data.operation as 'delete' | 'role_change' | 'username_change'
              )
            ).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Super Admin Immutability', () => {
    test('super admin username should be case-sensitive', () => {
      // Only exact match should be super admin
      expect(isSuperAdmin('Camryn')).toBe(true);
      expect(isSuperAdmin('camryn')).toBe(false);
      expect(isSuperAdmin('CAMRYN')).toBe(false);
      expect(isSuperAdmin('CaMrYn')).toBe(false);
    });

    test('super admin protection should be consistent across operations', () => {
      const operations: Array<'delete' | 'role_change' | 'username_change'> = [
        'delete',
        'role_change',
        'username_change',
      ];

      operations.forEach((operation) => {
        // Should always throw for super admin
        expect(() =>
          validateSuperAdminProtection('Camryn', operation)
        ).toThrow();
      });
    });
  });
});
