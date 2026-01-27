/**
 * ActiveSessionBanner Component
 * 
 * Displays a banner when user has an active scraping session running on VPS
 * Allows reconnecting to view live progress
 */

'use client';

import React from 'react';
import { Activity, Eye, X } from 'lucide-react';

interface ActiveSessionBannerProps {
  sessionName: string;
  sessionId: string;
  createdAt: string;
  onReconnect: () => void;
  onDismiss: () => void;
}

export default function ActiveSessionBanner({
  sessionName,
  sessionId,
  createdAt,
  onReconnect,
  onDismiss,
}: ActiveSessionBannerProps) {
  // Calculate time since started
  const timeSinceStart = React.useMemo(() => {
    const start = new Date(createdAt).getTime();
    const now = Date.now();
    const diff = now - start;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`;
    }
    return `${minutes}m ago`;
  }, [createdAt]);

  return (
    <div className="glass-card p-4 border-2 border-teal-400/50 bg-gradient-to-r from-teal-900/30 to-blue-900/30">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          {/* Animated Icon */}
          <div className="relative">
            <Activity className="w-6 h-6 text-teal-400" />
            <div className="absolute inset-0 animate-ping">
              <Activity className="w-6 h-6 text-teal-400 opacity-75" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-semibold">
                Scraping in Progress
              </h3>
              <span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 text-xs rounded-full border border-teal-400/30">
                Running on VPS
              </span>
            </div>
            
            <p className="text-sm text-gray-300 mb-2">
              <span className="font-medium text-white">{sessionName}</span>
              <span className="text-gray-400"> • Started {timeSinceStart}</span>
            </p>

            <p className="text-xs text-gray-400 mb-3">
              Your scrape is running in the background on the server. 
              Click below to reconnect and view live progress.
            </p>

            {/* Action Button */}
            <button
              onClick={onReconnect}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Eye className="w-4 h-4" />
              View Live Progress
            </button>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
          title="Dismiss (scraping continues in background)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
