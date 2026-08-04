'use client';
import React, { useState } from 'react';

const farms = [
{
  id: 1,
  category: 'Meet our growers',
  title: 'Grown with care at Sunridge Farms',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1d11b6f49-1768837482846.png",
  alt: 'Farmer tending to hemp plants in a lush green field at Sunridge Farms during golden hour'
},
{
  id: 2,
  category: 'Meet our growers',
  title: 'Small-batch quality at Blue Ridge Hemp Co.',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_189253a9e-1785709698811.png",
  alt: 'Close-up of hemp plants growing in rows at Blue Ridge Hemp Co. farm in the mountains'
},
{
  id: 3,
  category: 'Meet our growers',
  title: 'Sustainable growing at Green Valley Collective',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_10b9db4ab-1766733292044.png",
  alt: 'Aerial view of Green Valley Collective sustainable hemp farm with irrigation systems'
}];


export default function FarmCarousel() {
  const [active, setActive] = useState(0);

  const prev = () => setActive((a) => (a - 1 + farms?.length) % farms?.length);
  const next = () => setActive((a) => (a + 1) % farms?.length);

  return (
    <section className="bg-sc-cream px-4 lg:px-8 py-12">
      <div className="max-w-[1400px] mx-auto">
        <div className="relative overflow-hidden rounded-2xl">
          {/* Slides */}
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${active * 100}%)` }}>
            
            {farms?.map((farm) =>
            <div key={farm?.id} className="w-full flex-shrink-0 relative" style={{ aspectRatio: '16/7' }}>
                <img
                src={farm?.image}
                alt={farm?.alt}
                className="w-full h-full object-cover" />
              
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute bottom-6 left-6 lg:bottom-10 lg:left-10">
                  <span className="text-white/70 text-xs font-semibold uppercase tracking-widest block mb-1">
                    {farm?.category}
                  </span>
                  <p className="text-white text-xl lg:text-3xl font-bold tracking-tight">
                    {farm?.title}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="absolute bottom-6 right-6 lg:bottom-10 lg:right-10 flex items-center gap-2">
            <button
              onClick={prev}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/40 transition-colors"
              aria-label="Previous">
              
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={next}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/40 transition-colors"
              aria-label="Next">
              
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {farms?.map((_, i) =>
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
              i === active ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`
              }
              aria-label={`Slide ${i + 1}`} />

            )}
          </div>
        </div>
      </div>
    </section>);

}

export {};
