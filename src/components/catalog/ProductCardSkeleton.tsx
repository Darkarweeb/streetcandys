'use client';
import React from 'react';

export default function ProductCardSkeleton() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="rounded-card bg-sc-beige aspect-square mb-3" />
      <div className="px-1 space-y-2">
        <div className="h-4 bg-sc-beige rounded w-3/4" />
        <div className="h-3 bg-sc-beige rounded w-1/2" />
        <div className="h-4 bg-sc-beige rounded w-1/3" />
      </div>
      <div className="mt-3 h-11 bg-sc-beige rounded-pill" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
