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
 * Fix: Intercept the error, clear the Next.js chunk cache, and force a
 * hard reload so the browser fetches the latest chunks.
 */
export default function ChunkErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const msg = event?.message || '';
      const isChunkError =
        msg.includes("Cannot read properties of undefined (reading 'call')") ||
        msg.includes("undefined is not an object (evaluating 'originalFactory.call')") ||
        msg.includes('Loading chunk') ||
        msg.includes('ChunkLoadError');

      if (isChunkError) {
        // Prevent the error from propagating to the console as unhandled
        event.preventDefault();

        // Clear Next.js router cache to avoid serving stale navigation data
        try {
          // Remove all _next chunk entries from the cache storage
          if ('caches' in window) {
            caches.keys().then((keys) => {
              keys.forEach((key) => caches.delete(key));
            });
          }
        } catch {
          // Cache API not available — proceed with reload anyway
        }

        // Hard reload fetches fresh chunks from the server
        window.location.reload();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = String(event?.reason?.message || event?.reason || '');
      const isChunkError =
        msg.includes("Cannot read properties of undefined (reading 'call')") ||
        msg.includes("undefined is not an object (evaluating 'originalFactory.call')") ||
        msg.includes('Loading chunk') ||
        msg.includes('ChunkLoadError');

      if (isChunkError) {
        event.preventDefault();
        try {
          if ('caches' in window) {
            caches.keys().then((keys) => {
              keys.forEach((key) => caches.delete(key));
            });
          }
        } catch {
          // ignore
        }
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
