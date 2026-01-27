/**
 * TemplateManager Component
 * Manages scraping templates (save, load, delete)
 * Phase 3: Quick setup for common configurations
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Star, Trash2, X, Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast/useToast';

interface Template {
  id: string;
  name: string;
  description: string | null;
  towns: string[];
  industries: string[];
  config: any;
  isFavorite: boolean;
  useCount: number;
  createdAt: string;
  updatedAt: string;
}

interface TemplateManagerProps {
  isOpen: boolean;
  mode: 'save' | 'load';
  currentTowns: string[];
  currentIndustries: string[];
  onClose: () => void;
  onLoadTemplate: (towns: string[], industries: string[]) => void;
}

export default function TemplateManager({
  isOpen,
  mode,
  currentTowns,
  currentIndustries,
  onClose,
  onLoadTemplate,
}: TemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Save mode state
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  
  const { toast } = useToast();

  // Fetch templates when modal opens
  useEffect(() => {
    if (isOpen && mode === 'load') {
      fetchTemplates();
    }
  }, [isOpen, mode]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) {
        toast.error('Authentication required', {
          message: 'Please log in to view templates',
          section: 'scraper'
        });
        return;
      }

      const authData = JSON.parse(authStorage);
      const token = authData.token;

      const response = await fetch('/api/scraper/templates', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates', {
        message: error.message || 'Please try again',
        section: 'scraper'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.warning('Template name required', {
        message: 'Please enter a name for the template',
        section: 'scraper'
      });
      return;
    }

    if (currentTowns.length === 0) {
      toast.warning('No towns to save', {
        message: 'Please add at least one town',
        section: 'scraper'
      });
      return;
    }

    if (currentIndustries.length === 0) {
      toast.warning('No industries to save', {
        message: 'Please select at least one industry',
        section: 'scraper'
      });
      return;
    }

    setIsSaving(true);
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) {
        toast.error('Authentication required', {
          message: 'Please log in to save templates',
          section: 'scraper'
        });
        return;
      }

      const authData = JSON.parse(authStorage);
      const token = authData.token;

      const response = await fetch('/api/scraper/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: templateName.trim(),
          description: templateDescription.trim() || null,
          towns: currentTowns,
          industries: currentIndustries,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save template');
      }

      toast.success('Template saved', {
        message: `Saved "${templateName}"`,
        section: 'scraper'
      });

      setTemplateName('');
      setTemplateDescription('');
      onClose();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template', {
        message: error.message || 'Please try again',
        section: 'scraper'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadTemplate = async (template: Template) => {
    try {
      // Increment use count
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const authData = JSON.parse(authStorage);
        const token = authData.token;

        await fetch(`/api/scraper/templates/${template.id}/use`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }

      // Load template data
      onLoadTemplate(template.towns, template.industries);
      
      toast.success('Template loaded', {
        message: `Loaded "${template.name}"`,
        section: 'scraper'
      });

      onClose();
    } catch (error: any) {
      console.error('Error loading template:', error);
      toast.error('Failed to load template', {
        message: error.message || 'Please try again',
        section: 'scraper'
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Delete template "${templateName}"?`)) {
      return;
    }

    setDeletingId(templateId);
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) {
        toast.error('Authentication required', {
          message: 'Please log in to delete templates',
          section: 'scraper'
        });
        return;
      }

      const authData = JSON.parse(authStorage);
      const token = authData.token;

      const response = await fetch(`/api/scraper/templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      toast.success('Template deleted', {
        message: `Deleted "${templateName}"`,
        section: 'scraper'
      });

      // Refresh templates list
      fetchTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template', {
        message: error.message || 'Please try again',
        section: 'scraper'
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleFavorite = async (template: Template) => {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) return;

      const authData = JSON.parse(authStorage);
      const token = authData.token;

      const response = await fetch(`/api/scraper/templates/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          isFavorite: !template.isFavorite,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update template');
      }

      // Refresh templates list
      fetchTemplates();
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update template', {
        message: error.message || 'Please try again',
        section: 'scraper'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-card w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            {mode === 'save' ? (
              <>
                <Save className="w-6 h-6 text-rose-400" />
                <h2 className="text-xl lg:text-2xl font-bold text-white">
                  Save Template
                </h2>
              </>
            ) : (
              <>
                <FolderOpen className="w-6 h-6 text-rose-400" />
                <h2 className="text-xl lg:text-2xl font-bold text-white">
                  Load Template
                </h2>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {mode === 'save' ? (
            /* Save Mode */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Gauteng Pharmacies"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="What is this template for?"
                  rows={3}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div className="glass-card p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Preview</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-400">Towns:</span>{' '}
                    <span className="text-white">{currentTowns.length} selected</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Industries:</span>{' '}
                    <span className="text-white">{currentIndustries.length} selected</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Load Mode */
            <>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 text-rose-400 animate-spin mb-4" />
                  <p className="text-gray-400">Loading templates...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FolderOpen className="w-16 h-16 text-gray-600 mb-4" />
                  <p className="text-gray-400 text-center">
                    No templates saved yet
                  </p>
                  <p className="text-gray-500 text-sm text-center mt-2">
                    Save your first template to reuse configurations
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="glass-card p-4 hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Template Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-white font-semibold text-lg truncate">
                              {template.name}
                            </h3>
                            {template.isFavorite && (
                              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            )}
                          </div>
                          
                          {template.description && (
                            <p className="text-gray-400 text-sm mb-2">
                              {template.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div className="text-gray-300">
                              {template.towns.length} town{template.towns.length !== 1 ? 's' : ''}
                            </div>
                            <div className="text-gray-300">
                              {template.industries.length} industr{template.industries.length !== 1 ? 'ies' : 'y'}
                            </div>
                            <div className="text-gray-400">
                              Used {template.useCount} time{template.useCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {/* Favorite Button */}
                          <button
                            onClick={() => handleToggleFavorite(template)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title={template.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Star
                              className={`w-5 h-5 ${
                                template.isFavorite
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-400'
                              }`}
                            />
                          </button>

                          {/* Load Button */}
                          <button
                            onClick={() => handleLoadTemplate(template)}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                          >
                            <FolderOpen className="w-4 h-4" />
                            Load
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteTemplate(template.id, template.name)}
                            disabled={deletingId === template.id}
                            className="p-2 hover:bg-red-600/20 text-red-400 hover:text-red-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete template"
                          >
                            {deletingId === template.id ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Trash2 className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 lg:p-6 border-t border-white/10">
          {mode === 'save' ? (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={isSaving || !templateName.trim()}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Template
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

