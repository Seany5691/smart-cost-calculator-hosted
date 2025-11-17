'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUp, Database, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import ExcelImporter from '@/components/leads/import/ExcelImporter';
import ScrapedListSelector from '@/components/leads/import/ScrapedListSelector';
import { ConfirmModal } from '@/components/leads/ui/ConfirmModal';
import { useImportStore } from '@/store/leads/import';
import { useAuthStore } from '@/store/auth';

type ImportMethod = 'scraper' | 'excel' | null;

export default function ImportPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { 
    currentSession, 
    isImporting, 
    error, 
    importProgress,
    clearError 
  } = useImportStore();
  
  const [selectedMethod, setSelectedMethod] = useState<ImportMethod>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  const handleMethodSelect = (method: ImportMethod) => {
    setSelectedMethod(method);
    clearError();
  };

  const handleImportComplete = () => {
    setShowSuccess(true);
    setTimeout(() => {
      router.push('/?tab=1'); // Redirect to dashboard Main Sheet tab
    }, 2000);
  };

  const handleBack = () => {
    if (isImporting) {
      setShowBackConfirm(true);
      return;
    }
    setSelectedMethod(null);
    clearError();
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="glass-card p-8 max-w-md mx-auto text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to import leads.</p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-shadow"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Success screen
  if (showSuccess && currentSession?.status === 'completed') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="glass-card p-8 max-w-md mx-auto text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Import Successful!</h2>
            <p className="text-gray-600">
              Successfully imported {currentSession.imported_records} leads
            </p>
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-gray-600">Total Records</span>
              <span className="font-semibold text-gray-900">{currentSession.total_records}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-gray-600">Imported</span>
              <span className="font-semibold text-green-600">{currentSession.imported_records}</span>
            </div>
            {currentSession.failed_records > 0 && (
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="text-sm text-gray-600">Failed</span>
                <span className="font-semibold text-red-600">{currentSession.failed_records}</span>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-500 mb-4">Redirecting to leads page...</p>
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // Method selection screen
  if (!selectedMethod) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Import Leads
          </h1>
          <p className="text-lg text-gray-600">
            Choose your import method to get started
          </p>
        </div>

        {/* Import Method Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Scraper Import */}
          <button
            onClick={() => handleMethodSelect('scraper')}
            className="group relative overflow-hidden rounded-2xl p-8 bg-white border-2 border-gray-200 hover:border-blue-500 hover:shadow-2xl transition-all duration-300 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
            <div className="relative">
              <div className="inline-flex p-4 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-6">
                <Database className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Import from Scraper
              </h2>
              <p className="text-gray-600 mb-6">
                Import leads from Smart Cost Calculator's scraper sessions. Select from available scraped lists and import directly.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Pre-validated data
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Automatic field mapping
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Real-time import tracking
                </li>
              </ul>
              <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                Select Scraper Import
                <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
              </div>
            </div>
          </button>

          {/* Excel Import */}
          <button
            onClick={() => handleMethodSelect('excel')}
            className="group relative overflow-hidden rounded-2xl p-8 bg-white border-2 border-gray-200 hover:border-purple-500 hover:shadow-2xl transition-all duration-300 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
            <div className="relative">
              <div className="inline-flex p-4 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 mb-6">
                <FileUp className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Import from Excel
              </h2>
              <p className="text-gray-600 mb-6">
                Upload an Excel file from your computer or mobile device. Map fields and import your lead data.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Flexible field mapping
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Data validation
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Preview before import
                </li>
              </ul>
              <div className="flex items-center text-purple-600 font-semibold group-hover:translate-x-2 transition-transform">
                Select Excel Import
                <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
              </div>
            </div>
          </button>
        </div>

        {/* Help Section */}
        <div className="glass-card p-6 max-w-4xl mx-auto mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Scraper Import</h4>
              <p>Best for importing data directly from Smart Cost Calculator's web scraper. Data is automatically formatted and validated.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Excel Import</h4>
              <p>Best for importing existing lead lists. Supports .xlsx and .xls formats. Ensure your file has columns for name and maps address.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Import interface screen
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={handleBack}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          disabled={isImporting}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Method Selection
        </button>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          {selectedMethod === 'scraper' ? 'Import from Scraper' : 'Import from Excel'}
        </h1>
        <p className="text-lg text-gray-600">
          {selectedMethod === 'scraper' 
            ? 'Select a scraped list to import' 
            : 'Upload and map your Excel file'}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="glass-card p-4 mb-6 border-l-4 border-red-500 bg-red-50">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-1">Import Error</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Progress Display */}
      {isImporting && (
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin mr-3" />
              <span className="font-semibold text-gray-900">Importing leads...</span>
            </div>
            <span className="text-sm text-gray-600">{importProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
          {currentSession && (
            <div className="mt-4 text-sm text-gray-600">
              <p>Imported: {currentSession.imported_records} / {currentSession.total_records}</p>
              {currentSession.failed_records > 0 && (
                <p className="text-red-600">Failed: {currentSession.failed_records}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Import Component */}
      <div className="glass-card p-6">
        {selectedMethod === 'scraper' ? (
          <ScrapedListSelector onImportComplete={handleImportComplete} />
        ) : (
          <ExcelImporter onImportComplete={handleImportComplete} />
        )}
      </div>

      {/* Back Confirmation Modal */}
      <ConfirmModal
        isOpen={showBackConfirm}
        onClose={() => setShowBackConfirm(false)}
        onConfirm={() => {
          setShowBackConfirm(false);
          setSelectedMethod(null);
          clearError();
        }}
        title="Import in Progress"
        message="Import is currently in progress. Are you sure you want to go back? This will cancel the import."
        confirmText="Go Back"
        variant="warning"
      />
    </div>
  );
}
