'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  isNative,
  hideSplashScreen,
  setStatusBarLight,
  setupKeyboard,
  setupDeepLinkHandler,
  addAppStateListener,
} from '@/lib/mobile';

/**
 * CapacitorProvider — mounts once in the root layout (client component).
 * Initialises all Capacitor plugins and handles deep links / app lifecycle.
 * Gracefully no-ops on web.
 */
export default function CapacitorProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    async function init() {
      if (!isNative()) return;

      // 1. Status bar
      await setStatusBarLight();

      // 2. Keyboard
      await setupKeyboard();

      // 3. Deep links — map streetcandys.shop URLs to Next.js routes
      await setupDeepLinkHandler((url: string) => {
        try {
          const parsed = new URL(url);
          const path = parsed.pathname + parsed.search + parsed.hash;
          router.push(path);
        } catch {
          console.warn('[Mobile] Could not parse deep link URL:', url);
        }
      });

      // 4. App lifecycle — refresh auth session when returning to foreground
      await addAppStateListener({
        onForeground: () => {
          // Supabase client auto-refreshes the session; nothing extra needed.
          console.log('[Mobile] App returned to foreground');
        },
      });

      // 5. Hide splash screen after everything is ready
      await hideSplashScreen();
    }

    init().catch(console.error);
  }, [router]);

  return <>{children}</>;
}
