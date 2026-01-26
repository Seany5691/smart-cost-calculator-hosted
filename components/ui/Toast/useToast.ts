'use client';

import { useContext } from 'react';
import { ToastContext } from './ToastContext';

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return {
    toast: {
      success: context.success,
      error: context.error,
      warning: context.warning,
      info: context.info,
    },
    toasts: context.toasts,
    removeToast: context.removeToast,
  };
}
