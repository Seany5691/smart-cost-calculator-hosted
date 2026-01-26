import fc from 'fast-check';
import { generateToken, verifyToken } from '@/lib/auth';

describe('JWT Token Service', () => {
  describe('Property 75: JWT token structure', () => {
    /**
     * Feature: vps-hosted-calculator, Property 75: JWT token structure
     * For any successful login, the issued JWT token should include userId, username,
     * role, name, email, and expiration time (24 hours from issuance)
     * Validates: Requirements 10.2
     */
    test('should generate tokens with correct structure for any user', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 3, maxLength: 20 }),
            role: fc.constantFrom('admin', 'manager', 'user'),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
          }),
          (userData) => {
            const token = generateToken(userData);

            // Token should be a non-empty string
            expect(typeof token).toBe('string');
            expect(token.length).toBeGreaterThan(0);

            // Verify token structure
            const decoded = verifyToken(token);

            // Should contain all required fields
            expect(decoded).toHaveProperty('userId');
            expect(decoded).toHaveProperty('username');
            expect(decoded).toHaveProperty('role');
            expect(decoded).toHaveProperty('name');
            expect(decoded).toHaveProperty('email');
            expect(decoded).toHaveProperty('exp');
            expect(decoded).toHaveProperty('iat');

            // Values should match input
            expect(decoded.userId).toBe(userData.id);
            expect(decoded.username).toBe(userData.username);
            expect(decoded.role).toBe(userData.role);
            expect(decoded.name).toBe(userData.name);
            expect(decoded.email).toBe(userData.email);

            // Expiration should be approximately 24 hours from now
            const now = Math.floor(Date.now() / 1000);
            const expectedExpiration = now + 24 * 60 * 60; // 24 hours in seconds

            // Allow 10 second tolerance for test execution time
            expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiration - 10);
            expect(decoded.exp).toBeLessThanOrEqual(expectedExpiration + 10);

            // Issued at should be approximately now
            expect(decoded.iat).toBeGreaterThanOrEqual(now - 10);
            expect(decoded.iat).toBeLessThanOrEqual(now + 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should generate unique tokens for different users', () => {
      fc.assert(
        fc.property(
          fc.record({
            id1: fc.uuid(),
            username1: fc.string({ minLength: 3, maxLength: 20 }),
            id2: fc.uuid(),
            username2: fc.string({ minLength: 3, maxLength: 20 }),
            role: fc.constantFrom('admin', 'manager', 'user'),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
          }),
          (data) => {
            // Ensure users are different
            fc.pre(data.id1 !== data.id2 || data.username1 !== data.username2);

            const token1 = generateToken({
              id: data.id1,
              username: data.username1,
              role: data.role,
              name: data.name,
              email: data.email,
            });

            const token2 = generateToken({
              id: data.id2,
              username: data.username2,
              role: data.role,
              name: data.name,
              email: data.email,
            });

            // Tokens should be different
            expect(token1).not.toBe(token2);

            // Both should be valid
            const decoded1 = verifyToken(token1);
            const decoded2 = verifyToken(token2);

            expect(decoded1.userId).toBe(data.id1);
            expect(decoded2.userId).toBe(data.id2);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject invalid tokens', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 100 }),
          (invalidToken) => {
            // Ensure it's not a valid JWT format
            fc.pre(!invalidToken.includes('.') || invalidToken.split('.').length !== 3);

            // Should throw error for invalid token
            expect(() => verifyToken(invalidToken)).toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should verify tokens generated for any valid user data', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 3, maxLength: 20 }),
            role: fc.constantFrom('admin', 'manager', 'user'),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
          }),
          (userData) => {
            const token = generateToken(userData);

            // Should not throw
            const decoded = verifyToken(token);

            // Should return the same data
            expect(decoded.userId).toBe(userData.id);
            expect(decoded.username).toBe(userData.username);
            expect(decoded.role).toBe(userData.role);
            expect(decoded.name).toBe(userData.name);
            expect(decoded.email).toBe(userData.email);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Token Round Trip', () => {
    test('should maintain data integrity through generate-verify cycle', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 3, maxLength: 20 }),
            role: fc.constantFrom('admin', 'manager', 'user'),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
          }),
          (userData) => {
            // Generate token
            const token = generateToken(userData);

            // Verify token
            const decoded = verifyToken(token);

            // All user data should be preserved
            expect(decoded.userId).toBe(userData.id);
            expect(decoded.username).toBe(userData.username);
            expect(decoded.role).toBe(userData.role);
            expect(decoded.name).toBe(userData.name);
            expect(decoded.email).toBe(userData.email);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
