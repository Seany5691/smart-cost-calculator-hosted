/**
 * QueueStatus Component
 * Displays queue position and estimated wait time when a scraping session is queued
 */

import React, { useEffect, useState } from 'react';
import { Clock, Users, X } from 'lucide-react';

interface QueueStatusProps {
  sessionId: string;
  onCancel?: () => void;
}

interface QueueInfo {
  isQueued: boolean;
  queuePosition?: number;
  estimatedWaitMinutes?: number;
  totalInQueue?: number;
  currentlyProcessing?: {
    sessionId: string;
    startedAt: string;
  };
}

export default function QueueStatus({ sessionId, onCancel }: QueueStatusProps) {
  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchQueueStatus = async () => {
      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (!authStorage) {
          setError('Not authenticated');
          return;
        }

        const authData = JSON.parse(authStorage);
        const token = authData.token;

        const response = await fetch(
          `/api/scraper/queue-status?sessionId=${sessionId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            // Session not in queue anymore - might have started
            setQueueInfo(null);
            setLoading(false);
            return;
          }
          throw new Error('Failed to fetch queue status');
        }

        const data = await response.json();
        setQueueInfo(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching queue status:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchQueueStatus();

    // Poll every 5 seconds
    interval = setInterval(fetchQueueStatus, 5000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionId]);

  const handleCancel = async () => {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) return;

      const authData = JSON.parse(authStorage);
      const token = authData.token;

      const response = await fetch('/api/scraper/cancel-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel queued session');
      }

      if (onCancel) {
        onCancel();
      }
    } catch (err) {
      console.error('Error cancelling queued session:', err);
      alert('Failed to cancel queued session');
    }
  };

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-blue-700">
          <Clock className="w-5 h-5 animate-spin" />
          <span>Checking queue status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-700">Error: {error}</div>
      </div>
    );
  }

  if (!queueInfo || !queueInfo.isQueued) {
    return null;
  }

  const formatWaitTime = (minutes: number): string => {
    if (minutes < 1) return 'Less than a minute';
    if (minutes === 1) return '1 minute';
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-3 rounded-full">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900">
              Your scrape is in the queue
            </h3>
            <p className="text-sm text-blue-700">
              Another scraping session is currently running
            </p>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={handleCancel}
            className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-100 rounded-lg transition-colors"
            title="Cancel queued session"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border border-blue-100">
          <div className="text-sm text-blue-600 mb-1">Queue Position</div>
          <div className="text-2xl font-bold text-blue-900">
            #{queueInfo.queuePosition}
          </div>
          {queueInfo.totalInQueue !== undefined && (
            <div className="text-xs text-blue-600 mt-1">
              of {queueInfo.totalInQueue} in queue
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg p-4 border border-blue-100">
          <div className="text-sm text-blue-600 mb-1">Estimated Wait</div>
          <div className="text-2xl font-bold text-blue-900">
            {queueInfo.estimatedWaitMinutes !== undefined
              ? formatWaitTime(queueInfo.estimatedWaitMinutes)
              : 'Calculating...'}
          </div>
          <div className="text-xs text-blue-600 mt-1">approximate time</div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-blue-100">
          <div className="text-sm text-blue-600 mb-1">Status</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="text-lg font-semibold text-blue-900">Waiting</div>
          </div>
          <div className="text-xs text-blue-600 mt-1">
            {queueInfo.queuePosition === 1
              ? 'Starting soon...'
              : 'Will start automatically'}
          </div>
        </div>
      </div>

      {queueInfo.currentlyProcessing && (
        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <div className="text-sm text-blue-700">
            <Clock className="w-4 h-4 inline mr-2" />
            Another user's session is currently running. Your session will start
            automatically when it completes.
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-blue-600">
        <strong>Note:</strong> You can safely close this page. Your scrape will
        continue in the queue and start automatically when it's your turn. Check
        back later to view your results.
      </div>
    </div>
  );
}
