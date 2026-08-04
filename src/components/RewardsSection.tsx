'use client';
import React from 'react';

export default function RewardsSection() {
  return (
    <section className="bg-sc-forest overflow-hidden" id="rewards">
      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center">
        {/* Image */}
        <div className="w-full lg:w-1/2 relative">
          <img
            src="https://img.rocket.new/generatedImages/rocket_gen_img_1177c9561-1785876941823.png"
            alt="Happy customer holding Street Candy's products with a big smile, enjoying rewards program benefits"
            className="w-full h-64 lg:h-[480px] object-cover" />
          
          <div className="absolute inset-0 bg-sc-forest/20" />
        </div>

        {/* Content */}
        <div className="w-full lg:w-1/2 px-8 lg:px-16 py-12 lg:py-16">
          <h2 className="text-3xl lg:text-5xl font-black text-sc-cream tracking-tightest leading-tight mb-4">
            Free to join, sweet to earn. Hello, Street Rewards!
          </h2>
          <p className="text-sc-cream/80 text-base lg:text-lg mb-8 leading-relaxed">
            Earn points every time you shop and turn them into sweet savings on your favorite Street Candy's products. Rewarding yourself has never been this easy.
          </p>
          <a
            href="#rewards"
            className="inline-flex items-center gap-2 bg-sc-cream text-sc-forest font-bold text-base px-6 py-3 rounded-pill hover:bg-sc-beige transition-colors duration-200">
            
            Enroll today
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </section>);

}

export {};