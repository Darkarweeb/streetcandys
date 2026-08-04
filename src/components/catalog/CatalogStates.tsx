'use client';
import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-sc-beige flex items-center justify-center mb-6">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="text-sc-border" aria-hidden="true">
          <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M24 24l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M12 16h8M16 12v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <h3 className="text-sc-forest font-bold text-xl mb-2">{title}</h3>
      <p className="text-sc-muted text-sm max-w-xs mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="bg-sc-forest text-sc-cream font-bold text-sm px-6 py-3 rounded-pill hover:bg-sc-green transition-colors duration-200"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Algo salió mal',
  description = 'No pudimos cargar los productos. Por favor intenta de nuevo.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="text-red-400" aria-hidden="true">
          <circle cx="18" cy="18" r="14" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M18 10v10M18 24v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <h3 className="text-sc-forest font-bold text-xl mb-2">{title}</h3>
      <p className="text-sc-muted text-sm max-w-xs mb-6">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-sc-forest text-sc-cream font-bold text-sm px-6 py-3 rounded-pill hover:bg-sc-green transition-colors duration-200"
        >
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}
