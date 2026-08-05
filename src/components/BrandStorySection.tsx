'use client';
import React from 'react';

export default function BrandStorySection() {
  return (
    <section className="bg-sc-cream overflow-hidden">
      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-stretch">
        {/* Image */}
        <div className="w-full lg:w-1/2 relative min-h-[320px] lg:min-h-[480px]">
          <img
            src="https://images.unsplash.com/photo-1674671261877-66b79ea534c8"
            alt="Street Candy's founder and family in the kitchen crafting cannabis-infused edibles and candy recipes"
            className="w-full h-full object-cover absolute inset-0" />
          
          <div className="absolute inset-0 bg-sc-forest/10" />
        </div>

        {/* Content */}
        <div className="w-full lg:w-1/2 bg-sc-tan px-8 lg:px-16 py-12 lg:py-16 flex flex-col justify-center">
          <span className="text-sc-forest/60 text-xs font-bold uppercase tracking-widest mb-3">
            All in the Family
          </span>
          <h2 className="text-3xl lg:text-5xl font-black text-sc-forest tracking-tightest leading-tight mb-4">
            Street Candy's is made with love
          </h2>
          <p className="text-sc-forest/80 text-base lg:text-lg leading-relaxed mb-8">
            Our recipes were born in a home kitchen, perfected over years of family gatherings and late-night experiments. Every batch of Street Candy's is crafted with the same care and passion that started it all.
          </p>
          <a
            href="#shop"
            className="inline-flex items-center gap-2 bg-sc-forest text-sc-cream font-bold text-base px-6 py-3 rounded-pill hover:bg-sc-green transition-colors duration-200 w-fit">
            
            Shop Our Story
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </section>);

}

export {};