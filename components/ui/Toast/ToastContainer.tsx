'use client';

import { useContext } from 'react';
import { ToastContext } from './ToastContext';
import Toast from './Toast';

export default function ToastContainer() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('ToastContainer must be used within ToastProvider');
  }

  const { toasts, removeToast } = context;

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed top-4 right-4 z-[10000] space-y-3 max-w-md pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onDismiss={removeToast} />
        </div>
      ))}
    </div>
  );
}
