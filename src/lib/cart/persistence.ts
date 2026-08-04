/**
 * Street Candy — Cart Persistence
 * Handles localStorage-based cart persistence with configurable expiry.
 * Works alongside the existing cart-service / cart-repository (Supabase).
 * This module is client-only (never imported on the server).
 */

// ─── Configuration ────────────────────────────────────────────────────────────

/** How long (ms) an abandoned cart is kept before it is discarded on restore. */
export const CART_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const STORAGE_KEY = 'sc_cart_snapshot';
const SESSION_KEY = 'sc_guest_session_id';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PersistedCartItem {
  id: string;
  name: string;
  price: string;
  qty: number;
  image: string;
}

export interface CartSnapshot {
  items: PersistedCartItem[];
  /** ISO timestamp of the last write — used for TTL checks. */
  savedAt: string;
  /** Profile ID when the snapshot was saved, or null for guests. */
  profileId: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== 'undefined';
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Reads the cart snapshot from localStorage.
 * Returns null if nothing is stored, the data is corrupt, or the TTL has expired.
 */
export function readCartSnapshot(): CartSnapshot | null {
  if (!isClient()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: CartSnapshot = JSON.parse(raw);

    // Validate shape
    if (!Array.isArray(parsed.items) || typeof parsed.savedAt !== 'string') {
      return null;
    }

    // TTL check — discard abandoned carts
    const age = Date.now() - new Date(parsed.savedAt).getTime();
    if (age > CART_TTL_MS) {
      clearCartSnapshot();
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persists the current cart items to localStorage with a fresh timestamp.
 */
export function writeCartSnapshot(
  items: PersistedCartItem[],
  profileId: string | null,
): void {
  if (!isClient()) return;
  try {
    const snapshot: CartSnapshot = {
      items,
      savedAt: new Date().toISOString(),
      profileId,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // localStorage may be full or blocked — fail silently
  }
}

/**
 * Removes the cart snapshot from localStorage.
 */
export function clearCartSnapshot(): void {
  if (!isClient()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silencioso
  }
}

// ─── Guest Session ID ─────────────────────────────────────────────────────────

/**
 * Returns a stable guest session ID, creating one if it doesn't exist yet.
 * Stored in localStorage so it survives browser refreshes.
 */
export function getOrCreateGuestSessionId(): string {
  if (!isClient()) return '';
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;

    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 10);
    const id = `sc_guest_${ts}_${rand}`;
    window.localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return `sc_guest_fallback_${Date.now()}`;
  }
}

/**
 * Clears the guest session ID (call after successful login + merge).
 */
export function clearGuestSessionId(): void {
  if (!isClient()) return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // silencioso
  }
}

// ─── Merge helpers ────────────────────────────────────────────────────────────

/**
 * Merges a guest cart snapshot into an authenticated user's cart.
 * Items already present in the user cart have their quantities summed.
 * Returns the merged item list.
 */
export function mergeCartItems(
  userItems: PersistedCartItem[],
  guestItems: PersistedCartItem[],
): PersistedCartItem[] {
  const MAX_QTY = 20; // mirrors CARRITO_CONSTANTES.MAX_CANTIDAD_POR_ITEM
  const merged = [...userItems];

  for (const guestItem of guestItems) {
    const existing = merged.find((i) => i.id === guestItem.id);
    if (existing) {
      existing.qty = Math.min(existing.qty + guestItem.qty, MAX_QTY);
    } else {
      merged.push({ ...guestItem });
    }
  }

  return merged;
}
