'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import AnnouncementBar from '@/components/AnnouncementBar';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';

const NAV_ITEMS = [
  {
    href: '/cuenta',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1.5" y="1.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="10.5" y="1.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="1.5" y="10.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="10.5" y="10.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    exact: true,
  },
  {
    href: '/cuenta/perfil',
    label: 'Mi Perfil',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 16c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/cuenta/pedidos',
    label: 'Mis Pedidos',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M6 3V2a1 1 0 012 0v1M10 3V2a1 1 0 012 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M5 9h8M5 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/cuenta/direcciones',
    label: 'Direcciones',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 1.5C6.515 1.5 4.5 3.515 4.5 6c0 3.75 4.5 10.5 4.5 10.5S13.5 9.75 13.5 6c0-2.485-2.015-4.5-4.5-4.5zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/cuenta/favoritos',
    label: 'Favoritos',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 15s-7-4.5-7-9a4 4 0 018 0 4 4 0 018 0c0 4.5-7 9-7 9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/cuenta/recompensas',
    label: 'Recompensas',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2l1.8 3.6L15 6.3l-3 2.9.7 4.1L9 11.4l-3.7 1.9.7-4.1-3-2.9 4.2-.7L9 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/cuenta/loyalty',
    label: 'Loyalty Club',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 1.5l1.5 4.5H15l-3.75 2.75 1.5 4.5L9 10.5l-3.75 2.75 1.5-4.5L3 6h4.5L9 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/cuenta/resenas',
    label: 'Mis Reseñas',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2l1.5 3 3.5.5-2.5 2.5.5 3.5L9 10l-3 1.5.5-3.5L4 5.5 7.5 5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/cuenta/notificaciones',
    label: 'Notificaciones',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2a5 5 0 00-5 5v3l-1.5 2h13L14 10V7a5 5 0 00-5-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M7 14a2 2 0 004 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

interface CuentaLayoutProps {
  children: React.ReactNode;
}

export default function CuentaLayout({ children }: CuentaLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [cartOpen, setCartOpen] = React.useState(false);
  const [cartItems] = React.useState<{ id: string; name: string; price: string; qty: number; image: string }[]>([]);

  const { unreadCount } = useNotifications({ profileId: user?.id ?? null });

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/iniciar-sesion?next=' + encodeURIComponent(pathname));
    }
  }, [loading, user, router, pathname]);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sc-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sc-forest border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-sc-cream overflow-x-hidden">
      <AnnouncementBar />
      <Navigation cartCount={cartItems.length} onCartOpen={() => setCartOpen(true)} />

      <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-6 lg:py-12">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            {/* Profile card */}
            <div className="bg-white border border-sc-border rounded-card p-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-sc-forest flex items-center justify-center flex-shrink-0">
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.fullName} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <span className="text-sc-cream text-lg font-bold uppercase">
                      {profile?.fullName?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sc-forest font-semibold text-sm truncate">{profile?.fullName || 'Mi cuenta'}</p>
                  <p className="text-sc-muted text-xs truncate">{user.email}</p>
                  {profile?.countryCode && (
                    <span className="text-xs text-sc-muted">
                      {profile.countryCode === 'CO' ? '🇨🇴 Colombia' : '🇨🇷 Costa Rica'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Nav — horizontal scroll on mobile, vertical on desktop */}
            <nav
              className="bg-white border border-sc-border rounded-card overflow-hidden lg:block"
              aria-label="Navegación de cuenta"
            >
              {/* Mobile: horizontal scrollable tabs */}
              <div className="flex lg:hidden overflow-x-auto scrollbar-hide">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 text-xs font-medium transition-colors border-r border-sc-border/50 last:border-0 relative min-w-[72px] min-h-[64px] justify-center ${
                      isActive(item.href, item.exact)
                        ? 'bg-sc-forest text-sc-cream'
                        : 'text-sc-forest hover:bg-sc-beige'
                    }`}
                    aria-current={isActive(item.href, item.exact) ? 'page' : undefined}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="text-center leading-tight whitespace-nowrap">{item.label}</span>
                    {item.href === '/cuenta/notificaciones' && unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-sc-periwinkle text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
              {/* Desktop: vertical list */}
              <div className="hidden lg:block">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-b border-sc-border/50 last:border-0 min-h-[48px] ${
                      isActive(item.href, item.exact)
                        ? 'bg-sc-forest text-sc-cream'
                        : 'text-sc-forest hover:bg-sc-beige'
                    }`}
                    aria-current={isActive(item.href, item.exact) ? 'page' : undefined}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {item.label}
                    {item.href === '/cuenta/notificaciones' && unreadCount > 0 && (
                      <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-sc-periwinkle text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0" id="main-content">
            {children}
          </main>
        </div>
      </div>

      <Footer />
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={() => {}}
        onRemoveItem={() => {}}
      />
    </div>
  );
}
