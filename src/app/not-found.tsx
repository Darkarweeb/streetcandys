'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sc-cream px-4 py-16">
      <div className="text-center max-w-md">
        <h1 className="text-9xl font-black text-sc-forest opacity-10 leading-none select-none">404</h1>
        <h2 className="text-2xl font-bold text-sc-forest mt-4 mb-2">Página no encontrada</h2>
        <p className="text-sc-muted text-sm mb-8">
          La página que buscas no existe o fue movida. Volvamos al inicio.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router?.back()}
            className="inline-flex items-center justify-center gap-2 border border-sc-forest text-sc-forest px-6 py-3 rounded-pill text-sm font-medium hover:bg-sc-forest hover:text-sc-cream transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Volver
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-sc-forest text-sc-cream px-6 py-3 rounded-pill text-sm font-medium hover:bg-sc-darkforest transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 8l6-6 6 6M3 7.5V14h4v-3h2v3h4V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}