'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';

interface PartnerLogo {
  id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
  sort_order: number;
}

interface StrategicPartnersSectionProps {
  country: string;
}

export default function StrategicPartnersSection({ country }: StrategicPartnersSectionProps) {
  const [logos, setLogos] = useState<PartnerLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (countryCode: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/aliados?country=${countryCode}`);
      const data = await res.json();
      if (data.exito) setLogos(data.datos ?? []);
      else setLogos([]);
    } catch {
      setLogos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (country === 'CO' || country === 'CR') {
      load(country);
    }
  }, [country, load]);

  // Hide section if no logos and not loading
  if (!loading && logos.length === 0) return null;

  // Duplicate logos for seamless marquee
  const marqueeLogos = logos.length > 0 ? [...logos, ...logos] : [];

  return (
    <section
      className="py-14 lg:py-20 bg-white border-y border-sc-border overflow-hidden"
      aria-label="Nuestros Aliados Estratégicos"
    >
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <p className="text-sc-forest/60 text-xs font-bold uppercase tracking-widest mb-2 text-center">
          Aliados
        </p>
        <h2 className="text-sc-forest font-black text-2xl lg:text-3xl tracking-tightest leading-none mb-10 text-center">
          Nuestros Aliados Estratégicos
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-8 px-8 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-28 h-14 bg-sc-beige rounded-lg animate-pulse"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Mobile: auto-scrolling marquee */}
          <div className="block md:hidden relative">
            <div
              className="flex gap-10 items-center"
              style={{
                animation: 'partners-marquee 20s linear infinite',
                width: 'max-content',
              }}
              ref={trackRef}
              aria-hidden="true"
            >
              {marqueeLogos.map((logo, idx) => (
                <LogoItem key={`${logo.id}-${idx}`} logo={logo} />
              ))}
            </div>
          </div>

          {/* Desktop: static row, evenly spaced */}
          <div className="hidden md:flex flex-wrap items-center justify-center gap-10 lg:gap-16 px-8">
            {logos.map((logo) => (
              <LogoItem key={logo.id} logo={logo} />
            ))}
          </div>
        </>
      )}

      <style>{`
        @keyframes partners-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}

function LogoItem({ logo }: { logo: PartnerLogo }) {
  const img = (
    <img
      src={logo.logo_url}
      alt={logo.name}
      className="h-12 w-auto max-w-[120px] object-contain grayscale opacity-60 transition-all duration-300 hover:grayscale-0 hover:opacity-100"
      loading="lazy"
    />
  );

  if (logo.website_url) {
    return (
      <a
        href={logo.website_url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Visitar ${logo.name}`}
        className="flex-shrink-0 flex items-center justify-center"
      >
        {img}
      </a>
    );
  }

  return (
    <div className="flex-shrink-0 flex items-center justify-center" aria-label={logo.name}>
      {img}
    </div>
  );
}
