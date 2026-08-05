'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className}`}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
    </svg>
  );
}

// ─── Image Skeleton ───────────────────────────────────────────────────────────
export function ImageSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-sc-beige flex items-center justify-center ${className}`}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-sc-border opacity-60">
        <rect x="2" y="2" width="28" height="28" rx="4" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="11" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 22l8-6 6 5 4-3 10 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ─── Smart Image with skeleton + fallback ─────────────────────────────────────
interface SmartImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  skeletonClassName?: string;
}

export function SmartImage({ src, alt, className = '', fallback, skeletonClassName }: SmartImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    setStatus('loading');
  }, [src]);

  if (!src) {
    return (
      <div className={skeletonClassName || className}>
        {fallback || <ImageSkeleton className="w-full h-full" />}
      </div>
    );
  }

  return (
    <div className={`relative ${skeletonClassName || className}`}>
      {status === 'loading' && (
        <ImageSkeleton className="absolute inset-0 w-full h-full" />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${status === 'loading' ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        loading="lazy"
      />
      {status === 'error' && (
        <div className={`absolute inset-0 flex items-center justify-center bg-sc-beige ${className}`}>
          {fallback || (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-sc-muted">
              <rect x="2" y="2" width="20" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 15l6-5 4 4 3-2 7 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Confirmation Dialog ──────────────────────────────────────────────────────
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => cancelRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmBtnClass =
    variant === 'danger' ?'bg-red-600 hover:bg-red-700 text-white'
      : variant === 'warning' ?'bg-amber-500 hover:bg-amber-600 text-white' :'bg-sc-forest hover:bg-sc-darkforest text-sc-cream';

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fade-in">
        <div className="px-6 pt-6 pb-4">
          <h3 id="confirm-dialog-title" className="text-sc-forest font-bold text-base mb-2">
            {title}
          </h3>
          <p className="text-sc-muted text-sm leading-relaxed">{message}</p>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 border border-sc-border rounded-xl text-sm text-sc-forest hover:bg-sc-beige transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 min-h-[44px] ${confirmBtnClass}`}
          >
            {loading && <Spinner size={14} />}
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── useConfirm hook ──────────────────────────────────────────────────────────
interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
}

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    options: ConfirmOptions;
    loading: boolean;
    resolve: ((v: boolean) => void) | null;
  }>({
    open: false,
    options: { title: '', message: '' },
    loading: false,
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, options, loading: false, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState((s) => ({ ...s, open: false }));
  }, [state]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState((s) => ({ ...s, open: false }));
  }, [state]);

  const dialog = (
    <ConfirmDialog
      open={state.open}
      title={state.options.title}
      message={state.options.message}
      confirmLabel={state.options.confirmLabel}
      cancelLabel={state.options.cancelLabel}
      variant={state.options.variant}
      loading={state.loading}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, dialog };
}

// ─── LoadingButton ────────────────────────────────────────────────────────────
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  success?: boolean;
  successLabel?: string;
  loadingLabel?: string;
  spinnerSize?: number;
}

export function LoadingButton({
  loading = false,
  success = false,
  successLabel,
  loadingLabel,
  spinnerSize = 14,
  children,
  disabled,
  className = '',
  ...props
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading || success}
      className={`relative flex items-center justify-center gap-2 transition-all duration-200 ${
        success ? 'cursor-default' : ''
      } ${className}`}
      aria-busy={loading}
    >
      {loading && <Spinner size={spinnerSize} />}
      {success && (
        <svg width={spinnerSize} height={spinnerSize} viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M2 7l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <span>
        {loading && loadingLabel ? loadingLabel : success && successLabel ? successLabel : children}
      </span>
    </button>
  );
}

// ─── TableSkeleton ────────────────────────────────────────────────────────────
export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded w-full" />
        </td>
      ))}
    </tr>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon = '📭', title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div className="text-5xl mb-4 select-none" aria-hidden="true">{icon}</div>
      <p className="text-sc-forest font-semibold text-lg mb-2">{title}</p>
      {description && <p className="text-sc-muted text-sm mb-6 max-w-xs leading-relaxed">{description}</p>}
      {action}
    </div>
  );
}
