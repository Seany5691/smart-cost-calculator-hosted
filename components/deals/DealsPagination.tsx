'use client';

import { useDealsStore } from '@/lib/store/deals';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * DealsPagination Component
 * 
 * Pagination controls for deals list
 * - Current page and total pages display
 * - Previous/Next buttons
 * - Page number buttons (show 5 at a time)
 * - First/Last page buttons
 * - Responsive design (compact on mobile)
 * 
 * Requirements: AC-3.3
 */
export default function DealsPagination() {
  const { currentPage, totalPages, totalDeals, setCurrentPage } = useDealsStore();

  if (totalPages <= 1) {
    return null; // Don't show pagination if only one page
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top of page
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Generate page numbers to display (show 5 at a time)
  const getPageNumbers = (): number[] => {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    // Adjust start if we're near the end
    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="glass-card p-4 rounded-2xl">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Page Info */}
        <div className="text-sm text-gray-300">
          Showing page <span className="font-semibold text-white">{currentPage}</span> of{' '}
          <span className="font-semibold text-white">{totalPages}</span>
          {' '}({totalDeals} total deals)
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-2">
          {/* First Page Button */}
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="p-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="First page"
          >
            <ChevronsLeft className="w-5 h-5" />
          </button>

          {/* Previous Page Button */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Page Number Buttons */}
          <div className="hidden sm:flex items-center gap-2">
            {pageNumbers.map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  page === currentPage
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/50'
                    : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          {/* Mobile: Current Page Display */}
          <div className="sm:hidden px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium">
            {currentPage}
          </div>

          {/* Next Page Button */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Last Page Button */}
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Last page"
          >
            <ChevronsRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
