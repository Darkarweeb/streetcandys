import React from 'react';
import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';
import { Suspense } from 'react';
import '../styles/index.css';
import { AuthProvider } from '@/contexts/AuthContext';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import CapacitorProvider from '@/components/mobile/CapacitorProvider';
import OfflineBanner from '@/components/mobile/OfflineBanner';
import ChunkErrorHandler from '@/components/ChunkErrorHandler';

const dmSans = DM_Sans({
  subsets: ['latin'],
  axes: ['opsz'],
  weight: 'variable',
  style: ['normal', 'italic'],
  display: 'swap',
  preload: true,
  variable: '--font-dm-sans',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#e91e8c',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://streetcandys.shop'),
  title: {
    default: 'Street Candys | Premium Hemp-Derived Products',
    template: '%s | Street Candys',
  },
  description: 'Premium Hemp-Derived Products. Learn, discover and shop trusted hemp products.',
  keywords: ['hemp', 'CBD', 'hemp-derived', 'premium hemp products', 'Street Candys', 'hemp gummies', 'hemp oil', 'terpenes', 'cannabinoids'],
  applicationName: 'Street Candys',
  icons: {
    icon: [
      { url: '/assets/streetcandys-favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', type: 'image/x-icon', sizes: 'any' },
    ],
    apple: [
      { url: '/assets/images/app-icon-streetcandys.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'Street Candys',
    description: 'Premium Hemp-Derived Products. Learn, discover and shop trusted hemp products.',
    type: 'website',
    locale: 'es_CO',
    siteName: 'Street Candys',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://streetcandys.shop',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://streetcandys.shop'}/assets/images/og-image-streetcandys-premium.png`,
        width: 1200,
        height: 630,
        alt: 'Street Candys — Premium Hemp-Derived Products',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Street Candys',
    description: 'Premium Hemp-Derived Products. Learn, discover and shop trusted hemp products.',
    creator: '@streetcandys',
    images: [
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://streetcandys.shop'}/assets/images/og-image-streetcandys-premium.png`,
    ],
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL || 'https://streetcandys.shop',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={dmSans.variable}>
      <head>
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://img.rocket.new" />
        {/* Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: "StreetCandy's",
              url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
              logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/favicon.ico`,
              description: "Gomitas, chocolates y dulces premium. Compra en línea, acumula puntos y disfruta de promociones exclusivas.",
              sameAs: [
                'https://www.instagram.com/streetcandys',
                'https://www.facebook.com/streetcandys',
                'https://twitter.com/streetcandys',
              ],
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'Servicio al Cliente',
                url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/contacto`,
              },
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var _o=window.onerror;window.onerror=function(m,s,l,c,e){var ms=String(m||'');if(ms.indexOf('originalFactory.call')!==-1||ms.indexOf("reading 'call'")!==-1||ms.indexOf('Loading chunk')!==-1||ms.indexOf('ChunkLoadError')!==-1){try{if(window.caches){window.caches.keys().then(function(k){k.forEach(function(n){window.caches.delete(n);});});}}catch(ex){}window.location.reload();return true;}if(_o)return _o.apply(this,arguments);};})();`,
          }}
        />
        <script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fstreetcand8616back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.20" />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.2" /></head>
      <body className={dmSans.className}>
        <ChunkErrorHandler />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-sc-forest focus:text-sc-cream focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold focus:text-sm"
        >
          Saltar al contenido principal
        </a>
        <AuthProvider>
          <Suspense fallback={null}>
            <GoogleAnalytics />
          </Suspense>
          <CapacitorProvider>
            <OfflineBanner />
            {children}
          </CapacitorProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
