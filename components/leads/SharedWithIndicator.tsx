'use client';

import { useState, useEffect } from 'react';
import { Users, User } from 'lucide-react';

interface ShareInfo {
  shares: Array<{
    user_id: string;
    username: string;
    email: string;
    shared_by_username: string;
  }>;
  owner: {
    user_id: string;
    username: string;
    email: string;
  } | null;
}

// Helper function to get auth token
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const data = JSON.parse(stored);
      return data.state?.token || data.token || null;
    }
  } catch (error) {
    console.error('Error reading auth token:', error);
  }
  return null;
}

// Helper function to get current user ID
function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const data = JSON.parse(stored);
      return data.state?.user?.userId || data.user?.userId || null;
    }
  } catch (error) {
    console.error('Error reading user ID:', error);
  }
  return null;
}

interface SharedWithIndicatorProps {
  leadId: string;
  compact?: boolean; // For table view (compact) vs card view (expanded)
}

export default function SharedWithIndicator({ leadId, compact = false }: SharedWithIndicatorProps) {
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    fetchShareInfo();
  }, [leadId]);

  const fetchShareInfo = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/leads/${leadId}/share`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setShareInfo(data);
      }
    } catch (error) {
      console.error('Error fetching share info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !shareInfo) return null;

  const currentUserId = getCurrentUserId();
  const isOwner = shareInfo.owner?.user_id === currentUserId;
  const shareCount = shareInfo.shares.length;
  
  // Check if current user is a sharee
  const isSharee = shareInfo.shares.some(s => s.user_id === currentUserId);

  // Don't show indicator if no shares AND user is not a sharee
  if (shareCount === 0 && !isSharee) return null;

  // Get display names
  const getDisplayNames = () => {
    if (isOwner) {
      // Owner sees list of sharees
      return shareInfo.shares.map(s => s.username);
    } else {
      // Sharee sees owner + other sharees
      const names: string[] = [];
      if (shareInfo.owner) {
        names.push(`${shareInfo.owner.username} (Owner)`);
      }
      shareInfo.shares.forEach(s => {
        if (s.user_id !== currentUserId) {
          names.push(s.username);
        }
      });
      return names;
    }
  };

  const displayNames = getDisplayNames();
  const displayCount = displayNames.length;

  // Show indicator if there are display names OR if user is a sharee (to show owner)
  if (displayCount === 0 && !isSharee) return null;

  // Compact view for table
  if (compact) {
    return (
      <div className="relative inline-block">
        <div
          className="flex items-center gap-1 px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full cursor-help"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <Users className="w-3 h-3 text-cyan-400" />
          <span className="text-xs text-cyan-400 font-medium">{displayCount}</span>
        </div>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48">
            <div className="bg-slate-900 border border-white/20 rounded-lg shadow-xl p-3">
              <div className="text-xs font-semibold text-white mb-2">
                {isOwner ? 'Shared with:' : 'Shared access:'}
              </div>
              <div className="space-y-1">
                {displayNames.map((name, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-300">
                    <User className="w-3 h-3 text-cyan-400" />
                    <span className="truncate">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Expanded view for cards
  return (
    <div className="flex items-start gap-2 p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
      <Users className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-cyan-400 mb-1">
          {isOwner ? 'Shared with:' : 'Shared access:'}
        </div>
        <div className="space-y-1">
          {displayNames.slice(0, 3).map((name, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-xs text-cyan-300">
              <User className="w-3 h-3" />
              <span className="truncate">{name}</span>
            </div>
          ))}
          {displayNames.length > 3 && (
            <div className="text-xs text-cyan-400 font-medium">
              +{displayNames.length - 3} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
