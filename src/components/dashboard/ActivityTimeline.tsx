'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FileText, 
  Save, 
  FolderOpen, 
  FileDown, 
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { getActivityLogs, getUniqueUsers, ActivityLog, ActivityType } from '@/lib/activityLogger';
import { useAuthStore } from '@/store/auth';
import { ActivityCardSkeleton } from '@/components/ui/skeletons';
import { debounce } from '@/lib/utils/debounce';

interface ActivityTimelineProps {
  userRole: 'admin' | 'manager' | 'user';
  currentUserId: string;
  isMobile?: boolean;
}

// Activity type to icon mapping
const activityIcons: Record<ActivityType, typeof FileText> = {
  deal_created: FileText,
  deal_saved: Save,
  deal_loaded: FolderOpen,
  proposal_generated: FileText,
  pdf_generated: FileDown
};

// Activity type to color mapping
const activityColors: Record<ActivityType, string> = {
  deal_created: 'text-green-500 bg-green-50',
  deal_saved: 'text-blue-500 bg-blue-50',
  deal_loaded: 'text-purple-500 bg-purple-50',
  proposal_generated: 'text-orange-500 bg-orange-50',
  pdf_generated: 'text-indigo-500 bg-indigo-50'
};

// Activity type to display text mapping
const activityLabels: Record<ActivityType, string> = {
  deal_created: 'Deal Created',
  deal_saved: 'Deal Saved',
  deal_loaded: 'Deal Loaded',
  proposal_generated: 'Proposal Generated',
  pdf_generated: 'PDF Generated'
};

/**
 * Format timestamp to relative time (e.g., "2 hours ago")
 */
const formatRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const activityTime = new Date(timestamp);
  const diffMs = now.getTime() - activityTime.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else {
    return activityTime.toLocaleDateString();
  }
};

export default function ActivityTimeline({ userRole, currentUserId, isMobile = false }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [availableUsers, setAvailableUsers] = useState<Array<{ userId: string; username: string; userRole: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { users } = useAuthStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // Determine page size based on device type
  const pageSize = isMobile ? 20 : 50;

  // Load initial activities
  const loadActivities = useCallback(async (resetPage: boolean = false) => {
    const targetPage = resetPage ? 1 : currentPage;
    
    if (resetPage) {
      setIsLoading(true);
      setActivities([]);
      setCurrentPage(1);
      setHasMore(true);
    } else {
      setIsLoadingMore(true);
    }
    
    setError(null);
    
    try {
      const filterUserId = userRole === 'admin' && selectedUserId !== 'all' 
        ? selectedUserId 
        : userRole !== 'admin' 
        ? currentUserId 
        : undefined;

      const response = await fetch(
        `/api/activity-logs?page=${targetPage}&pageSize=${pageSize}${filterUserId ? `&userId=${filterUserId}` : ''}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }
      
      const result = await response.json();
      
      // Filter out "deal_loaded" activities
      const filteredLogs = result.data?.filter((activity: any) => 
        activity.activity_type !== 'deal_loaded'
      ) || [];
      
      if (resetPage) {
        setActivities(filteredLogs);
      } else {
        setActivities(prev => [...prev, ...filteredLogs]);
      }
      
      setHasMore(result.hasMore);
      
      if (!resetPage) {
        setCurrentPage(prev => prev + 1);
      }
    } catch (err) {
      console.error('Failed to load activities from database, falling back to localStorage:', err);
      setError('Unable to load activities from server. Showing local data.');
      
      // Fall back to localStorage
      let logs: ActivityLog[];
      if (userRole === 'admin') {
        if (selectedUserId === 'all') {
          logs = getActivityLogs();
        } else {
          logs = getActivityLogs(selectedUserId);
        }
      } else {
        logs = getActivityLogs(currentUserId);
      }
      
      // Filter out "deal_loaded" activities and apply pagination
      const filteredLogs = logs.filter(log => log.activityType !== 'deal_loaded');
      const start = (targetPage - 1) * pageSize;
      const end = start + pageSize;
      const paginatedLogs = filteredLogs.slice(start, end);
      
      if (resetPage) {
        setActivities(paginatedLogs);
      } else {
        setActivities(prev => [...prev, ...paginatedLogs]);
      }
      
      setHasMore(end < filteredLogs.length);
      
      if (!resetPage) {
        setCurrentPage(prev => prev + 1);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [userRole, currentUserId, selectedUserId, currentPage, pageSize]);

  // Initial load and reload on filter change
  useEffect(() => {
    loadActivities(true);
  }, [userRole, currentUserId, selectedUserId]);

  useEffect(() => {
    // Load available users for admin dropdown
    if (userRole === 'admin') {
      const uniqueUsers = getUniqueUsers();
      setAvailableUsers(uniqueUsers);
    }
  }, [userRole]);

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    if (!loadMoreTriggerRef.current || !hasMore || isLoadingMore) {
      return;
    }

    // Debounced load more function
    const debouncedLoadMore = debounce(() => {
      if (hasMore && !isLoadingMore) {
        loadActivities(false);
      }
    }, 100);

    // Create intersection observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          debouncedLoadMore();
        }
      },
      {
        root: null,
        rootMargin: '100px', // Trigger 100px before reaching the element
        threshold: 0.1
      }
    );

    observerRef.current.observe(loadMoreTriggerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingMore, loadActivities]);

  return (
    <div className="space-y-4">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 sm:p-5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] md:hover:shadow-[0_0_40px_rgba(138,43,226,0.3),0_8px_32px_rgba(0,0,0,0.12)] transition-all duration-300 group relative overflow-hidden"
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-pink-500/5 rounded-2xl pointer-events-none"></div>
        
        {/* Glow border on hover (desktop only) */}
        <div className="hidden md:block absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-pink-500/20 blur-xl"></div>
        </div>
        
        <div className="flex items-center space-x-3 sm:space-x-4 relative z-10">
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg shadow-md group-hover:scale-105 transition-transform duration-300">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-gray-900 text-base sm:text-lg flex items-center space-x-2">
              <span>Recent Activity</span>
              {!isLoading && activities.length > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-700 rounded-full">
                  {activities.length}
                </span>
              )}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
              {isLoading ? 'Loading activities...' : isExpanded ? 'Click to collapse' : 'Click to view activity'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 relative z-10">
          <div className="p-1.5 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors duration-300">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-purple-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-purple-600" />
            )}
          </div>
        </div>
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="space-y-4 animate-slide-down">
          {/* Admin User Selection Dropdown */}
          {userRole === 'admin' && (
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-500" />
              <div className="relative flex-1 max-w-xs">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-4 py-2 pr-10 bg-white/80 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none cursor-pointer transition-all duration-200 hover:bg-white"
                  disabled={isLoading}
                >
                  <option value="all">All Users</option>
                  {availableUsers.map((user) => (
                    <option key={user.userId} value={user.userId}>
                      {user.username} ({user.userRole})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start space-x-2">
              <div className="text-yellow-600 text-sm flex-1">
                {error}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <ActivityCardSkeleton key={index} isMobile={isMobile} />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mb-4">
                <Clock className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg">No recent activity to display</p>
              <p className="text-gray-400 text-sm mt-2">
                {userRole === 'admin' && selectedUserId !== 'all'
                  ? 'This user has no activity yet'
                  : 'Activity will appear here once you start using the calculator'}
              </p>
            </div>
          ) : (
            <div className="space-y-3" ref={scrollContainerRef}>
              {activities.map((activity) => {
                const Icon = activityIcons[activity.activityType];
                const colorClasses = activityColors[activity.activityType];
                const label = activityLabels[activity.activityType];

                return (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-4 p-4 bg-white/60 rounded-lg border border-gray-100 hover:bg-white/80 hover:shadow-md transition-all duration-200"
                  >
                    {/* Activity Icon */}
                    <div className={`p-2 rounded-lg ${colorClasses} flex-shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Activity Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{label}</p>
                          {activity.dealName && (
                            <p className="text-sm text-gray-600 mt-1">
                              {activity.dealName}
                            </p>
                          )}
                          {userRole === 'admin' && (
                            <p className="text-xs text-gray-500 mt-1">
                              by {activity.username}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                          {formatRelativeTime(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Infinite scroll trigger */}
              {hasMore && (
                <div ref={loadMoreTriggerRef} className="py-4">
                  {isLoadingMore && (
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      <span className="text-sm text-gray-500">Loading more activities...</span>
                    </div>
                  )}
                </div>
              )}

              {/* No more activities message */}
              {!hasMore && activities.length > 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No more activities to load</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
