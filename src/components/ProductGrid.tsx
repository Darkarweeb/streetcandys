'use client';
import React, { useState } from 'react';

interface Product {
  id: number;
  name: string;
  price: string;
  rating: number;
  reviewCount: string;
  intensity: 'low' | 'medium' | 'high';
  mood: string;
  badge?: string;
  image: string;
  alt: string;
  bgColor: string;
}

const products: Product[] = [
{
  id: 1,
  name: 'Sunset Sherbet Gummies',
  price: 'From $19.00',
  rating: 4.7,
  reviewCount: '12.3k',
  intensity: 'high',
  mood: 'Happy',
  badge: 'Best Seller',
  image: "https://images.unsplash.com/photo-1665946773076-2fefb8c92e48",
  alt: 'Colorful sunset sherbet flavored cannabis gummies in orange and pink hues',
  bgColor: '#F5E6D3'
},
{
  id: 2,
  name: 'Midnight Blueberry Drops',
  price: 'From $22.00',
  rating: 4.6,
  reviewCount: '8.9k',
  intensity: 'high',
  mood: 'Sleepy',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1ba25dc11-1781001381620.png",
  alt: 'Deep blue blueberry flavored sleep gummies with melatonin in a glass jar',
  bgColor: '#D6E4F0'
},
{
  id: 3,
  name: 'Tropical Punch Pre-Rolls',
  price: 'From $17.00',
  rating: 4.5,
  reviewCount: '5.2k',
  intensity: 'high',
  mood: 'Creative',
  badge: 'Top Shelf',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_123bffee3-1785885894901.png",
  alt: 'Premium tropical punch flavored pre-roll joints in a branded tube',
  bgColor: '#E8F5E9'
},
{
  id: 4,
  name: 'Watermelon Wave Gummies',
  price: 'From $19.00',
  rating: 4.8,
  reviewCount: '15.1k',
  intensity: 'medium',
  mood: 'Chill',
  image: "https://images.unsplash.com/photo-1666400958323-c32105837348",
  alt: 'Bright green and red watermelon flavored cannabis gummies in a pile',
  bgColor: '#FCE4EC'
},
{
  id: 5,
  name: 'Lemon Haze Flower',
  price: 'From $16.00',
  rating: 4.5,
  reviewCount: '3.8k',
  intensity: 'high',
  mood: 'Energized',
  badge: 'Top Shelf',
  image: "https://images.unsplash.com/photo-1642715372818-9072d336720b",
  alt: 'Lemon haze hemp flower buds with yellow trichomes on a white background',
  bgColor: '#FFFDE7'
},
{
  id: 6,
  name: 'Strawberry Fields Gummies',
  price: 'From $19.00',
  rating: 4.6,
  reviewCount: '7.4k',
  intensity: 'high',
  mood: 'Happy',
  image: "https://images.unsplash.com/photo-1665946773644-9c260862fb28",
  alt: 'Pink strawberry flavored cannabis gummies shaped like berries in a bowl',
  bgColor: '#FCE4EC'
},
{
  id: 7,
  name: 'Mango Tango Concentrate',
  price: 'From $44.00/g',
  rating: 4.5,
  reviewCount: '1.2k',
  intensity: 'high',
  mood: 'Focused',
  image: "https://images.unsplash.com/photo-1603909419943-ef2be7c3060e",
  alt: 'Golden mango tango cannabis concentrate wax in a small glass jar',
  bgColor: '#FFF3E0'
},
{
  id: 8,
  name: 'Grape Escape Gummies',
  price: 'From $39.00',
  rating: 4.7,
  reviewCount: '9.6k',
  intensity: 'high',
  mood: 'Soothing',
  image: "https://images.unsplash.com/photo-1665946772981-63be1c521abe",
  alt: 'Deep purple grape flavored high-dose cannabis gummies in a resealable bag',
  bgColor: '#EDE7F6'
}];


interface ProductGridProps {
  title: string;
  onAddToCart: (product: {id: number;name: string;price: string;image: string;}) => void;
}

function StarIcon({ filled }: {filled: boolean;}) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1">
      <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5 4.5 4z" />
    </svg>);

}

function IntensityIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="8" width="3" height="5" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="5.5" y="5" width="3" height="8" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="10" y="2" width="3" height="11" rx="1" fill="currentColor" />
    </svg>);

}

export default function ProductGrid({ title, onAddToCart }: ProductGridProps) {
  return (
    <section className="bg-sc-cream px-4 lg:px-8 py-12" id="products">
      <div className="max-w-[1400px] mx-auto">
        <h2 className="text-3xl lg:text-4xl font-bold text-sc-forest tracking-tight mb-8 text-center">
          {title}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {products.map((product) =>
          <div key={product.id} className="group flex flex-col">
              <article className="flex-1">
                {/* Image Container */}
                <a href="#shop" className="block relative">
                  <div
                  className="relative rounded-card overflow-hidden mb-3"
                  style={{ backgroundColor: product.bgColor, aspectRatio: '1/1' }}>
                  
                    <img
                    src={product.image}
                    alt={product.alt}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  
                    {/* Top badge */}
                    {product.badge &&
                  <div className="absolute top-3 left-3">
                        <span className="bg-sc-forest text-sc-cream text-xs font-semibold px-3 py-1 rounded-badge">
                          {product.badge}
                        </span>
                      </div>
                  }
                    {/* Bottom mood badge */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent px-3 py-2">
                      <span className="text-white text-xs font-medium">{product.mood}</span>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="px-1">
                    <p className="text-sc-forest font-semibold text-sm mb-1 leading-tight">{product.name}</p>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1 text-sc-forest">
                        <StarIcon filled={true} />
                        <span className="text-xs font-medium">{product.rating}</span>
                        <span className="text-xs text-sc-muted">({product.reviewCount})</span>
                      </div>
                      <div className="flex items-center gap-1 text-sc-forest">
                        <IntensityIcon />
                        <span className="text-xs text-sc-muted">{product.intensity}</span>
                      </div>
                    </div>
                    <p className="text-sc-forest text-sm font-medium">{product.price}</p>
                  </div>
                </a>
              </article>

              {/* Add to Cart */}
              <button
              onClick={() => onAddToCart({ id: product.id, name: product.name, price: product.price, image: product.image })}
              className="mt-3 w-full bg-sc-forest text-sc-cream text-sm font-bold py-3 px-5 rounded-pill hover:bg-sc-green transition-colors duration-200 active:scale-95">
              
                Add to Cart
              </button>
            </div>
          )}
        </div>

        {/* Shop All CTA */}
        <div className="flex justify-center mt-10">
          <a
            href="#shop"
            className="inline-flex items-center gap-2 bg-sc-forest text-sc-cream font-bold text-base px-6 py-3 rounded-pill hover:bg-sc-green transition-colors duration-200">
            
            Shop All
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </section>);

}

export {};