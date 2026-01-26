'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

// Helper function to get auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const data = JSON.parse(stored);
      return data.state?.token || data.token || null;
    }
  } catch (error) {
    console.error('[EXCEL_IMPORTER] Error reading auth token from localStorage:', error);
  }
  return null;
}

interface ExcelImporterProps {
  onImportComplete?: () => void;
  onCancel?: () => void;
}

export default function ExcelImporter({ onImportComplete, onCancel }: ExcelImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [listName, setListName] = useState<string>('');
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setValidationErrors([]);
    
    // Validate file
    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      setValidationErrors(['Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file.']);
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setValidationErrors(['File is too large. Maximum size is 10MB.']);
      return;
    }

    setFile(selectedFile);
    
    // Auto-fill list name from filename
    const fileNameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
    setListName(fileNameWithoutExt);
    
    // Parse file for preview
    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          if (jsonData.length === 0) {
            setValidationErrors(['File is empty or has no data']);
            return;
          }

          // Get headers
          const fileHeaders = Object.keys(jsonData[0] as object);
          setHeaders(fileHeaders);
          
          // Auto-detect field mapping
          const detectedMapping: Record<string, string> = {};
          fileHeaders.forEach(header => {
            const lowerHeader = header.toLowerCase();
            
            // Map name field
            if (lowerHeader.includes('name') && !lowerHeader.includes('business')) {
              detectedMapping['name'] = header;
            }
            
            // Map phone field
            if (lowerHeader.includes('phone')) {
              detectedMapping['phone'] = header;
            }
            
            // Map provider field
            if (lowerHeader.includes('provider')) {
              detectedMapping['provider'] = header;
            }
            
            // Map maps_address field (prioritize maps-related headers)
            if (lowerHeader.includes('maps') || lowerHeader === 'maps_address' || lowerHeader === 'mapsaddress') {
              detectedMapping['mapsAddress'] = header;
            }
            
            // Map address field (only if not maps-related)
            if (lowerHeader.includes('address') && !lowerHeader.includes('maps') && !detectedMapping['address']) {
              detectedMapping['address'] = header;
            }
            
            // Map type of business field
            if (lowerHeader.includes('business') || lowerHeader.includes('type')) {
              detectedMapping['typeOfBusiness'] = header;
            }
            
            // Map town field
            if (lowerHeader.includes('town')) {
              detectedMapping['town'] = header;
            }
            
            // Map notes field
            if (lowerHeader.includes('note')) {
              detectedMapping['notes'] = header;
            }
          });
          setFieldMapping(detectedMapping);
          
          // Show preview
          setPreviewData(jsonData.slice(0, 5));
          setStep('preview');
        } catch (err) {
          setValidationErrors(['Failed to parse Excel file. Please check the file format.']);
        }
      };
      
      reader.onerror = () => {
        setValidationErrors(['Failed to read file']);
      };
      
      reader.readAsBinaryString(selectedFile);
    } catch (err) {
      setValidationErrors(['Failed to load Excel parser']);
    }
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  // Handle field mapping change
  const handleFieldMappingChange = useCallback((targetField: string, sourceField: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [targetField]: sourceField
    }));
  }, []);

  // Handle import
  const handleImport = useCallback(async () => {
    if (!file) return;
    
    // Validate list name
    if (!listName || listName.trim() === '') {
      setValidationErrors(['Please enter a list name']);
      return;
    }
    
    setStep('importing');
    setIsImporting(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('listName', listName.trim());
      formData.append('fieldMapping', JSON.stringify(fieldMapping));
      
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/leads/import/excel', {
        method: 'POST',
        headers,
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import failed');
      }
      
      setImportProgress(100);
      setTimeout(() => {
        onImportComplete?.();
      }, 500);
    } catch (err: any) {
      setValidationErrors([err.message || 'Import failed']);
      setStep('preview');
    } finally {
      setIsImporting(false);
    }
  }, [file, fieldMapping, listName, onImportComplete]);

  // Reset to upload step
  const handleReset = useCallback(() => {
    setFile(null);
    setPreviewData([]);
    setHeaders([]);
    setFieldMapping({});
    setListName('');
    setValidationErrors([]);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Render upload step
  if (step === 'upload') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white mb-2">Import from Excel</h3>
          <p className="text-emerald-200 text-sm">
            Upload an Excel file (.xlsx, .xls) or CSV file to import leads
          </p>
        </div>

        {/* Drag and drop area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-xl p-12 text-center transition-all
            ${isDragging 
              ? 'border-emerald-500 bg-emerald-500/10' 
              : 'border-emerald-500/30 hover:border-emerald-500/50 bg-white/5'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInputChange}
            className="hidden"
          />
          
          <div className="flex flex-col items-center space-y-4">
            <div className={`
              p-4 rounded-full transition-colors
              ${isDragging ? 'bg-emerald-500/20' : 'bg-white/10'}
            `}>
              <Upload className={`w-12 h-12 ${isDragging ? 'text-emerald-400' : 'text-emerald-300'}`} />
            </div>
            
            <div>
              <p className="text-white font-medium mb-1">
                {isDragging ? 'Drop file here' : 'Drag and drop your file here'}
              </p>
              <p className="text-emerald-200 text-sm">or</p>
            </div>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              Browse Files
            </button>
            
            <div className="text-xs text-emerald-300/70 space-y-1">
              <p>Supported formats: .xlsx, .xls, .csv</p>
              <p>Maximum file size: 10MB</p>
            </div>
          </div>
        </div>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-400 font-medium mb-1">Validation Errors</p>
                <ul className="text-sm text-red-300 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Cancel button */}
        {onCancel && (
          <div className="flex justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-emerald-200 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  }

  // Render preview and field mapping step
  if (step === 'preview') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white mb-1">Preview and Map Fields</h3>
            <p className="text-emerald-200 text-sm">
              Review the data and map columns to lead fields
            </p>
          </div>
          <button
            onClick={handleReset}
            className="p-2 text-emerald-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File info */}
        <div className="bg-white/5 rounded-lg p-4 flex items-center space-x-3">
          <FileSpreadsheet className="w-8 h-8 text-green-400" />
          <div className="flex-1">
            <p className="text-white font-medium">{file?.name}</p>
            <p className="text-emerald-200 text-sm">
              {((file?.size || 0) / 1024).toFixed(2)} KB
            </p>
          </div>
        </div>

        {/* List name input */}
        <div className="space-y-2">
          <label className="text-white font-medium">
            List Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="e.g., Potchefstroom, Klerksdorp, Rustenburg..."
            className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
          <p className="text-sm text-emerald-300/70">
            Auto-filled from filename. Edit to change the list name.
          </p>
        </div>

        {/* Field mapping */}
        <div className="space-y-4">
          <h4 className="text-white font-medium">Field Mapping</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['mapsAddress', 'name', 'phone', 'provider', 'address', 'typeOfBusiness', 'town', 'notes'].map(field => (
              <div key={field} className="space-y-2">
                <label className="text-sm text-emerald-200">
                  {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  {(field === 'mapsAddress' || field === 'name') && (
                    <span className="text-red-400 ml-1">*</span>
                  )}
                </label>
                <select
                  value={fieldMapping[field] || ''}
                  onChange={(e) => handleFieldMappingChange(field, e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Not mapped --</option>
                  {headers.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Preview data */}
        <div className="space-y-4">
          <h4 className="text-white font-medium">Data Preview (First 5 rows)</h4>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-emerald-500/20">
                  {headers.map(header => (
                    <th key={header} className="px-3 py-2 text-left text-emerald-200 font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, index) => (
                  <tr key={index} className="border-b border-emerald-500/10">
                    {headers.map(header => (
                      <td key={header} className="px-3 py-2 text-emerald-100">
                        {String(row[header] || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-400 font-medium mb-1">Validation Errors</p>
                <ul className="text-sm text-red-300 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-emerald-500/20">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-emerald-200 hover:text-white transition-colors"
          >
            Choose Different File
          </button>
          
          <div className="flex space-x-3">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 text-emerald-200 hover:text-white transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleImport}
              disabled={validationErrors.length > 0}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Import Leads
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render importing step
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">Importing Leads</h3>
        <p className="text-emerald-200 text-sm">
          Please wait while we import your leads...
        </p>
      </div>

      {/* Progress indicator */}
      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-emerald-200">Progress</span>
            <span className="text-white font-medium">{importProgress}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Error display */}
      {validationErrors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 font-medium mb-1">Import Error</p>
              <p className="text-sm text-red-300">{validationErrors[0]}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
