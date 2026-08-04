'use client';
import React, { useState, useEffect } from 'react';
import { formatShippingThreshold, type Country } from '@/lib/price';

const COUNTRY_KEY = 'sc_country';

function getMessages(country: Country): string[] {
  return [
    `🚚 Envío gratis en compras superiores a ${formatShippingThreshold(country)}`,
    '✦',
    '🌿 Calidad garantizada y certificada',
  ];
}

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(true);
  const [country, setCountry] = useState<Country>('CO');

  useEffect(() => {
    // Read persisted value on mount
    const stored = localStorage.getItem(COUNTRY_KEY);
    if (stored === 'CR' || stored === 'CO') {
      setCountry(stored as Country);
    }

    // Cross-tab: StorageEvent fires when another tab writes to localStorage
    const handleStorage = (e: StorageEvent) => {
      if (e.key === COUNTRY_KEY && (e.newValue === 'CR' || e.newValue === 'CO')) {
        setCountry(e.newValue as Country);
      }
    };

    // Same-tab: custom event dispatched by handleCountryChange in page.tsx
    const handleCustom = (e: Event) => {
      const code = (e as CustomEvent<string>).detail;
      if (code === 'CR' || code === 'CO') {
        setCountry(code as Country);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('sc:country-change', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sc:country-change', handleCustom);
    };
  }, []);

  if (!visible) return null;

  const msgs = getMessages(country);

  return (
    <div className="bg-sc-darkforest text-sc-cream text-sm font-medium flex items-center justify-center gap-6 px-4 py-2 relative overflow-hidden">
      <div suppressHydrationWarning className="flex items-center gap-6 animate-marquee whitespace-nowrap">
        {msgs.map((msg, i) => (
          <span suppressHydrationWarning key={i} className={msg === '✦' ? 'text-sc-cream/50' : ''}>{msg}</span>
        ))}
        {msgs.map((msg, i) => (
          <span suppressHydrationWarning key={`dup-${i}`} className={msg === '✦' ? 'text-sc-cream/50' : ''}>{msg}</span>
        ))}
      </div>
      <button
        onClick={() => setVisible(false)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-sc-cream/70 hover:text-sc-cream transition-colors"
        aria-label="Cerrar anuncio"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}
