import fc from 'fast-check';
import { login, hashPassword, comparePassword, generateToken, verifyToken } from '@/lib/auth';
import { getPool } from '@/lib/db';

// Mock the database
jest.mock('@/lib/db');

const mockPool = {
  query: jest.fn(),
};

(getPool as jest.Mock).mockReturnValue(mockPool);

describe('Authentication Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 74: Credential validation', () => {
    /**
     * Feature: vps-hosted-calculator, Property 74: Credential validation
     * For any login attempt, the system should validate the username and password
     * against the PostgreSQL users table and return success only for matching credentials
     * Validates: Requirements 10.1
     */
    test('should validate credentials correctly for any valid user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 20 }),
            password: fc.string({ minLength: 8, maxLength: 50 }),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            role: fc.constantFrom('admin', 'manager', 'user'),
          }),
          async (userData) => {
            // Hash the password
            const hashedPassword = await hashPassword(userData.password);

            // Mock database response for valid credentials
            mockPool.query.mockResolvedValueOnce({
              rows: [
                {
                  id: 'test-user-id',
                  username: userData.username,
                  password: hashedPassword,
                  role: userData.role,
                  name: userData.name,
                  email: userData.email,
                  is_active: true,
                  requires_password_change: false,
                  is_super_admin: false,
                },
              ],
            });

            // Attempt login with correct credentials
            const result = await login(userData.username, userData.password);

            // Should succeed
            expect(result).toHaveProperty('token');
            expect(result).toHaveProperty('user');
            expect(result.user.username).toBe(userData.username);
            expect(result.user.role).toBe(userData.role);
          }
        ),
        { numRuns: 10 }
      );
    }, 30000);

    test('should reject invalid credentials for any user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 20 }),
            correctPassword: fc.string({ minLength: 8, maxLength: 50 }),
            wrongPassword: fc.string({ minLength: 8, maxLength: 50 }),
          }),
          async (userData) => {
            // Ensure passwords are different
            fc.pre(userData.correctPassword !== userData.wrongPassword);

            const hashedPassword = await hashPassword(userData.correctPassword);

            // Mock database response
            mockPool.query.mockResolvedValueOnce({
              rows: [
                {
                  id: 'test-user-id',
                  username: userData.username,
                  password: hashedPassword,
                  role: 'user',
                  name: 'Test User',
                  email: 'test@example.com',
                  is_active: true,
                },
              ],
            });

            // Attempt login with wrong password
            await expect(
              login(userData.username, userData.wrongPassword)
            ).rejects.toThrow('Invalid credentials');
          }
        ),
        { numRuns: 10 }
      );
    }, 30000);

    test('should reject login for non-existent users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 20 }),
            password: fc.string({ minLength: 8, maxLength: 50 }),
          }),
          async (userData) => {
            // Ensure it's not the super admin username
            fc.pre(userData.username !== 'Camryn');

            // Mock database response for non-existent user
            mockPool.query.mockResolvedValueOnce({
              rows: [],
            });

            // Attempt login
            await expect(
              login(userData.username, userData.password)
            ).rejects.toThrow('Invalid credentials');
          }
        ),
        { numRuns: 10 }
      );
    }, 10000);
  });

  describe('Password Hashing', () => {
    test('should hash passwords consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 50 }),
          async (password) => {
            const hash = await hashPassword(password);

            // Hash should be different from original password
            expect(hash).not.toBe(password);

            // Should be able to verify the password
            const isValid = await comparePassword(password, hash);
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    }, 30000);

    test('should reject incorrect passwords', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 50 }),
          fc.string({ minLength: 8, maxLength: 50 }),
          async (password1, password2) => {
            fc.pre(password1 !== password2);

            const hash = await hashPassword(password1);

            // Should not verify with different password
            const isValid = await comparePassword(password2, hash);
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 10 }
      );
    }, 30000);
  });

  describe('Super Admin Login', () => {
    test('should allow super admin login with correct credentials', async () => {
      // Mock database response for super admin check
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'super-admin-id',
            username: 'Camryn',
            role: 'admin',
            name: 'Camryn',
            email: 'camryn@smartcalculator.com',
            is_super_admin: true,
          },
        ],
      });

      const result = await login('Camryn', 'Elliot6242!');

      expect(result).toHaveProperty('token');
      expect(result.user.username).toBe('Camryn');
      expect(result.user.role).toBe('admin');
    });

    test('should reject super admin login with incorrect password', async () => {
      await expect(login('Camryn', 'wrongpassword')).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });
});
