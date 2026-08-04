'use client';
import React from 'react';

export default function ContactSection() {
  return (
    <section className="bg-sc-cream px-4 lg:px-8 py-14" id="contact">
      <div className="max-w-[1400px] mx-auto">
        <h3 className="text-2xl lg:text-4xl font-bold text-sc-forest tracking-tight text-center mb-10">
          Our cannabis experts{' '}
          <span className="italic">are standing by</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Call */}
          <a
            href="tel:+18005550199"
            className="flex items-center justify-between gap-4 border-2 border-sc-beige rounded-xl p-5 hover:border-sc-forest transition-colors duration-200 group"
          >
            <div>
              <p className="text-sc-forest font-bold text-base mb-0.5">Call Us</p>
              <p className="text-sc-muted text-xs mb-1">7am to 10pm CT, 7 days a week</p>
              <p className="text-sc-forest font-semibold text-sm">+1 800-555-0199</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-sc-beige flex items-center justify-center flex-shrink-0 group-hover:bg-sc-forest group-hover:text-sc-cream transition-colors">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5a2 2 0 012-2h1.5a1 1 0 01.97.757l.9 3.6a1 1 0 01-.29.99l-1.2 1.1a11 11 0 005.67 5.67l1.1-1.2a1 1 0 01.99-.29l3.6.9A1 1 0 0119 15.5V17a2 2 0 01-2 2C7.163 19 1 12.837 1 5a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </a>

          {/* Email */}
          <a
            href="mailto:hello@streetcandys.com"
            className="flex items-center justify-between gap-4 border-2 border-sc-beige rounded-xl p-5 hover:border-sc-forest transition-colors duration-200 group"
          >
            <div>
              <p className="text-sc-forest font-bold text-base mb-0.5">Email</p>
              <p className="text-sc-forest font-semibold text-sm">hello@streetcandys.com</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-sc-beige flex items-center justify-center flex-shrink-0 group-hover:bg-sc-forest group-hover:text-sc-cream transition-colors">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M2 7l8 5 8-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </a>

          {/* Chat */}
          <button
            className="flex items-center justify-between gap-4 border-2 border-sc-beige rounded-xl p-5 hover:border-sc-forest transition-colors duration-200 group text-left"
          >
            <div>
              <p className="text-sc-forest font-bold text-base mb-0.5">Chat with us 24/7</p>
              <p className="text-sc-forest font-semibold text-sm">Chat now →</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-sc-beige flex items-center justify-center flex-shrink-0 group-hover:bg-sc-forest group-hover:text-sc-cream transition-colors">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M2 4a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6l-4 4V4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}

export {};
