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
 */

const RELOAD_COUNT_KEY = '__sc_chunk_reload_count__';
const MAX_RELOADS = 2;

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
  try {
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key));
      });
    }
  } catch {
    // Cache API not available
  }

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
    // Reset reload counter only after 5 s of stable operation.
    // Resetting immediately on mount was the regression: the chunk error
    // fires ~100 ms after mount, the counter was already 0 again, and the
    // MAX_RELOADS guard never held — causing an infinite reload loop that
    // prevented SpinToWin (and the rest of the page) from ever rendering.
    const resetTimer = setTimeout(() => {
      try {
        sessionStorage.removeItem(RELOAD_COUNT_KEY);
      } catch {
        // ignore
      }
    }, 5000);

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
      clearTimeout(resetTimer);
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
