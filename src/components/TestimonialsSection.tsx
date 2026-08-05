'use client';
import React, { useState } from 'react';

const testimonials = [
{
  id: 1,
  productName: 'Sunset Sherbet Gummies',
  productImage: "https://images.unsplash.com/photo-1666402667217-f01f13c6ded0",
  productAlt: 'Small thumbnail of Sunset Sherbet Gummies product',
  quote: '"These are absolutely incredible. The flavor is amazing and the effects are exactly what I was looking for. Will be ordering again!"',
  reviewer: 'JESSICA M.',
  rating: 5
},
{
  id: 2,
  productName: 'Midnight Blueberry Drops',
  productImage: "https://img.rocket.new/generatedImages/rocket_gen_img_1336e2ebc-1772460531497.png",
  productAlt: 'Small thumbnail of Midnight Blueberry Drops sleep gummies',
  quote: '"I finally sleep through the night! Street Candy\'s has completely changed my routine. The quality is unmatched and shipping was super fast."',
  reviewer: 'MARCUS T.',
  rating: 5
},
{
  id: 3,
  productName: 'Tropical Punch Pre-Rolls',
  productImage: "https://img.rocket.new/generatedImages/rocket_gen_img_118b43080-1785876653204.png",
  productAlt: 'Small thumbnail of Tropical Punch Pre-Rolls product',
  quote: '"Top shelf quality every single time. I\'ve tried many brands but Street Candy\'s is on another level. The pre-rolls are perfectly crafted."',
  reviewer: 'SARAH K.',
  rating: 5
},
{
  id: 4,
  productName: 'Lemon Haze Flower',
  productImage: "https://images.unsplash.com/photo-1612369300180-ed761b589b64",
  productAlt: 'Small thumbnail of Lemon Haze Flower product',
  quote: '"The Lemon Haze is exactly what I needed for my creative sessions. Smooth, flavorful, and the effects are consistent every time."',
  reviewer: 'DAVID R.',
  rating: 5
}];


function StarRating({ count }: {count: number;}) {
  return (
    <div className="flex items-center gap-0.5 text-sc-forest">
      {[1, 2, 3, 4, 5].map((i) =>
      <svg key={i} width="16" height="16" viewBox="0 0 16 16" fill={i <= count ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1">
          <path d="M8 1.5l1.8 3.8 4.2.6-3 3 .7 4.2L8 11l-3.7 2.1.7-4.2-3-3 4.2-.6z" />
        </svg>
      )}
    </div>);

}

export default function TestimonialsSection() {
  const [active, setActive] = useState(0);
  const t = testimonials[active];

  return (
    <section className="bg-sc-cream px-4 lg:px-8 py-16" id="reviews">
      <div className="max-w-[900px] mx-auto">
        <div className="bg-sc-beige rounded-2xl p-8 lg:p-14 text-center relative overflow-hidden">
          {/* Product thumbnail + name */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-card overflow-hidden bg-sc-cream flex-shrink-0">
              <img
                src={t.productImage}
                alt={t.productAlt}
                className="w-full h-full object-cover" />
              
            </div>
            <div className="text-left">
              <p className="text-sc-forest font-semibold text-sm">{t.productName}</p>
              <StarRating count={t.rating} />
            </div>
          </div>

          {/* Quote */}
          <blockquote className="text-sc-forest text-xl lg:text-3xl font-bold tracking-tight leading-snug mb-6">
            {t.quote}
          </blockquote>

          {/* Reviewer */}
          <p className="text-sc-forest/60 text-sm font-semibold tracking-widest uppercase mb-8">
            {t.reviewer}
          </p>

          {/* Read more CTA */}
          <a
            href="#reviews"
            className="inline-flex items-center gap-2 border-2 border-sc-forest text-sc-forest font-bold text-sm px-6 py-3 rounded-pill hover:bg-sc-forest hover:text-sc-cream transition-colors duration-200">
            
            Read 50k+ more reviews
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7h9M8 3.5l3.5 3.5L8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>

          {/* Dots navigation */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {testimonials.map((_, i) =>
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
              i === active ? 'bg-sc-forest w-6' : 'bg-sc-forest/30'}`
              }
              aria-label={`Testimonial ${i + 1}`} />

            )}
          </div>
        </div>
      </div>
    </section>);

}

export {};