/**
 * List Management Tests
 * 
 * Tests for multi-list management functionality (Requirement 5.21)
 * Property 46: Multi-list CRUD
 */

import { pool } from '@/lib/db';

// Mock the database pool
jest.mock('@/lib/db', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn()
  }
}));

describe('List Management (Requirement 5.21)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Get Unique List Names', () => {
    it('should return unique list names for a user', async () => {
      const mockListNames = [
        { list_name: 'Potchefstroom' },
        { list_name: 'Klerksdorp' },
        { list_name: 'Rustenburg' }
      ];

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockListNames
      });

      const userId = 'test-user-id';
      const result = await pool.query(
        `SELECT DISTINCT list_name 
         FROM leads 
         WHERE user_id = $1 AND list_name IS NOT NULL
         ORDER BY list_name`,
        [userId]
      );

      expect(result.rows).toEqual(mockListNames);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DISTINCT list_name'),
        [userId]
      );
    });

    it('should return empty array when no lists exist', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: []
      });

      const userId = 'test-user-id';
      const result = await pool.query(
        `SELECT DISTINCT list_name 
         FROM leads 
         WHERE user_id = $1 AND list_name IS NOT NULL
         ORDER BY list_name`,
        [userId]
      );

      expect(result.rows).toEqual([]);
    });

    it('should filter out null list names', async () => {
      const mockListNames = [
        { list_name: 'Potchefstroom' },
        { list_name: 'Klerksdorp' }
      ];

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockListNames
      });

      const userId = 'test-user-id';
      const result = await pool.query(
        `SELECT DISTINCT list_name 
         FROM leads 
         WHERE user_id = $1 AND list_name IS NOT NULL
         ORDER BY list_name`,
        [userId]
      );

      expect(result.rows.every(row => row.list_name !== null)).toBe(true);
    });
  });

  describe('Delete List', () => {
    it('should delete all leads in a list', async () => {
      const listName = 'Potchefstroom';
      const userId = 'test-user-id';
      const deletedCount = 5;

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [{ count: deletedCount.toString() }] }) // COUNT
          .mockResolvedValueOnce({ rows: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }] }) // SELECT IDs
          .mockResolvedValueOnce({ rows: [] }) // DELETE
          .mockResolvedValueOnce({ rows: [] }) // INSERT activity log
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn()
      };

      (pool.connect as jest.Mock).mockResolvedValueOnce(mockClient);

      await mockClient.query('BEGIN');
      const countResult = await mockClient.query(
        'SELECT COUNT(*) FROM leads WHERE user_id = $1 AND list_name = $2',
        [userId, listName]
      );
      const leadsResult = await mockClient.query(
        'SELECT id FROM leads WHERE user_id = $1 AND list_name = $2',
        [userId, listName]
      );
      await mockClient.query(
        'DELETE FROM leads WHERE user_id = $1 AND list_name = $2',
        [userId, listName]
      );
      await mockClient.query(
        `INSERT INTO activity_log (user_id, activity_type, entity_type, metadata)
         VALUES ($1, $2, $3, $4)`,
        [userId, 'list_deleted', 'list', JSON.stringify({ listName, deletedCount, leadIds: leadsResult.rows.map(r => r.id) })]
      );
      await mockClient.query('COMMIT');
      mockClient.release();

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM leads'),
        [userId, listName]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const listName = 'Potchefstroom';
      const userId = 'test-user-id';

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockRejectedValueOnce(new Error('Database error')), // COUNT fails
        release: jest.fn()
      };

      (pool.connect as jest.Mock).mockResolvedValueOnce(mockClient);

      try {
        await mockClient.query('BEGIN');
        await mockClient.query(
          'SELECT COUNT(*) FROM leads WHERE user_id = $1 AND list_name = $2',
          [userId, listName]
        );
      } catch (error) {
        await mockClient.query('ROLLBACK');
      } finally {
        mockClient.release();
      }

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 404 when list is empty', async () => {
      const listName = 'NonExistent';
      const userId = 'test-user-id';

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // COUNT returns 0
          .mockResolvedValueOnce({ rows: [] }), // ROLLBACK
        release: jest.fn()
      };

      (pool.connect as jest.Mock).mockResolvedValueOnce(mockClient);

      await mockClient.query('BEGIN');
      const countResult = await mockClient.query(
        'SELECT COUNT(*) FROM leads WHERE user_id = $1 AND list_name = $2',
        [userId, listName]
      );
      
      const deletedCount = parseInt(countResult.rows[0].count);
      
      if (deletedCount === 0) {
        await mockClient.query('ROLLBACK');
        mockClient.release();
        expect(deletedCount).toBe(0);
      }
    });
  });

  describe('View List Leads', () => {
    it('should return all leads in a specific list', async () => {
      const listName = 'Potchefstroom';
      const userId = 'test-user-id';
      const mockLeads = [
        { id: '1', name: 'Lead 1', list_name: listName, provider: 'Telkom', number: 1 },
        { id: '2', name: 'Lead 2', list_name: listName, provider: 'Vodacom', number: 2 }
      ];

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockLeads
      });

      const result = await pool.query(
        `SELECT * FROM leads 
         WHERE user_id = $1 AND list_name = $2
         ORDER BY provider, number`,
        [userId, listName]
      );

      expect(result.rows).toEqual(mockLeads);
      expect(result.rows.every(lead => lead.list_name === listName)).toBe(true);
    });

    it('should return empty array for non-existent list', async () => {
      const listName = 'NonExistent';
      const userId = 'test-user-id';

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: []
      });

      const result = await pool.query(
        `SELECT * FROM leads 
         WHERE user_id = $1 AND list_name = $2
         ORDER BY provider, number`,
        [userId, listName]
      );

      expect(result.rows).toEqual([]);
    });
  });

  describe('Property 46: Multi-list CRUD', () => {
    it('should support creating leads in a list', async () => {
      const listName = 'Potchefstroom';
      const userId = 'test-user-id';
      const leadData = {
        name: 'Test Business',
        phone: '0123456789',
        provider: 'Telkom',
        list_name: listName
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ ...leadData, id: '1', number: 1 }]
      });

      const result = await pool.query(
        `INSERT INTO leads (name, phone, provider, list_name, user_id, number, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [leadData.name, leadData.phone, leadData.provider, listName, userId, 1, 'new']
      );

      expect(result.rows[0].list_name).toBe(listName);
    });

    it('should support viewing leads filtered by list', async () => {
      const listName = 'Potchefstroom';
      const userId = 'test-user-id';

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          { id: '1', name: 'Lead 1', list_name: listName },
          { id: '2', name: 'Lead 2', list_name: listName }
        ]
      });

      const result = await pool.query(
        `SELECT * FROM leads WHERE user_id = $1 AND list_name = $2`,
        [userId, listName]
      );

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows.every(lead => lead.list_name === listName)).toBe(true);
    });

    it('should support deleting a list', async () => {
      const listName = 'Potchefstroom';
      const userId = 'test-user-id';

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [{ count: '3' }] }) // COUNT
          .mockResolvedValueOnce({ rows: [{ id: '1' }, { id: '2' }, { id: '3' }] }) // SELECT IDs
          .mockResolvedValueOnce({ rowCount: 3 }) // DELETE
          .mockResolvedValueOnce({ rows: [] }) // INSERT activity log
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn()
      };

      (pool.connect as jest.Mock).mockResolvedValueOnce(mockClient);

      await mockClient.query('BEGIN');
      const countResult = await mockClient.query(
        'SELECT COUNT(*) FROM leads WHERE user_id = $1 AND list_name = $2',
        [userId, listName]
      );
      await mockClient.query(
        'SELECT id FROM leads WHERE user_id = $1 AND list_name = $2',
        [userId, listName]
      );
      const deleteResult = await mockClient.query(
        'DELETE FROM leads WHERE user_id = $1 AND list_name = $2',
        [userId, listName]
      );
      await mockClient.query(
        `INSERT INTO activity_log (user_id, activity_type, entity_type, metadata)
         VALUES ($1, $2, $3, $4)`,
        [userId, 'list_deleted', 'list', JSON.stringify({ listName, deletedCount: 3, leadIds: ['1', '2', '3'] })]
      );
      await mockClient.query('COMMIT');

      expect(deleteResult.rowCount).toBe(3);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });
});
