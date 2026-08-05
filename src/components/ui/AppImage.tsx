'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import Image from 'next/image';

interface AppImageProps {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
    priority?: boolean;
    quality?: number;
    placeholder?: 'blur' | 'empty';
    blurDataURL?: string;
    fill?: boolean;
    sizes?: string;
    onClick?: () => void;
    fallbackSrc?: string;
    loading?: 'lazy' | 'eager';
    unoptimized?: boolean;
    showSkeleton?: boolean;
    [key: string]: any;
}

const AppImage = memo(function AppImage({
    src,
    alt,
    width,
    height,
    className = '',
    priority = false,
    quality = 85,
    placeholder = 'empty',
    blurDataURL,
    fill = false,
    sizes,
    onClick,
    fallbackSrc = '/assets/images/no_image.png',
    loading = 'lazy',
    unoptimized = false,
    showSkeleton = true,
    ...props
}: AppImageProps) {
    const [imageSrc, setImageSrc] = useState(src);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const isExternalUrl = useMemo(() => typeof imageSrc === 'string' && imageSrc.startsWith('http'), [imageSrc]);
    const resolvedUnoptimized = unoptimized || isExternalUrl;

    const handleError = useCallback(() => {
        if (!hasError && imageSrc !== fallbackSrc) {
            setImageSrc(fallbackSrc);
            setHasError(true);
        }
        setIsLoading(false);
    }, [hasError, imageSrc, fallbackSrc]);

    const handleLoad = useCallback(() => {
        setIsLoading(false);
        setHasError(false);
    }, []);

    const imageClassName = useMemo(() => {
        const classes = [className];
        if (isLoading) classes.push('opacity-0');
        if (onClick) classes.push('cursor-pointer hover:opacity-90 transition-opacity duration-200');
        return classes.filter(Boolean).join(' ');
    }, [className, isLoading, onClick]);

    const imageProps = useMemo(() => {
        const baseProps: any = {
            src: imageSrc,
            alt,
            className: `${imageClassName} transition-opacity duration-300`,
            quality,
            placeholder,
            unoptimized: resolvedUnoptimized,
            onError: handleError,
            onLoad: handleLoad,
            onClick,
        };

        if (priority) {
            baseProps.priority = true;
        } else {
            baseProps.loading = loading;
        }

        if (blurDataURL && placeholder === 'blur') {
            baseProps.blurDataURL = blurDataURL;
        }

        return baseProps;
    }, [imageSrc, alt, imageClassName, quality, placeholder, blurDataURL, resolvedUnoptimized, priority, loading, handleError, handleLoad, onClick]);

    if (fill) {
        return (
            <div className="relative" style={{ width: '100%', height: '100%' }}>
                {/* Skeleton overlay while loading */}
                {isLoading && showSkeleton && (
                    <div className="absolute inset-0 bg-sc-beige animate-pulse z-10 flex items-center justify-center">
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-sc-border opacity-50">
                            <rect x="2" y="2" width="24" height="24" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                            <circle cx="9" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M2 19l7-5 5 4 3-2.5 9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                )}
                <Image
                    {...imageProps}
                    fill
                    sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
                    style={{ objectFit: 'cover' }}
                    {...props}
                />
            </div>
        );
    }

    return (
        <div className="relative inline-block" style={{ width: width || 400, height: height || 300 }}>
            {/* Skeleton overlay while loading */}
            {isLoading && showSkeleton && (
                <div className="absolute inset-0 bg-sc-beige animate-pulse z-10 rounded flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-sc-border opacity-50">
                        <rect x="2" y="2" width="24" height="24" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="9" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M2 19l7-5 5 4 3-2.5 9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            )}
            <Image
                {...imageProps}
                width={width || 400}
                height={height || 300}
                sizes={sizes}
                {...props}
            />
        </div>
    );
});

AppImage.displayName = 'AppImage';

export default AppImage;