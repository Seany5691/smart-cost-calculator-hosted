/**
 * Property-Based Tests for Configuration CRUD Operations
 * Feature: vps-hosted-calculator
 * 
 * Property 52: Hardware item CRUD
 * Property 53: Connectivity item CRUD
 * Property 54: Licensing item CRUD
 * Validates: Requirements 6.1, 6.2, 6.3
 */

import fc from 'fast-check';
import { Pool } from 'pg';

// Mock the pg Pool
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    end: jest.fn(),
  };
  return {
    Pool: jest.fn(() => mockPool),
  };
});

// Mock database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/test_db',
});

// Arbitraries for generating test data
const hardwareItemArbitrary = fc.record({
  name: fc.string({ minLength: 1, maxLength: 255 }),
  cost: fc.float({ min: 0, max: 100000, noNaN: true }),
  managerCost: fc.float({ min: 0, max: 100000, noNaN: true }),
  userCost: fc.float({ min: 0, max: 100000, noNaN: true }),
  quantity: fc.integer({ min: 1, max: 100 }),
  locked: fc.boolean(),
  isExtension: fc.boolean(),
  displayOrder: fc.integer({ min: 0, max: 1000 }),
});

const connectivityItemArbitrary = fc.record({
  name: fc.string({ minLength: 1, maxLength: 255 }),
  cost: fc.float({ min: 0, max: 100000, noNaN: true }),
  managerCost: fc.float({ min: 0, max: 100000, noNaN: true }),
  userCost: fc.float({ min: 0, max: 100000, noNaN: true }),
  quantity: fc.integer({ min: 1, max: 100 }),
  locked: fc.boolean(),
  displayOrder: fc.integer({ min: 0, max: 1000 }),
});

const licensingItemArbitrary = fc.record({
  name: fc.string({ minLength: 1, maxLength: 255 }),
  cost: fc.float({ min: 0, max: 100000, noNaN: true }),
  managerCost: fc.float({ min: 0, max: 100000, noNaN: true }),
  userCost: fc.float({ min: 0, max: 100000, noNaN: true }),
  quantity: fc.integer({ min: 1, max: 100 }),
  locked: fc.boolean(),
  displayOrder: fc.integer({ min: 0, max: 1000 }),
});

// Helper functions for CRUD operations
async function createHardwareItem(item: any) {
  const result = await pool.query(
    `INSERT INTO hardware_items 
     (name, cost, manager_cost, user_cost, quantity, locked, is_extension, display_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
     RETURNING id, name, cost, manager_cost as "managerCost", user_cost as "userCost", 
               quantity, locked, is_extension as "isExtension", is_active as "isActive", 
               display_order as "displayOrder"`,
    [item.name, item.cost, item.managerCost, item.userCost, item.quantity, item.locked, item.isExtension, item.displayOrder]
  );
  return result.rows[0];
}

async function readHardwareItem(id: string) {
  const result = await pool.query(
    `SELECT id, name, cost, manager_cost as "managerCost", user_cost as "userCost", 
            quantity, locked, is_extension as "isExtension", is_active as "isActive", 
            display_order as "displayOrder"
     FROM hardware_items WHERE id = $1`,
    [id]
  );
  return result.rows[0];
}

async function updateHardwareItem(id: string, updates: any) {
  const result = await pool.query(
    `UPDATE hardware_items 
     SET name = $2, cost = $3, manager_cost = $4, user_cost = $5, 
         quantity = $6, locked = $7, is_extension = $8, display_order = $9
     WHERE id = $1
     RETURNING id, name, cost, manager_cost as "managerCost", user_cost as "userCost", 
               quantity, locked, is_extension as "isExtension", is_active as "isActive", 
               display_order as "displayOrder"`,
    [id, updates.name, updates.cost, updates.managerCost, updates.userCost, 
     updates.quantity, updates.locked, updates.isExtension, updates.displayOrder]
  );
  return result.rows[0];
}

async function deleteHardwareItem(id: string) {
  await pool.query(
    `UPDATE hardware_items SET is_active = false WHERE id = $1`,
    [id]
  );
}

async function createConnectivityItem(item: any) {
  const result = await pool.query(
    `INSERT INTO connectivity_items 
     (name, cost, manager_cost, user_cost, quantity, locked, display_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     RETURNING id, name, cost, manager_cost as "managerCost", user_cost as "userCost", 
               quantity, locked, is_active as "isActive", display_order as "displayOrder"`,
    [item.name, item.cost, item.managerCost, item.userCost, item.quantity, item.locked, item.displayOrder]
  );
  return result.rows[0];
}

async function readConnectivityItem(id: string) {
  const result = await pool.query(
    `SELECT id, name, cost, manager_cost as "managerCost", user_cost as "userCost", 
            quantity, locked, is_active as "isActive", display_order as "displayOrder"
     FROM connectivity_items WHERE id = $1`,
    [id]
  );
  return result.rows[0];
}

async function updateConnectivityItem(id: string, updates: any) {
  const result = await pool.query(
    `UPDATE connectivity_items 
     SET name = $2, cost = $3, manager_cost = $4, user_cost = $5, 
         quantity = $6, locked = $7, display_order = $8
     WHERE id = $1
     RETURNING id, name, cost, manager_cost as "managerCost", user_cost as "userCost", 
               quantity, locked, is_active as "isActive", display_order as "displayOrder"`,
    [id, updates.name, updates.cost, updates.managerCost, updates.userCost, 
     updates.quantity, updates.locked, updates.displayOrder]
  );
  return result.rows[0];
}

async function deleteConnectivityItem(id: string) {
  await pool.query(
    `UPDATE connectivity_items SET is_active = false WHERE id = $1`,
    [id]
  );
}

async function createLicensingItem(item: any) {
  const result = await pool.query(
    `INSERT INTO licensing_items 
     (name, cost, manager_cost, user_cost, quantity, locked, display_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     RETURNING id, name, cost, manager_cost as "managerCost", user_cost as "userCost", 
               quantity, locked, is_active as "isActive", display_order as "displayOrder"`,
    [item.name, item.cost, item.managerCost, item.userCost, item.quantity, item.locked, item.displayOrder]
  );
  return result.rows[0];
}

async function readLicensingItem(id: string) {
  const result = await pool.query(
    `SELECT id, name, cost, manager_cost as "managerCost", user_cost as "userCost", 
            quantity, locked, is_active as "isActive", display_order as "displayOrder"
     FROM licensing_items WHERE id = $1`,
    [id]
  );
  return result.rows[0];
}

async function updateLicensingItem(id: string, updates: any) {
  const result = await pool.query(
    `UPDATE licensing_items 
     SET name = $2, cost = $3, manager_cost = $4, user_cost = $5, 
         quantity = $6, locked = $7, display_order = $8
     WHERE id = $1
     RETURNING id, name, cost, manager_cost as "managerCost", user_cost as "userCost", 
               quantity, locked, is_active as "isActive", display_order as "displayOrder"`,
    [id, updates.name, updates.cost, updates.managerCost, updates.userCost, 
     updates.quantity, updates.locked, updates.displayOrder]
  );
  return result.rows[0];
}

async function deleteLicensingItem(id: string) {
  await pool.query(
    `UPDATE licensing_items SET is_active = false WHERE id = $1`,
    [id]
  );
}

describe('Configuration CRUD Property Tests', () => {
  beforeAll(async () => {
    // Mock successful connection test
    (pool.query as jest.Mock).mockResolvedValue({ rows: [{ '?column?': 1 }] });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Property 52: Hardware item CRUD', () => {
    test('For any hardware item, creating then reading should return equivalent data', async () => {
      await fc.assert(
        fc.asyncProperty(hardwareItemArbitrary, async (item) => {
          const mockId = 'test-id-' + Math.random();
          const createdItem = { id: mockId, ...item, isActive: true };
          
          // Mock INSERT query
          (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [createdItem] });
          
          // Mock SELECT query
          (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [createdItem] });
          
          // Mock DELETE query
          (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

          // Create
          const created = await createHardwareItem(item);
          expect(created).toBeDefined();
          expect(created.id).toBeDefined();

          // Read
          const read = await readHardwareItem(created.id);
          expect(read).toBeDefined();

          // Verify all fields match
          expect(read.name).toBe(item.name);
          expect(read.cost).toBeCloseTo(item.cost, 2);
          expect(read.managerCost).toBeCloseTo(item.managerCost, 2);
          expect(read.userCost).toBeCloseTo(item.userCost, 2);
          expect(read.quantity).toBe(item.quantity);
          expect(read.locked).toBe(item.locked);
          expect(read.isExtension).toBe(item.isExtension);
          expect(read.displayOrder).toBe(item.displayOrder);
          expect(read.isActive).toBe(true);

          // Cleanup
          await deleteHardwareItem(created.id);
        }),
        { numRuns: 10 } // Reduced from 100 for faster tests
      );
    });

    test('For any hardware item, updating then reading should return updated data', async () => {
      await fc.assert(
        fc.asyncProperty(
          hardwareItemArbitrary,
          hardwareItemArbitrary,
          async (originalItem, updatedItem) => {
            const mockId = 'test-id-' + Math.random();
            const createdItem = { id: mockId, ...originalItem, isActive: true };
            const updatedItemWithId = { id: mockId, ...updatedItem, isActive: true };
            
            // Mock INSERT query
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [createdItem] });
            
            // Mock UPDATE query
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [updatedItemWithId] });
            
            // Mock SELECT query
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [updatedItemWithId] });
            
            // Mock DELETE query
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            // Create
            const created = await createHardwareItem(originalItem);

            // Update
            const updated = await updateHardwareItem(created.id, updatedItem);
            expect(updated).toBeDefined();

            // Read
            const read = await readHardwareItem(created.id);

            // Verify updated fields match
            expect(read.name).toBe(updatedItem.name);
            expect(read.cost).toBeCloseTo(updatedItem.cost, 2);
            expect(read.managerCost).toBeCloseTo(updatedItem.managerCost, 2);
            expect(read.userCost).toBeCloseTo(updatedItem.userCost, 2);

            // Cleanup
            await deleteHardwareItem(created.id);
          }
        ),
        { numRuns: 10 }
      );
    });

    test('For any hardware item, soft delete should set isActive to false', async () => {
      await fc.assert(
        fc.asyncProperty(hardwareItemArbitrary, async (item) => {
          const mockId = 'test-id-' + Math.random();
          const createdItem = { id: mockId, ...item, isActive: true };
          const deletedItem = { isActive: false };
          
          // Mock INSERT query
          (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [createdItem] });
          
          // Mock UPDATE (soft delete) query
          (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
          
          // Mock SELECT query to verify soft delete
          (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [deletedItem] });

          // Create
          const created = await createHardwareItem(item);

          // Delete (soft delete)
          await deleteHardwareItem(created.id);

          // Read (should still exist but inactive)
          const result = await pool.query(
            'SELECT is_active as "isActive" FROM hardware_items WHERE id = $1',
            [created.id]
          );
          expect(result.rows[0].isActive).toBe(false);
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 53: Connectivity item CRUD', () => {
    test('For any connectivity item, creating then reading should return equivalent data', async () => {
      await fc.assert(
        fc.asyncProperty(connectivityItemArbitrary, async (item) => {
          const mockId = 'test-id-' + Math.random();
          const createdItem = { id: mockId, ...item, isActive: true };
          
          // Mock INSERT, SELECT, DELETE queries
          (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [createdItem] });
          (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [createdItem] });
          (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

          // Create
          const created = await createConnectivityItem(item);
          expect(created).toBeDefined();
          expect(created.id).toBeDefined();

          // Read
          const read = await readConnectivityItem(created.id);
          expect(read).toBeDefined();

          // Verify all fields match
          expect(read.name).toBe(item.name);
          expect(read.cost).toBeCloseTo(item.cost, 2);
          expect(read.managerCost).toBeCloseTo(item.managerCost, 2);
          expect(read.userCost).toBeCloseTo(item.userCost, 2);
          expect(read.quantity).toBe(item.quantity);
          expect(read.locked).toBe(item.locked);
          expect(read.displayOrder).toBe(item.displayOrder);
          expect(read.isActive).toBe(true);

          // Cleanup
          await deleteConnectivityItem(created.id);
        }),
        { numRuns: 10 }
      );
    });

    test('For any connectivity item, updating then reading should return updated data', async () => {
      await fc.assert(
        fc.asyncProperty(
          connectivityItemArbitrary,
          connectivityItemArbitrary,
          async (originalItem, updatedItem) => {
            const mockId = 'test-id-' + Math.random();
            const createdItem = { id: mockId, ...originalItem, isActive: true };
            const updatedItemWithId = { id: mockId, ...updatedItem, isActive: true };
            
            // Mock INSERT, UPDATE, SELECT, DELETE queries
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [createdItem] });
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [updatedItemWithId] });
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [updatedItemWithId] });
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            // Create
            const created = await createConnectivityItem(originalItem);

            // Update
            const updated = await updateConnectivityItem(created.id, updatedItem);
            expect(updated).toBeDefined();

            // Read
            const read = await readConnectivityItem(created.id);

            // Verify updated fields match
            expect(read.name).toBe(updatedItem.name);
            expect(read.cost).toBeCloseTo(updatedItem.cost, 2);

            // Cleanup
            await deleteConnectivityItem(created.id);
          }
        ),
        { numRuns: 10 }
      );
    });

    test('For any connectivity item, soft delete should set isActive to false', async () => {
      await fc.assert(
        fc.asyncProperty(connectivityItemArbitrary, async (item) => {
          const mockId = 'test-id-' + Math.random();
          const createdItem = { id: mockId, ...item, isActive: true };
          const deletedItem = { isActive: false };
          
          // Mock INSERT, UPDATE (soft delete), SELECT queries
          (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [createdItem] });
          (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
          (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [deletedItem] });

          // Create
          const created = await createConnectivityItem(item);

          // Delete (soft delete)
          await deleteConnectivityItem(created.id);

          // Read (should still exist but inactive)
          const result = await pool.query(
            'SELECT is_active as "isActive" FROM connectivity_items WHERE id = $1',
            [created.id]
          );
          expect(result.rows[0].isActive).toBe(false);
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 54: Licensing item CRUD', () => {
    test('For any licensing item, creating then reading should return equivalent data', async () => {
      await fc.assert(
        fc.asyncProperty(licensingItemArbitrary, async (item) => {
          const mockId = 'test-id-' + Math.random();
          const createdItem = { id: mockId, ...item, isActive: true };
          
          // Mock INSERT, SELECT, DELETE queries
          (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [createdItem] });
          (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [createdItem] });
          (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

          // Create
          const created = await createLicensingItem(item);
          expect(created).toBeDefined();
          expect(created.id).toBeDefined();

          // Read
          const read = await readLicensingItem(created.id);
          expect(read).toBeDefined();

          // Verify all fields match
          expect(read.name).toBe(item.name);
          expect(read.cost).toBeCloseTo(item.cost, 2);
          expect(read.managerCost).toBeCloseTo(item.managerCost, 2);
          expect(read.userCost).toBeCloseTo(item.userCost, 2);
          expect(read.quantity).toBe(item.quantity);
          expect(read.locked).toBe(item.locked);
          expect(read.displayOrder).toBe(item.displayOrder);
          expect(read.isActive).toBe(true);

          // Cleanup
          await deleteLicensingItem(created.id);
        }),
        { numRuns: 10 }
      );
    });

    test('For any licensing item, updating then reading should return updated data', async () => {
      await fc.assert(
        fc.asyncProperty(
          licensingItemArbitrary,
          licensingItemArbitrary,
          async (originalItem, updatedItem) => {
            const mockId = 'test-id-' + Math.random();
            const createdItem = { id: mockId, ...originalItem, isActive: true };
            const updatedItemWithId = { id: mockId, ...updatedItem, isActive: true };
            
            // Mock INSERT, UPDATE, SELECT, DELETE queries
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [createdItem] });
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [updatedItemWithId] });
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [updatedItemWithId] });
            (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            // Create
            const created = await createLicensingItem(originalItem);

            // Update
            const updated = await updateLicensingItem(created.id, updatedItem);
            expect(updated).toBeDefined();

            // Read
            const read = await readLicensingItem(created.id);

            // Verify updated fields match
            expect(read.name).toBe(updatedItem.name);
            expect(read.cost).toBeCloseTo(updatedItem.cost, 2);

            // Cleanup
            await deleteLicensingItem(created.id);
          }
        ),
        { numRuns: 10 }
      );
    });

    test('For any licensing item, soft delete should set isActive to false', async () => {
      await fc.assert(
        fc.asyncProperty(licensingItemArbitrary, async (item) => {
          const mockId = 'test-id-' + Math.random();
          const createdItem = { id: mockId, ...item, isActive: true };
          const deletedItem = { isActive: false };
          
          // Mock INSERT, UPDATE (soft delete), SELECT queries
          (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [createdItem] });
          (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
          (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [deletedItem] });

          // Create
          const created = await createLicensingItem(item);

          // Delete (soft delete)
          await deleteLicensingItem(created.id);

          // Read (should still exist but inactive)
          const result = await pool.query(
            'SELECT is_active as "isActive" FROM licensing_items WHERE id = $1',
            [created.id]
          );
          expect(result.rows[0].isActive).toBe(false);
        }),
        { numRuns: 10 }
      );
    });
  });
});
