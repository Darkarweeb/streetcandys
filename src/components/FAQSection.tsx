'use client';
import React, { useState } from 'react';

const faqs = [
{
  id: 1,
  question: 'How do you create the different candy effects?',
  answer: 'Each Street Candy\'s product is carefully formulated using specific cannabinoid blends and terpene profiles sourced from our partner farms. Our team of experts works to match the right compounds to each desired effect — whether that\'s relaxation, energy, creativity, or sleep support.'
},
{
  id: 2,
  question: 'Are Street Candy\'s products lab tested?',
  answer: 'Absolutely. Every single batch of Street Candy\'s products is tested by independent, accredited third-party laboratories. We test for potency, purity, pesticides, heavy metals, and residual solvents. A Certificate of Analysis (COA) is available for every product.'
},
{
  id: 3,
  question: 'Will this show up on a drug test?',
  answer: 'Hemp-derived THC products may cause a positive result on a drug test. Standard drug tests typically screen for THC metabolites and cannot distinguish between hemp-derived and marijuana-derived THC. We recommend consulting with your employer or testing facility before use.'
},
{
  id: 4,
  question: 'What does Street Candy\'s feel like?',
  answer: 'The experience varies by product and individual. Our gummies and edibles typically produce a relaxed, euphoric feeling that can range from mild to strong depending on dosage. Effects usually begin within 30–90 minutes and can last 4–8 hours. We always recommend starting low and going slow.'
},
{
  id: 5,
  question: 'Is there a Certificate of Analysis for each product?',
  answer: 'Yes! Every Street Candy\'s product comes with a Certificate of Analysis from an accredited third-party lab. You can find the COA on each product page or request it directly from our customer support team. Transparency is a core value for us.'
}];


export default function FAQSection() {
  const [openId, setOpenId] = useState<number | null>(null);

  const toggle = (id: number) => setOpenId((prev) => prev === id ? null : id);

  return (
    <section className="bg-sc-cream px-4 lg:px-8 py-14" id="faq">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
          {/* Left: FAQ list */}
          <div className="w-full lg:w-3/5">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl lg:text-4xl font-black text-sc-forest tracking-tightest">
                FAQs
              </h2>
              <a
                href="#contact"
                className="inline-flex items-center gap-1 text-sc-forest font-semibold text-sm underline underline-offset-2 hover:opacity-70 transition-opacity">
                
                Go to Help Center
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>

            <div className="space-y-0">
              {faqs.map((faq) =>
              <div key={faq.id} className="border-b border-sc-beige">
                  <h3>
                    <button
                    onClick={() => toggle(faq.id)}
                    className="w-full flex items-center justify-between gap-4 py-5 text-left text-sc-forest font-semibold text-base lg:text-lg hover:opacity-70 transition-opacity"
                    aria-expanded={openId === faq.id}>
                    
                      <span>{faq.question}</span>
                      <span className={`flex-shrink-0 transition-transform duration-300 ${
                    openId === faq.id ? 'rotate-45' : ''}`
                    }>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </span>
                    </button>
                  </h3>
                  {openId === faq.id &&
                <div className="pb-5 pr-8">
                      <p className="text-sc-muted text-sm leading-relaxed">{faq.answer}</p>
                    </div>
                }
                </div>
              )}
            </div>
          </div>

          {/* Right: Image */}
          <div className="w-full lg:w-2/5">
            <div className="rounded-2xl overflow-hidden sticky top-24" style={{ aspectRatio: '3/4' }}>
              <img
                src="https://images.unsplash.com/photo-1587920951705-5e2ddf954c49"
                alt="Street Candy's product lineup displayed on a colorful background showing gummies, flower, and edibles"
                className="w-full h-full object-cover" />
              
            </div>
          </div>
        </div>
      </div>
    </section>);

}

export {};