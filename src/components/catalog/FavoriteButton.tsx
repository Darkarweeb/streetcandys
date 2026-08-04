'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';

interface FavoriteButtonProps {
  productId: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function FavoriteButton({ productId, size = 'md', className = '' }: FavoriteButtonProps) {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite, toggling } = useFavorites();

  const active = isFavorite(productId);
  const isToggling = toggling.has(productId);

  const iconSize = size === 'sm' ? 14 : 18;
  const btnSize = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      window.location.href = '/iniciar-sesion?next=' + encodeURIComponent(window.location.pathname);
      return;
    }
    await toggleFavorite(productId);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isToggling}
      aria-label={active ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      aria-pressed={active}
      className={`
        ${btnSize} rounded-full flex items-center justify-center transition-all duration-200
        ${active
          ? 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-200' :'bg-white/80 text-sc-muted hover:text-red-400 hover:bg-red-50 border border-sc-border'
        }
        disabled:opacity-60 disabled:cursor-not-allowed backdrop-blur-sm
        ${className}
      `}
    >
      {isToggling ? (
        <span
          className="border-2 border-current border-t-transparent rounded-full animate-spin"
          style={{ width: iconSize - 4, height: iconSize - 4 }}
        />
      ) : (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 18 18"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 15s-7-4.5-7-9a4 4 0 018 0 4 4 0 018 0c0 4.5-7 9-7 9z" />
        </svg>
      )}
    </button>
  );
}
