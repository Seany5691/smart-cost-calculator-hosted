'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-simple';
import { useToast } from '@/components/ui/Toast/useToast';

interface ExportButtonProps {
  status: string;
}

export default function ExportButton({ status }: ExportButtonProps) {
  const { token } = useAuthStore();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!token) {
      toast.error('Authentication required', {
        message: 'Please log in to export leads',
        section: 'leads'
      });
      return;
    }

    setIsExporting(true);

    try {
      const response = await fetch(`/api/leads/export?status=${status}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export leads');
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${status}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Export successful', {
        message: 'Leads exported to Excel',
        section: 'leads'
      });
    } catch (error) {
      console.error('Error exporting leads:', error);
      toast.error('Export failed', {
        message: error instanceof Error ? error.message : 'Failed to export leads',
        section: 'leads'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      title="Export leads to Excel"
    >
      <span className="flex items-center gap-2">
        <Download className="w-5 h-5" />
        {isExporting ? 'Exporting...' : 'Export'}
      </span>
    </button>
  );
}
