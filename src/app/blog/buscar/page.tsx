import type { Metadata } from 'next';
import { Suspense } from 'react';
import BlogSearchPage from './client';

export const metadata: Metadata = {
  title: "Buscar artículos | Blog Street Candy's",
  description: "Busca artículos sobre cannabis, bienestar y cultura en el blog de Street Candy's.",
  robots: { index: false },
};

function SearchFallback() {
  return (
    <div className="min-h-screen bg-sc-cream">
      <div className="bg-sc-darkforest py-10 md:py-14">
        <div className="max-w-[800px] mx-auto px-4 lg:px-8">
          <div className="h-8 bg-white/10 rounded animate-pulse w-48 mb-6" />
          <div className="h-12 bg-white/10 rounded-pill animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <BlogSearchPage />
    </Suspense>
  );
}
