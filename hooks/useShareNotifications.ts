'use client';

import { useState, useEffect } from 'react';

interface ShareNotification {
  id: number;
  lead_id: number;
  business_name: string;
  contact_person: string;
  shared_by_username: string;
  created_at: string;
}

export function useShareNotifications() {
  const [notifications, setNotifications] = useState<ShareNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/leads/share-notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Error fetching share notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return {
    notifications,
    loading,
    refetch: fetchNotifications,
    removeNotification,
  };
}
