'use client';

import React, { useState } from 'react';
import { Upload, FileSpreadsheet, X, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast/useToast';
import * as XLSX from 'xlsx';

interface FieldMapping {
  name: string;
  phone: string;
  address?: string;
  town?: string;
  industry?: string;
  mapsUrl?: string;
}

interface ExcelProviderLookupProps {
  onComplete?: (results: any[]) => void;
}

export default function ExcelProviderLookup({ onComplete }: ExcelProviderLookupProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({
    name: '',
    phone: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    setFile(selectedFile);

    try {
      // Read file
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (jsonData.length < 2) {
        toast.error('File must contain at least a header row and one data row.');
        setFile(null);
        return;
      }

      // Extract headers (first row)
      const fileHeaders = jsonData[0].map((h: any) => String(h).trim());
      setHeaders(fileHeaders);

      // Extract data (remaining rows)
      const rows = jsonData.slice(1).map((row: any[]) => {
        const obj: any = {};
        fileHeaders.forEach((header: string, index: number) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });
      setData(rows);

      // Auto-detect field mappings
      const autoMapping: FieldMapping = {
        name: '',
        phone: '',
      };

      fileHeaders.forEach((header: string) => {
        const lower = header.toLowerCase();
        if (lower.includes('name') || lower.includes('business')) {
          autoMapping.name = header;
        } else if (lower.includes('phone') || lower.includes('tel') || lower.includes('mobile')) {
          autoMapping.phone = header;
        } else if (lower.includes('address')) {
          autoMapping.address = header;
        } else if (lower.includes('town') || lower.includes('city')) {
          autoMapping.town = header;
        } else if (lower.includes('industry') || lower.includes('type') || lower.includes('category')) {
          autoMapping.industry = header;
        } else if (lower.includes('url') || lower.includes('website') || lower.includes('maps')) {
          autoMapping.mapsUrl = header;
        }
      });

      setMapping(autoMapping);
      toast.success(`File loaded: ${rows.length} rows found`);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Failed to read file. Please ensure it is a valid Excel or CSV file.');
      setFile(null);
    }
  };

  const handleStartLookup = async () => {
    // Validate mapping
    if (!mapping.name || !mapping.phone) {
      toast.error('Please map at least Name and Phone fields');
      return;
    }

    // Validate data
    if (data.length === 0) {
      toast.error('No data to process');
      return;
    }

    setIsProcessing(true);
    setProgress({ completed: 0, total: data.length });

    try {
      // Get auth token
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) {
        toast.error('Authentication required. Please log in.');
        return;
      }

      const authData = JSON.parse(authStorage);
      const token = authData.token;
      
      if (!token) {
        toast.error('Authentication required. Please log in.');
        return;
      }

      // Map data to expected format
      const businesses = data.map((row: any) => ({
        name: row[mapping.name] || '',
        phone: row[mapping.phone] || '',
        address: mapping.address ? row[mapping.address] || '' : '',
        town: mapping.town ? row[mapping.town] || '' : '',
        industry: mapping.industry ? row[mapping.industry] || '' : '',
        mapsUrl: mapping.mapsUrl ? row[mapping.mapsUrl] || '' : '',
      }));

      // Call API endpoint
      const response = await fetch('/api/scraper/excel-provider-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ businesses }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to perform provider lookups');
      }

      const result = await response.json();
      
      setResults(result.businesses);
      setShowResults(true);
      toast.success(`Provider lookups completed: ${result.successCount} successful`);

      if (onComplete) {
        onComplete(result.businesses);
      }
    } catch (error: any) {
      console.error('Error performing provider lookups:', error);
      toast.error(`Provider lookup failed: ${error.message || 'An error occurred'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadResults = () => {
    if (results.length === 0) return;

    // Create worksheet from results
    const worksheet = XLSX.utils.json_to_sheet(results);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `provider_lookup_results_${timestamp}.xlsx`;

    // Download
    XLSX.writeFile(workbook, filename);
    toast.success(`Downloaded ${filename}`);
  };

  const handleReset = () => {
    setFile(null);
    setHeaders([]);
    setData([]);
    setMapping({ name: '', phone: '' });
    setResults([]);
    setShowResults(false);
    setProgress({ completed: 0, total: 0 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-rose-400" />
            Excel Provider Lookup
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Upload an Excel file with business data to perform provider lookups
          </p>
        </div>
      </div>

      {/* File Upload */}
      {!file && !showResults && (
        <div className="border-2 border-dashed border-rose-400/30 rounded-lg p-8 text-center hover:border-rose-400/50 transition-colors">
          <input
            type="file"
            id="excel-upload"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <label
            htmlFor="excel-upload"
            className="cursor-pointer flex flex-col items-center gap-3"
          >
            <Upload className="w-12 h-12 text-rose-400" />
            <div>
              <div className="text-white font-medium">Click to upload Excel file</div>
              <div className="text-sm text-gray-400 mt-1">
                Supports .xlsx, .xls, and .csv files
              </div>
            </div>
          </label>
        </div>
      )}

      {/* Field Mapping */}
      {file && !showResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">
              File: <span className="text-white font-medium">{file.name}</span>
              <span className="text-gray-400 ml-2">({data.length} rows)</span>
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
            <div className="text-sm font-medium text-white mb-3">Map Excel Columns</div>

            {/* Required Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Business Name <span className="text-rose-400">*</span>
                </label>
                <select
                  value={mapping.name}
                  onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-rose-400/30 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                >
                  <option value="">Select column...</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Phone Number <span className="text-rose-400">*</span>
                </label>
                <select
                  value={mapping.phone}
                  onChange={(e) => setMapping({ ...mapping, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-rose-400/30 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                >
                  <option value="">Select column...</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Address (Optional)</label>
                <select
                  value={mapping.address || ''}
                  onChange={(e) => setMapping({ ...mapping, address: e.target.value || undefined })}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-rose-400/30 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                >
                  <option value="">Select column...</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Town (Optional)</label>
                <select
                  value={mapping.town || ''}
                  onChange={(e) => setMapping({ ...mapping, town: e.target.value || undefined })}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-rose-400/30 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                >
                  <option value="">Select column...</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Industry (Optional)</label>
                <select
                  value={mapping.industry || ''}
                  onChange={(e) => setMapping({ ...mapping, industry: e.target.value || undefined })}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-rose-400/30 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                >
                  <option value="">Select column...</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Maps URL (Optional)</label>
                <select
                  value={mapping.mapsUrl || ''}
                  onChange={(e) => setMapping({ ...mapping, mapsUrl: e.target.value || undefined })}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-rose-400/30 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                >
                  <option value="">Select column...</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartLookup}
            disabled={isProcessing || !mapping.name || !mapping.phone}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white rounded-lg transition-all shadow-lg hover:shadow-rose-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing... {progress.completed}/{progress.total}</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Start Provider Lookups</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Lookups Complete</span>
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Start New Lookup
            </button>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-300 mb-2">
              Processed <span className="text-white font-medium">{results.length}</span> businesses
            </div>
            <div className="text-xs text-gray-400">
              {results.filter(r => r.provider && r.provider !== 'Unknown').length} providers found
            </div>
          </div>

          <button
            onClick={handleDownloadResults}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all shadow-lg hover:shadow-green-500/50"
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span>Download Results</span>
          </button>
        </div>
      )}
    </div>
  );
}
