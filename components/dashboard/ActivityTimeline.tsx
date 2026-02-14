'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/auth-simple';

interface Activity {
  id: string;
  userId: string;
  userName: string;
  activityType: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface ActivityTimelineData {
  activities: Activity[];
  count: number;
}

export default function ActivityTimeline() {
  const { user } = useAuthStore();
  const [data, setData] = useState<ActivityTimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const token = useAuthStore.getState().token;
      const headers: HeadersInit = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/dashboard/activity?limit=10', { headers });
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      const data = await response.json();
      setData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activityType: string) => {
    const icons: Record<string, string> = {
      deal_created: '💼',
      deal_saved: '💾',
      proposal_generated: '📄',
      pdf_generated: '📑',
      deal_loaded: '📂',
      lead_created: '➕',
      lead_status_changed: '🔄',
      scraping_started: '🔍',
      scraping_completed: '✅',
      note_added: '📝',
      reminder_created: '⏰',
      route_generated: '🗺️',
      calculator_saved: '🧮',
      calculator_loaded: '📊',
      proposal_created: '📋',
    };
    return icons[activityType] || '📌';
  };

  const getActivityColor = (activityType: string) => {
    const colors: Record<string, string> = {
      deal_created: 'text-purple-400',
      deal_saved: 'text-blue-400',
      proposal_generated: 'text-cyan-400',
      pdf_generated: 'text-teal-400',
      deal_loaded: 'text-indigo-400',
      lead_created: 'text-green-400',
      lead_status_changed: 'text-yellow-400',
      scraping_started: 'text-orange-400',
      scraping_completed: 'text-emerald-400',
      note_added: 'text-pink-400',
      reminder_created: 'text-red-400',
      route_generated: 'text-violet-400',
      calculator_saved: 'text-blue-400',
      calculator_loaded: 'text-indigo-400',
      proposal_created: 'text-cyan-400',
    };
    return colors[activityType] || 'text-gray-400';
  };

  const formatActivityMessage = (activity: Activity) => {
    const type = activity.activityType;
    const metadata = activity.metadata || {};

    switch (type) {
      case 'deal_created':
        return `created a new deal "${metadata.dealName || metadata.deal_name || 'Untitled'}"`;
      case 'deal_saved':
        return `saved deal "${metadata.dealName || metadata.deal_name || 'Untitled'}"`;
      case 'proposal_generated':
        return `generated a proposal for "${metadata.dealName || metadata.deal_name || 'Untitled'}"`;
      case 'pdf_generated':
        return `generated PDF for "${metadata.dealName || metadata.deal_name || 'Untitled'}"`;
      case 'deal_loaded':
        return `loaded deal "${metadata.dealName || metadata.deal_name || 'Untitled'}"`;
      case 'lead_created':
        return `created lead "${metadata.leadName || metadata.name || 'Untitled'}"`;
      case 'lead_status_changed':
        const oldStatus = metadata.oldStatus || metadata.old_status || 'unknown';
        const newStatus = metadata.newStatus || metadata.new_status || 'unknown';
        const leadName = metadata.leadName || metadata.name || '';
        return `changed ${leadName ? `"${leadName}" ` : ''}status from "${oldStatus}" to "${newStatus}"`;
      case 'scraping_started':
        return `started scraping session "${metadata.sessionName || metadata.session_name || 'Untitled'}"`;
      case 'scraping_completed':
        const businesses = metadata.businessesScraped || metadata.businesses_scraped || 0;
        const sessionName = metadata.sessionName || metadata.session_name || '';
        return `completed scraping ${sessionName ? `"${sessionName}" ` : ''}with ${businesses} businesses`;
      case 'note_added':
        return `added a note to lead "${metadata.leadName || metadata.name || 'Untitled'}"`;
      case 'reminder_created':
        return `created a reminder "${metadata.reminderTitle || metadata.title || 'Untitled'}"`;
      case 'route_generated':
        return `generated route with ${metadata.stopCount || metadata.stop_count || 0} stops`;
      case 'calculator_saved':
        return `saved calculator deal "${metadata.dealName || metadata.deal_name || 'Untitled'}"`;
      case 'calculator_loaded':
        return `loaded calculator deal "${metadata.dealName || metadata.deal_name || 'Untitled'}"`;
      case 'proposal_created':
        return `created proposal for "${metadata.dealName || metadata.deal_name || 'Untitled'}"`;
      default:
        return type.replace(/_/g, ' ');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6 gradient-text">Recent Activity</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-4 animate-pulse">
              <div className="w-10 h-10 bg-white/10 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-white/10 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6 gradient-text">Recent Activity</h2>
        <p className="text-red-400">Error loading activities: {error}</p>
      </div>
    );
  }

  if (!data || data.activities.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6 gradient-text">Recent Activity</h2>
        <p className="text-gray-400 text-center py-8">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold gradient-text">Recent Activity</h2>
        {user?.role === 'admin' && (
          <span className="text-xs text-gray-400 bg-white/5 px-3 py-1 rounded-full">
            All Users
          </span>
        )}
      </div>

      <div className="space-y-3 lg:space-y-4 max-h-96 overflow-y-auto scrollbar-hide">
        {data.activities.map((activity) => (
          <div
            key={activity.id}
            className="flex flex-col sm:flex-row items-start gap-3 lg:gap-4 p-3 lg:p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors w-full"
          >
            <div className={`text-2xl ${getActivityColor(activity.activityType)} flex-shrink-0`}>
              {getActivityIcon(activity.activityType)}
            </div>
            <div className="flex-1 min-w-0 w-full">
              <p className="text-sm text-white break-words">
                <span className="font-semibold">{activity.userName}</span>{' '}
                <span className="text-gray-300">{formatActivityMessage(activity)}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {formatTimeAgo(activity.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {data.count >= 10 && (
        <div className="mt-4 pt-4 border-t border-white/10 text-center">
          <button
            onClick={fetchActivities}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Refresh activities
          </button>
        </div>
      )}
    </div>
  );
}
