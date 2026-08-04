'use client';

import { useEffect, useState } from 'react';
import { getNetworkStatus, addNetworkListener, isNative } from '@/lib/mobile';

/**
 * Offline banner — shown only on native when the device has no connectivity.
 * On web this component renders nothing.
 */
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (!isNative()) return;

    getNetworkStatus().then((status) => {
      setIsOffline(!status.connected);
    });

    let handle: { remove: () => void } | null = null;
    addNetworkListener((status) => {
      setIsOffline(!status.connected);
    }).then((h) => {
      handle = h;
    });

    return () => {
      handle?.remove();
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white text-center text-sm py-2 px-4">
      Sin conexión a internet. Algunas funciones pueden no estar disponibles.
    </div>
  );
}
