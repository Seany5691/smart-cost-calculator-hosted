'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Loader2, Copy, Check, AlertCircle, Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import type { Lead } from '@/lib/leads/types';
import type { EmailTemplate, FieldValue } from '@/lib/emailTemplates/types';
import { useToast } from '@/components/ui/Toast/useToast';

interface EmailTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
}

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

export default function EmailTemplateModal({
  isOpen,
  onClose,
  lead
}: EmailTemplateModalProps) {
  const [mounted, setMounted] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [fieldValues, setFieldValues] = useState<FieldValue>({});
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [error, setError] = useState('');
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [missingFieldsData, setMissingFieldsData] = useState<Record<string, { label: string; source: string; value: string }>>({});
  const [emailAddress, setEmailAddress] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch templates on mount
  useEffect(() => {
    if (isOpen && mounted) {
      fetchTemplates();
    }
  }, [isOpen, mounted]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplateId('');
      setSelectedTemplate(null);
      setFieldValues({});
      setError('');
      setMissingFields([]);
      setMissingFieldsData({});
      setEmailAddress(lead.email || ''); // Pre-fill email if it exists
      setGeneratedEmail('');
      setCopied(false);
      setShowDatePicker(null);
      setCustomDate('');
    }
  }, [isOpen, lead.email]);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
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
      setLoadingTemplates(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setGeneratedEmail('');
    setCopied(false);
    setError('');
    setMissingFields([]);
    
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      
      // Initialize field values with defaults
      const initialValues: FieldValue = {};
      
      if (template.fields) {
        for (const field of template.fields) {
          if (field.field_type === 'bullet_list') {
            const defaultCount = field.options?.default_count || 3;
            initialValues[field.field_key] = Array(defaultCount).fill('');
          } else if (field.field_type === 'dropdown' && field.options?.options) {
            initialValues[field.field_key] = field.options.options[0];
          } else if (field.field_type !== 'lead_field') {
            initialValues[field.field_key] = '';
          }
        }
      }
      
      setFieldValues(initialValues);
      
      // Check for missing lead fields
      checkMissingLeadFields(template);
    }
  };

  const checkMissingLeadFields = (template: EmailTemplate) => {
    const missing: string[] = [];
    const missingData: Record<string, { label: string; source: string; value: string }> = {};
    
    if (template.fields) {
      for (const field of template.fields) {
        if (field.is_required && field.field_type === 'lead_field' && field.lead_field_source) {
          const leadValue = lead[field.lead_field_source as keyof Lead];
          if (!leadValue || (typeof leadValue === 'string' && !leadValue.trim())) {
            missing.push(field.field_label);
            missingData[field.field_key] = {
              label: field.field_label,
              source: field.lead_field_source,
              value: ''
            };
          }
        }
      }
    }
    
    setMissingFields(missing);
    setMissingFieldsData(missingData);
  };

  const handleFieldChange = (fieldKey: string, value: any) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const handleBulletListChange = (fieldKey: string, index: number, value: string) => {
    setFieldValues(prev => {
      const currentList = (prev[fieldKey] as string[]) || [];
      const newList = [...currentList];
      newList[index] = value;
      return {
        ...prev,
        [fieldKey]: newList
      };
    });
  };

  const addBulletItem = (fieldKey: string) => {
    setFieldValues(prev => {
      const currentList = (prev[fieldKey] as string[]) || [];
      return {
        ...prev,
        [fieldKey]: [...currentList, '']
      };
    });
  };

  const removeBulletItem = (fieldKey: string, index: number) => {
    setFieldValues(prev => {
      const currentList = (prev[fieldKey] as string[]) || [];
      const newList = currentList.filter((_, i) => i !== index);
      return {
        ...prev,
        [fieldKey]: newList
      };
    });
  };

  const formatCustomDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  };

  const handleGenerateEmail = async () => {
    if (!selectedTemplate) return;
    
    setLoading(true);
    setError('');

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      // FIRST: Check if there are missing fields that need to be saved to the lead
      if (missingFields.length > 0) {
        // Validate that all missing fields have been filled in
        const emptyFields = Object.entries(missingFieldsData).filter(([_, data]) => !data.value.trim());
        if (emptyFields.length > 0) {
          setError(`Please fill in all required fields: ${emptyFields.map(([_, data]) => data.label).join(', ')}`);
          setLoading(false);
          return;
        }

        // Update lead with missing fields
        const updateData: Record<string, string> = {};
        Object.entries(missingFieldsData).forEach(([_, data]) => {
          updateData[data.source] = data.value.trim();
        });

        const updateResponse = await fetch(`/api/leads/${lead.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(updateData)
        });

        if (!updateResponse.ok) {
          throw new Error('Failed to update lead with missing fields');
        }

        // Update local lead object so the generate API can use the new values
        Object.entries(missingFieldsData).forEach(([_, data]) => {
          (lead as any)[data.source] = data.value.trim();
        });

        // Clear missing fields state
        setMissingFields([]);
        setMissingFieldsData({});

        toast.success('Lead updated', {
          message: 'Missing fields have been added to the lead',
          section: 'leads'
        });

        // Wait a moment for database to commit the transaction
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // ALSO: Update email if it was changed or filled in
      if (emailAddress.trim() && emailAddress.trim() !== lead.email) {
        const emailUpdateResponse = await fetch(`/api/leads/${lead.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ email: emailAddress.trim() })
        });

        if (!emailUpdateResponse.ok) {
          throw new Error('Failed to update email address');
        }

        // Update local lead object
        lead.email = emailAddress.trim();

        toast.success('Email updated', {
          message: 'Email address has been saved to the lead',
          section: 'leads'
        });

        // Wait a moment for database to commit the transaction
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // SECOND: Now generate the email with the updated lead data
      const response = await fetch('/api/email-templates/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          lead_id: lead.id,
          field_values: fieldValues
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.missing_fields) {
          // This shouldn't happen now, but handle it just in case
          setMissingFields(data.missing_fields);
          setError(`Missing required fields: ${data.missing_fields.join(', ')}`);
        } else {
          throw new Error(data.error || 'Failed to generate email');
        }
        return;
      }

      setGeneratedEmail(data.email_content);
      toast.success('Email generated', {
        message: 'Your email is ready to copy',
        section: 'leads'
      });
    } catch (err) {
      console.error('Error generating email:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate email');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(generatedEmail);
      setCopied(true);
      toast.success('Email copied', {
        message: 'Email content copied to clipboard',
        section: 'leads'
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      toast.error('Failed to copy', {
        message: 'Please copy manually',
        section: 'leads'
      });
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-template-modal-title"
    >
      <div 
        className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-emerald-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Mail className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 id="email-template-modal-title" className="text-2xl font-bold text-white">
                Create Email from Template
              </h2>
              <p className="text-sm text-emerald-200">{lead.name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-emerald-200" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)] custom-scrollbar space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-400 font-medium mb-1">Error</p>
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Missing Fields - Allow filling them in */}
          {missingFields.length > 0 && !error && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-yellow-400 font-medium mb-3">Missing Required Fields</p>
                  <p className="text-sm text-yellow-300 mb-4">
                    Please enter the following fields. They will be saved to the lead when you generate the email:
                  </p>
                  <div className="space-y-3">
                    {Object.entries(missingFieldsData).map(([key, data]) => (
                      <div key={key}>
                        <label className="block text-yellow-200 font-medium mb-1 text-sm">
                          {data.label} <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={data.value}
                          onChange={(e) => {
                            setMissingFieldsData(prev => ({
                              ...prev,
                              [key]: { ...prev[key], value: e.target.value }
                            }));
                          }}
                          placeholder={`Enter ${data.label.toLowerCase()}`}
                          className="w-full px-4 py-2 bg-white/10 border border-yellow-500/30 rounded-lg text-white placeholder-yellow-300/50 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500"
                          disabled={loading}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Template Selection */}
          <div className="space-y-2">
            <label className="text-white font-medium">
              Select Email Template <span className="text-red-400">*</span>
            </label>
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              </div>
            ) : (
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                disabled={loading}
              >
                <option value="">-- Select a template --</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id} className="bg-slate-800">
                    {template.name}
                  </option>
                ))}
              </select>
            )}
            {selectedTemplate?.description && (
              <p className="text-sm text-emerald-300/70">{selectedTemplate.description}</p>
            )}
          </div>

          {/* Email Address Field - Always visible */}
          {selectedTemplate && (
            <div className="space-y-2 border-t border-emerald-500/20 pt-4">
              <label className="text-white font-medium flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="Enter email address"
                className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                disabled={loading}
              />
              <p className="text-sm text-emerald-300/70">
                {lead.email 
                  ? 'Update the email address for this lead' 
                  : 'Add an email address to this lead for future reference'}
              </p>
            </div>
          )}

          {/* Dynamic Fields */}
          {selectedTemplate && selectedTemplate.fields && selectedTemplate.fields.length > 0 && (
            <div className="space-y-4 border-t border-emerald-500/20 pt-4">
              <h3 className="text-lg font-semibold text-white">Template Fields</h3>
              
              {selectedTemplate.fields
                .filter(field => field.field_type !== 'lead_field')
                .map((field) => (
                  <div key={field.id} className="space-y-2">
                    <label className="text-white font-medium">
                      {field.field_label}
                      {field.is_required && <span className="text-red-400 ml-1">*</span>}
                    </label>

                    {/* Text Input */}
                    {field.field_type === 'text' && (
                      <input
                        type="text"
                        value={(fieldValues[field.field_key] as string) || ''}
                        onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                        placeholder={field.placeholder || ''}
                        className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        disabled={loading}
                      />
                    )}

                    {/* Dropdown */}
                    {field.field_type === 'dropdown' && field.options?.options && (
                      <div className="space-y-2">
                        <select
                          value={(fieldValues[field.field_key] as string) || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === 'Custom Date') {
                              setShowDatePicker(field.field_key);
                            } else {
                              setShowDatePicker(null);
                              handleFieldChange(field.field_key, value);
                            }
                          }}
                          className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                          disabled={loading}
                        >
                          {field.options.options.map((option: string) => (
                            <option key={option} value={option} className="bg-slate-800">
                              {option}
                            </option>
                          ))}
                        </select>
                        
                        {/* Date Picker for Custom Date */}
                        {showDatePicker === field.field_key && (
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={customDate}
                              onChange={(e) => {
                                setCustomDate(e.target.value);
                                if (e.target.value) {
                                  const formatted = formatCustomDate(e.target.value);
                                  handleFieldChange(field.field_key, formatted);
                                }
                              }}
                              className="flex-1 px-4 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                            />
                            <CalendarIcon className="w-5 h-5 text-emerald-400" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Date Input */}
                    {field.field_type === 'date' && (
                      <input
                        type="date"
                        value={(fieldValues[field.field_key] as string) || ''}
                        onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        disabled={loading}
                      />
                    )}

                    {/* Bullet List */}
                    {field.field_type === 'bullet_list' && (
                      <div className="space-y-2">
                        {((fieldValues[field.field_key] as string[]) || []).map((item, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-emerald-400 font-bold">•</span>
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => handleBulletListChange(field.field_key, index, e.target.value)}
                              placeholder={field.placeholder || `Item ${index + 1}`}
                              className="flex-1 px-4 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                              disabled={loading}
                            />
                            {((fieldValues[field.field_key] as string[]) || []).length > (field.options?.min_items || 1) && (
                              <button
                                type="button"
                                onClick={() => removeBulletItem(field.field_key, index)}
                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                disabled={loading}
                                aria-label="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        {(!field.options?.max_items || ((fieldValues[field.field_key] as string[]) || []).length < field.options.max_items) && (
                          <button
                            type="button"
                            onClick={() => addBulletItem(field.field_key)}
                            className="flex items-center gap-2 px-3 py-2 bg-emerald-500/20 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-colors text-sm border border-emerald-500/30"
                            disabled={loading}
                          >
                            <Plus className="w-4 h-4" />
                            Add Item
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* Generated Email Preview */}
          {generatedEmail && (
            <div className="space-y-2 border-t border-emerald-500/20 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-white font-medium">Generated Email</label>
                <button
                  onClick={handleCopyEmail}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold"
                  disabled={copied}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Email
                    </>
                  )}
                </button>
              </div>
              <div className="bg-white/5 border border-emerald-500/20 rounded-lg p-4 max-h-96 overflow-y-auto custom-scrollbar">
                <pre className="text-sm text-white whitespace-pre-wrap font-sans">{generatedEmail}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end p-6 border-t border-emerald-500/20 bg-slate-900/50">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 transition-colors"
          >
            {generatedEmail ? 'Close' : 'Cancel'}
          </button>
          {!generatedEmail && (
            <button
              type="button"
              onClick={handleGenerateEmail}
              disabled={loading || !selectedTemplate}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{missingFields.length > 0 ? 'Saving & Generating...' : 'Generating...'}</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Generate Email</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
