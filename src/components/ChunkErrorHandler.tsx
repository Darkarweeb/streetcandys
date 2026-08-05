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
 * Fix: Intercept the error, clear ALL caches (Cache API + localStorage Next.js
 * entries), and force a hard reload so the browser fetches the latest chunks.
 */

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

export default function ChunkErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const msg = event?.message || '';
      if (isChunkError(msg)) {
        event.preventDefault();
        clearAllNextCaches();
        window.location.reload();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = String(event?.reason?.message || event?.reason || '');
      if (isChunkError(msg)) {
        event.preventDefault();
        clearAllNextCaches();
        window.location.reload();
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
