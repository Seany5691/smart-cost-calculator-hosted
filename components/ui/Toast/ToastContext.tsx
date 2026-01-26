'use client';

import { createContext } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  section?: 'leads' | 'calculator' | 'scraper';
}

export interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => void;
  error: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => void;
  warning: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => void;
  info: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);
