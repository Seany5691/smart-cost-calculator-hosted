/**
 * Comprehensive tests for Leads CRUD API endpoints
 * 
 * Tests Task 4: API Routes - Leads CRUD Operations
 * Validates: Requirements 30.2-30.8, 22.1-22.12
 */

import { POST as CreateLead } from '@/app/api/leads/route';
import { GET as GetLead, PUT as UpdateLead, DELETE as DeleteLead } from '@/app/api/leads/[id]/route';
import { POST as BulkUpdate } from '@/app/api/leads/bulk/route';
import { GET as GetStats } from '@/app/api/leads/stats/route';
import { POST as Renumber } from '@/app/api/leads/renumber/route';
import { pool } from '@/lib/db';
import { NextRequest } from 'next/server';

// Mock the middleware
jest.mock('@/lib/middleware', () => ({
  verifyAuth: jest.fn().mockResolvedValue({
    authenticated: true,
    user: { userId: 'test-user-id', role: 'user' }
  })
}));

describe('Leads CRUD API Routes - Task 4', () => {
  const testUserId = 'test-user-id';
  let testLeadId: string;

  beforeEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM leads WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM interactions WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM activity_log WHERE user_id = $1', [testUserId]);
  });

  afterAll(async () => {
    // Clean up and close pool
    await pool.query('DELETE FROM leads WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM interactions WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM activity_log WHERE user_id = $1', [testUserId]);
    await pool.end();
  });

  describe('Task 4.2: POST /api/leads - Create new lead', () => {
    it('should create a new lead with auto-generated number', async () => {
      const request = new NextRequest('http://localhost/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Company',
          phone: '555-1234',
          provider: 'Telkom',
          address: '123 Main St',
          town: 'Cape Town',
          typeOfBusiness: 'Retail',
          status: 'new'
        })
      });

      const response = await CreateLead(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('Test Company');
      expect(data.number).toBe(1); // First lead should be number 1
      expect(data.status).toBe('new');
      expect(data.user_id).toBe(testUserId);

      testLeadId = data.id;
    });

    it('should auto-increment lead numbers', async () => {
      // Create first lead
      const request1 = new NextRequest('http://localhost/api/leads', {
        method: 'POST',
        body: JSON.stringify({ name: 'Lead 1', status: 'new' })
      });
      const response1 = await CreateLead(request1);
      const data1 = await response1.json();
      expect(data1.number).toBe(1);

      // Create second lead
      const request2 = new NextRequest('http://localhost/api/leads', {
        method: 'POST',
        body: JSON.stringify({ name: 'Lead 2', status: 'new' })
      });
      const response2 = await CreateLead(request2);
      const data2 = await response2.json();
      expect(data2.number).toBe(2);

      // Create third lead
      const request3 = new NextRequest('http://localhost/api/leads', {
        method: 'POST',
        body: JSON.stringify({ name: 'Lead 3', status: 'new' })
      });
      const response3 = await CreateLead(request3);
      const data3 = await response3.json();
      expect(data3.number).toBe(3);
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost/api/leads', {
        method: 'POST',
        body: JSON.stringify({ status: 'new' }) // Missing name
      });

      const response = await CreateLead(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Name is required');
    });

    it('should validate status-specific requirements for "later" status', async () => {
      const request = new NextRequest('http://localhost/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Lead',
          status: 'later'
          // Missing dateToCallBack
        })
      });

      const response = await CreateLead(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Date to call back is required');
    });

    it('should validate status-specific requirements for "signed" status', async () => {
      const request = new NextRequest('http://localhost/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Lead',
          status: 'signed'
          // Missing dateSigned
        })
      });

      const response = await CreateLead(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Date signed is required');
    });

    it('should create lead with all optional fields', async () => {
      const request = new NextRequest('http://localhost/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Complete Lead',
          phone: '555-9999',
          provider: 'Vodacom',
          address: '456 Oak Ave',
          town: 'Johannesburg',
          contactPerson: 'John Doe',
          typeOfBusiness: 'Manufacturing',
          status: 'leads',
          notes: 'Important client',
          mapsAddress: 'https://maps.google.com/?q=-26.2041,28.0473',
          backgroundColor: '#FFFFFF',
          listName: 'Import 2024-01'
        })
      });

      const response = await CreateLead(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('Complete Lead');
      expect(data.phone).toBe('555-9999');
      expect(data.provider).toBe('Vodacom');
      expect(data.list_name).toBe('Import 2024-01');
    });
  });

  describe('Task 4.3: GET /api/leads/[id] - Get single lead', () => {
    beforeEach(async () => {
      // Create a test lead
      const result = await pool.query(
        `INSERT INTO leads (name, status, user_id, number) 
         VALUES ('Test Lead', 'new', $1, 1) RETURNING id`,
        [testUserId]
      );
      testLeadId = result.rows[0].id;
    });

    it('should fetch a single lead by id', async () => {
      const request = new NextRequest(`http://localhost/api/leads/${testLeadId}`);
      const response = await GetLead(request, { params: { id: testLeadId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(testLeadId);
      expect(data.name).toBe('Test Lead');
    });

    it('should return 404 for non-existent lead', async () => {
      const fakeId = '99999';
      const request = new NextRequest(`http://localhost/api/leads/${fakeId}`);
      const response = await GetLead(request, { params: { id: fakeId } });

      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error).toContain('not found');
    });
  });

  describe('Task 4.4: PUT /api/leads/[id] - Update lead', () => {
    beforeEach(async () => {
      const result = await pool.query(
        `INSERT INTO leads (name, status, provider, user_id, number) 
         VALUES ('Original Name', 'new', 'Telkom', $1, 1) RETURNING id`,
        [testUserId]
      );
      testLeadId = result.rows[0].id;
    });

    it('should update lead fields', async () => {
      const request = new NextRequest(`http://localhost/api/leads/${testLeadId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Name',
          phone: '555-0000',
          provider: 'Vodacom'
        })
      });

      const response = await UpdateLead(request, { params: { id: testLeadId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('Updated Name');
      expect(data.phone).toBe('555-0000');
      expect(data.provider).toBe('Vodacom');
    });

    it('should update status and log interaction', async () => {
      const request = new NextRequest(`http://localhost/api/leads/${testLeadId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'leads' })
      });

      const response = await UpdateLead(request, { params: { id: testLeadId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('leads');

      // Verify interaction was logged
      const interactions = await pool.query(
        'SELECT * FROM interactions WHERE lead_id = $1 AND interaction_type = $2',
        [testLeadId, 'status_change']
      );
      expect(interactions.rows.length).toBeGreaterThan(0);
    });

    it('should validate status-specific requirements', async () => {
      const request = new NextRequest(`http://localhost/api/leads/${testLeadId}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'later'
          // Missing dateToCallBack
        })
      });

      const response = await UpdateLead(request, { params: { id: testLeadId } });
      expect(response.status).toBe(400);
    });

    it('should update updated_at timestamp', async () => {
      // Get original timestamp
      const original = await pool.query(
        'SELECT updated_at FROM leads WHERE id = $1',
        [testLeadId]
      );
      const originalTime = original.rows[0].updated_at;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update lead
      const request = new NextRequest(`http://localhost/api/leads/${testLeadId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'New Name' })
      });
      await UpdateLead(request, { params: { id: testLeadId } });

      // Check timestamp was updated
      const updated = await pool.query(
        'SELECT updated_at FROM leads WHERE id = $1',
        [testLeadId]
      );
      const updatedTime = updated.rows[0].updated_at;

      expect(new Date(updatedTime).getTime()).toBeGreaterThan(new Date(originalTime).getTime());
    });
  });

  describe('Task 4.5: DELETE /api/leads/[id] - Delete lead', () => {
    beforeEach(async () => {
      const result = await pool.query(
        `INSERT INTO leads (name, status, user_id, number) 
         VALUES ('To Delete', 'new', $1, 1) RETURNING id`,
        [testUserId]
      );
      testLeadId = result.rows[0].id;
    });

    it('should delete a lead', async () => {
      const request = new NextRequest(`http://localhost/api/leads/${testLeadId}`);
      const response = await DeleteLead(request, { params: { id: testLeadId } });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.message).toContain('deleted successfully');

      // Verify lead is deleted
      const check = await pool.query('SELECT * FROM leads WHERE id = $1', [testLeadId]);
      expect(check.rows.length).toBe(0);
    });

    it('should return 404 for non-existent lead', async () => {
      const fakeId = '99999';
      const request = new NextRequest(`http://localhost/api/leads/${fakeId}`);
      const response = await DeleteLead(request, { params: { id: fakeId } });

      expect(response.status).toBe(404);
    });

    it('should cascade delete related records', async () => {
      // Create related records (notes, reminders, etc.)
      await pool.query(
        `INSERT INTO lead_notes (lead_id, user_id, content) VALUES ($1, $2, $3)`,
        [testLeadId, testUserId, 'Test note']
      );

      // Delete lead
      const request = new NextRequest(`http://localhost/api/leads/${testLeadId}`);
      await DeleteLead(request, { params: { id: testLeadId } });

      // Verify notes are also deleted (cascade)
      const notes = await pool.query('SELECT * FROM lead_notes WHERE lead_id = $1', [testLeadId]);
      expect(notes.rows.length).toBe(0);
    });
  });

  describe('Task 4.6: POST /api/leads/bulk - Bulk operations', () => {
    let leadIds: string[];

    beforeEach(async () => {
      // Create multiple test leads
      const result = await pool.query(
        `INSERT INTO leads (name, status, provider, user_id, number) 
         VALUES 
           ('Lead 1', 'new', 'Telkom', $1, 1),
           ('Lead 2', 'new', 'Vodacom', $1, 2),
           ('Lead 3', 'new', 'MTN', $1, 3)
         RETURNING id`,
        [testUserId]
      );
      leadIds = result.rows.map(row => row.id);
    });

    it('should bulk update lead status', async () => {
      const request = new NextRequest('http://localhost/api/leads/bulk', {
        method: 'POST',
        body: JSON.stringify({
          leadIds: leadIds,
          updates: { status: 'leads' }
        })
      });

      const response = await BulkUpdate(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('Successfully updated 3 leads');

      // Verify all leads were updated
      const check = await pool.query(
        'SELECT status FROM leads WHERE id = ANY($1)',
        [leadIds]
      );
      expect(check.rows.every(row => row.status === 'leads')).toBe(true);
    });

    it('should bulk update multiple fields', async () => {
      const request = new NextRequest('http://localhost/api/leads/bulk', {
        method: 'POST',
        body: JSON.stringify({
          leadIds: leadIds,
          updates: {
            status: 'working',
            provider: 'Telkom',
            notes: 'Bulk updated'
          }
        })
      });

      const response = await BulkUpdate(request);
      expect(response.status).toBe(200);

      // Verify updates
      const check = await pool.query(
        'SELECT status, provider, notes FROM leads WHERE id = ANY($1)',
        [leadIds]
      );
      expect(check.rows.every(row => 
        row.status === 'working' && 
        row.provider === 'Telkom' && 
        row.notes === 'Bulk updated'
      )).toBe(true);
    });

    it('should validate leadIds are provided', async () => {
      const request = new NextRequest('http://localhost/api/leads/bulk', {
        method: 'POST',
        body: JSON.stringify({
          updates: { status: 'leads' }
          // Missing leadIds
        })
      });

      const response = await BulkUpdate(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Lead IDs are required');
    });

    it('should validate updates object is provided', async () => {
      const request = new NextRequest('http://localhost/api/leads/bulk', {
        method: 'POST',
        body: JSON.stringify({
          leadIds: leadIds
          // Missing updates
        })
      });

      const response = await BulkUpdate(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Updates object is required');
    });

    it('should log interactions for bulk updates', async () => {
      const request = new NextRequest('http://localhost/api/leads/bulk', {
        method: 'POST',
        body: JSON.stringify({
          leadIds: leadIds,
          updates: { status: 'leads' }
        })
      });

      await BulkUpdate(request);

      // Verify interactions were logged
      const interactions = await pool.query(
        'SELECT * FROM interactions WHERE lead_id = ANY($1) AND interaction_type = $2',
        [leadIds, 'bulk_update']
      );
      expect(interactions.rows.length).toBe(3);
    });
  });

  describe('Task 4.7: GET /api/leads/stats - Dashboard statistics', () => {
    beforeEach(async () => {
      // Create leads with various statuses
      await pool.query(
        `INSERT INTO leads (name, status, user_id, number) VALUES 
         ('Lead 1', 'new', $1, 1),
         ('Lead 2', 'new', $1, 2),
         ('Lead 3', 'leads', $1, 3),
         ('Lead 4', 'working', $1, 4),
         ('Lead 5', 'later', $1, 5),
         ('Lead 6', 'bad', $1, 6),
         ('Lead 7', 'signed', $1, 7)`,
        [testUserId]
      );
    });

    it('should return statistics for all lead statuses', async () => {
      const request = new NextRequest('http://localhost/api/leads/stats');
      const response = await GetStats(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalLeads).toBe(7);
      expect(data.newCount).toBe(2);
      expect(data.leadsCount).toBe(1);
      expect(data.workingCount).toBe(1);
      expect(data.laterCount).toBe(1);
      expect(data.badCount).toBe(1);
      expect(data.signedCount).toBe(1);
    });

    it('should return callback statistics', async () => {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      // Add leads with callbacks
      await pool.query(
        `INSERT INTO leads (name, status, date_to_call_back, user_id, number) VALUES 
         ('Callback Today', 'later', $1, $2, 10),
         ('Callback Tomorrow', 'later', $3, $2, 11)`,
        [today, testUserId, tomorrow]
      );

      const request = new NextRequest('http://localhost/api/leads/stats');
      const response = await GetStats(request);
      const data = await response.json();

      expect(data.callbacksToday).toBe(1);
      expect(data.callbacksUpcoming).toBeGreaterThanOrEqual(1);
    });

    it('should return zero counts when no leads exist', async () => {
      // Clean up all leads
      await pool.query('DELETE FROM leads WHERE user_id = $1', [testUserId]);

      const request = new NextRequest('http://localhost/api/leads/stats');
      const response = await GetStats(request);
      const data = await response.json();

      expect(data.totalLeads).toBe(0);
      expect(data.newCount).toBe(0);
      expect(data.leadsCount).toBe(0);
      expect(data.workingCount).toBe(0);
    });
  });

  describe('Task 4.8: POST /api/leads/renumber - Renumber leads', () => {
    beforeEach(async () => {
      // Create leads with non-sequential numbers
      await pool.query(
        `INSERT INTO leads (name, status, provider, user_id, number) VALUES 
         ('Lead A', 'new', 'Vodacom', $1, 5),
         ('Lead B', 'new', 'Telkom', $1, 10),
         ('Lead C', 'new', 'MTN', $1, 15),
         ('Lead D', 'new', 'Telkom', $1, 20)`,
        [testUserId]
      );
    });

    it('should renumber leads sequentially', async () => {
      const request = new NextRequest('http://localhost/api/leads/renumber', {
        method: 'POST',
        body: JSON.stringify({ status: 'new' })
      });

      const response = await Renumber(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('Successfully renumbered 4 leads');

      // Verify leads are numbered 1, 2, 3, 4
      const check = await pool.query(
        'SELECT number FROM leads WHERE user_id = $1 AND status = $2 ORDER BY number',
        [testUserId, 'new']
      );
      expect(check.rows.map(r => r.number)).toEqual([1, 2, 3, 4]);
    });

    it('should sort by provider priority when renumbering', async () => {
      const request = new NextRequest('http://localhost/api/leads/renumber', {
        method: 'POST',
        body: JSON.stringify({ status: 'new' })
      });

      await Renumber(request);

      // Verify Telkom leads come first (priority 1)
      const check = await pool.query(
        'SELECT name, provider, number FROM leads WHERE user_id = $1 AND status = $2 ORDER BY number',
        [testUserId, 'new']
      );
      
      // Telkom should be first
      expect(check.rows[0].provider).toBe('Telkom');
      expect(check.rows[1].provider).toBe('Telkom');
    });

    it('should validate status is provided', async () => {
      const request = new NextRequest('http://localhost/api/leads/renumber', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await Renumber(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Status is required');
    });

    it('should validate status is valid', async () => {
      const request = new NextRequest('http://localhost/api/leads/renumber', {
        method: 'POST',
        body: JSON.stringify({ status: 'invalid_status' })
      });

      const response = await Renumber(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Invalid status');
    });
  });

  describe('Integration: Complete CRUD Workflow', () => {
    it('should support full lead lifecycle', async () => {
      // 1. Create a lead
      const createRequest = new NextRequest('http://localhost/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Lifecycle Test',
          status: 'new',
          provider: 'Telkom'
        })
      });
      const createResponse = await CreateLead(createRequest);
      const created = await createResponse.json();
      expect(created.number).toBe(1);
      const leadId = created.id;

      // 2. Get the lead
      const getRequest = new NextRequest(`http://localhost/api/leads/${leadId}`);
      const getResponse = await GetLead(getRequest, { params: { id: leadId } });
      const fetched = await getResponse.json();
      expect(fetched.name).toBe('Lifecycle Test');

      // 3. Update the lead
      const updateRequest = new NextRequest(`http://localhost/api/leads/${leadId}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'leads',
          notes: 'Updated via test'
        })
      });
      const updateResponse = await UpdateLead(updateRequest, { params: { id: leadId } });
      const updated = await updateResponse.json();
      expect(updated.status).toBe('leads');
      expect(updated.notes).toBe('Updated via test');

      // 4. Delete the lead
      const deleteRequest = new NextRequest(`http://localhost/api/leads/${leadId}`);
      const deleteResponse = await DeleteLead(deleteRequest, { params: { id: leadId } });
      expect(deleteResponse.status).toBe(200);

      // 5. Verify deletion
      const verifyRequest = new NextRequest(`http://localhost/api/leads/${leadId}`);
      const verifyResponse = await GetLead(verifyRequest, { params: { id: leadId } });
      expect(verifyResponse.status).toBe(404);
    });
  });
});
