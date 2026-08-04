'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Only run in production and when the measurement ID is configured
    if (process.env.NODE_ENV !== 'production') return;
    const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (!measurementId || measurementId === 'your-google-analytics-id-here') return;

    if (!window.dataLayer) {
      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      script.async = true;
      document.head.appendChild(script);

      window.dataLayer = [];
      window.gtag = function (...args: unknown[]) {
        window.dataLayer.push(args);
      };
      window.gtag('js', new Date());
      window.gtag('config', measurementId);
    }

    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    if (window.gtag) {
      window.gtag('event', 'page_view', { page_path: url });
    }
  }, [pathname, searchParams]);

  return null;
}
