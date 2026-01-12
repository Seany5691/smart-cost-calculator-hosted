// PostgreSQL helper functions for leads management
import { postgresql } from '@/lib/postgresql';
import { Lead, Route, LeadNote, LeadInteraction, LeadStatus, LeadSearchFilters } from './types';

export const postgresqlLeads = {
  // =====================================================
  // LEADS OPERATIONS
  // =====================================================

  /**
   * Fetch a single lead by ID
   */
  async getLeadById(userId: string, leadId: string): Promise<Lead | null> {
    try {
      const query = `
        SELECT * FROM leads 
        WHERE user_id = $1 AND id = $2
      `;
      
      const result = await postgresql.query(query, [userId, leadId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return transformLeadFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error fetching lead by ID:', error);
      return null;
    }
  },

  /**
   * Fetch all leads for the current user with optional filters
   */
  async getLeads(userId: string, filters?: LeadSearchFilters): Promise<Lead[]> {
    try {
      let query = `
        SELECT * FROM leads 
        WHERE user_id = $1
      `;
      const params: any[] = [userId];

      // Apply filters
      if (filters?.status) {
        query += ` AND status = $${params.length + 1}`;
        params.push(filters.status);
      }

      if (filters?.list_name) {
        query += ` AND list_name = $${params.length + 1}`;
        params.push(filters.list_name);
      }

      if (filters?.provider) {
        query += ` AND provider = $${params.length + 1}`;
        params.push(filters.provider);
      }

      if (filters?.searchTerm) {
        // Search across multiple fields
        query += ` AND (
          name ILIKE $${params.length + 1} OR
          phone ILIKE $${params.length + 2} OR
          provider ILIKE $${params.length + 3} OR
          address ILIKE $${params.length + 4} OR
          type_of_business ILIKE $${params.length + 5}
        )`;
        const searchTerm = `%${filters.searchTerm}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      // Order by number within status
      query += ` ORDER BY number ASC`;

      const { rows } = await postgresql.query(query, params);

      // Transform snake_case database fields to camelCase for app compatibility
      return (rows || []).map(transformLeadFromDb);
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      throw new Error(error.message || 'Failed to fetch leads');
    }
  },

  /**
   * Fetch leads by specific status
   */
  async getLeadsByStatus(userId: string, status: LeadStatus): Promise<Lead[]> {
    return this.getLeads(userId, { status });
  },

  /**
   * Create a new lead
   */
  async createLead(userId: string, leadData: Partial<Lead>): Promise<Lead> {
    try {
      // Get the next number for the status
      const existingLeads = await this.getLeadsByStatus(userId, leadData.status || 'new');
      const nextNumber = existingLeads.length + 1;

      const dbLead = transformLeadToDb({
        ...leadData,
        user_id: userId,
        number: nextNumber,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Lead);

      const { rows } = await postgresql.query(`
        INSERT INTO leads (
          id, maps_address, number, name, phone, provider, address, town,
          contact_person, type_of_business, status, notes, date_to_call_back,
          date_signed, coordinates, background_color, list_name, user_id,
          import_session_id, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        )
        RETURNING *
      `, [
        dbLead.id, dbLead.maps_address, dbLead.number, dbLead.name, dbLead.phone,
        dbLead.provider, dbLead.address, dbLead.town, dbLead.contact_person,
        dbLead.type_of_business, dbLead.status, dbLead.notes, dbLead.date_to_call_back,
        dbLead.date_signed, dbLead.coordinates, dbLead.background_color,
        dbLead.list_name, dbLead.user_id, dbLead.import_session_id,
        dbLead.created_at, dbLead.updated_at
      ]);

      // Log interaction
      await this.createInteraction(userId, rows[0].id, 'lead_created', null, leadData.name || null);

      return transformLeadFromDb(rows[0]);
    } catch (error: any) {
      console.error('Error creating lead:', error);
      throw new Error(error.message || 'Failed to create lead');
    }
  },

  /**
   * Update an existing lead
   */
  async updateLead(userId: string, leadId: string, updates: Partial<Lead>): Promise<Lead> {
    try {
      const dbUpdates = transformLeadToDb({
        ...updates,
        updated_at: new Date().toISOString(),
      } as Lead);

      // Build dynamic update query
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(dbUpdates)) {
        if (key !== 'id') { // Don't update the ID
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      const query = `
        UPDATE leads 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      values.push(leadId, userId);

      const { rows } = await postgresql.query(query, values);

      if (rows.length === 0) {
        throw new Error('Lead not found or access denied');
      }

      // Log interaction
      await this.createInteraction(userId, leadId, 'lead_updated', null, null);

      return transformLeadFromDb(rows[0]);
    } catch (error: any) {
      console.error('Error updating lead:', error);
      throw new Error(error.message || 'Failed to update lead');
    }
  },

  /**
   * Bulk create multiple leads (for imports)
   */
  async bulkCreateLeads(userId: string, leadsData: Partial<Lead>[]): Promise<{ data: Lead[] | null; error: any }> {
    try {
      // Transform all leads to database format
      const dbLeads = leadsData.map((lead, index) => {
        const dbLead = transformLeadToDb({
          ...lead,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Lead);
        
        // Calculate number based on status
        return {
          ...dbLead,
          number: index + 1
        };
      });

      const { rows } = await postgresql.query(`
        INSERT INTO leads (
          id, maps_address, number, name, phone, provider, address, town,
          contact_person, type_of_business, status, notes, date_to_call_back,
          date_signed, coordinates, background_color, list_name, user_id,
          import_session_id, created_at, updated_at
        ) VALUES 
        ${dbLeads.map((_, index) => {
          const baseIndex = index * 21 + 1;
          return `($${baseIndex}, $${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, $${baseIndex + 12}, $${baseIndex + 13}, $${baseIndex + 14}, $${baseIndex + 15}, $${baseIndex + 16}, $${baseIndex + 17}, $${baseIndex + 18}, $${baseIndex + 19}, $${baseIndex + 20}, $${baseIndex + 21})`;
        }).join(', ')}
        RETURNING *
      `, dbLeads.flatMap(lead => [
        lead.id, lead.maps_address, lead.number, lead.name, lead.phone,
        lead.provider, lead.address, lead.town, lead.contact_person,
        lead.type_of_business, lead.status, lead.notes, lead.date_to_call_back,
        lead.date_signed, lead.coordinates, lead.background_color,
        lead.list_name, lead.user_id, lead.import_session_id,
        lead.created_at, lead.updated_at
      ]));

      // Transform back to app format
      const transformedData = rows ? rows.map(transformLeadFromDb) : null;
      return { data: transformedData, error: null };
    } catch (error: any) {
      console.error('Error bulk creating leads:', error);
      return { data: null, error };
    }
  },

  /**
   * Bulk delete multiple leads
   */
  async bulkDeleteLeads(userId: string, leadIds: string[]): Promise<void> {
    try {
      // Get all leads to be deleted for renumbering
      const leadsToDelete = await Promise.all(
        leadIds.map(id => this.getLeadById(userId, id))
      );
      
      // Group by status for renumbering
      const statusGroups = leadsToDelete.reduce((acc, lead) => {
        if (lead && lead.status) {
          if (!acc[lead.status]) acc[lead.status] = [];
          acc[lead.status].push(lead);
        }
        return acc;
      }, {} as Record<string, Lead[]>);

      // Delete all leads
      const placeholders = leadIds.map((_, index) => `$${index + 2}`).join(',');
      const query = `
        DELETE FROM leads 
        WHERE user_id = $1 AND id IN (${placeholders})
      `;
      
      await postgresql.query(query, [userId, ...leadIds]);

      // Renumber remaining leads in each affected status
      for (const [status, deletedLeads] of Object.entries(statusGroups)) {
        await this.renumberLeads(userId, status as LeadStatus);
      }
    } catch (error) {
      console.error('Error bulk deleting leads:', error);
      throw error;
    }
  },

  /**
   * Delete a lead
   */
  async deleteLead(userId: string, leadId: string): Promise<void> {
    try {
      const { rowCount } = await postgresql.query(`
        DELETE FROM leads 
        WHERE id = $1 AND user_id = $2
      `, [leadId, userId]);

      if (rowCount === 0) {
        throw new Error('Lead not found or access denied');
      }
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      throw new Error(error.message || 'Failed to delete lead');
    }
  },

  /**
   * Change lead status with automatic renumbering
   */
  async changeLeadStatus(
    userId: string,
    leadId: string,
    newStatus: LeadStatus,
    additionalData?: { notes?: string; date_to_call_back?: string; dateSigned?: string }
  ): Promise<void> {
    try {
      console.log('[changeLeadStatus] Called with:', { 
        leadId, 
        newStatus, 
        additionalData,
        hasDateSigned: !!additionalData?.dateSigned 
      });

      // Get the lead
      const { rows: [lead] } = await postgresql.query(`
        SELECT * FROM leads 
        WHERE id = $1 AND user_id = $2
      `, [leadId, userId]);

      if (!lead) {
        throw new Error('Lead not found or access denied');
      }

      const oldStatus = lead.status;

      // Get the next number for the new status
      const leadsInNewStatus = await this.getLeadsByStatus(userId, newStatus);
      const nextNumber = leadsInNewStatus.length + 1;

      // Update the lead
      const updates: any = {
        status: newStatus,
        number: nextNumber,
        updated_at: new Date().toISOString(),
      };

      // Handle date_to_call_back for "later" status
      if (additionalData?.date_to_call_back) {
        updates.date_to_call_back = additionalData.date_to_call_back;
      }

      // Handle dateSigned for "signed" status
      console.log('[changeLeadStatus] Checking dateSigned:', {
        newStatus,
        isSignedStatus: newStatus === 'signed',
        hasAdditionalData: !!additionalData,
        dateSigned: additionalData?.dateSigned,
        hasDateSigned: !!additionalData?.dateSigned
      });
      
      if (newStatus === 'signed' && additionalData?.dateSigned) {
        updates.date_signed = additionalData.dateSigned;
        console.log('[changeLeadStatus] Setting dateSigned to:', additionalData.dateSigned);
      }

      // Clear dateSigned if moving away from "signed" status
      if (oldStatus === 'signed' && newStatus !== 'signed') {
        updates.date_signed = null;
      }

      console.log('[changeLeadStatus] Updates to apply:', updates);

      // Build dynamic update query
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }

      values.push(leadId, userId);

      const { rowCount } = await postgresql.query(`
        UPDATE leads 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      `, values);

      if (rowCount === 0) {
        throw new Error('Failed to update lead');
      }

      console.log('[changeLeadStatus] Lead updated successfully');

      // Renumber the old status category if status changed
      if (oldStatus !== newStatus) {
        await this.renumberLeads(userId, oldStatus);
      }

      // Log interaction
      await this.createInteraction(userId, leadId, 'status_change', oldStatus, newStatus);

      // Add note if provided
      if (additionalData?.notes) {
        await this.createNote(userId, leadId, additionalData.notes);
      }
    } catch (error: any) {
      console.error('Error changing lead status:', error);
      throw new Error(error.message || 'Failed to change lead status');
    }
  },

  /**
   * Renumber leads in a specific status category
   */
  async renumberLeads(userId: string, status: LeadStatus): Promise<void> {
    try {
      const leads = await this.getLeadsByStatus(userId, status);

      // Update each lead with sequential numbers
      for (const [index, lead] of leads.entries()) {
        await postgresql.query(`
          UPDATE leads 
          SET number = $1, updated_at = NOW()
          WHERE id = $2 AND user_id = $3
        `, [index + 1, lead.id, userId]);
      }
    } catch (error: any) {
      console.error('Error renumbering leads:', error);
      throw new Error(error.message || 'Failed to renumber leads');
    }
  },

  /**
   * Bulk update multiple leads
   */
  async bulkUpdateLeads(
    userId: string,
    leadIds: string[],
    updates: Partial<Lead>
  ): Promise<{ successful: string[]; failed: Array<{ id: string; error: string }> }> {
    const results = {
      successful: [] as string[],
      failed: [] as Array<{ id: string; error: string }>,
    };

    for (const leadId of leadIds) {
      try {
        await this.updateLead(userId, leadId, updates);
        results.successful.push(leadId);
      } catch (error: any) {
        results.failed.push({
          id: leadId,
          error: error.message || 'Update failed',
        });
      }
    }

    return results;
  },

  /**
   * Get unique list names for the user
   */
  async getUniqueListNames(userId: string): Promise<string[]> {
    try {
      const { rows } = await postgresql.query(`
        SELECT DISTINCT list_name 
        FROM leads 
        WHERE user_id = $1 AND list_name IS NOT NULL
        ORDER BY list_name
      `, [userId]);

      return rows.map((row: any) => row.list_name).filter(Boolean);
    } catch (error: any) {
      console.error('Error fetching list names:', error);
      return [];
    }
  },

  /**
   * Delete all leads in a specific list
   */
  async deleteList(userId: string, listName: string): Promise<{ deletedCount: number }> {
    try {
      // First get count of leads to be deleted
      const { rows: [countResult] } = await postgresql.query(`
        SELECT COUNT(*) as count 
        FROM leads 
        WHERE user_id = $1 AND list_name = $2
      `, [userId, listName]);

      const deletedCount = parseInt(countResult.count);

      // Delete all leads with this list name
      await postgresql.query(`
        DELETE FROM leads 
        WHERE user_id = $1 AND list_name = $2
      `, [userId, listName]);

      return { deletedCount };
    } catch (error: any) {
      console.error('Error deleting list:', error);
      throw new Error(error.message || 'Failed to delete list');
    }
  },

  // =====================================================
  // ROUTES OPERATIONS
  // =====================================================

  /**
   * Fetch leads by their IDs
   */
  async getLeadsByIds(userId: string, leadIds: string[]): Promise<Lead[]> {
    try {
      if (leadIds.length === 0) return [];
      
      const placeholders = leadIds.map((_, index) => `$${index + 2}`).join(',');
      const query = `
        SELECT * FROM leads 
        WHERE user_id = $1 AND id IN (${placeholders})
        ORDER BY number
      `;
      
      const { rows } = await postgresql.query(query, [userId, ...leadIds]);
      
      return rows.map(transformLeadFromDb);
    } catch (error) {
      console.error('Error fetching leads by IDs:', error);
      return [];
    }
  },

  /**
   * Fetch all routes for the current user
   */
  async getRoutes(userId: string): Promise<Route[]> {
    try {
      const { rows } = await postgresql.query(`
        SELECT * FROM routes 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `, [userId]);

      return (rows || []).map(transformRouteFromDb);
    } catch (error: any) {
      console.error('Error fetching routes:', error);
      throw new Error(error.message || 'Failed to fetch routes');
    }
  },

  /**
   * Create a new route
   */
  async createRoute(userId: string, routeData: any): Promise<Route> {
    try {
      const query = `
        INSERT INTO routes (
          id, name, route_url, stop_count, lead_ids, 
          starting_point, notes, user_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `;
      
      const { rows } = await postgresql.query(query, [
        routeData.id || `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        routeData.name,
        routeData.routeUrl,
        routeData.stopCount || 0,
        JSON.stringify(routeData.leadIds || []),
        routeData.startingPoint || '',
        routeData.notes || '',
        userId,
        new Date().toISOString(),
        new Date().toISOString()
      ]);
      
      return transformRouteFromDb(rows[0]);
    } catch (error: any) {
      console.error('Error creating route:', error);
      throw new Error(error?.message || 'Failed to create route');
    }
  },
  /**
   * Delete a route
   */
  async deleteRoute(userId: string, routeId: string): Promise<void> {
    try {
      const { rowCount } = await postgresql.query(`
        DELETE FROM routes 
        WHERE id = $1 AND user_id = $2
      `, [routeId, userId]);

      if (rowCount === 0) {
        throw new Error('Route not found or access denied');
      }
    } catch (error: any) {
      console.error('Error deleting route:', error);
      throw new Error(error.message || 'Failed to delete route');
    }
  },

  // =====================================================
  // NOTES OPERATIONS
  // =====================================================

  /**
   * Fetch notes for a lead
   */
  async getNotes(userId: string, leadId: string): Promise<LeadNote[]> {
    try {
      const { rows } = await postgresql.query(`
        SELECT * FROM lead_notes 
        WHERE lead_id = $1 
        ORDER BY created_at DESC
      `, [leadId]);

      return (rows || []).map(transformNoteFromDb);
    } catch (error: any) {
      console.error('Error fetching notes:', error);
      throw new Error(error.message || 'Failed to fetch notes');
    }
  },

  /**
   * Create a new note
   */
  async createNote(userId: string, leadId: string, content: string): Promise<LeadNote> {
    try {
      const { rows } = await postgresql.query(`
        INSERT INTO lead_notes (lead_id, user_id, content, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING *
      `, [leadId, userId, content]);

      // Log interaction
      await this.createInteraction(userId, leadId, 'note_added', null, content);

      return transformNoteFromDb(rows[0]);
    } catch (error: any) {
      console.error('Error creating note:', error);
      throw new Error(error.message || 'Failed to create note');
    }
  },

  /**
   * Update a note
   */
  async updateNote(userId: string, noteId: string, content: string): Promise<LeadNote> {
    try {
      const { rows } = await postgresql.query(`
        UPDATE lead_notes 
        SET content = $1, updated_at = NOW()
        WHERE id = $2 AND user_id = $3
        RETURNING *
      `, [content, noteId, userId]);

      if (rows.length === 0) {
        throw new Error('Note not found or access denied');
      }

      // Log interaction
      await this.createInteraction(userId, rows[0].lead_id, 'note_updated', null, content);

      return transformNoteFromDb(rows[0]);
    } catch (error: any) {
      console.error('Error updating note:', error);
      throw new Error(error.message || 'Failed to update note');
    }
  },

  /**
   * Delete a note
   */
  async deleteNote(userId: string, noteId: string): Promise<void> {
    try {
      const { rowCount } = await postgresql.query(`
        DELETE FROM lead_notes 
        WHERE id = $1 AND user_id = $2
      `, [noteId, userId]);

      if (rowCount === 0) {
        throw new Error('Note not found or access denied');
      }
    } catch (error: any) {
      console.error('Error deleting note:', error);
      throw new Error(error.message || 'Failed to delete note');
    }
  },

  // =====================================================
  // INTERACTIONS OPERATIONS
  // =====================================================

  /**
   * Create an interaction log entry
   */
  async createInteraction(
    userId: string,
    leadId: string,
    interactionType: string,
    oldValue: string | null,
    newValue: string | null,
    metadata?: any
  ): Promise<void> {
    try {
      await postgresql.query(`
        INSERT INTO lead_interactions (
          lead_id, user_id, interaction_type, old_value, new_value, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [leadId, userId, interactionType, oldValue, newValue, JSON.stringify(metadata || {})]);
    } catch (error: any) {
      // Don't throw on interaction logging errors
      console.error('Error creating interaction:', error);
    }
  },

  /**
   * Fetch interactions for a lead
   */
  async getInteractions(userId: string, leadId: string): Promise<LeadInteraction[]> {
    try {
      const { rows } = await postgresql.query(`
        SELECT * FROM lead_interactions 
        WHERE lead_id = $1 
        ORDER BY created_at DESC
      `, [leadId]);

      return (rows || []).map(transformInteractionFromDb);
    } catch (error: any) {
      console.error('Error fetching interactions:', error);
      return [];
    }
  },
};

// =====================================================
// TRANSFORMATION FUNCTIONS
// =====================================================

/**
 * Transform database lead (snake_case) to app lead (camelCase)
 */
function transformLeadFromDb(dbLead: any): Lead {
  const transformed = {
    id: dbLead.id,
    maps_address: dbLead.maps_address,
    number: dbLead.number,
    name: dbLead.name,
    phone: dbLead.phone,
    provider: dbLead.provider,
    address: dbLead.address,
    town: dbLead.town,
    contact_person: dbLead.contact_person,
    type_of_business: dbLead.type_of_business,
    status: dbLead.status,
    notes: dbLead.notes,
    date_to_call_back: dbLead.date_to_call_back,
    dateSigned: dbLead.date_signed,
    coordinates: dbLead.coordinates,
    background_color: dbLead.background_color,
    list_name: dbLead.list_name,
    user_id: dbLead.user_id,
    import_session_id: dbLead.import_session_id,
    created_at: dbLead.created_at,
    updated_at: dbLead.updated_at,
  };
  
  // Debug logging for signed leads
  if (transformed.status === 'signed') {
    console.log('[transformLeadFromDb] Signed lead:', {
      name: transformed.name,
      dateSigned: transformed.dateSigned,
      dbDateSigned: dbLead.date_signed,
      updated_at: transformed.updated_at
    });
  }
  
  return transformed;
}

/**
 * Transform app lead (camelCase) to database lead (snake_case)
 */
function transformLeadToDb(lead: Partial<Lead>): any {
  const dbLead: any = {};

  if (lead.id !== undefined) dbLead.id = lead.id;
  if (lead.maps_address !== undefined) dbLead.maps_address = lead.maps_address;
  if (lead.number !== undefined) dbLead.number = lead.number;
  if (lead.name !== undefined) dbLead.name = lead.name;
  if (lead.phone !== undefined) dbLead.phone = lead.phone;
  if (lead.provider !== undefined) dbLead.provider = lead.provider;
  if (lead.address !== undefined) dbLead.address = lead.address;
  if (lead.town !== undefined) dbLead.town = lead.town;
  if (lead.contact_person !== undefined) dbLead.contact_person = lead.contact_person;
  if (lead.type_of_business !== undefined) dbLead.type_of_business = lead.type_of_business;
  if (lead.status !== undefined) dbLead.status = lead.status;
  if (lead.notes !== undefined) dbLead.notes = lead.notes;
  if (lead.date_to_call_back !== undefined) dbLead.date_to_call_back = lead.date_to_call_back;
  if (lead.dateSigned !== undefined) dbLead.date_signed = lead.dateSigned;
  if (lead.coordinates !== undefined) dbLead.coordinates = lead.coordinates;
  if (lead.background_color !== undefined) dbLead.background_color = lead.background_color;
  if (lead.list_name !== undefined) dbLead.list_name = lead.list_name;
  if (lead.user_id !== undefined) dbLead.user_id = lead.user_id;
  if (lead.import_session_id !== undefined) dbLead.import_session_id = lead.import_session_id;
  if (lead.created_at !== undefined) dbLead.created_at = lead.created_at;
  if (lead.updated_at !== undefined) dbLead.updated_at = lead.updated_at;

  return dbLead;
}

/**
 * Transform database route (snake_case) to app route (camelCase)
 */
function transformRouteFromDb(dbRoute: any): Route {
  return {
    id: dbRoute.id,
    name: dbRoute.name,
    route_url: dbRoute.route_url,
    stop_count: dbRoute.stop_count,
    lead_ids: dbRoute.lead_ids || [],
    starting_point: dbRoute.starting_point,
    notes: dbRoute.notes,
    user_id: dbRoute.user_id,
    created_at: dbRoute.created_at,
  };
}

/**
 * Transform app route (camelCase) to database route (snake_case)
 */
function transformRouteToDb(route: Partial<Route>): any {
  const dbRoute: any = {};

  if (route.id !== undefined) dbRoute.id = route.id;
  if (route.name !== undefined) dbRoute.name = route.name;
  if (route.route_url !== undefined) dbRoute.route_url = route.route_url;
  if (route.stop_count !== undefined) dbRoute.stop_count = route.stop_count;
  if (route.lead_ids !== undefined) dbRoute.lead_ids = route.lead_ids;
  if (route.starting_point !== undefined) dbRoute.starting_point = route.starting_point;
  if (route.notes !== undefined) dbRoute.notes = route.notes;
  if (route.user_id !== undefined) dbRoute.user_id = route.user_id;
  if (route.created_at !== undefined) dbRoute.created_at = route.created_at;

  return dbRoute;
}

/**
 * Transform database note (snake_case) to app note (camelCase)
 */
function transformNoteFromDb(dbNote: any): LeadNote {
  return {
    id: dbNote.id,
    lead_id: dbNote.lead_id,
    user_id: dbNote.user_id,
    content: dbNote.content,
    created_at: dbNote.created_at,
    updated_at: dbNote.updated_at,
  };
}

/**
 * Transform database interaction (snake_case) to app interaction (camelCase)
 */
function transformInteractionFromDb(dbInteraction: any): LeadInteraction {
  return {
    id: dbInteraction.id,
    lead_id: dbInteraction.lead_id,
    user_id: dbInteraction.user_id,
    interaction_type: dbInteraction.interaction_type,
    old_value: dbInteraction.old_value,
    new_value: dbInteraction.new_value,
    metadata: dbInteraction.metadata,
    created_at: dbInteraction.created_at,
  };
}
