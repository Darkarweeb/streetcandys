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
import { ToastProvider } from '@/components/ui/Toast';

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
    default: 'Street Candys | Productos Derivados del Cáñamo',
    template: '%s | Street Candys',
  },
  description: 'Descubre y compra productos de cáñamo premium y de confianza. Envíos a Colombia y Costa Rica.',
  keywords: ['cáñamo', 'CBD', 'productos derivados del cáñamo', 'productos premium', 'Street Candys', 'gomitas de cáñamo', 'aceite de cáñamo', 'terpenos', 'cannabinoides', 'Colombia', 'Costa Rica'],
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
    title: 'Street Candys | Productos Derivados del Cáñamo',
    description: 'Descubre y compra productos de cáñamo premium y de confianza. Envíos a Colombia y Costa Rica.',
    type: 'website',
    locale: 'es_CO',
    siteName: 'Street Candys',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://streetcandys.shop',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://streetcandys.shop'}/assets/images/og-image-streetcandys-spanish.png`,
        width: 1200,
        height: 630,
        alt: 'Street Candys — Productos Derivados del Cáñamo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Street Candys | Productos Derivados del Cáñamo',
    description: 'Descubre y compra productos de cáñamo premium y de confianza. Envíos a Colombia y Costa Rica.',
    creator: '@streetcandys',
    images: [
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://streetcandys.shop'}/assets/images/og-image-streetcandys-spanish.png`,
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
            __html: `(function(){var RCK='__sc_chunk_reload_count__';var MAX=3;function rc(){try{return parseInt(sessionStorage.getItem(RCK)||'0',10);}catch(e){return 0;}}function ic(){try{var c=rc()+1;sessionStorage.setItem(RCK,String(c));}catch(e){}}function clr(){try{if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(reg){reg.unregister();});});}}catch(e){}try{if(window.caches){window.caches.keys().then(function(k){k.forEach(function(n){window.caches.delete(n);});});}}catch(e){}try{var ls=window.localStorage;if(ls){var tr=[];for(var i=0;i<ls.length;i++){var k=ls.key(i);if(k&&(k.indexOf('__RSC_')!==-1||k.indexOf('next-router')!==-1||k.indexOf('_next')!==-1||k.indexOf('__NEXT_')!==-1)){tr.push(k);}}tr.forEach(function(k){ls.removeItem(k);});}}catch(e){}try{var ss=window.sessionStorage;if(ss){var ts=[];for(var j=0;j<ss.length;j++){var sk=ss.key(j);if(sk&&sk!==RCK&&(sk.indexOf('__RSC_')!==-1||sk.indexOf('next-router')!==-1||sk.indexOf('_next')!==-1||sk.indexOf('__NEXT_')!==-1)){ts.push(sk);}}ts.forEach(function(k){ss.removeItem(k);});}}catch(e){}}function isChunk(m){var s=String(m||'');return s.indexOf('originalFactory')!==-1||s.indexOf("reading 'call'")!==-1||s.indexOf('Loading chunk')!==-1||s.indexOf('ChunkLoadError')!==-1||s.indexOf('undefined is not an object')!==-1&&s.indexOf('originalFactory')!==-1;}function doReload(){if(rc()>=MAX){return;}ic();clr();window.location.reload();}window.addEventListener('error',function(ev){var msg=ev&&(ev.message||'');if(isChunk(msg)){ev.preventDefault();doReload();}},true);window.addEventListener('unhandledrejection',function(ev){var ms=String(ev&&ev.reason&&ev.reason.message||ev&&ev.reason||'');if(isChunk(ms)){ev.preventDefault();doReload();}});var _o=window.onerror;window.onerror=function(m,s,l,c,e){if(isChunk(String(m||''))){doReload();return true;}if(_o)return _o.apply(this,arguments);return false;};setTimeout(function(){try{sessionStorage.removeItem(RCK);}catch(e){}},8000);})();`,
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
          <ToastProvider>
            <CapacitorProvider>
              <OfflineBanner />
              {children}
            </CapacitorProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
