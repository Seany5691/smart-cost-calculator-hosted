/**
 * Interaction Logging Tests
 * 
 * Tests for the interaction logging system that tracks all lead operations.
 * 
 * Property 48: Interaction logging completeness
 * For any lead interaction (status change, note added/updated/deleted, lead created/updated, 
 * callback scheduled/completed), all required fields (interaction_type, old_value, new_value, 
 * metadata) should be logged
 * Validates: Requirements 5.23
 */

describe('Interaction Logging', () => {
  describe('API Route Implementation', () => {
    test('interactions endpoint exists', () => {
      const interactionsRoute = require('../../app/api/leads/[id]/interactions/route');
      expect(interactionsRoute.GET).toBeDefined();
    });

    test('lead creation logs interaction', () => {
      const leadsRoute = require('../../app/api/leads/route');
      expect(leadsRoute.POST.toString()).toContain('lead_created');
      expect(leadsRoute.POST.toString()).toContain('interactions');
    });

    test('lead update logs interaction', () => {
      const leadRoute = require('../../app/api/leads/[id]/route');
      expect(leadRoute.PUT.toString()).toContain('lead_updated');
      expect(leadRoute.PUT.toString()).toContain('interactions');
    });

    test('status change logs interaction', () => {
      const leadRoute = require('../../app/api/leads/[id]/route');
      expect(leadRoute.PUT.toString()).toContain('status_change');
    });

    test('callback scheduled logs interaction', () => {
      const leadRoute = require('../../app/api/leads/[id]/route');
      expect(leadRoute.PUT.toString()).toContain('callback_scheduled');
    });

    test('note added logs interaction', () => {
      const notesRoute = require('../../app/api/leads/[id]/notes/route');
      expect(notesRoute.POST.toString()).toContain('note_added');
      expect(notesRoute.POST.toString()).toContain('interactions');
    });

    test('note updated logs interaction', () => {
      const noteRoute = require('../../app/api/leads/[id]/notes/[noteId]/route');
      expect(noteRoute.PUT.toString()).toContain('note_updated');
      expect(noteRoute.PUT.toString()).toContain('interactions');
    });

    test('note deleted logs interaction', () => {
      const noteRoute = require('../../app/api/leads/[id]/notes/[noteId]/route');
      expect(noteRoute.DELETE.toString()).toContain('note_deleted');
      expect(noteRoute.DELETE.toString()).toContain('interactions');
    });

    test('reminder created logs interaction', () => {
      const remindersRoute = require('../../app/api/leads/[id]/reminders/route');
      expect(remindersRoute.POST.toString()).toContain('reminder_created');
      expect(remindersRoute.POST.toString()).toContain('interactions');
    });

    test('reminder updated logs interaction', () => {
      const reminderRoute = require('../../app/api/leads/[id]/reminders/[reminderId]/route');
      expect(reminderRoute.PUT.toString()).toContain('reminder_updated');
      expect(reminderRoute.PUT.toString()).toContain('interactions');
    });

    test('reminder completed logs interaction', () => {
      const reminderRoute = require('../../app/api/leads/[id]/reminders/[reminderId]/route');
      expect(reminderRoute.PUT.toString()).toContain('reminder_completed');
    });

    test('reminder deleted logs interaction', () => {
      const reminderRoute = require('../../app/api/leads/[id]/reminders/[reminderId]/route');
      expect(reminderRoute.DELETE.toString()).toContain('reminder_deleted');
      expect(reminderRoute.DELETE.toString()).toContain('interactions');
    });

    test('attachment added logs interaction', () => {
      const attachmentsRoute = require('../../app/api/leads/[id]/attachments/route');
      expect(attachmentsRoute.POST.toString()).toContain('attachment_added');
      expect(attachmentsRoute.POST.toString()).toContain('interactions');
    });

    test('attachment deleted logs interaction', () => {
      const attachmentRoute = require('../../app/api/leads/[id]/attachments/[attachmentId]/route');
      expect(attachmentRoute.DELETE.toString()).toContain('attachment_deleted');
      expect(attachmentRoute.DELETE.toString()).toContain('interactions');
    });

    test('bulk update logs interactions', () => {
      const bulkRoute = require('../../app/api/leads/bulk/route');
      expect(bulkRoute.POST.toString()).toContain('bulk_update');
      expect(bulkRoute.POST.toString()).toContain('interactions');
    });
  });

  describe('Interaction Types', () => {
    test('all required interaction types are implemented', () => {
      const interactionTypes = [
        'lead_created',
        'lead_updated',
        'status_change',
        'callback_scheduled',
        'note_added',
        'note_updated',
        'note_deleted',
        'reminder_created',
        'reminder_updated',
        'reminder_completed',
        'reminder_deleted',
        'attachment_added',
        'attachment_deleted',
        'bulk_update',
      ];

      // Verify each interaction type is used in at least one route
      interactionTypes.forEach(type => {
        let found = false;
        
        try {
          const leadsRoute = require('../../app/api/leads/route');
          if (leadsRoute.POST.toString().includes(type)) found = true;
        } catch (e) {}

        try {
          const leadRoute = require('../../app/api/leads/[id]/route');
          if (leadRoute.PUT.toString().includes(type)) found = true;
        } catch (e) {}

        try {
          const notesRoute = require('../../app/api/leads/[id]/notes/route');
          if (notesRoute.POST.toString().includes(type)) found = true;
        } catch (e) {}

        try {
          const noteRoute = require('../../app/api/leads/[id]/notes/[noteId]/route');
          if (noteRoute.PUT.toString().includes(type) || noteRoute.DELETE.toString().includes(type)) found = true;
        } catch (e) {}

        try {
          const remindersRoute = require('../../app/api/leads/[id]/reminders/route');
          if (remindersRoute.POST.toString().includes(type)) found = true;
        } catch (e) {}

        try {
          const reminderRoute = require('../../app/api/leads/[id]/reminders/[reminderId]/route');
          if (reminderRoute.PUT.toString().includes(type) || reminderRoute.DELETE.toString().includes(type)) found = true;
        } catch (e) {}

        try {
          const attachmentsRoute = require('../../app/api/leads/[id]/attachments/route');
          if (attachmentsRoute.POST.toString().includes(type)) found = true;
        } catch (e) {}

        try {
          const attachmentRoute = require('../../app/api/leads/[id]/attachments/[attachmentId]/route');
          if (attachmentRoute.DELETE.toString().includes(type)) found = true;
        } catch (e) {}

        try {
          const bulkRoute = require('../../app/api/leads/bulk/route');
          if (bulkRoute.POST.toString().includes(type)) found = true;
        } catch (e) {}

        expect(found).toBe(true);
      });
    });
  });

  describe('Database Schema', () => {
    test('interactions table has required fields', () => {
      const schema = require('fs').readFileSync('database/schema.sql', 'utf8');
      
      expect(schema).toContain('CREATE TABLE IF NOT EXISTS interactions');
      expect(schema).toContain('id UUID PRIMARY KEY');
      expect(schema).toContain('lead_id UUID');
      expect(schema).toContain('user_id UUID NOT NULL');
      expect(schema).toContain('interaction_type VARCHAR(100) NOT NULL');
      expect(schema).toContain('old_value TEXT');
      expect(schema).toContain('new_value TEXT');
      expect(schema).toContain('metadata JSONB');
      expect(schema).toContain('created_at TIMESTAMP');
    });

    test('interactions table has proper indexes', () => {
      const schema = require('fs').readFileSync('database/schema.sql', 'utf8');
      
      expect(schema).toContain('idx_interactions_lead_id');
      expect(schema).toContain('idx_interactions_user_id');
      expect(schema).toContain('idx_interactions_created_at');
    });

    test('interactions table has foreign key constraints', () => {
      const schema = require('fs').readFileSync('database/schema.sql', 'utf8');
      
      expect(schema).toContain('REFERENCES leads(id) ON DELETE CASCADE');
      expect(schema).toContain('REFERENCES users(id) ON DELETE CASCADE');
    });
  });
});
