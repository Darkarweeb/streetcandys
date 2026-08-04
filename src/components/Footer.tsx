'use client';
import React, { useState } from 'react';
import AppLogo from '@/components/ui/AppLogo';

export default function Footer() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmail('');
  };

  const footerLinks = [
    {
      heading: 'Shop',
      links: [
        { label: 'Shop All', href: '#shop' },
        { label: 'Gummies', href: '#shop' },
        { label: 'Flower', href: '#shop' },
        { label: 'Edibles', href: '#shop' },
        { label: 'Beverages', href: '#shop' },
        { label: 'Pre-Rolls', href: '#shop' },
        { label: 'Concentrates', href: '#shop' },
        { label: 'Bundles', href: '#shop' },
      ],
    },
    {
      heading: 'Learn',
      links: [
        { label: 'Legality', href: '#learn' },
        { label: 'Cannabinoids', href: '#learn' },
        { label: 'About Us', href: '#about' },
        { label: 'Quality', href: '#learn' },
        { label: 'Street Labs', href: '#learn' },
        { label: 'Rewards', href: '#rewards' },
      ],
    },
    {
      heading: 'Quick Links',
      links: [
        { label: 'Reviews', href: '#reviews' },
        { label: 'Centro de Ayuda', href: '/contacto' },
        { label: 'Envíos', href: '/envios' },
        { label: 'Reembolsos', href: '/reembolsos' },
        { label: 'Descuento Veteranos', href: '#' },
        { label: 'Contáctanos', href: '/contacto' },
      ],
    },
    {
      heading: 'Rewards',
      links: [
        { label: 'How It Works', href: '#rewards' },
        { label: 'Points Balance', href: '#rewards' },
        { label: 'Give & Get', href: '#rewards' },
        { label: 'Ways to Earn', href: '#rewards' },
        { label: 'Ways to Redeem', href: '#rewards' },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { label: 'Privacidad', href: '/privacidad' },
        { label: 'Términos y Condiciones', href: '/terminos' },
        { label: 'Política de Cookies', href: '/cookies' },
        { label: 'Verificación de Edad', href: '/edad-legal' },
      ],
    },
  ];

  return (
    <footer className="bg-sc-darkforest text-sc-cream" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 pt-16 pb-10">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 mb-12">
          {/* Left: Newsletter + Social */}
          <div className="lg:w-72 flex-shrink-0">
            {/* Logo */}
            <div className="mb-6">
              <AppLogo variant="dark" height={32} />
            </div>

            <h3 className="text-sc-cream font-bold text-lg leading-snug mb-4">
              Let's be friends.<br />
              <span className="text-sc-cream/80">Get 20% off your first order</span>
            </h3>

            {/* Email form */}
            <form onSubmit={handleSubmit} className="flex items-center gap-0 mb-6 border border-sc-cream/30 rounded-pill overflow-hidden">
              <div className="flex items-center gap-2 flex-1 px-4">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-sc-cream/50 flex-shrink-0">
                  <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M1 6l7 4 7-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="bg-transparent text-sc-cream placeholder-sc-cream/40 text-sm py-3.5 outline-none flex-1 min-w-0"
                  inputMode="email"
                  autoComplete="email"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-3.5 text-sc-cream hover:text-sc-cream/70 transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Subscribe"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3 9h12M11 5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>

            {/* Social Icons */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* X/Twitter */}
              <a href="#" aria-label="X" className="text-sc-cream/60 hover:text-sc-cream transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                  <path d="M13.5 2h2.5l-5.5 6.3L17 16h-4.8l-3.5-4.6L4.5 16H2l5.8-6.6L1.5 2H6.4l3.2 4.2L13.5 2zm-.9 12.5h1.4L5.5 3.4H4l9.1 11.1z"/>
                </svg>
              </a>
              {/* Instagram */}
              <a href="#" aria-label="Instagram" className="text-sc-cream/60 hover:text-sc-cream transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <rect x="2" y="2" width="14" height="14" rx="4"/>
                  <circle cx="9" cy="9" r="3.5"/>
                  <circle cx="13" cy="5" r="0.8" fill="currentColor" stroke="none"/>
                </svg>
              </a>
              {/* TikTok */}
              <a href="#" aria-label="TikTok" className="text-sc-cream/60 hover:text-sc-cream transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                  <path d="M14 2h-2.5v9.5a2.5 2.5 0 11-2.5-2.5V6.5A5 5 0 109 14V7.5A6.5 6.5 0 0014 8V5.5A4 4 0 0112 2H14z"/>
                </svg>
              </a>
              {/* WhatsApp */}
              <a
                href="https://wa.me/573115397983?text=Hola%20%F0%9F%91%8B%2C%20quiero%20informaci%C3%B3n%20sobre%20Street%20Candy."
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="text-sc-cream/60 hover:text-sc-cream transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                  <path d="M9 1C4.582 1 1 4.582 1 9c0 1.41.347 2.74.957 3.91L1 17l4.195-.93A8 8 0 009 17c4.418 0 8-3.582 8-8s-3.582-8-8-8zm0 14.5a6.48 6.48 0 01-3.308-.906l-.237-.141-2.49.552.562-2.43-.155-.25A6.5 6.5 0 1115.5 9 6.508 6.508 0 019 15.5zm3.563-4.875c-.195-.098-1.152-.568-1.33-.633-.178-.065-.307-.098-.437.098-.13.195-.502.633-.615.762-.113.13-.227.146-.422.049-.195-.098-.824-.304-1.569-.968-.58-.517-.972-1.155-1.086-1.35-.113-.195-.012-.3.085-.397.087-.087.195-.227.293-.34.098-.114.13-.195.195-.325.065-.13.033-.244-.016-.342-.049-.098-.437-1.054-.599-1.443-.157-.378-.317-.327-.437-.333-.113-.006-.244-.008-.374-.008-.13 0-.341.049-.52.244-.178.195-.682.667-.682 1.626s.699 1.886.796 2.016c.098.13 1.374 2.098 3.328 2.943.465.2.828.32 1.111.41.467.148.892.127 1.228.077.374-.056 1.152-.471 1.314-.926.163-.455.163-.845.114-.926-.049-.082-.178-.13-.374-.228z"/>
                </svg>
              </a>
              {/* LinkedIn */}
              <a href="#" aria-label="LinkedIn" className="text-sc-cream/60 hover:text-sc-cream transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                  <rect x="2" y="2" width="14" height="14" rx="2"/>
                  <path d="M5 7.5v5M5 5.5v.5M8 7.5v5M8 10a2 2 0 014 0v2.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Right: Link columns */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-8">
            {footerLinks.map((col) => (
              <div key={col.heading}>
                <p className="text-sc-cream/50 text-xs font-bold uppercase tracking-widest mb-4">
                  {col.heading}
                </p>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sc-cream/80 text-sm hover:text-sc-cream transition-colors block py-1 min-h-[36px] flex items-center"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-sc-cream/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <AppLogo variant="dark" height={28} />
          <p className="text-sc-cream/40 text-xs">
            All rights reserved &copy; Street Candys 2026. Must be of legal age to purchase.
          </p>
        </div>
      </div>
    </footer>
  );
}
