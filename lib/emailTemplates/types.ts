// Email Template Types

export type FieldType = 'text' | 'dropdown' | 'date' | 'bullet_list' | 'lead_field';

export interface EmailTemplateField {
  id: string;
  template_id: string;
  field_key: string;
  field_label: string;
  field_type: FieldType;
  lead_field_source?: string; // Maps to lead table column
  is_required: boolean;
  field_order: number;
  options?: {
    options?: string[]; // For dropdown
    min_items?: number; // For bullet_list
    max_items?: number; // For bullet_list
    default_count?: number; // For bullet_list
    [key: string]: any;
  };
  placeholder?: string;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  description?: string;
  template_content: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  fields?: EmailTemplateField[]; // Populated when fetching with fields
}

export interface EmailTemplateFormData {
  name: string;
  description?: string;
  template_content: string;
  is_active: boolean;
  fields: Omit<EmailTemplateField, 'id' | 'template_id' | 'created_at'>[];
}

export interface GenerateEmailRequest {
  template_id: string;
  lead_id: string;
  field_values: Record<string, any>; // Dynamic field values
}

export interface GenerateEmailResponse {
  success: boolean;
  email_content?: string;
  missing_fields?: string[]; // Required lead fields that are missing
  error?: string;
}

export interface FieldValue {
  [key: string]: string | string[] | Date;
}
