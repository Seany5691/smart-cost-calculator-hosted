import type { Lead } from '@/lib/leads/types';
import type { EmailTemplate, EmailTemplateField, FieldValue } from './types';

/**
 * Validates if all required lead fields are present
 */
export function validateLeadFields(
  lead: Lead,
  fields: EmailTemplateField[]
): { valid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  for (const field of fields) {
    if (field.is_required && field.field_type === 'lead_field' && field.lead_field_source) {
      const leadValue = lead[field.lead_field_source as keyof Lead];
      if (!leadValue || (typeof leadValue === 'string' && !leadValue.trim())) {
        missingFields.push(field.field_label);
      }
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Formats a date for email display
 */
export function formatDateForEmail(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'long'
  });
}

/**
 * Generates email content by replacing placeholders with actual values
 */
export function generateEmailContent(
  template: EmailTemplate,
  lead: Lead,
  fieldValues: FieldValue
): string {
  let content = template.template_content;

  // Replace placeholders with actual values
  if (template.fields) {
    for (const field of template.fields) {
      const placeholder = `[${field.field_label}]`;
      let value = '';

      if (field.field_type === 'lead_field' && field.lead_field_source) {
        // Get value from lead
        value = String(lead[field.lead_field_source as keyof Lead] || '');
      } else if (field.field_type === 'bullet_list') {
        // Format bullet list
        const items = fieldValues[field.field_key] as string[];
        if (items && Array.isArray(items)) {
          value = items.map(item => `- ${item}`).join('\n');
        }
      } else if (field.field_type === 'date') {
        // Format date
        const dateValue = fieldValues[field.field_key];
        if (dateValue) {
          value = formatDateForEmail(dateValue as Date | string);
        }
      } else {
        // Get value from fieldValues
        value = String(fieldValues[field.field_key] || '');
      }

      // Replace all occurrences of the placeholder
      content = content.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }
  }

  return content;
}

/**
 * Validates field values before generating email
 */
export function validateFieldValues(
  fields: EmailTemplateField[],
  fieldValues: FieldValue
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const field of fields) {
    if (field.is_required && field.field_type !== 'lead_field') {
      const value = fieldValues[field.field_key];
      
      if (!value) {
        errors.push(`${field.field_label} is required`);
        continue;
      }

      if (field.field_type === 'bullet_list') {
        const items = value as string[];
        const minItems = field.options?.min_items || 1;
        
        if (!Array.isArray(items) || items.length < minItems) {
          errors.push(`${field.field_label} requires at least ${minItems} item(s)`);
        } else if (items.some(item => !item.trim())) {
          errors.push(`${field.field_label} cannot contain empty items`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Gets the display name for a lead field source
 */
export function getLeadFieldDisplayName(fieldSource: string): string {
  const fieldNames: Record<string, string> = {
    contact_person: 'Contact Person',
    name: 'Company Name',
    phone: 'Phone Number',
    address: 'Address',
    town: 'Town',
    provider: 'Provider',
    type_of_business: 'Type of Business',
    notes: 'Notes'
  };

  return fieldNames[fieldSource] || fieldSource;
}
