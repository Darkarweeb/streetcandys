'use client';

import { useEffect } from 'react';

/**
 * ChunkErrorHandler
 *
 * Detects stale webpack chunk errors that occur when the browser has cached
 * JavaScript chunks from a previous deployment and a new build has been
 * deployed with different chunk hashes.
 *
 * Symptom: TypeError: Cannot read properties of undefined (reading 'call')
 *          at webpack.js (originalFactory.call)
 *
 * Fix: Intercept the error, clear ALL caches (Cache API + localStorage/sessionStorage
 * Next.js entries), and force a hard reload so the browser fetches the latest chunks.
 * A reload guard prevents infinite reload loops.
 *
 * Counter reset: delayed 5 s after mount so the guard isn't cleared before
 * the error fires during hydration.
 */

const RELOAD_COUNT_KEY = '__sc_chunk_reload_count__';
const MAX_RELOADS = 3;
// How long (ms) the app must stay alive before we consider it "stable"
const STABLE_DELAY_MS = 8000;

function getReloadCount(): number {
  try {
    return parseInt(sessionStorage.getItem(RELOAD_COUNT_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

function incrementReloadCount(): void {
  try {
    const count = getReloadCount() + 1;
    sessionStorage.setItem(RELOAD_COUNT_KEY, String(count));
  } catch {
    // sessionStorage not available
  }
}

function clearAllNextCaches() {
  // Unregister service workers
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => reg.unregister());
      });
    }
  } catch {
    // ignore
  }

  // Clear Cache API
  try {
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key));
      });
    }
  } catch {
    // Cache API not available
  }

  // Clear Next.js localStorage entries
  try {
    const ls = window.localStorage;
    const toRemove: string[] = [];
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i);
      if (
        key &&
        (key.includes('__RSC_') ||
          key.includes('next-router') ||
          key.includes('_next') ||
          key.includes('__NEXT_'))
      ) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((k) => ls.removeItem(k));
  } catch {
    // localStorage not available
  }

  // Clear Next.js sessionStorage entries (preserve reload counter)
  try {
    const ss = window.sessionStorage;
    const toRemove: string[] = [];
    for (let i = 0; i < ss.length; i++) {
      const key = ss.key(i);
      if (
        key &&
        key !== RELOAD_COUNT_KEY &&
        (key.includes('__RSC_') ||
          key.includes('next-router') ||
          key.includes('_next') ||
          key.includes('__NEXT_'))
      ) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((k) => ss.removeItem(k));
  } catch {
    // sessionStorage not available
  }
}

function isChunkError(msg: string): boolean {
  return (
    msg.includes("Cannot read properties of undefined (reading 'call')") ||
    msg.includes("undefined is not an object (evaluating 'originalFactory.call')") ||
    msg.includes("undefined is not an object (evaluating 'originalFactory") ||
    msg.includes('Loading chunk') ||
    msg.includes('ChunkLoadError') ||
    msg.includes('originalFactory')
  );
}

function handleChunkError() {
  const count = getReloadCount();
  if (count >= MAX_RELOADS) {
    // Stop reloading to prevent infinite loop — let the error surface
    console.warn('[ChunkErrorHandler] Max reload attempts reached. Stopping reload loop.');
    return;
  }
  incrementReloadCount();
  clearAllNextCaches();
  window.location.reload();
}

export default function ChunkErrorHandler() {
  useEffect(() => {
    // Delay the counter reset so the guard is still active during hydration.
    // If a chunk error fires within the first 5 s, the counter prevents looping.
    // After 5 s of stable operation we reset so future navigations can recover.
    const stableTimer = setTimeout(() => {
      try {
        sessionStorage.removeItem(RELOAD_COUNT_KEY);
      } catch {
        // ignore
      }
    }, STABLE_DELAY_MS);

    const handleError = (event: ErrorEvent) => {
      const msg = event?.message || '';
      if (isChunkError(msg)) {
        event.preventDefault();
        handleChunkError();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = String(event?.reason?.message || event?.reason || '');
      if (isChunkError(msg)) {
        event.preventDefault();
        handleChunkError();
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      clearTimeout(stableTimer);
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
