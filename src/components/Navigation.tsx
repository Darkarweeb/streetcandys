'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLogo from '@/components/ui/AppLogo';

interface NavigationProps {
  cartCount: number;
  onCartOpen: () => void;
  country?: string;
  onCountryChange?: (code: string) => void;
}

export default function Navigation({ cartCount, onCartOpen, country = 'CO', onCountryChange }: NavigationProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [mounted, setMounted] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Close search on outside click
  useEffect(() => {
    if (!searchOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-search-container]')) {
        setSearchOpen(false);
        setSearchValue('');
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [searchOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleSearchSubmit = () => {
    const trimmed = searchValue.trim();
    if (!trimmed) return;
    setSearchOpen(false);
    setSearchValue('');
    router.push(`/productos?busqueda=${encodeURIComponent(trimmed)}`);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
      setSearchValue('');
    }
  };

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClick = () => setUserMenuOpen(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [userMenuOpen]);

  // Close country dropdown on outside click
  useEffect(() => {
    if (!countryDropdownOpen) return;
    const handleClick = () => setCountryDropdownOpen(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [countryDropdownOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
      router.refresh();
    } catch {
      // silent
    }
  };

  const navLinks = [
    { label: 'Productos', href: '/productos', isLink: true },
    { label: 'Blog', href: '/blog', isLink: true },
    { label: 'Contacto', href: '/contacto', isLink: true },
  ];

  return (
    <header className={`sticky top-0 z-50 bg-sc-cream transition-shadow duration-300 ${scrolled ? 'shadow-sm' : ''}`} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <a href="/" className="flex-shrink-0 flex items-center gap-2">
          <AppLogo variant="light" height={36} />
        </a>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Navegación principal">
          {navLinks.map(link => (
            link.isLink ? (
              <Link
                key={link.label}
                href={link.href}
                className="flex items-center gap-1 px-3 py-2 text-sc-forest text-sm font-medium hover:opacity-70 transition-opacity rounded-sm"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="flex items-center gap-1 px-3 py-2 text-sc-forest text-sm font-medium hover:opacity-70 transition-opacity rounded-sm"
              >
                {link.label}
              </a>
            )
          ))}
        </nav>

        {/* Right Icons */}
        <div className="flex items-center gap-1">
          {/* Search */}
          <div className="relative flex items-center" data-search-container>
            {searchOpen ? (
              <div className="flex items-center gap-1 bg-white border border-sc-border rounded-pill px-3 py-1.5 shadow-sm">
                <input
                  ref={searchInputRef}
                  type="search"
                  inputMode="search"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Buscar productos..."
                  className="w-44 sm:w-56 text-sm text-sc-forest bg-transparent focus:outline-none placeholder-sc-muted"
                  aria-label="Buscar productos"
                  autoComplete="off"
                />
                <button
                  onClick={handleSearchSubmit}
                  className="text-sc-forest hover:opacity-70 transition-opacity flex-shrink-0"
                  aria-label="Enviar búsqueda"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setSearchOpen(true); }}
                className="p-2.5 text-sc-forest hover:opacity-70 transition-opacity min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Buscar"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          {/* Location */}
          <div className="relative hidden md:block">
            <button
              onClick={(e) => { e.stopPropagation(); setCountryDropdownOpen(!countryDropdownOpen); }}
              className="flex items-center gap-1 px-3 py-2 text-sc-forest text-sm font-medium hover:opacity-70 transition-opacity"
              aria-label="Seleccionar país"
              aria-expanded={countryDropdownOpen}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6c0 3.75 4.5 8.5 4.5 8.5S12.5 9.75 12.5 6c0-2.485-2.015-4.5-4.5-4.5zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="currentColor"/>
              </svg>
              {/* suppressHydrationWarning: emoji + country code can differ between SSR and CSR */}
              <span className="text-xs" suppressHydrationWarning>
                {country === 'CR' ? '🇨🇷 CR' : '🇨🇴 CO'}
              </span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {countryDropdownOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-44 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { onCountryChange?.('CO'); setCountryDropdownOpen(false); }}
                  className={`w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sc-forest text-sm hover:bg-gray-50 transition-colors ${country === 'CO' ? 'font-semibold' : ''}`}
                >
                  <span>🇨🇴</span>
                  <span>Colombia</span>
                  {country === 'CO' && (
                    <svg className="ml-auto" width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => { onCountryChange?.('CR'); setCountryDropdownOpen(false); }}
                  className={`w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sc-forest text-sm hover:bg-gray-50 transition-colors ${country === 'CR' ? 'font-semibold' : ''}`}
                >
                  <span>🇨🇷</span>
                  <span>Costa Rica</span>
                  {country === 'CR' && (
                    <svg className="ml-auto" width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Account — stable placeholder on SSR, real content after mount */}
          <>
            {!mounted ? (
              /* SSR / pre-hydration: render a same-size invisible placeholder so the
                 DOM structure matches exactly between server and client first paint */
              <div className="w-9 h-9 hidden md:block" aria-hidden="true" />
            ) : !authLoading ? (
              <>
                {user ? (
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); }}
                      className="p-2 text-sc-forest hover:opacity-70 transition-opacity flex items-center gap-1.5"
                      aria-label="Menú de cuenta"
                      aria-expanded={userMenuOpen}
                    >
                      <div className="w-7 h-7 rounded-full bg-sc-forest flex items-center justify-center">
                        <span className="text-sc-cream text-xs font-bold uppercase">
                          {profile?.fullName?.charAt(0) || user.email?.charAt(0) || 'U'}
                        </span>
                      </div>
                    </button>

                    {userMenuOpen && (
                      <div
                        className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sc-forest text-sm font-semibold truncate">
                            {profile?.fullName || 'Mi cuenta'}
                          </p>
                          <p className="text-gray-400 text-xs truncate">{user.email}</p>
                        </div>
                        {profile?.role === 'admin' && (
                          <Link
                            href="/admin"
                            className="block px-4 py-2.5 text-sc-forest text-sm hover:bg-gray-50 transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            Panel de administración
                          </Link>
                        )}
                        <Link
                          href="/cuenta"
                          className="block px-4 py-2.5 text-sc-forest text-sm hover:bg-gray-50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Mi cuenta
                        </Link>
                        <Link
                          href="/cuenta/pedidos"
                          className="block px-4 py-2.5 text-sc-forest text-sm hover:bg-gray-50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Mis pedidos
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2.5 text-red-500 text-sm hover:bg-red-50 transition-colors"
                        >
                          Cerrar sesión
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href="/iniciar-sesion"
                    className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sc-forest text-sm font-medium hover:opacity-70 transition-opacity"
                    aria-label="Iniciar sesión"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <span className="text-xs">Ingresar</span>
                  </Link>
                )}
              </>
            ) : (
              /* authLoading=true after mount: same placeholder to avoid layout shift */
              <div className="w-9 h-9 hidden md:block" aria-hidden="true" />
            )}
          </>

          {/* Cart */}
          <button
            onClick={onCartOpen}
            className="p-2.5 text-sc-forest hover:opacity-70 transition-opacity relative min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={`Carrito${cartCount > 0 ? `, ${cartCount} productos` : ''}`}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M2 2h2l2.4 9.6a1 1 0 001 .8h7.2a1 1 0 00.96-.72L17 7H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="8" cy="17" r="1" fill="currentColor"/>
              <circle cx="15" cy="17" r="1" fill="currentColor"/>
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-sc-periwinkle text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          {/* Mobile menu */}
          <button
            className="lg:hidden p-2.5 text-sc-forest hover:opacity-70 transition-opacity min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menú"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-sc-cream border-t border-sc-beige px-4 py-4 max-h-[calc(100dvh-60px)] overflow-y-auto" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          {navLinks.map(link => (
            <Link
              key={link.label}
              href={link.href}
              className="block py-3.5 text-sc-forest text-base font-medium border-b border-sc-beige/50 last:border-0 min-h-[44px] flex items-center"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          {/* Mobile Country Selector */}
          <div className="py-3 border-b border-sc-beige/50">
            <p className="text-xs font-semibold text-sc-muted uppercase tracking-widest mb-2">País</p>
            <div className="flex gap-2">
              <button
                onClick={() => { onCountryChange?.('CO'); setMobileOpen(false); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-pill text-sm font-medium border transition-colors min-h-[44px] ${
                  country === 'CO' ? 'bg-sc-forest text-sc-cream border-sc-forest' : 'bg-transparent text-sc-forest border-sc-border hover:bg-sc-beige'
                }`}
              >
                <span>🇨🇴</span>
                <span>Colombia</span>
              </button>
              <button
                onClick={() => { onCountryChange?.('CR'); setMobileOpen(false); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-pill text-sm font-medium border transition-colors min-h-[44px] ${
                  country === 'CR' ? 'bg-sc-forest text-sc-cream border-sc-forest' : 'bg-transparent text-sc-forest border-sc-border hover:bg-sc-beige'
                }`}
              >
                <span>🇨🇷</span>
                <span>Costa Rica</span>
              </button>
            </div>
          </div>

          {/* Mobile auth links */}
          <div className="pt-3 border-t border-sc-beige/50 mt-1">
            {mounted && user ? (
              <>
                {profile?.role === 'admin' || profile?.role === 'staff' ? (
                  <Link
                    href="/admin"
                    className="block py-3.5 text-sc-forest text-base font-medium border-b border-sc-beige/50 min-h-[44px] flex items-center"
                    onClick={() => setMobileOpen(false)}
                  >
                    Panel de administración
                  </Link>
                ) : null}
                <Link
                  href="/cuenta"
                  className="block py-3.5 text-sc-forest text-base font-medium border-b border-sc-beige/50 min-h-[44px] flex items-center"
                  onClick={() => setMobileOpen(false)}
                >
                  Mi cuenta
                </Link>
                <button
                  onClick={() => { handleSignOut(); setMobileOpen(false); }}
                  className="block w-full text-left py-3.5 text-red-500 text-base font-medium min-h-[44px] flex items-center"
                >
                  Cerrar sesión
                </button>
              </>
            ) : mounted ? (
              <>
                <Link
                  href="/iniciar-sesion"
                  className="block py-3.5 text-sc-forest text-base font-medium border-b border-sc-beige/50 min-h-[44px] flex items-center"
                  onClick={() => setMobileOpen(false)}
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/registro"
                  className="block py-3.5 text-sc-forest text-base font-medium min-h-[44px] flex items-center"
                  onClick={() => setMobileOpen(false)}
                >
                  Crear cuenta
                </Link>
              </>
            ) : null}
          </div>
        </div>
      )}
    </header>
  );
}
