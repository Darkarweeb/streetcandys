'use client';
import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Payload delivered by Supabase Realtime for UPDATE events on the `ordenes` table.
 * Only the fields we care about are typed; the rest are unknown.
 */
export interface OrderStatusPayload {
  id: string;
  status: string;
  status_updated_at: string | null;
  estimated_delivery_time: string | null;
  tracking_number: string | null;
  status_history: unknown;
}

interface UseOrderRealtimeOptions {
  /**
   * When provided, the subscription is scoped to a single order by its UUID.
   * When omitted, ALL order updates are delivered (admin use-case).
   */
  orderId?: string;
  /** Called whenever an order row is updated in the database. */
  onUpdate: (payload: OrderStatusPayload) => void;
  /** Set to false to skip subscribing (e.g. while auth is loading). */
  enabled?: boolean;
}

/** Maximum reconnect delay in milliseconds (30 s). */
const MAX_RECONNECT_DELAY_MS = 30_000;

/**
 * Subscribes to Supabase Realtime UPDATE events on the `ordenes` table.
 *
 * Reliability improvements over the baseline:
 * - Auto-reconnects after connection loss with exponential backoff (1 s → 30 s).
 * - Deduplicates events: ignores payloads whose `status_updated_at` has already
 *   been processed for a given order id.
 * - Ignores events where the `status` value has not changed.
 * - Cleans up both the channel and any pending reconnect timer on unmount.
 * - Uses an `isMounted` flag to prevent state updates / reconnects after unmount.
 */
export function useOrderRealtime({
  orderId,
  onUpdate,
  enabled = true,
}: UseOrderRealtimeOptions): void {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  // Tracks the last processed status_updated_at per order id to deduplicate events.
  const lastSeenRef = useRef<Map<string, string>>(new Map());
  // Tracks the last known status per order id to skip no-op updates.
  const lastStatusRef = useRef<Map<string, string>>(new Map());

  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    const supabase = createClient();
    const channelName = orderId
      ? `order-status-${orderId}`
      : 'order-status-all';

    function clearReconnectTimer() {
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }

    function removeCurrentChannel() {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    }

    function subscribe() {
      if (!isMounted) return;

      // Remove any stale channel with the same name (e.g. React StrictMode double-mount).
      const existing = supabase
        .getChannels()
        .find((ch) => ch.topic === `realtime:${channelName}`);
      if (existing) {
        supabase.removeChannel(existing);
      }

      const filter = orderId ? `id=eq.${orderId}` : undefined;

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            ...(filter ? { filter } : {}),
          },
          (event) => {
            if (!isMounted) return;

            const newRow = event.new as OrderStatusPayload;
            const rowId = newRow.id;

            // Deduplicate: skip if we have already processed this exact timestamp.
            if (newRow.status_updated_at) {
              const lastSeen = lastSeenRef.current.get(rowId);
              if (lastSeen === newRow.status_updated_at) return;
              lastSeenRef.current.set(rowId, newRow.status_updated_at);
            }

            // Ignore events where status has not actually changed.
            const lastStatus = lastStatusRef.current.get(rowId);
            if (lastStatus === newRow.status) return;
            lastStatusRef.current.set(rowId, newRow.status);

            onUpdateRef.current(newRow);
          },
        )
        .subscribe((status) => {
          if (!isMounted) return;

          if (status === 'SUBSCRIBED') {
            // Successful (re)connection — reset backoff counter.
            reconnectAttemptRef.current = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            // Connection lost — schedule a reconnect with exponential backoff.
            removeCurrentChannel();
            clearReconnectTimer();

            const attempt = reconnectAttemptRef.current;
            const delay = Math.min(1_000 * 2 ** attempt, MAX_RECONNECT_DELAY_MS);
            reconnectAttemptRef.current = attempt + 1;

            reconnectTimerRef.current = setTimeout(() => {
              reconnectTimerRef.current = null;
              subscribe();
            }, delay);
          }
        });

      channelRef.current = channel;
    }

    subscribe();

    return () => {
      isMounted = false;
      clearReconnectTimer();
      removeCurrentChannel();
    };
    // onUpdate is intentionally excluded — tracked via ref to avoid re-subscribing
    // on every render while still calling the latest version.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, enabled]);
}
