'use client';

import { useState, useEffect } from 'react';
import { Mail, Plus, Edit, Trash2, Loader2, Save, X, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import type { EmailTemplate, EmailTemplateField, FieldType } from '@/lib/emailTemplates/types';

// Helper function to get auth token
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const data = JSON.parse(stored);
      return data.state?.token || data.token || null;
    }
  } catch (error) {
    console.error('Error reading auth token:', error);
  }
  return null;
}

export default function EmailTemplatesConfig() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formFields, setFormFields] = useState<Omit<EmailTemplateField, 'id' | 'template_id' | 'created_at'>[]>([]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch('/api/email-templates', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch templates');

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    setIsCreating(true);
    setEditingTemplate(null);
    setFormName('');
    setFormDescription('');
    setFormContent('');
    setFormIsActive(true);
    setFormFields([]);
    setError('');
  };

  const startEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setIsCreating(false);
    setFormName(template.name);
    setFormDescription(template.description || '');
    setFormContent(template.template_content);
    setFormIsActive(template.is_active);
    setFormFields(template.fields?.map(f => ({
      field_key: f.field_key,
      field_label: f.field_label,
      field_type: f.field_type,
      lead_field_source: f.lead_field_source,
      is_required: f.is_required,
      field_order: f.field_order,
      options: f.options,
      placeholder: f.placeholder
    })) || []);
    setError('');
  };

  const cancelEdit = () => {
    setEditingTemplate(null);
    setIsCreating(false);
    setError('');
  };

  const addField = () => {
    setFormFields([...formFields, {
      field_key: '',
      field_label: '',
      field_type: 'text',
      is_required: false,
      field_order: formFields.length,
      options: undefined,
      placeholder: ''
    }]);
  };

  const updateField = (index: number, updates: Partial<Omit<EmailTemplateField, 'id' | 'template_id' | 'created_at'>>) => {
    const newFields = [...formFields];
    newFields[index] = { ...newFields[index], ...updates };
    setFormFields(newFields);
  };

  const removeField = (index: number) => {
    setFormFields(formFields.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === formFields.length - 1) return;

    const newFields = [...formFields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    
    // Update field_order
    newFields.forEach((field, idx) => {
      field.field_order = idx;
    });
    
    setFormFields(newFields);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formContent.trim()) {
      setError('Name and template content are required');
      return;
    }

    // Validate fields
    for (const field of formFields) {
      if (!field.field_key.trim() || !field.field_label.trim()) {
        setError('All fields must have a key and label');
        return;
      }
      
      // CRITICAL: Validate that lead_field type has a lead_field_source
      if (field.field_type === 'lead_field' && (!field.lead_field_source || !field.lead_field_source.trim())) {
        setError(`Field "${field.field_label}" is set to "Lead Field" type but has no Lead Field Source selected. Please select a source field.`);
        return;
      }
    }

    setSaving(true);
    setError('');

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const payload = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        template_content: formContent.trim(),
        is_active: formIsActive,
        fields: formFields
      };

      const url = editingTemplate 
        ? `/api/email-templates/${editingTemplate.id}`
        : '/api/email-templates';
      
      const method = editingTemplate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save template');
      }

      await fetchTemplates();
      cancelEdit();
    } catch (err) {
      console.error('Error saving template:', err);
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/email-templates/${templateId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      await fetchTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (isCreating || editingTemplate) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">
            {isCreating ? 'Create New Template' : 'Edit Template'}
          </h3>
          <button
            onClick={cancelEdit}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            disabled={saving}
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Template Name */}
          <div>
            <label className="block text-white font-medium mb-2">
              Template Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Document Request Email"
              className="w-full px-4 py-2 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              disabled={saving}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-white font-medium mb-2">Description</label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Brief description of this template"
              className="w-full px-4 py-2 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              disabled={saving}
            />
          </div>

          {/* Template Content */}
          <div>
            <label className="block text-white font-medium mb-2">
              Template Content <span className="text-red-400">*</span>
            </label>
            <p className="text-sm text-purple-300 mb-2">
              Use [Field Label] as placeholders. Example: [Contact Person], [Company Name]
            </p>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={12}
              placeholder="Dear [Contact Person],&#10;&#10;..."
              className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500 font-mono text-sm resize-none"
              disabled={saving}
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is-active"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
              className="rounded border-purple-500/30 bg-white/10 text-purple-500 focus:ring-purple-500"
              disabled={saving}
            />
            <label htmlFor="is-active" className="text-white font-medium">
              Active (visible to users)
            </label>
          </div>

          {/* Fields */}
          <div className="border-t border-purple-500/20 pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-white">Template Fields</h4>
              <button
                onClick={addField}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                disabled={saving}
              >
                <Plus className="w-4 h-4" />
                Add Field
              </button>
            </div>

            {formFields.length === 0 ? (
              <p className="text-purple-300 text-sm text-center py-4">
                No fields added yet. Click "Add Field" to create one.
              </p>
            ) : (
              <div className="space-y-4">
                {formFields.map((field, index) => (
                  <div key={index} className="bg-white/5 border border-purple-500/20 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">Field {index + 1}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => moveField(index, 'up')}
                          disabled={index === 0 || saving}
                          className="p-1 text-purple-400 hover:bg-purple-500/20 rounded disabled:opacity-30"
                          title="Move up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveField(index, 'down')}
                          disabled={index === formFields.length - 1 || saving}
                          className="p-1 text-purple-400 hover:bg-purple-500/20 rounded disabled:opacity-30"
                          title="Move down"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeField(index)}
                          className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                          disabled={saving}
                          title="Remove field"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-white text-sm mb-1">Field Key</label>
                        <input
                          type="text"
                          value={field.field_key}
                          onChange={(e) => updateField(index, { field_key: e.target.value })}
                          placeholder="e.g., contact_person"
                          className="w-full px-3 py-2 bg-white/10 border border-purple-500/30 rounded text-white text-sm placeholder-purple-300/50 focus:outline-none focus:border-purple-500"
                          disabled={saving}
                        />
                      </div>
                      <div>
                        <label className="block text-white text-sm mb-1">Field Label</label>
                        <input
                          type="text"
                          value={field.field_label}
                          onChange={(e) => updateField(index, { field_label: e.target.value })}
                          placeholder="e.g., Contact Person"
                          className="w-full px-3 py-2 bg-white/10 border border-purple-500/30 rounded text-white text-sm placeholder-purple-300/50 focus:outline-none focus:border-purple-500"
                          disabled={saving}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-white text-sm mb-1">Field Type</label>
                        <select
                          value={field.field_type}
                          onChange={(e) => updateField(index, { field_type: e.target.value as FieldType })}
                          className="w-full px-3 py-2 bg-white/10 border border-purple-500/30 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                          disabled={saving}
                        >
                          <option value="text">Text Input</option>
                          <option value="dropdown">Dropdown</option>
                          <option value="date">Date Picker</option>
                          <option value="bullet_list">Bullet List</option>
                          <option value="lead_field">Lead Field (Auto-fill)</option>
                        </select>
                      </div>
                      {field.field_type === 'lead_field' && (
                        <div>
                          <label className="block text-white text-sm mb-1">Lead Field Source</label>
                          <select
                            value={field.lead_field_source || ''}
                            onChange={(e) => updateField(index, { lead_field_source: e.target.value })}
                            className="w-full px-3 py-2 bg-white/10 border border-purple-500/30 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                            disabled={saving}
                          >
                            <option value="">-- Select --</option>
                            <option value="contact_person">Contact Person</option>
                            <option value="name">Company Name</option>
                            <option value="phone">Phone</option>
                            <option value="address">Address</option>
                            <option value="town">Town</option>
                            <option value="provider">Provider</option>
                            <option value="type_of_business">Type of Business</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {field.field_type === 'dropdown' && (
                      <div>
                        <label className="block text-white text-sm mb-1">Dropdown Options (comma-separated)</label>
                        <input
                          type="text"
                          value={field.options?.options?.join(', ') || ''}
                          onChange={(e) => updateField(index, { 
                            options: { ...field.options, options: e.target.value.split(',').map(s => s.trim()) }
                          })}
                          placeholder="Today, Last Week, Custom Date"
                          className="w-full px-3 py-2 bg-white/10 border border-purple-500/30 rounded text-white text-sm placeholder-purple-300/50 focus:outline-none focus:border-purple-500"
                          disabled={saving}
                        />
                      </div>
                    )}

                    {field.field_type === 'bullet_list' && (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-white text-sm mb-1">Min Items</label>
                          <input
                            type="number"
                            min="1"
                            value={field.options?.min_items || 1}
                            onChange={(e) => updateField(index, { 
                              options: { ...field.options, min_items: parseInt(e.target.value) }
                            })}
                            className="w-full px-3 py-2 bg-white/10 border border-purple-500/30 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                            disabled={saving}
                          />
                        </div>
                        <div>
                          <label className="block text-white text-sm mb-1">Max Items</label>
                          <input
                            type="number"
                            min="1"
                            value={field.options?.max_items || 20}
                            onChange={(e) => updateField(index, { 
                              options: { ...field.options, max_items: parseInt(e.target.value) }
                            })}
                            className="w-full px-3 py-2 bg-white/10 border border-purple-500/30 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                            disabled={saving}
                          />
                        </div>
                        <div>
                          <label className="block text-white text-sm mb-1">Default Count</label>
                          <input
                            type="number"
                            min="1"
                            value={field.options?.default_count || 3}
                            onChange={(e) => updateField(index, { 
                              options: { ...field.options, default_count: parseInt(e.target.value) }
                            })}
                            className="w-full px-3 py-2 bg-white/10 border border-purple-500/30 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                            disabled={saving}
                          />
                        </div>
                      </div>
                    )}

                    {field.field_type !== 'lead_field' && (
                      <div>
                        <label className="block text-white text-sm mb-1">Placeholder</label>
                        <input
                          type="text"
                          value={field.placeholder || ''}
                          onChange={(e) => updateField(index, { placeholder: e.target.value })}
                          placeholder="Placeholder text"
                          className="w-full px-3 py-2 bg-white/10 border border-purple-500/30 rounded text-white text-sm placeholder-purple-300/50 focus:outline-none focus:border-purple-500"
                          disabled={saving}
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`required-${index}`}
                        checked={field.is_required}
                        onChange={(e) => updateField(index, { is_required: e.target.checked })}
                        className="rounded border-purple-500/30 bg-white/10 text-purple-500 focus:ring-purple-500"
                        disabled={saving}
                      />
                      <label htmlFor={`required-${index}`} className="text-white text-sm">
                        Required field
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex gap-3 justify-end pt-4 border-t border-purple-500/20">
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2 font-semibold"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Template
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Email Templates</h3>
          <p className="text-purple-300 text-sm mt-1">
            Manage email templates for lead communication
          </p>
        </div>
        <button
          onClick={startCreate}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
        >
          <Plus className="w-5 h-5" />
          Create Template
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <p className="text-purple-300 text-lg">No email templates yet</p>
          <p className="text-purple-400 text-sm mt-2">Create your first template to get started</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white/5 border border-purple-500/20 rounded-lg p-6 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold text-white">{template.name}</h4>
                    {!template.is_active && (
                      <span className="px-2 py-1 bg-gray-500/20 border border-gray-500/30 rounded text-xs text-gray-400">
                        Inactive
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-purple-300 text-sm mb-3">{template.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-purple-400">
                    <span>{template.fields?.length || 0} fields</span>
                    <span>•</span>
                    <span>Created {new Date(template.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(template)}
                    className="p-2 text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors"
                    title="Edit template"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Delete template"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
