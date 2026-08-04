'use client';
import React, { useRef } from 'react';

const categories = [
{
  id: 1,
  label: 'Gummies',
  image: "https://images.unsplash.com/photo-1616016463094-84c3fb32342b",
  alt: 'Colorful cannabis gummies in various flavors arranged on a surface'
},
{
  id: 2,
  label: 'Flower',
  image: "https://images.unsplash.com/photo-1693325356304-29f2c1487740",
  alt: 'Premium hemp flower buds with visible trichomes close-up'
},
{
  id: 3,
  label: 'Edibles',
  image: "https://images.unsplash.com/photo-1620695971042-70a26d80cc77",
  alt: 'Assorted cannabis-infused edibles including chocolates and baked goods'
},
{
  id: 4,
  label: 'Beverages',
  image: "https://images.unsplash.com/photo-1671748287107-17684546c1c8",
  alt: 'Cannabis-infused beverages in stylish cans and bottles'
},
{
  id: 5,
  label: 'Pre-Rolls',
  image: "https://images.unsplash.com/photo-1616093052830-edfa642531e7",
  alt: 'Neatly rolled pre-roll joints lined up in a row'
},
{
  id: 6,
  label: 'Concentrates',
  image: "https://images.unsplash.com/photo-1603909419943-ef2be7c3060e",
  alt: 'Golden cannabis concentrate wax in a small glass container'
},
{
  id: 7,
  label: 'Bundles',
  image: "https://images.unsplash.com/photo-1639605764722-06c741b42180",
  alt: 'Bundle of various cannabis products packaged together as a gift set'
}];


export default function CategorySection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className="bg-sc-cream px-4 lg:px-8 py-10" id="shop">
      <div className="max-w-[1400px] mx-auto">
        <h3 className="text-2xl lg:text-3xl font-bold text-sc-forest tracking-tight mb-6">
          Explore our products
        </h3>
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          
          {categories?.map((cat) =>
          <a
            key={cat?.id}
            href="#shop"
            className="flex-shrink-0 flex flex-col items-center gap-2 bg-sc-beigeLight hover:bg-sc-beige transition-colors rounded-sm2 p-4 w-36 lg:w-44 group cursor-pointer">
            
              <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-card overflow-hidden bg-sc-beige flex items-center justify-center">
                <img
                src={cat?.image}
                alt={cat?.alt}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              
              </div>
              <h4 className="text-sc-forest text-sm font-semibold text-center">{cat?.label}</h4>
            </a>
          )}
        </div>
      </div>
    </section>);

}

export {};