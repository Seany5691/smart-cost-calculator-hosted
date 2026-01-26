'use client';

import { useRef, useState, useEffect, ReactNode } from 'react';

interface ScrollableTableProps {
  children: ReactNode;
  minWidth?: string;
  className?: string;
}

export default function ScrollableTable({ 
  children, 
  minWidth = '800px',
  className = '' 
}: ScrollableTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      
      // Show left shadow if scrolled right
      setShowLeftShadow(scrollLeft > 0);
      
      // Show right shadow if not scrolled to the end
      setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 1);
    };

    // Check initial state
    handleScroll();

    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <div className="relative lg:overflow-visible">
      {/* Left scroll indicator */}
      {showLeftShadow && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-8 pointer-events-none z-10 lg:hidden"
          style={{
            background: 'linear-gradient(to right, rgba(10, 10, 10, 0.9), transparent)'
          }}
          aria-hidden="true"
        />
      )}

      {/* Right scroll indicator */}
      {showRightShadow && (
        <div 
          className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none z-10 lg:hidden"
          style={{
            background: 'linear-gradient(to left, rgba(10, 10, 10, 0.9), transparent)'
          }}
          aria-hidden="true"
        />
      )}

      {/* Scrollable container */}
      <div
        ref={containerRef}
        className={`overflow-x-auto lg:overflow-x-visible -mx-4 px-4 lg:mx-0 lg:px-0 momentum-scroll ${className}`}
        role="region"
        aria-label="Scrollable table"
        tabIndex={0}
      >
        <div style={{ minWidth: `min(${minWidth}, 100%)` }} className="lg:min-w-full">
          {children}
        </div>
      </div>

      {/* Scroll hint for mobile */}
      {showRightShadow && (
        <div className="lg:hidden text-center mt-2">
          <p className="text-xs text-gray-400">
            ← Scroll horizontally to see more →
          </p>
        </div>
      )}
    </div>
  );
}
