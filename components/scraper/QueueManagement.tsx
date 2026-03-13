/**
 * Queue Management Component
 * Admin interface for managing scraping queue and clearing stale sessions
 */

import React, { useEffect, useState } from 'react';
import { 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  Clock, 
  Play,
  X,
  CheckCircle
} from 'lucide-react';

interface QueueItem {
  id: string;
  user_id: string;
  session_id: string;
  status: string;
  queue_position: number;
  estimated_wait_minutes: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  session_name?: string;
  username?: string;
}

interface RunningSession {
  id: string;
  user_id: string;
  name: string;
  status: string;
  progress: number;
  created_at: string;
  updated_at: string;
  hours_since_update: string;
  total_duration_hours: string;
}

interface QueueData {
  queue: QueueItem[];
  runningSessions: RunningSession[];
  staleSessions: RunningSession[];
  stats: {
    totalInQueue: number;
    queuedCount: number;
    processingCount: number;
    runningSessionsCount: number;
    staleSessionsCount: number;
  };
}

export default function QueueManagement() {
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) {
        setError('Not authenticated');
        return;
      }

      const authData = JSON.parse(authStorage);
      const token = authData.token;

      const response = await fetch('/api/scraper/queue-management', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch queue data');
      }

      const result = await response.json();
      setData(result);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching queue data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const performAction = async (action: string, params: any = {}) => {
    try {
      setActionLoading(action);
      
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) {
        throw new Error('Not authenticated');
      }

      const authData = JSON.parse(authStorage);
      const token = authData.token;

      const response = await fetch('/api/scraper/queue-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, ...params }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Action failed');
      }

      const result = await response.json();
      console.log('Action result:', result);
      
      // Refresh data after action
      await fetchData();
      
      setActionLoading(null);
    } catch (err) {
      console.error('Error performing action:', err);
      alert(err instanceof Error ? err.message : 'Action failed');
      setActionLoading(null);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
        <span className="ml-2 text-slate-300">Loading queue data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg">
        <p className="text-rose-400">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
          <div className="text-sm text-slate-400 mb-1">Total in Queue</div>
          <div className="text-2xl font-bold text-white">{data.stats.totalInQueue}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
          <div className="text-sm text-slate-400 mb-1">Queued</div>
          <div className="text-2xl font-bold text-blue-400">{data.stats.queuedCount}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
          <div className="text-sm text-slate-400 mb-1">Processing</div>
          <div className="text-2xl font-bold text-green-400">{data.stats.processingCount}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
          <div className="text-sm text-slate-400 mb-1">Running Sessions</div>
          <div className="text-2xl font-bold text-yellow-400">{data.stats.runningSessionsCount}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
          <div className="text-sm text-slate-400 mb-1">Stale Sessions</div>
          <div className="text-2xl font-bold text-rose-400">{data.stats.staleSessionsCount}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => performAction('clearStale')}
          disabled={actionLoading !== null || data.stats.staleSessionsCount === 0}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          {actionLoading === 'clearStale' ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          Clear Stale Sessions ({data.stats.staleSessionsCount})
        </button>
        
        <button
          onClick={() => performAction('clearQueue')}
          disabled={actionLoading !== null || data.stats.totalInQueue === 0}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          {actionLoading === 'clearQueue' ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          Clear All Queue Items
        </button>
        
        <button
          onClick={() => performAction('forceProcess')}
          disabled={actionLoading !== null || data.stats.queuedCount === 0}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          {actionLoading === 'forceProcess' ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          Force Process Next
        </button>
        
        <button
          onClick={fetchData}
          disabled={actionLoading !== null}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stale Sessions Warning */}
      {data.staleSessions.length > 0 && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-rose-400 font-semibold mb-2">
                {data.staleSessions.length} Stale Session(s) Detected
              </h3>
              <p className="text-sm text-slate-300 mb-3">
                These sessions are marked as "running" but haven't been updated in over 12 hours. 
                They're likely crashed or stuck and should be cleared.
              </p>
              <div className="space-y-2">
                {data.staleSessions.map((session) => (
                  <div key={session.id} className="bg-slate-900/50 rounded p-3 flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">{session.name}</div>
                      <div className="text-xs text-slate-400">
                        Last updated: {formatDuration(parseFloat(session.hours_since_update) * 60)} ago
                        {' • '}
                        Total duration: {formatDuration(parseFloat(session.total_duration_hours) * 60)}
                      </div>
                    </div>
                    <button
                      onClick={() => performAction('clearSession', { sessionId: session.id })}
                      disabled={actionLoading !== null}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-700 text-white text-sm rounded flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Stop
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Running Sessions */}
      {data.runningSessions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Running Sessions</h3>
          <div className="space-y-2">
            {data.runningSessions.map((session) => {
              const isStale = parseFloat(session.hours_since_update) > 12;
              return (
                <div
                  key={session.id}
                  className={`bg-slate-900/50 rounded-lg p-4 border ${
                    isStale ? 'border-rose-500/30' : 'border-green-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isStale ? 'bg-rose-500' : 'bg-green-500 animate-pulse'}`}></div>
                        <span className="text-white font-medium">{session.name}</span>
                      </div>
                      <div className="text-sm text-slate-400 mt-1">
                        Progress: {session.progress}%
                        {' • '}
                        Last update: {formatDuration(parseFloat(session.hours_since_update) * 60)} ago
                        {' • '}
                        Running for: {formatDuration(parseFloat(session.total_duration_hours) * 60)}
                      </div>
                    </div>
                    <button
                      onClick={() => performAction('clearSession', { sessionId: session.id })}
                      disabled={actionLoading !== null}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-700 text-white text-sm rounded flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Stop
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Queue Items */}
      {data.queue.length > 0 ? (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Queue Items</h3>
          <div className="space-y-2">
            {data.queue.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold text-rose-400">
                        #{item.queue_position}
                      </div>
                      <div>
                        <div className="text-white font-medium">
                          {item.session_name || 'Unnamed Session'}
                        </div>
                        <div className="text-sm text-slate-400">
                          User: {item.username || 'Unknown'}
                          {' • '}
                          Status: <span className={`${
                            item.status === 'queued' ? 'text-blue-400' :
                            item.status === 'processing' ? 'text-green-400' :
                            'text-slate-400'
                          }`}>{item.status}</span>
                          {' • '}
                          Created: {formatDate(item.created_at)}
                          {' • '}
                          Est. wait: {formatDuration(item.estimated_wait_minutes)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => performAction('clearItem', { itemId: item.id })}
                    disabled={actionLoading !== null}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-700 text-white text-sm rounded flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-slate-400">
          <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
          <p>Queue is empty</p>
        </div>
      )}
    </div>
  );
}
