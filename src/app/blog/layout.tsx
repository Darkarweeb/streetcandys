import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Blog | Street Candy's — Cannabis, Bienestar y Cultura",
  description:
    "Aprende sobre cannabis, bienestar, ciencia y cultura con los artículos de Street Candy's. Guías, noticias y educación cannábica en español.",
  keywords: ['cannabis', 'bienestar', 'CBD', 'THC', 'educación cannábica', 'Street Candy'],
  openGraph: {
    title: "Blog | Street Candy's",
    description:
      "Aprende sobre cannabis, bienestar, ciencia y cultura con los artículos de Street Candy's.",
    type: 'website',
    locale: 'es_CO',
    siteName: "Street Candy's",
    url: `${baseUrl}/blog`,
  },
  twitter: {
    card: 'summary_large_image',
    title: "Blog | Street Candy's",
    description:
      "Aprende sobre cannabis, bienestar, ciencia y cultura con los artículos de Street Candy's.",
    creator: '@streetcandys',
  },
  alternates: {
    canonical: `${baseUrl}/blog`,
    types: {
      'application/rss+xml': `${baseUrl}/blog/rss.xml`,
    },
  },
};

export default function BlogLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
