'use client';

import React, { memo } from 'react';
import Image from 'next/image';

interface AppLogoProps {
  variant?: 'dark' | 'light'; // dark = white/neon on dark bg; light = forest green on light bg
  height?: number;
  className?: string;
  onClick?: () => void;
}

const AppLogo = memo(function AppLogo({
  variant = 'light',
  height = 40,
  className = '',
  onClick,
}: AppLogoProps) {
  const src =
    variant === 'dark' ?'/assets/streetcandys-logo-dark.svg' :'/assets/streetcandys-logo-light.svg';

  const containerClass = [
    'flex items-center flex-shrink-0',
    onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Maintain aspect ratio: logos are roughly 3:1 wide
  const width = Math.round(height * 3);

  return (
    <div className={containerClass} onClick={onClick}>
      <Image
        src={src}
        alt="StreetCandy's"
        width={width}
        height={height}
        priority
        unoptimized
        style={{ height, width: 'auto' }}
      />
    </div>
  );
});

export default AppLogo;
