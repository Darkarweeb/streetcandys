/**
 * Street Candy — useCartPersistence
 *
 * Provides persistent cart state that:
 *  - Survives browser refreshes (localStorage snapshot)
 *  - Survives browser sessions (same localStorage key)
 *  - Auto-restores on mount
 *  - Merges guest cart with authenticated user cart after login
 *  - Expires abandoned carts after CART_TTL_MS (configurable in persistence.ts)
 *
 * Reuses the existing CartItem shape from page.tsx — no business logic is
 * duplicated; this hook is purely a persistence/merge layer.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  readCartSnapshot,
  writeCartSnapshot,
  clearCartSnapshot,
  mergeCartItems,
  type PersistedCartItem,
} from '@/lib/cart/persistence';

export type { PersistedCartItem };

interface UseCartPersistenceOptions {
  /** Current authenticated user's profile ID, or null/undefined for guests. */
  profileId?: string | null;
}

interface UseCartPersistenceReturn {
  cartItems: PersistedCartItem[];
  setCartItems: React.Dispatch<React.SetStateAction<PersistedCartItem[]>>;
  clearCart: () => void;
}

/**
 * Drop-in replacement for `useState<CartItem[]>([])` that adds persistence.
 *
 * Usage:
 *   const { cartItems, setCartItems, clearCart } = useCartPersistence({ profileId });
 */
export function useCartPersistence({
  profileId,
}: UseCartPersistenceOptions = {}): UseCartPersistenceReturn {
  // Start with empty array (SSR-safe); snapshot is loaded after mount
  const [cartItems, setCartItemsRaw] = useState<PersistedCartItem[]>([]);

  // Track the previous profileId so we can detect login transitions
  const prevProfileIdRef = useRef<string | null | undefined>(undefined);
  // Flag: have we already restored from localStorage on this mount?
  const restoredRef = useRef(false);
  // Flag: persist effect should skip the first write until after restore settles
  const skipNextPersistRef = useRef(true);

  // ── 1. Auto-restore on mount ────────────────────────────────────────────────
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const snapshot = readCartSnapshot();
    if (!snapshot || snapshot.items.length === 0) {
      // Nothing to restore — allow persist effect to write from now on
      skipNextPersistRef.current = false;
      return;
    }

    setCartItemsRaw(snapshot.items);
    // After setting items from snapshot, the next persist effect run
    // will see the restored items — allow it to write then
    skipNextPersistRef.current = false;
  }, []);

  // ── 2. Merge guest cart after login ────────────────────────────────────────
  useEffect(() => {
    // Wait until we've restored the snapshot first
    if (!restoredRef.current) return;

    const prev = prevProfileIdRef.current;
    const curr = profileId ?? null;

    // Detect transition: was guest (null/undefined), now authenticated
    const justLoggedIn =
      (prev === null || prev === undefined) &&
      curr !== null &&
      curr !== undefined;

    if (justLoggedIn) {
      // Read the guest snapshot that was saved before login
      const guestSnapshot = readCartSnapshot();

      if (guestSnapshot && guestSnapshot.profileId === null && guestSnapshot.items.length > 0) {
        // Merge guest items into whatever the user already has in state
        setCartItemsRaw((currentItems) => {
          const merged = mergeCartItems(currentItems, guestSnapshot.items);
          // Immediately persist the merged cart under the new profileId
          writeCartSnapshot(merged, curr);
          return merged;
        });
      }
    }

    prevProfileIdRef.current = curr;
  }, [profileId]);

  // ── 3. Persist on every change ─────────────────────────────────────────────
  useEffect(() => {
    // Skip the very first run (before restore has settled) to avoid
    // overwriting a valid snapshot with the initial empty array
    if (skipNextPersistRef.current) return;

    writeCartSnapshot(cartItems, profileId ?? null);
  }, [cartItems, profileId]);

  // ── 4. Wrapped setter (same API as useState setter) ────────────────────────
  const setCartItems: React.Dispatch<React.SetStateAction<PersistedCartItem[]>> = useCallback(
    (action) => {
      setCartItemsRaw(action);
    },
    [],
  );

  // ── 5. Clear helper ────────────────────────────────────────────────────────
  const clearCart = useCallback(() => {
    setCartItemsRaw([]);
    clearCartSnapshot();
  }, []);

  return { cartItems, setCartItems, clearCart };
}
