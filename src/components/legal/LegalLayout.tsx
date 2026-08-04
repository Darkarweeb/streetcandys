'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface LegalPage {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const legalPages: LegalPage[] = [
  {
    label: 'Privacidad',
    href: '/privacidad',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1L2 4v4c0 3.3 2.5 6.4 6 7 3.5-.6 6-3.7 6-7V4L8 1z"/>
      </svg>
    ),
  },
  {
    label: 'Términos y Condiciones',
    href: '/terminos',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="1" width="12" height="14" rx="2"/>
        <path d="M5 5h6M5 8h6M5 11h4"/>
      </svg>
    ),
  },
  {
    label: 'Política de Cookies',
    href: '/cookies',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="6"/>
        <circle cx="6" cy="6" r="1" fill="currentColor" stroke="none"/>
        <circle cx="10" cy="7" r="1" fill="currentColor" stroke="none"/>
        <circle cx="7" cy="10" r="1" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    label: 'Política de Envíos',
    href: '/envios',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="5" width="10" height="8" rx="1"/>
        <path d="M11 7h2l2 3v3h-4V7z"/>
        <circle cx="4" cy="13" r="1.5"/>
        <circle cx="12" cy="13" r="1.5"/>
      </svg>
    ),
  },
  {
    label: 'Política de Reembolsos',
    href: '/reembolsos',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 8a6 6 0 1 0 6-6"/>
        <path d="M2 4v4h4"/>
        <path d="M8 6v2l1.5 1.5"/>
      </svg>
    ),
  },
  {
    label: 'Contacto',
    href: '/contacto',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="14" height="10" rx="2"/>
        <path d="M1 6l7 4 7-4"/>
      </svg>
    ),
  },
  {
    label: 'Verificación de Edad',
    href: '/edad-legal',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="6"/>
        <path d="M8 5v3l2 2"/>
      </svg>
    ),
  },
];

interface LegalLayoutProps {
  children: React.ReactNode;
  currentHref: string;
  breadcrumbLabel: string;
}

export default function LegalLayout({ children, currentHref, breadcrumbLabel }: LegalLayoutProps) {
  const [cartCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
      <Navigation cartCount={cartCount} onCartOpen={() => {}} />

      <main className="min-h-screen bg-sc-cream">
        {/* Page Header */}
        <div className="bg-sc-darkforest text-sc-cream py-10 md:py-14">
          <div className="max-w-[1200px] mx-auto px-4 lg:px-8">
            <nav aria-label="Ruta de navegación" className="flex items-center gap-1.5 text-sm text-sc-cream/50 flex-wrap mb-4">
              <Link href="/" className="hover:text-sc-cream transition-colors">Inicio</Link>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="flex-shrink-0">
                <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <Link href="/privacidad" className="hover:text-sc-cream transition-colors">Legal</Link>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="flex-shrink-0">
                <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-sc-cream font-medium" aria-current="page">{breadcrumbLabel}</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-black tracking-tightest">{breadcrumbLabel}</h1>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-10 md:py-14">
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Sidebar */}
            <aside className="lg:w-64 flex-shrink-0">
              {/* Mobile toggle */}
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="lg:hidden w-full flex items-center justify-between px-4 py-3 bg-white border border-sc-border rounded-card text-sc-forest font-medium text-sm mb-2"
                aria-expanded={mobileNavOpen}
              >
                <span>Páginas legales</span>
                <svg
                  width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                  className={`transition-transform duration-200 ${mobileNavOpen ? 'rotate-180' : ''}`}
                >
                  <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <nav
                aria-label="Navegación legal"
                className={`${mobileNavOpen ? 'block' : 'hidden'} lg:block bg-white border border-sc-border rounded-card overflow-hidden`}
              >
                <div className="p-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-sc-muted px-3 py-2">Información Legal</p>
                  <ul className="space-y-0.5">
                    {legalPages.map((page) => {
                      const isActive = currentHref === page.href;
                      return (
                        <li key={page.href}>
                          <Link
                            href={page.href}
                            onClick={() => setMobileNavOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-sm2 text-sm font-medium transition-all duration-150 ${
                              isActive
                                ? 'bg-sc-forest text-sc-cream'
                                : 'text-sc-forest hover:bg-sc-beige'
                            }`}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            <span className={isActive ? 'text-sc-cream' : 'text-sc-muted'}>{page.icon}</span>
                            {page.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Help box */}
                <div className="border-t border-sc-border p-4 bg-sc-tan">
                  <p className="text-xs font-bold text-sc-forest mb-1">¿Tienes preguntas?</p>
                  <p className="text-xs text-sc-muted mb-3">Nuestro equipo está disponible para ayudarte.</p>
                  <Link
                    href="/contacto"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-sc-forest hover:opacity-70 transition-opacity"
                  >
                    Contáctanos
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 6h8M7 3l3 3-3 3"/>
                    </svg>
                  </Link>
                </div>
              </nav>
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              <div className="bg-white border border-sc-border rounded-card p-6 md:p-10 prose prose-sm max-w-none
                prose-headings:font-black prose-headings:tracking-tightest prose-headings:text-sc-forest
                prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
                prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2
                prose-p:text-sc-muted prose-p:leading-relaxed
                prose-a:text-sc-forest prose-a:font-semibold prose-a:no-underline hover:prose-a:opacity-70
                prose-ul:text-sc-muted prose-ol:text-sc-muted
                prose-li:leading-relaxed
                prose-strong:text-sc-forest
                prose-hr:border-sc-border">
                {children}
              </div>

              {/* Bottom navigation */}
              <div className="mt-6 flex flex-wrap gap-3">
                {legalPages
                  .filter((p) => p.href !== currentHref)
                  .slice(0, 3)
                  .map((page) => (
                    <Link
                      key={page.href}
                      href={page.href}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-sc-border rounded-pill text-sm font-medium text-sc-forest hover:bg-sc-beige transition-colors"
                    >
                      <span className="text-sc-muted">{page.icon}</span>
                      {page.label}
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
