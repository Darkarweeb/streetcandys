'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function HeroSection() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #fff0f5 0%, #ffe4ef 40%, #ffd6e8 100%)' }}
      aria-label="Hero StreetCandy's"
    >
      {/* Decorative background circles */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #ff69b4 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} aria-hidden="true" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, #ff1493 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} aria-hidden="true" />
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

          {/* Left: Text content */}
          <div className="relative z-10">
            {/* Logo */}
            <div className="mb-4">
              <Image
                src="/assets/streetcandys-logo-dark.svg"
                alt="Street Candy's — Logo oficial"
                width={280}
                height={120}
                className="h-24 w-auto"
                priority
              />
            </div>

            {/* Badge */}
            <p className="text-sm font-semibold tracking-widest mb-3" style={{ color: '#e91e8c' }}>
              • DULCES PREMIUM •
            </p>

            {/* Headline */}
            <h1 className="text-4xl lg:text-6xl font-black leading-tight mb-2" style={{ color: '#1a1a1a' }}>
              Los mejores
            </h1>
            <h1 className="text-4xl lg:text-6xl font-black leading-tight mb-6" style={{ color: '#e91e8c' }}>
              dulces premium
            </h1>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-4 mb-8">
              {[
                { icon: '🛍️', label: 'Compra en línea' },
                { icon: '⭐', label: 'Acumula recompensas' },
                { icon: '🚚', label: 'Envíos rápidos' },
              ]?.map((item) => (
                <div
                  key={item?.label}
                  className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm"
                  style={{ border: '1.5px solid #ffd6e8' }}
                >
                  <span className="text-lg" aria-hidden="true">{item?.icon}</span>
                  <span className="text-sm font-semibold" style={{ color: '#333' }}>{item?.label}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/productos"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white shadow-lg transition-transform hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #e91e8c 0%, #ff69b4 100%)' }}
              >
                ❤️ Dulces que te hacen sonreír
              </Link>
              <Link
                href="/cuenta/recompensas"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-transform hover:scale-105 bg-white"
                style={{ color: '#e91e8c', border: '2px solid #e91e8c' }}
              >
                Ver recompensas
              </Link>
            </div>
          </div>

          {/* Right: Hero image */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-lg">
              <Image
                src="/assets/images/hero-banner-streetcandys.png"
                alt="Street Candy's — Gomitas, chocolates y dulces premium coloridos sobre fondo rosa"
                width={600}
                height={500}
                className="w-full h-auto object-contain drop-shadow-2xl"
                priority
              />
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-8 rounded-2xl px-6 py-3 flex flex-wrap items-center justify-between gap-3"
          style={{ background: 'linear-gradient(90deg, #e91e8c 0%, #ff69b4 100%)' }}
        >
          <div className="flex flex-wrap gap-6">
            <span className="flex items-center gap-2 text-white text-sm font-semibold">
              📍 Colombia y Costa Rica
            </span>
            <span className="flex items-center gap-2 text-white text-sm font-semibold">
              ❤️ Productos 100% originales
            </span>
          </div>
          <Link
            href="/productos"
            className="flex items-center gap-2 bg-white rounded-full px-5 py-2 text-sm font-bold transition-transform hover:scale-105"
            style={{ color: '#e91e8c' }}
          >
            ❤️ Dulces que te hacen sonreír
          </Link>
        </div>
      </div>
    </section>
  );
}

export {};