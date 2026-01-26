'use client';

import { useState, useCallback, ReactNode } from 'react';
import { ToastContext, Toast } from './ToastContext';
import ToastContainer from './ToastContainer';

interface ToastProviderProps {
  children: ReactNode;
}

const MAX_TOASTS = 5;

export default function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration || getDefaultDuration(toast.type),
    };

    setToasts((prev) => {
      // Limit to MAX_TOASTS, remove oldest if necessary
      const updated = [...prev, newToast];
      if (updated.length > MAX_TOASTS) {
        return updated.slice(updated.length - MAX_TOASTS);
      }
      return updated;
    });

    // Auto-dismiss after duration
    if (newToast.duration) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  }, [removeToast]);

  const success = useCallback((title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => {
    addToast({ type: 'success', title, ...options });
  }, [addToast]);

  const error = useCallback((title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => {
    addToast({ type: 'error', title, ...options });
  }, [addToast]);

  const warning = useCallback((title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => {
    addToast({ type: 'warning', title, ...options });
  }, [addToast]);

  const info = useCallback((title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => {
    addToast({ type: 'info', title, ...options });
  }, [addToast]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function getDefaultDuration(type: Toast['type']): number {
  switch (type) {
    case 'success':
      return 3000;
    case 'error':
      return 5000;
    case 'warning':
      return 4000;
    case 'info':
      return 4000;
    default:
      return 4000;
  }
}
