'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import CuentaLayout from '@/components/cuenta/CuentaLayout';
import { useNotifications } from '@/hooks/useNotifications';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardOrder {
  id: string;
  order_number: string;
  status: string;
  total: number;
  currency_code: string;
  created_at: string;
}

interface DashboardNotification {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

interface DashboardAddress {
  id: string;
  label: string;
  full_name: string;
  address_line1: string;
  city: string;
  state_province: string;
  country_code: string;
  is_default: boolean;
}

interface PointTransaction {
  id: string;
  transaction_type: string;
  points: number;
  balance_after: number;
  description: string;
  created_at: string;
}

interface AvailableReward {
  id: string;
  name: string;
  points_required: number;
  reward_type: string;
  reward_value: number;
  eligible_tiers: string[];
  is_active: boolean;
}

interface DashboardData {
  orders: {
    total: number;
    active: number;
    latest: DashboardOrder | null;
    recent: DashboardOrder[];
  };
  reviews: {
    submitted: number;
    pending: number;
    eligibleForReview: number;
  };
  notifications: {
    recent: DashboardNotification[];
    unreadCount: number;
  };
  address: DashboardAddress | null;
  rewards: {
    balance: number;
    lifetime: number;
    tier: string;
    tierUpdatedAt: string | null;
    nextTier: string | null;
    tierProgress: number;
    pointsToNextTier: number;
    recentTransactions: PointTransaction[];
    availableRewards: AvailableReward[];
  };
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Pendiente',   color: 'bg-yellow-100 text-yellow-800' },
  confirmed:  { label: 'Confirmado',  color: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Procesando',  color: 'bg-purple-100 text-purple-800' },
  shipped:    { label: 'Enviado',     color: 'bg-indigo-100 text-indigo-800' },
  delivered:  { label: 'Entregado',   color: 'bg-green-100 text-green-800' },
  cancelled:  { label: 'Cancelado',   color: 'bg-red-100 text-red-800' },
  refunded:   { label: 'Reembolsado', color: 'bg-gray-100 text-gray-700' },
};

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  crew:   { label: 'Crew',   color: 'text-sc-forest',     bg: 'bg-sc-beige',          emoji: '🌿' },
  og:     { label: 'OG',     color: 'text-sc-periwinkle', bg: 'bg-sc-periwinkle/15',  emoji: '⚡' },
  legend: { label: 'Legend', color: 'text-amber-700',     bg: 'bg-amber-50',          emoji: '🏆' },
  icon:   { label: 'Icon',   color: 'text-sc-cream',      bg: 'bg-sc-forest',         emoji: '👑' },
};

const TX_LABELS: Record<string, { sign: string; color: string }> = {
  earned:     { sign: '+', color: 'text-green-600' },
  bonus:      { sign: '+', color: 'text-sc-periwinkle' },
  referral:   { sign: '+', color: 'text-green-600' },
  redeemed:   { sign: '-', color: 'text-red-500' },
  expired:    { sign: '-', color: 'text-gray-400' },
  adjustment: { sign: '',  color: 'text-sc-muted' },
};

const NOTIF_META: Record<string, { icon: string; color: string }> = {
  welcome:               { icon: '👋', color: 'bg-emerald-50 text-emerald-600' },
  order_received:        { icon: '📥', color: 'bg-blue-50 text-blue-600' },
  order_confirmed:       { icon: '✅', color: 'bg-blue-50 text-blue-600' },
  order_preparing:       { icon: '👨‍🍳', color: 'bg-amber-50 text-amber-600' },
  order_shipped:         { icon: '🚚', color: 'bg-indigo-50 text-indigo-600' },
  order_delivered:       { icon: '🎉', color: 'bg-green-50 text-green-600' },
  order_cancelled:       { icon: '❌', color: 'bg-red-50 text-red-600' },
  reward_earned:         { icon: '⭐', color: 'bg-yellow-50 text-yellow-600' },
  reward_redeemed:       { icon: '🎁', color: 'bg-purple-50 text-purple-600' },
  loyalty_tier_upgraded: { icon: '🏆', color: 'bg-purple-50 text-purple-600' },
  promotion_available:   { icon: '🎯', color: 'bg-pink-50 text-pink-600' },
  review_approved:       { icon: '⭐', color: 'bg-yellow-50 text-yellow-600' },
  system_announcement:   { icon: '📢', color: 'bg-sc-forest/5 text-sc-forest' },
  system:                { icon: '🔔', color: 'bg-sc-beige text-sc-forest' },
};

const QUICK_ACTIONS = [
  { href: '/cuenta/perfil',        label: 'Mi Perfil',          icon: '👤' },
  { href: '/cuenta/pedidos',       label: 'Mis Pedidos',        icon: '📦' },
  { href: '/cuenta/direcciones',   label: 'Direcciones',        icon: '📍' },
  { href: '/cuenta/loyalty',       label: 'Loyalty Club',       icon: '🏆' },
  { href: '/cuenta/notificaciones',label: 'Notificaciones',     icon: '🔔' },
  { href: '/cuenta/resenas',       label: 'Mis Reseñas',        icon: '⭐' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string) {
  const symbol = currency === 'CRC' ? '₡' : '$';
  return `${symbol}${amount.toLocaleString('es-CO')}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `hace ${days}d`;
  if (hours > 0) return `hace ${hours}h`;
  if (mins > 0) return `hace ${mins}m`;
  return 'ahora';
}

function getMemberSince(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-sc-beige rounded ${className ?? ''}`} />;
}

function SectionSkeleton() {
  return (
    <div className="bg-white border border-sc-border rounded-card p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function SectionCard({
  title,
  linkHref,
  linkLabel,
  children,
}: {
  title: string;
  linkHref?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-sc-border rounded-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-sc-border">
        <h2 className="text-sc-forest font-semibold text-sm">{title}</h2>
        {linkHref && linkLabel && (
          <Link href={linkHref} className="text-sc-periwinkle text-xs font-medium hover:underline">
            {linkLabel} →
          </Link>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CuentaDashboardPage() {
  const { profile, user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live unread count via hook (realtime)
  const { unreadCount: liveUnread } = useNotifications({ profileId: user?.id ?? null, limit: 5 });

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/cuenta/dashboard');
        if (!res.ok) throw new Error('Error al cargar');
        const json = await res.json();
        if (!json.exito) throw new Error(json.error ?? 'Error desconocido');
        setData(json.datos);
      } catch {
        setError('No se pudo cargar el dashboard. Intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const tier = data?.rewards?.tier ?? 'crew';
  const tierInfo = TIER_CONFIG[tier] ?? TIER_CONFIG.crew;
  const unreadCount = liveUnread ?? data?.notifications?.unreadCount ?? 0;

  return (
    <CuentaLayout>
      <div className="space-y-6">

        {/* ── Welcome Header ── */}
        <div className="bg-white border border-sc-border rounded-card p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-sc-forest tracking-tight">
                Hola, {profile?.fullName?.split(' ')[0] || 'amigo'} 👋
              </h1>
              <p className="text-sc-muted text-sm mt-0.5">
                Bienvenido a tu cuenta de Street Candy&apos;s
              </p>
              {profile?.createdAt && (
                <p className="text-sc-muted text-xs mt-1">
                  Miembro desde {getMemberSince(profile.createdAt)}
                </p>
              )}
            </div>

            {/* Tier + Points badge */}
            {loading ? (
              <Skeleton className="h-16 w-40" />
            ) : (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-card border ${tierInfo.bg} border-sc-border/50 flex-shrink-0`}>
                <span className="text-2xl">{tierInfo.emoji}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wide ${tierInfo.color}`}>
                      {tierInfo.label}
                    </span>
                  </div>
                  <p className="text-sc-forest font-bold text-lg leading-tight">
                    {(data?.rewards?.balance ?? 0).toLocaleString()} pts
                  </p>
                  {data?.rewards?.nextTier && (
                    <p className="text-sc-muted text-xs">
                      {data.rewards.pointsToNextTier.toLocaleString()} para {data.rewards.nextTier}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tier progress bar */}
          {!loading && data?.rewards?.nextTier && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-sc-muted mb-1.5">
                <span>{tierInfo.label}</span>
                <span>{data.rewards.tierProgress}% hacia {data.rewards.nextTier}</span>
              </div>
              <div className="h-2 bg-sc-beige rounded-full overflow-hidden">
                <div
                  className="h-full bg-sc-forest rounded-full transition-all duration-700"
                  style={{ width: `${data.rewards.tierProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {loading ? (
            [...Array(4)].map((_, i) => <SectionSkeleton key={i} />)
          ) : (
            <>
              <div className="bg-white border border-sc-border rounded-card p-4 text-center">
                <p className="text-2xl font-bold text-sc-forest">{data?.orders?.total ?? 0}</p>
                <p className="text-sc-muted text-xs mt-0.5">Pedidos</p>
              </div>
              <div className="bg-white border border-sc-border rounded-card p-4 text-center">
                <p className="text-2xl font-bold text-sc-forest">{data?.orders?.active ?? 0}</p>
                <p className="text-sc-muted text-xs mt-0.5">En proceso</p>
              </div>
              <div className="bg-white border border-sc-border rounded-card p-4 text-center">
                <p className="text-2xl font-bold text-sc-forest">{data?.reviews?.submitted ?? 0}</p>
                <p className="text-sc-muted text-xs mt-0.5">Reseñas</p>
              </div>
              <div className="bg-white border border-sc-border rounded-card p-4 text-center relative">
                <p className="text-2xl font-bold text-sc-forest">{unreadCount}</p>
                <p className="text-sc-muted text-xs mt-0.5">Notif. nuevas</p>
              </div>
            </>
          )}
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Orders Summary */}
          <SectionCard title="Resumen de Pedidos" linkHref="/cuenta/pedidos" linkLabel="Ver todos">
            {loading ? (
              <div className="p-5 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                ))}
              </div>
            ) : !data?.orders?.recent?.length ? (
              <div className="px-5 py-10 text-center">
                <p className="text-3xl mb-2">📦</p>
                <p className="text-sc-forest text-sm font-medium mb-1">Sin pedidos aún</p>
                <Link href="/productos" className="text-sc-periwinkle text-xs hover:underline">
                  Explorar productos →
                </Link>
              </div>
            ) : (
              <div>
                {/* Latest order highlight */}
                {data.orders.latest && (
                  <div className="px-5 py-3 bg-sc-tan/40 border-b border-sc-border">
                    <p className="text-xs text-sc-muted font-medium uppercase tracking-wide mb-1">Último pedido</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sc-forest text-sm font-semibold">#{data.orders.latest.order_number}</p>
                        <p className="text-sc-muted text-xs">{formatDate(data.orders.latest.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-badge text-xs font-medium ${ESTADO_LABELS[data.orders.latest.status]?.color ?? 'bg-gray-100 text-gray-700'}`}>
                          {ESTADO_LABELS[data.orders.latest.status]?.label ?? data.orders.latest.status}
                        </span>
                        <span className="text-sc-forest text-sm font-bold">
                          {formatCurrency(data.orders.latest.total, data.orders.latest.currency_code)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {/* Recent orders list */}
                <div className="divide-y divide-sc-border/60">
                  {data.orders.recent.slice(0, 4).map(order => {
                    const estado = ESTADO_LABELS[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-700' };
                    return (
                      <Link
                        key={order.id}
                        href={`/cuenta/pedidos/${order.id}`}
                        className="flex items-center justify-between px-5 py-3 hover:bg-sc-tan/30 transition-colors"
                      >
                        <div>
                          <p className="text-sc-forest text-sm font-medium">#{order.order_number}</p>
                          <p className="text-sc-muted text-xs">{formatDate(order.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-badge text-xs font-medium ${estado.color}`}>
                            {estado.label}
                          </span>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-sc-muted flex-shrink-0">
                            <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </SectionCard>

          {/* Rewards Summary */}
          <SectionCard title="Recompensas & Puntos" linkHref="/cuenta/loyalty" linkLabel="Ver Loyalty Club">
            {loading ? (
              <div className="p-5 space-y-3">
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ) : (
              <div>
                {/* Balance */}
                <div className="px-5 py-4 border-b border-sc-border/60">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-sc-muted font-medium uppercase tracking-wide mb-0.5">Saldo actual</p>
                      <p className="text-3xl font-bold text-sc-forest">
                        {(data?.rewards?.balance ?? 0).toLocaleString()}
                        <span className="text-sm font-normal text-sc-muted ml-1">pts</span>
                      </p>
                    </div>
                    {data?.rewards?.availableRewards && data.rewards.availableRewards.length > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-sc-muted">Recompensas disponibles</p>
                        <p className="text-sc-periwinkle font-bold text-lg">
                          {data.rewards.availableRewards.filter(r =>
                            (data.rewards?.balance ?? 0) >= r.points_required &&
                            r.eligible_tiers.includes(tier)
                          ).length}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent transactions */}
                {data?.rewards?.recentTransactions && data.rewards.recentTransactions.length > 0 ? (
                  <div className="divide-y divide-sc-border/60">
                    {data.rewards.recentTransactions.slice(0, 3).map(tx => {
                      const txMeta = TX_LABELS[tx.transaction_type] ?? { sign: '', color: 'text-sc-muted' };
                      return (
                        <div key={tx.id} className="flex items-center justify-between px-5 py-2.5">
                          <p className="text-sc-forest text-xs truncate max-w-[60%]">{tx.description}</p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-sm font-semibold ${txMeta.color}`}>
                              {txMeta.sign}{Math.abs(tx.points)}
                            </span>
                            <span className="text-sc-muted text-xs">{timeAgo(tx.created_at)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-5 py-6 text-center">
                    <p className="text-sc-muted text-xs">Sin actividad de puntos reciente</p>
                  </div>
                )}

                {/* Available rewards preview */}
                {data?.rewards?.availableRewards && data.rewards.availableRewards.length > 0 && (
                  <div className="px-5 py-3 bg-sc-tan/30 border-t border-sc-border/60">
                    <p className="text-xs text-sc-muted font-medium mb-2">Recompensas disponibles</p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.rewards.availableRewards.slice(0, 3).map(r => (
                        <span key={r.id} className="text-xs bg-white border border-sc-border rounded-badge px-2 py-0.5 text-sc-forest">
                          {r.name} · {r.points_required.toLocaleString()} pts
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* Reviews Summary */}
          <SectionCard title="Mis Reseñas" linkHref="/cuenta/resenas" linkLabel="Ver reseñas">
            {loading ? (
              <div className="p-5 space-y-3">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ) : (
              <div className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-sc-tan/40 rounded-card p-3">
                    <p className="text-xl font-bold text-sc-forest">{data?.reviews?.submitted ?? 0}</p>
                    <p className="text-sc-muted text-xs mt-0.5">Enviadas</p>
                  </div>
                  <div className="bg-yellow-50 rounded-card p-3">
                    <p className="text-xl font-bold text-amber-700">{data?.reviews?.pending ?? 0}</p>
                    <p className="text-sc-muted text-xs mt-0.5">Pendientes</p>
                  </div>
                  <div className="bg-sc-periwinkle/10 rounded-card p-3">
                    <p className="text-xl font-bold text-sc-periwinkle">{data?.reviews?.eligibleForReview ?? 0}</p>
                    <p className="text-sc-muted text-xs mt-0.5">Por reseñar</p>
                  </div>
                </div>
                {(data?.reviews?.eligibleForReview ?? 0) > 0 && (
                  <div className="bg-sc-periwinkle/5 border border-sc-periwinkle/20 rounded-card px-3 py-2 flex items-center justify-between">
                    <p className="text-sc-periwinkle text-xs font-medium">
                      Tienes {data!.reviews.eligibleForReview} producto{data!.reviews.eligibleForReview > 1 ? 's' : ''} por reseñar
                    </p>
                    <Link href="/cuenta/resenas" className="text-sc-periwinkle text-xs font-semibold hover:underline">
                      Reseñar →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* Notifications Summary */}
          <SectionCard title="Notificaciones" linkHref="/cuenta/notificaciones" linkLabel="Centro de notificaciones">
            {loading ? (
              <div className="p-5 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !data?.notifications?.recent?.length ? (
              <div className="px-5 py-8 text-center">
                <p className="text-2xl mb-2">🔔</p>
                <p className="text-sc-muted text-xs">Sin notificaciones recientes</p>
              </div>
            ) : (
              <div>
                {unreadCount > 0 && (
                  <div className="px-5 py-2.5 bg-sc-periwinkle/5 border-b border-sc-border/60 flex items-center justify-between">
                    <p className="text-sc-periwinkle text-xs font-medium">
                      {unreadCount} notificación{unreadCount > 1 ? 'es' : ''} sin leer
                    </p>
                    <Link href="/cuenta/notificaciones" className="text-sc-periwinkle text-xs font-semibold hover:underline">
                      Ver todas →
                    </Link>
                  </div>
                )}
                <div className="divide-y divide-sc-border/60">
                  {data.notifications.recent.slice(0, 4).map(notif => {
                    const meta = NOTIF_META[notif.notification_type] ?? { icon: '🔔', color: 'bg-sc-beige text-sc-forest' };
                    const Wrapper = notif.action_url ? Link : 'div';
                    const wrapperProps = notif.action_url
                      ? { href: notif.action_url, className: 'flex items-start gap-3 px-5 py-3 hover:bg-sc-tan/30 transition-colors' }
                      : { className: 'flex items-start gap-3 px-5 py-3' };
                    return (
                      <Wrapper key={notif.id} {...(wrapperProps as React.ComponentProps<typeof Link>)}>
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${meta.color}`}>
                          {meta.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium truncate ${notif.is_read ? 'text-sc-muted' : 'text-sc-forest'}`}>
                              {notif.title}
                            </p>
                            {!notif.is_read && (
                              <span className="w-2 h-2 bg-sc-periwinkle rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sc-muted text-xs truncate">{notif.body}</p>
                        </div>
                        <span className="text-sc-muted text-xs flex-shrink-0">{timeAgo(notif.created_at)}</span>
                      </Wrapper>
                    );
                  })}
                </div>
              </div>
            )}
          </SectionCard>

        </div>

        {/* ── Bottom Row: Address + Quick Actions ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Default Address */}
          <SectionCard title="Dirección de Envío" linkHref="/cuenta/direcciones" linkLabel="Gestionar">
            {loading ? (
              <div className="p-5 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ) : !data?.address ? (
              <div className="px-5 py-8 text-center">
                <p className="text-2xl mb-2">📍</p>
                <p className="text-sc-muted text-xs mb-3">Sin dirección predeterminada</p>
                <Link
                  href="/cuenta/direcciones"
                  className="inline-block text-xs bg-sc-forest text-sc-cream px-3 py-1.5 rounded-pill hover:bg-sc-darkforest transition-colors"
                >
                  Agregar dirección
                </Link>
              </div>
            ) : (
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-sc-forest text-sm font-semibold">{data.address.full_name}</p>
                    {data.address.label && (
                      <span className="inline-block text-xs bg-sc-beige text-sc-forest px-2 py-0.5 rounded-badge">
                        {data.address.label}
                      </span>
                    )}
                    <p className="text-sc-muted text-xs">{data.address.address_line1}</p>
                    <p className="text-sc-muted text-xs">
                      {data.address.city}, {data.address.state_province}
                    </p>
                    <p className="text-sc-muted text-xs">
                      {data.address.country_code === 'CO' ? '🇨🇴 Colombia' : '🇨🇷 Costa Rica'}
                    </p>
                  </div>
                  <Link
                    href="/cuenta/direcciones"
                    className="flex-shrink-0 text-xs text-sc-periwinkle font-medium hover:underline"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            )}
          </SectionCard>

          {/* Quick Actions */}
          <div className="bg-white border border-sc-border rounded-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-sc-border">
              <h2 className="text-sc-forest font-semibold text-sm">Acciones Rápidas</h2>
            </div>
            <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-sc-border/60">
              {QUICK_ACTIONS.map((action, idx) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`flex items-center gap-2.5 px-4 py-3.5 hover:bg-sc-tan/30 transition-colors group ${idx === QUICK_ACTIONS.length - 1 && QUICK_ACTIONS.length % 2 !== 0 ? 'col-span-2' : ''}`}
                >
                  <span className="text-lg">{action.icon}</span>
                  <span className="text-sc-forest text-xs font-medium group-hover:text-sc-forest leading-tight">
                    {action.label}
                  </span>
                  {action.href === '/cuenta/notificaciones' && unreadCount > 0 && (
                    <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-sc-periwinkle text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-card p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

      </div>
    </CuentaLayout>
  );
}
