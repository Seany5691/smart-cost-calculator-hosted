/**
 * Tests for GET /api/leads endpoint
 * 
 * Validates: Requirements 30.1, 8.14, 4.11, 4.19-4.26
 */

import { GET } from '@/app/api/leads/route';
import { pool } from '@/lib/db';
import { NextRequest } from 'next/server';

// Mock the middleware
jest.mock('@/lib/middleware', () => ({
  verifyAuth: jest.fn().mockResolvedValue({
    authenticated: true,
    user: { userId: 'test-user-id' }
  })
}));

describe('GET /api/leads', () => {
  const testUserId = 'test-user-id';

  beforeEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM leads WHERE user_id = $1', [testUserId]);
  });

  afterAll(async () => {
    // Clean up and close pool
    await pool.query('DELETE FROM leads WHERE user_id = $1', [testUserId]);
    await pool.end();
  });

  describe('Basic Functionality', () => {
    it('should return empty array when no leads exist', async () => {
      const request = new NextRequest('http://localhost/api/leads');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leads).toEqual([]);
      expect(data.pagination.total).toBe(0);
    });

    it('should return leads for authenticated user', async () => {
      // Create test leads
      await pool.query(
        `INSERT INTO leads (name, status, user_id, number) VALUES 
         ('Lead 1', 'new', $1, 1),
         ('Lead 2', 'leads', $1, 2)`,
        [testUserId]
      );

      const request = new NextRequest('http://localhost/api/leads');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leads).toHaveLength(2);
      expect(data.pagination.total).toBe(2);
    });
  });

  describe('Filtering', () => {
    beforeEach(async () => {
      // Create test leads with various attributes
      await pool.query(
        `INSERT INTO leads (name, status, provider, town, list_name, user_id, number) VALUES 
         ('Lead 1', 'new', 'Telkom', 'Cape Town', 'List A', $1, 1),
         ('Lead 2', 'leads', 'Vodacom', 'Johannesburg', 'List A', $1, 2),
         ('Lead 3', 'working', 'Telkom', 'Cape Town', 'List B', $1, 3),
         ('Lead 4', 'later', 'MTN', 'Durban', 'List A', $1, 4)`,
        [testUserId]
      );
    });

    it('should filter by status', async () => {
      const request = new NextRequest('http://localhost/api/leads?status=new');
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads).toHaveLength(1);
      expect(data.leads[0].status).toBe('new');
    });

    it('should filter by multiple statuses', async () => {
      const request = new NextRequest('http://localhost/api/leads?status=new,leads');
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads).toHaveLength(2);
      expect(data.leads.every((l: any) => ['new', 'leads'].includes(l.status))).toBe(true);
    });

    it('should filter by provider', async () => {
      const request = new NextRequest('http://localhost/api/leads?provider=Telkom');
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads).toHaveLength(2);
      expect(data.leads.every((l: any) => l.provider === 'Telkom')).toBe(true);
    });

    it('should filter by town', async () => {
      const request = new NextRequest('http://localhost/api/leads?town=Cape Town');
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads).toHaveLength(2);
      expect(data.leads.every((l: any) => l.town === 'Cape Town')).toBe(true);
    });

    it('should filter by list_name', async () => {
      const request = new NextRequest('http://localhost/api/leads?listName=List A');
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads).toHaveLength(3);
      expect(data.leads.every((l: any) => l.list_name === 'List A')).toBe(true);
    });

    it('should combine multiple filters', async () => {
      const request = new NextRequest('http://localhost/api/leads?status=new&provider=Telkom&town=Cape Town');
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads).toHaveLength(1);
      expect(data.leads[0].name).toBe('Lead 1');
    });
  });

  describe('Search', () => {
    beforeEach(async () => {
      await pool.query(
        `INSERT INTO leads (name, phone, provider, address, type_of_business, notes, user_id, number) VALUES 
         ('ABC Company', '555-1234', 'Telkom', '123 Main St', 'Retail', 'Good prospect', $1, 1),
         ('XYZ Corp', '555-5678', 'Vodacom', '456 Oak Ave', 'Manufacturing', 'Follow up needed', $1, 2),
         ('Test Business', '555-9999', 'MTN', '789 Pine Rd', 'Services', 'Not interested', $1, 3)`,
        [testUserId]
      );
    });

    it('should search by name', async () => {
      const request = new NextRequest('http://localhost/api/leads?search=ABC');
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads).toHaveLength(1);
      expect(data.leads[0].name).toBe('ABC Company');
    });

    it('should search by phone', async () => {
      const request = new NextRequest('http://localhost/api/leads?search=555-5678');
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads).toHaveLength(1);
      expect(data.leads[0].name).toBe('XYZ Corp');
    });

    it('should search by provider', async () => {
      const request = new NextRequest('http://localhost/api/leads?search=Vodacom');
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads).toHaveLength(1);
      expect(data.leads[0].provider).toBe('Vodacom');
    });

    it('should search by address', async () => {
      const request = new NextRequest('http://localhost/api/leads?search=Oak');
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads).toHaveLength(1);
      expect(data.leads[0].address).toContain('Oak');
    });

    it('should search by type_of_business', async () => {
      const request = new NextRequest('http://localhost/api/leads?search=Manufacturing');
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads).toHaveLength(1);
      expect(data.leads[0].type_of_business).toBe('Manufacturing');
    });

    it('should search by notes', async () => {
      const request = new NextRequest('http://localhost/api/leads?search=prospect');
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads).toHaveLength(1);
      expect(data.leads[0].notes).toContain('prospect');
    });

    it('should be case-insensitive', async () => {
      const request = new NextRequest('http://localhost/api/leads?search=abc');
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads).toHaveLength(1);
      expect(data.leads[0].name).toBe('ABC Company');
    });
  });

  describe('Sorting', () => {
    beforeEach(async () => {
      await pool.query(
        `INSERT INTO leads (name, provider, town, user_id, number, created_at) VALUES 
         ('Charlie', 'Vodacom', 'Durban', $1, 3, '2024-01-03'),
         ('Alice', 'Telkom', 'Cape Town', $1, 1, '2024-01-01'),
         ('Bob', 'MTN', 'Johannesburg', $1, 2, '2024-01-02')`,
        [testUserId]
      );
    });

    it('should sort by number ascending (default)', async () => {
      const request = new NextRequest('http://localhost/api/leads?sortBy=number');
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads[0].number).toBe(1);
      expect(data.leads[1].number).toBe(2);
      expect(data.leads[2].number).toBe(3);
    });

    it('should sort by number descending', async () => {
      const request = new NextRequest('http://localhost/api/leads?sortBy=number&sortDirection=desc');
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads[0].number).toBe(3);
      expect(data.leads[1].number).toBe(2);
      expect(data.leads[2].number).toBe(1);
    });

    it('should sort by name ascending', async () => {
      const request = new NextRequest('http://localhost/api/leads?sortBy=name');
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads[0].name).toBe('Alice');
      expect(data.leads[1].name).toBe('Bob');
      expect(data.leads[2].name).toBe('Charlie');
    });

    it('should sort by provider', async () => {
      const request = new NextRequest('http://localhost/api/leads?sortBy=provider');
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads[0].provider).toBe('MTN');
      expect(data.leads[1].provider).toBe('Telkom');
      expect(data.leads[2].provider).toBe('Vodacom');
    });

    it('should sort by town', async () => {
      const request = new NextRequest('http://localhost/api/leads?sortBy=town');
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads[0].town).toBe('Cape Town');
      expect(data.leads[1].town).toBe('Durban');
      expect(data.leads[2].town).toBe('Johannesburg');
    });

    it('should sort by date', async () => {
      const request = new NextRequest('http://localhost/api/leads?sortBy=date');
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads[0].name).toBe('Alice');
      expect(data.leads[1].name).toBe('Bob');
      expect(data.leads[2].name).toBe('Charlie');
    });
  });

  describe('"No Good" Leads Sorting', () => {
    beforeEach(async () => {
      await pool.query(
        `INSERT INTO leads (name, user_id, number, background_color) VALUES 
         ('Good Lead 1', $1, 1, NULL),
         ('Bad Lead 1', $1, 2, '#FF0000'),
         ('Good Lead 2', $1, 3, NULL),
         ('Bad Lead 2', $1, 4, '#FF0000'),
         ('Good Lead 3', $1, 5, NULL)`,
        [testUserId]
      );
    });

    it('should place "No Good" leads at the bottom regardless of sort order', async () => {
      const request = new NextRequest('http://localhost/api/leads?sortBy=number');
      const response = await GET(request);
      const data = await response.json();

      // First 3 should be good leads
      expect(data.leads[0].background_color).not.toBe('#FF0000');
      expect(data.leads[1].background_color).not.toBe('#FF0000');
      expect(data.leads[2].background_color).not.toBe('#FF0000');

      // Last 2 should be bad leads
      expect(data.leads[3].background_color).toBe('#FF0000');
      expect(data.leads[4].background_color).toBe('#FF0000');
    });

    it('should maintain sort order within good leads', async () => {
      const request = new NextRequest('http://localhost/api/leads?sortBy=name');
      const response = await GET(request);
      const data = await response.json();

      // Good leads should be sorted by name
      const goodLeads = data.leads.filter((l: any) => l.background_color !== '#FF0000');
      expect(goodLeads[0].name).toBe('Good Lead 1');
      expect(goodLeads[1].name).toBe('Good Lead 2');
      expect(goodLeads[2].name).toBe('Good Lead 3');
    });
  });

  describe('Pagination', () => {
    beforeEach(async () => {
      // Create 75 test leads
      const values = Array.from({ length: 75 }, (_, i) => 
        `('Lead ${i + 1}', 'new', '${testUserId}', ${i + 1})`
      ).join(',');
      
      await pool.query(
        `INSERT INTO leads (name, status, user_id, number) VALUES ${values}`
      );
    });

    it('should default to 50 items per page', async () => {
      const request = new NextRequest('http://localhost/api/leads');
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads).toHaveLength(50);
      expect(data.pagination.limit).toBe(50);
      expect(data.pagination.total).toBe(75);
      expect(data.pagination.totalPages).toBe(2);
    });

    it('should return second page', async () => {
      const request = new NextRequest('http://localhost/api/leads?page=2');
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads).toHaveLength(25);
      expect(data.pagination.page).toBe(2);
    });

    it('should support custom limit', async () => {
      const request = new NextRequest('http://localhost/api/leads?limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads).toHaveLength(10);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.totalPages).toBe(8);
    });

    it('should calculate pagination correctly', async () => {
      const request = new NextRequest('http://localhost/api/leads?page=1&limit=20');
      const response = await GET(request);
      const data = await response.json();

      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 75,
        totalPages: 4
      });
    });
  });

  describe('Combined Filters, Search, Sort, and Pagination', () => {
    beforeEach(async () => {
      await pool.query(
        `INSERT INTO leads (name, status, provider, town, phone, user_id, number) VALUES 
         ('Alpha Corp', 'new', 'Telkom', 'Cape Town', '555-0001', $1, 1),
         ('Beta Inc', 'leads', 'Telkom', 'Cape Town', '555-0002', $1, 2),
         ('Gamma LLC', 'new', 'Vodacom', 'Durban', '555-0003', $1, 3),
         ('Delta Co', 'new', 'Telkom', 'Cape Town', '555-0004', $1, 4),
         ('Epsilon Ltd', 'leads', 'MTN', 'Johannesburg', '555-0005', $1, 5)`,
        [testUserId]
      );
    });

    it('should apply filters, search, and sort together', async () => {
      const request = new NextRequest(
        'http://localhost/api/leads?status=new&provider=Telkom&search=Corp&sortBy=name'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.leads).toHaveLength(2);
      expect(data.leads[0].name).toBe('Alpha Corp');
      expect(data.leads[1].name).toBe('Delta Co');
    });
  });
});
