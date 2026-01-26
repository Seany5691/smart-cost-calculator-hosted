'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { Toast as ToastType } from './ToastContext';

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

export default function Toast({ toast, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300); // Match animation duration
  };

  // Get icon based on type
  const Icon = getIcon(toast.type);

  // Get colors based on type and section
  const colors = getColors(toast.type, toast.section);

  return (
    <div
      className={`
        bg-white/5 backdrop-blur-xl border rounded-xl p-4 shadow-2xl
        transition-all duration-300 ease-out
        ${isExiting ? 'animate-slide-out-right' : 'animate-slide-in-right'}
        ${colors.border}
      `}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`p-2 rounded-lg flex-shrink-0 ${colors.iconBg}`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium">{toast.title}</p>
          {toast.message && (
            <p className="text-sm text-gray-300 mt-1">{toast.message}</p>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          onClick={handleDismiss}
          className="p-1 text-gray-400 hover:text-white transition-colors flex-shrink-0"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function getIcon(type: ToastType['type']) {
  switch (type) {
    case 'success':
      return CheckCircle;
    case 'error':
      return XCircle;
    case 'warning':
      return AlertTriangle;
    case 'info':
      return Info;
    default:
      return Info;
  }
}

function getColors(type: ToastType['type'], section?: ToastType['section']) {
  // Base colors by type
  const typeColors = {
    success: {
      border: 'border-green-500/30',
      iconBg: 'bg-green-500/20',
      icon: 'text-green-400',
    },
    error: {
      border: 'border-red-500/30',
      iconBg: 'bg-red-500/20',
      icon: 'text-red-400',
    },
    warning: {
      border: 'border-yellow-500/30',
      iconBg: 'bg-yellow-500/20',
      icon: 'text-yellow-400',
    },
    info: {
      border: 'border-blue-500/30',
      iconBg: 'bg-blue-500/20',
      icon: 'text-blue-400',
    },
  };

  // If section is specified, use section-specific colors for info type
  if (type === 'info' && section) {
    switch (section) {
      case 'leads':
        return {
          border: 'border-emerald-500/30',
          iconBg: 'bg-emerald-500/20',
          icon: 'text-emerald-400',
        };
      case 'calculator':
        return {
          border: 'border-purple-500/30',
          iconBg: 'bg-purple-500/20',
          icon: 'text-purple-400',
        };
      case 'scraper':
        return {
          border: 'border-teal-500/30',
          iconBg: 'bg-teal-500/20',
          icon: 'text-teal-400',
        };
    }
  }

  return typeColors[type];
}
