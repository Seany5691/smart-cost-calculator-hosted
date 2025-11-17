// Supabase helper functions for leads management
import { supabase } from '@/lib/supabase';
import { Lead, Route, LeadNote, LeadInteraction, LeadStatus, LeadSearchFilters } from './types';

export const supabaseLeads = {
  // =====================================================
  // LEADS OPERATIONS
  // =====================================================

  /**
   * Fetch all leads for the current user with optional filters
   */
  async getLeads(userId: string, filters?: LeadSearchFilters): Promise<Lead[]> {
    try {
      let query = supabase
        .from('leads')
        .select('*')
        .eq('userId', userId);

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.list_name) {
        query = query.eq('listName', filters.list_name);
      }

      if (filters?.provider) {
        query = query.eq('provider', filters.provider);
      }

      if (filters?.searchTerm) {
        // Search across multiple fields
        query = query.or(
          `name.ilike.%${filters.searchTerm}%,` +
          `phone.ilike.%${filters.searchTerm}%,` +
          `provider.ilike.%${filters.searchTerm}%,` +
          `address.ilike.%${filters.searchTerm}%,` +
          `typeOfBusiness.ilike.%${filters.searchTerm}%`
        );
      }

      // Order by number within status
      query = query.order('number', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      // Transform camelCase database fields to snake_case for app compatibility
      return (data || []).map(transformLeadFromDb);
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

      const { data, error } = await supabase
        .from('leads')
        .insert(dbLead)
        .select()
        .single();

      if (error) throw error;

      // Log interaction
      await this.createInteraction(userId, data.id, 'lead_created', null, leadData.name || null);

      return transformLeadFromDb(data);
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

      const { data, error } = await supabase
        .from('leads')
        .update(dbUpdates)
        .eq('id', leadId)
        .eq('userId', userId)
        .select()
        .single();

      if (error) throw error;

      // Log interaction
      await this.createInteraction(userId, leadId, 'lead_updated', null, null);

      return transformLeadFromDb(data);
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
      const dbLeads = leadsData.map(lead => transformLeadToDb({
        ...lead,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Lead));

      const { data, error } = await supabase
        .from('leads')
        .insert(dbLeads)
        .select();

      if (error) {
        return { data: null, error };
      }

      // Transform back to app format
      const transformedData = data ? data.map(transformLeadFromDb) : null;
      return { data: transformedData, error: null };
    } catch (error: any) {
      console.error('Error bulk creating leads:', error);
      return { data: null, error };
    }
  },

  /**
   * Delete a lead
   */
  async deleteLead(userId: string, leadId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId)
        .eq('userId', userId);

      if (error) throw error;
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
    additionalData?: { notes?: string; date_to_call_back?: string }
  ): Promise<void> {
    try {
      // Get the lead
      const { data: lead, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .eq('userId', userId)
        .single();

      if (fetchError) throw fetchError;

      const oldStatus = lead.status;

      // Get the next number for the new status
      const leadsInNewStatus = await this.getLeadsByStatus(userId, newStatus);
      const nextNumber = leadsInNewStatus.length + 1;

      // Update the lead
      const updates: any = {
        status: newStatus,
        number: nextNumber,
        updatedAt: new Date().toISOString(),
      };

      if (additionalData?.date_to_call_back) {
        updates.dateToCallBack = additionalData.date_to_call_back;
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId)
        .eq('userId', userId);

      if (updateError) throw updateError;

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
      const updates = leads.map((lead, index) => ({
        id: lead.id,
        number: index + 1,
        updatedAt: new Date().toISOString(),
      }));

      for (const update of updates) {
        await supabase
          .from('leads')
          .update({ number: update.number, updatedAt: update.updatedAt })
          .eq('id', update.id)
          .eq('userId', userId);
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
      const { data, error } = await supabase
        .from('leads')
        .select('listName')
        .eq('userId', userId)
        .not('listName', 'is', null);

      if (error) throw error;

      const listNames = new Set<string>();
      data?.forEach((row: any) => {
        if (row.listName) {
          listNames.add(row.listName);
        }
      });

      return Array.from(listNames).sort();
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
      const { data: leadsToDelete, error: countError } = await supabase
        .from('leads')
        .select('id')
        .eq('userId', userId)
        .eq('listName', listName);

      if (countError) throw countError;

      const deletedCount = leadsToDelete?.length || 0;

      // Delete all leads with this list name
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('userId', userId)
        .eq('listName', listName);

      if (error) throw error;

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
   * Fetch all routes for the current user
   */
  async getRoutes(userId: string): Promise<Route[]> {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });

      if (error) throw error;

      return (data || []).map(transformRouteFromDb);
    } catch (error: any) {
      console.error('Error fetching routes:', error);
      throw new Error(error.message || 'Failed to fetch routes');
    }
  },

  /**
   * Create a new route
   */
  async createRoute(userId: string, routeData: Partial<Route>): Promise<Route> {
    try {
      const dbRoute = transformRouteToDb({
        ...routeData,
        user_id: userId,
        created_at: new Date().toISOString(),
      } as Route);

      const { data, error } = await supabase
        .from('routes')
        .insert(dbRoute)
        .select()
        .single();

      if (error) throw error;

      return transformRouteFromDb(data);
    } catch (error: any) {
      console.error('Error creating route:', error);
      throw new Error(error.message || 'Failed to create route');
    }
  },

  /**
   * Delete a route
   */
  async deleteRoute(userId: string, routeId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', routeId)
        .eq('userId', userId);

      if (error) throw error;
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
      const { data, error } = await supabase
        .from('lead_notes')
        .select('*')
        .eq('leadId', leadId)
        .order('createdAt', { ascending: false });

      if (error) throw error;

      return (data || []).map(transformNoteFromDb);
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
      const { data, error } = await supabase
        .from('lead_notes')
        .insert({
          leadId,
          userId,
          content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Log interaction
      await this.createInteraction(userId, leadId, 'note_added', null, content);

      return transformNoteFromDb(data);
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
      const { data, error } = await supabase
        .from('lead_notes')
        .update({
          content,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', noteId)
        .eq('userId', userId)
        .select()
        .single();

      if (error) throw error;

      // Log interaction
      await this.createInteraction(userId, data.leadId, 'note_updated', null, content);

      return transformNoteFromDb(data);
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
      const { error } = await supabase
        .from('lead_notes')
        .delete()
        .eq('id', noteId)
        .eq('userId', userId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting note:', error);
      throw new Error(error.message || 'Failed to delete note');
    }
  },

  // =====================================================
  // ATTACHMENTS OPERATIONS
  // =====================================================

  /**
   * Upload a file attachment for a lead
   */
  async uploadAttachment(
    userId: string,
    leadId: string,
    file: File,
    description?: string
  ): Promise<any> {
    try {
      // Generate unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `${userId}/${leadId}/${fileName}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lead-attachments')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create attachment record in database
      const { data, error } = await supabase
        .from('lead_attachments')
        .insert({
          leadId,
          userId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          storagePath,
          description,
          createdAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Log interaction
      await this.createInteraction(userId, leadId, 'attachment_added', null, file.name);

      return {
        id: data.id,
        lead_id: data.leadId,
        user_id: data.userId,
        file_name: data.fileName,
        file_type: data.fileType,
        file_size: data.fileSize,
        storage_path: data.storagePath,
        description: data.description,
        created_at: data.createdAt,
      };
    } catch (error: any) {
      console.error('Error uploading attachment:', error);
      throw new Error(error.message || 'Failed to upload attachment');
    }
  },

  /**
   * Get all attachments for a lead
   */
  async getAttachments(userId: string, leadId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('lead_attachments')
        .select('*')
        .eq('leadId', leadId)
        .order('createdAt', { ascending: false });

      if (error) throw error;

      return (data || []).map((attachment: any) => ({
        id: attachment.id,
        lead_id: attachment.leadId,
        user_id: attachment.userId,
        file_name: attachment.fileName,
        file_type: attachment.fileType,
        file_size: attachment.fileSize,
        storage_path: attachment.storagePath,
        description: attachment.description,
        created_at: attachment.createdAt,
      }));
    } catch (error: any) {
      console.error('Error fetching attachments:', error);
      throw new Error(error.message || 'Failed to fetch attachments');
    }
  },

  /**
   * Get download URL for an attachment
   */
  async getAttachmentUrl(storagePath: string): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from('lead-attachments')
        .createSignedUrl(storagePath, 3600); // URL valid for 1 hour

      if (error) throw error;

      return data.signedUrl;
    } catch (error: any) {
      console.error('Error getting attachment URL:', error);
      throw new Error(error.message || 'Failed to get attachment URL');
    }
  },

  /**
   * Download an attachment
   */
  async downloadAttachment(storagePath: string): Promise<Blob> {
    try {
      const { data, error } = await supabase.storage
        .from('lead-attachments')
        .download(storagePath);

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Error downloading attachment:', error);
      throw new Error(error.message || 'Failed to download attachment');
    }
  },

  /**
   * Delete an attachment
   */
  async deleteAttachment(userId: string, attachmentId: string): Promise<void> {
    try {
      // Get attachment details first
      const { data: attachment, error: fetchError } = await supabase
        .from('lead_attachments')
        .select('*')
        .eq('id', attachmentId)
        .eq('userId', userId)
        .single();

      if (fetchError) throw fetchError;

      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('lead-attachments')
        .remove([attachment.storagePath]);

      if (storageError) throw storageError;

      // Delete record from database
      const { error: dbError } = await supabase
        .from('lead_attachments')
        .delete()
        .eq('id', attachmentId)
        .eq('userId', userId);

      if (dbError) throw dbError;

      // Log interaction
      await this.createInteraction(
        userId,
        attachment.leadId,
        'attachment_deleted',
        attachment.fileName,
        null
      );
    } catch (error: any) {
      console.error('Error deleting attachment:', error);
      throw new Error(error.message || 'Failed to delete attachment');
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
      await supabase.from('lead_interactions').insert({
        leadId,
        userId,
        interactionType,
        oldValue,
        newValue,
        metadata,
        createdAt: new Date().toISOString(),
      });
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
      const { data, error } = await supabase
        .from('lead_interactions')
        .select('*')
        .eq('leadId', leadId)
        .order('createdAt', { ascending: false });

      if (error) throw error;

      return (data || []).map(transformInteractionFromDb);
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
 * Transform database lead (camelCase) to app lead (snake_case)
 */
function transformLeadFromDb(dbLead: any): Lead {
  return {
    id: dbLead.id,
    maps_address: dbLead.mapsAddress,
    number: dbLead.number,
    name: dbLead.name,
    phone: dbLead.phone,
    provider: dbLead.provider,
    address: dbLead.address,
    town: dbLead.town,
    contact_person: dbLead.contactPerson,
    type_of_business: dbLead.typeOfBusiness,
    status: dbLead.status,
    notes: dbLead.notes,
    date_to_call_back: dbLead.dateToCallBack,
    coordinates: dbLead.coordinates,
    background_color: dbLead.backgroundColor,
    list_name: dbLead.listName,
    user_id: dbLead.userId,
    import_session_id: dbLead.importSessionId,
    created_at: dbLead.createdAt,
    updated_at: dbLead.updatedAt,
  };
}

/**
 * Transform app lead (snake_case) to database lead (camelCase)
 */
function transformLeadToDb(lead: Partial<Lead>): any {
  const dbLead: any = {};

  if (lead.id !== undefined) dbLead.id = lead.id;
  if (lead.maps_address !== undefined) dbLead.mapsAddress = lead.maps_address;
  if (lead.number !== undefined) dbLead.number = lead.number;
  if (lead.name !== undefined) dbLead.name = lead.name;
  if (lead.phone !== undefined) dbLead.phone = lead.phone;
  if (lead.provider !== undefined) dbLead.provider = lead.provider;
  if (lead.address !== undefined) dbLead.address = lead.address;
  if (lead.town !== undefined) dbLead.town = lead.town;
  if (lead.contact_person !== undefined) dbLead.contactPerson = lead.contact_person;
  if (lead.type_of_business !== undefined) dbLead.typeOfBusiness = lead.type_of_business;
  if (lead.status !== undefined) dbLead.status = lead.status;
  if (lead.notes !== undefined) dbLead.notes = lead.notes;
  if (lead.date_to_call_back !== undefined) dbLead.dateToCallBack = lead.date_to_call_back;
  if (lead.coordinates !== undefined) dbLead.coordinates = lead.coordinates;
  if (lead.background_color !== undefined) dbLead.backgroundColor = lead.background_color;
  if (lead.list_name !== undefined) dbLead.listName = lead.list_name;
  if (lead.user_id !== undefined) dbLead.userId = lead.user_id;
  if (lead.import_session_id !== undefined) dbLead.importSessionId = lead.import_session_id;
  if (lead.created_at !== undefined) dbLead.createdAt = lead.created_at;
  if (lead.updated_at !== undefined) dbLead.updatedAt = lead.updated_at;

  return dbLead;
}

/**
 * Transform database route (camelCase) to app route (snake_case)
 */
function transformRouteFromDb(dbRoute: any): Route {
  return {
    id: dbRoute.id,
    name: dbRoute.name,
    route_url: dbRoute.routeUrl,
    stop_count: dbRoute.stopCount,
    lead_ids: dbRoute.leadIds || [],
    starting_point: dbRoute.startingPoint,
    notes: dbRoute.notes,
    user_id: dbRoute.userId,
    created_at: dbRoute.createdAt,
  };
}

/**
 * Transform app route (snake_case) to database route (camelCase)
 */
function transformRouteToDb(route: Partial<Route>): any {
  const dbRoute: any = {};

  if (route.id !== undefined) dbRoute.id = route.id;
  if (route.name !== undefined) dbRoute.name = route.name;
  if (route.route_url !== undefined) dbRoute.routeUrl = route.route_url;
  if (route.stop_count !== undefined) dbRoute.stopCount = route.stop_count;
  if (route.lead_ids !== undefined) dbRoute.leadIds = route.lead_ids;
  if (route.starting_point !== undefined) dbRoute.startingPoint = route.starting_point;
  if (route.notes !== undefined) dbRoute.notes = route.notes;
  if (route.user_id !== undefined) dbRoute.userId = route.user_id;
  if (route.created_at !== undefined) dbRoute.createdAt = route.created_at;

  return dbRoute;
}

/**
 * Transform database note (camelCase) to app note (snake_case)
 */
function transformNoteFromDb(dbNote: any): LeadNote {
  return {
    id: dbNote.id,
    lead_id: dbNote.leadId,
    user_id: dbNote.userId,
    content: dbNote.content,
    created_at: dbNote.createdAt,
    updated_at: dbNote.updatedAt,
  };
}

/**
 * Transform database interaction (camelCase) to app interaction (snake_case)
 */
function transformInteractionFromDb(dbInteraction: any): LeadInteraction {
  return {
    id: dbInteraction.id,
    lead_id: dbInteraction.leadId,
    user_id: dbInteraction.userId,
    interaction_type: dbInteraction.interactionType,
    old_value: dbInteraction.oldValue,
    new_value: dbInteraction.newValue,
    metadata: dbInteraction.metadata,
    created_at: dbInteraction.createdAt,
  };
}
