'use client';

import { useLeadsStore } from '@/lib/store/leads';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function LeadsPagination() {
  const { currentPage, totalPages, setCurrentPage } = useLeadsStore();

  const pages = [];
  const maxVisiblePages = 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between glass-card px-4 py-3">
      <div className="text-sm text-gray-300">
        Page {currentPage} of {totalPages}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 border border-white/20 rounded-lg text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {startPage > 1 && (
          <>
            <button
              onClick={() => setCurrentPage(1)}
              className="px-3 py-1 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              1
            </button>
            {startPage > 2 && (
              <span className="px-2 text-gray-400">...</span>
            )}
          </>
        )}

        {pages.map((page) => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`px-3 py-1 rounded-lg transition-colors ${
              page === currentPage
                ? 'bg-gradient-to-r from-emerald-600 to-blue-600 text-white font-medium'
                : 'border border-white/20 text-white hover:bg-white/20'
            }`}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <span className="px-2 text-gray-400">...</span>
            )}
            <button
              onClick={() => setCurrentPage(totalPages)}
              className="px-3 py-1 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 border border-white/20 rounded-lg text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
