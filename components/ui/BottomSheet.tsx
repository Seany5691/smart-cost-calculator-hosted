'use client';

import { useEffect, useRef, ReactNode } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function BottomSheet({ 
  isOpen, 
  onClose, 
  title,
  children,
  className = '' 
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle swipe to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    currentYRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    
    // Only allow downward swipes
    if (diff > 0) {
      currentYRef.current = diff;
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${diff}px)`;
      }
    }
  };

  const handleTouchEnd = () => {
    // If swiped down more than 100px, close the sheet
    if (currentYRef.current > 100) {
      onClose();
    }
    
    // Reset position
    if (sheetRef.current) {
      sheetRef.current.style.transform = 'translateY(0)';
    }
    
    startYRef.current = 0;
    currentYRef.current = 0;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Bottom sheet'}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Sheet Container */}
        <div className={`glass-card rounded-t-3xl max-h-[85vh] flex flex-col ${className}`}>
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div 
              className="w-12 h-1.5 bg-white/30 rounded-full"
              aria-hidden="true"
            />
          </div>

          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors no-tap-zoom touch-feedback"
                aria-label="Close"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto momentum-scroll px-6 py-4 custom-scrollbar">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
