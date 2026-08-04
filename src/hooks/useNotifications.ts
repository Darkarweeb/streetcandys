'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface CustomerNotification {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
  deleted_at: string | null;
  created_at: string;
}

interface UseNotificationsOptions {
  profileId: string | null;
  /** Max notifications to load. Default: 100 */
  limit?: number;
}

interface UseNotificationsReturn {
  notifications: CustomerNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook to load, display, and subscribe to customer notifications in realtime.
 * Supports mark-as-read, mark-all-read, delete (soft), and realtime INSERT updates.
 */
export function useNotifications({
  profileId,
  limit = 100,
}: UseNotificationsOptions): UseNotificationsReturn {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', profileId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (dbError) throw new Error(dbError.message);
      setNotifications((data as CustomerNotification[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando notificaciones');
    } finally {
      setLoading(false);
    }
  }, [profileId, limit, supabase]);

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Realtime subscription — listen for INSERT and UPDATE events
  useEffect(() => {
    if (!profileId) return;

    let isMounted = true;
    const channelName = `notifications-${profileId}`;

    const existing = supabase
      .getChannels()
      .find((ch) => ch.topic === `realtime:${channelName}`);
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${profileId}`,
        },
        (event) => {
          if (!isMounted) return;
          const newNotif = event.new as CustomerNotification;
          // Only show if not soft-deleted
          if (newNotif.deleted_at) return;
          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev].slice(0, limit);
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${profileId}`,
        },
        (event) => {
          if (!isMounted) return;
          const updated = event.new as CustomerNotification;
          setNotifications((prev) => {
            // If soft-deleted, remove from list
            if (updated.deleted_at) {
              return prev.filter((n) => n.id !== updated.id);
            }
            return prev.map((n) => (n.id === updated.id ? updated : n));
          });
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [profileId, limit, supabase]);

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n,
          ),
        );
      } catch {
        // silent — UI already optimistic
      }
    },
    [supabase],
  );

  const markAllAsRead = useCallback(async () => {
    if (!profileId) return;
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('profile_id', profileId)
        .eq('is_read', false)
        .is('deleted_at', null);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })),
      );
    } catch {
      // silent
    }
  }, [profileId, supabase]);

  const deleteNotification = useCallback(
    async (id: string) => {
      // Optimistic remove
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      try {
        await supabase
          .from('notifications')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);
      } catch {
        // Revert on failure
        loadNotifications();
      }
    },
    [supabase, loadNotifications],
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: loadNotifications,
  };
}
