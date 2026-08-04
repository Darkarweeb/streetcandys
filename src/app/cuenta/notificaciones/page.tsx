'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import CuentaLayout from '@/components/cuenta/CuentaLayout';
import { useNotifications, CustomerNotification } from '@/hooks/useNotifications';

// ─── Notification type metadata ──────────────────────────────
interface NotifMeta {
  icon: string;
  label: string;
  color: string;
}

const NOTIF_META: Record<string, NotifMeta> = {
  welcome:              { icon: '👋', label: 'Bienvenida',          color: 'bg-emerald-50 text-emerald-600' },
  order_received:       { icon: '📥', label: 'Pedido recibido',     color: 'bg-blue-50 text-blue-600' },
  order_confirmed:      { icon: '✅', label: 'Pedido confirmado',   color: 'bg-blue-50 text-blue-600' },
  order_preparing:      { icon: '👨‍🍳', label: 'En preparación',     color: 'bg-amber-50 text-amber-600' },
  order_ready:          { icon: '📦', label: 'Listo',               color: 'bg-amber-50 text-amber-600' },
  order_shipped:        { icon: '🚚', label: 'Enviado',             color: 'bg-indigo-50 text-indigo-600' },
  order_out_for_delivery: { icon: '🛵', label: 'En camino',         color: 'bg-indigo-50 text-indigo-600' },
  order_delivered:      { icon: '🎉', label: 'Entregado',           color: 'bg-green-50 text-green-600' },
  order_cancelled:      { icon: '❌', label: 'Cancelado',           color: 'bg-red-50 text-red-600' },
  order_refunded:       { icon: '💸', label: 'Reembolsado',         color: 'bg-gray-50 text-gray-600' },
  payment_failed:       { icon: '💳', label: 'Pago fallido',        color: 'bg-red-50 text-red-600' },
  reward_earned:        { icon: '⭐', label: 'Puntos ganados',      color: 'bg-yellow-50 text-yellow-600' },
  reward_redeemed:      { icon: '🎁', label: 'Recompensa canjeada', color: 'bg-purple-50 text-purple-600' },
  reward_tier_up:       { icon: '🏆', label: 'Nivel subido',        color: 'bg-purple-50 text-purple-600' },
  loyalty_tier_upgraded:{ icon: '🏆', label: 'Nivel subido',        color: 'bg-purple-50 text-purple-600' },
  promotion_available:  { icon: '🎯', label: 'Promoción',           color: 'bg-pink-50 text-pink-600' },
  review_approved:      { icon: '⭐', label: 'Reseña aprobada',     color: 'bg-yellow-50 text-yellow-600' },
  system_announcement:  { icon: '📢', label: 'Anuncio',             color: 'bg-sc-forest/5 text-sc-forest' },
  system:               { icon: '🔔', label: 'Sistema',             color: 'bg-sc-forest/5 text-sc-forest' },
  coupon_applied:       { icon: '🏷️', label: 'Cupón aplicado',      color: 'bg-teal-50 text-teal-600' },
};

const DEFAULT_META: NotifMeta = { icon: '🔔', label: 'Notificación', color: 'bg-sc-beige text-sc-forest' };

function getMeta(type: string): NotifMeta {
  return NOTIF_META[type] ?? DEFAULT_META;
}

// ─── Filter categories ────────────────────────────────────────
const FILTER_GROUPS = [
  { key: 'all',       label: 'Todas' },
  { key: 'orders',    label: 'Pedidos' },
  { key: 'rewards',   label: 'Recompensas' },
  { key: 'promotions',label: 'Promociones' },
  { key: 'system',    label: 'Sistema' },
];

const ORDER_TYPES = new Set([
  'order_received','order_confirmed','order_preparing','order_ready',
  'order_shipped','order_out_for_delivery','order_delivered',
  'order_cancelled','order_refunded','payment_failed',
]);
const REWARD_TYPES = new Set([
  'reward_earned','reward_redeemed','reward_tier_up','loyalty_tier_upgraded',
]);
const PROMO_TYPES = new Set(['promotion_available','coupon_applied']);
const SYSTEM_TYPES = new Set(['welcome','system','system_announcement','review_approved']);

function matchesGroup(type: string, group: string): boolean {
  if (group === 'all') return true;
  if (group === 'orders') return ORDER_TYPES.has(type);
  if (group === 'rewards') return REWARD_TYPES.has(type);
  if (group === 'promotions') return PROMO_TYPES.has(type);
  if (group === 'system') return SYSTEM_TYPES.has(type);
  return false;
}

// ─── Helpers ─────────────────────────────────────────────────
function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Ahora mismo';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Skeleton ─────────────────────────────────────────────────
function NotifSkeleton() {
  return (
    <div className="px-5 py-4 animate-pulse flex gap-4 border-b border-sc-border last:border-0">
      <div className="w-10 h-10 bg-sc-beige rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-sc-beige rounded w-2/3" />
        <div className="h-3 bg-sc-beige rounded w-full" />
        <div className="h-3 bg-sc-beige rounded w-1/3" />
      </div>
    </div>
  );
}

// ─── Notification row ─────────────────────────────────────────
interface NotifRowProps {
  notif: CustomerNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotifRow({ notif, onMarkRead, onDelete }: NotifRowProps) {
  const meta = getMeta(notif.notification_type);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleting(true);
    await onDelete(notif.id);
  };

  const handleMarkRead = () => {
    if (!notif.is_read) onMarkRead(notif.id);
  };

  const rowContent = (
    <div
      className={`flex gap-3 px-4 py-4 transition-colors min-h-[76px] group relative ${
        notif.is_read ? 'bg-white hover:bg-sc-tan/20' : 'bg-sc-tan/40 hover:bg-sc-tan/60'
      } ${deleting ? 'opacity-40 pointer-events-none' : ''}`}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 mt-0.5 ${meta.color}`}>
        {meta.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-8">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${notif.is_read ? 'text-sc-forest font-medium' : 'text-sc-forest font-semibold'}`}>
            {notif.title}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-sc-muted text-xs whitespace-nowrap">{formatDate(notif.created_at)}</span>
            {!notif.is_read && (
              <span className="w-2 h-2 bg-sc-periwinkle rounded-full flex-shrink-0" aria-label="No leída" />
            )}
          </div>
        </div>
        <p className="text-sc-muted text-xs mt-0.5 leading-relaxed line-clamp-2">{notif.body}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full ${meta.color}`}>
            {meta.label}
          </span>
          {notif.action_url && (
            <span className="text-xs text-sc-periwinkle font-medium">Ver detalle →</span>
          )}
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        aria-label="Eliminar notificación"
        className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-sc-muted hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M6 6.5v3M8 6.5v3M3 3.5l.7 7.5a.5.5 0 00.5.5h5.6a.5.5 0 00.5-.5L11 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );

  if (notif.action_url) {
    return (
      <div className="border-b border-sc-border last:border-0" onClick={handleMarkRead}>
        <Link href={notif.action_url} className="block">
          {rowContent}
        </Link>
      </div>
    );
  }

  return (
    <div
      className="border-b border-sc-border last:border-0 cursor-pointer"
      onClick={handleMarkRead}
    >
      {rowContent}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function NotificacionesPage() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);

  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  } = useNotifications({ profileId: user?.id ?? null });

  const filtered = useMemo(
    () => notifications.filter((n) => matchesGroup(n.notification_type, activeFilter)),
    [notifications, activeFilter],
  );

  const filteredUnread = useMemo(
    () => filtered.filter((n) => !n.is_read).length,
    [filtered],
  );

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    await markAllAsRead();
    setMarkingAll(false);
  };

  // Count per group for badges
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    FILTER_GROUPS.forEach((g) => {
      counts[g.key] = notifications.filter(
        (n) => !n.is_read && matchesGroup(n.notification_type, g.key),
      ).length;
    });
    return counts;
  }, [notifications]);

  return (
    <CuentaLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between mb-5 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-sc-forest tracking-tight">Notificaciones</h1>
            <p className="text-sc-muted text-sm mt-1">
              {unreadCount > 0
                ? `${unreadCount} sin leer`
                : 'Todo al día'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
              className="flex-shrink-0 text-sc-periwinkle text-sm font-medium hover:underline disabled:opacity-60 mt-1"
            >
              {markingAll ? 'Marcando...' : 'Marcar todo como leído'}
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-4 pb-1">
          {FILTER_GROUPS.map((g) => (
            <button
              key={g.key}
              onClick={() => setActiveFilter(g.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                activeFilter === g.key
                  ? 'bg-sc-forest text-sc-cream border-sc-forest'
                  : 'bg-white text-sc-forest border-sc-border hover:bg-sc-beige'
              }`}
            >
              {g.label}
              {groupCounts[g.key] > 0 && (
                <span
                  className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    activeFilter === g.key
                      ? 'bg-white/20 text-sc-cream' :'bg-sc-periwinkle text-white'
                  }`}
                >
                  {groupCounts[g.key] > 99 ? '99+' : groupCounts[g.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="bg-white border border-sc-border rounded-card overflow-hidden">
          {loading ? (
            <div>
              {[...Array(5)].map((_, i) => <NotifSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="px-5 py-10 text-center">
              <p className="text-red-600 text-sm mb-3">{error}</p>
              <button onClick={refresh} className="text-sc-periwinkle text-sm hover:underline">
                Reintentar
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-5xl mb-4">🔔</p>
              <p className="text-sc-forest font-semibold text-lg mb-2">
                {activeFilter === 'all' ? 'Sin notificaciones' : 'Sin notificaciones en esta categoría'}
              </p>
              <p className="text-sc-muted text-sm">
                {activeFilter === 'all' ?'Te avisaremos cuando haya novedades sobre tus pedidos y recompensas' :'Prueba otra categoría o espera nuevas actualizaciones'}
              </p>
            </div>
          ) : (
            <>
              {filteredUnread > 0 && (
                <div className="px-4 py-2 bg-sc-tan/30 border-b border-sc-border flex items-center justify-between">
                  <span className="text-xs text-sc-muted font-medium">
                    {filteredUnread} sin leer en esta vista
                  </span>
                </div>
              )}
              <div>
                {filtered.map((notif) => (
                  <NotifRow
                    key={notif.id}
                    notif={notif}
                    onMarkRead={markAsRead}
                    onDelete={deleteNotification}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer info */}
        {filtered.length > 0 && (
          <p className="text-center text-xs text-sc-muted mt-4">
            Mostrando {filtered.length} notificación{filtered.length !== 1 ? 'es' : ''} · ordenadas de más reciente a más antigua
          </p>
        )}
      </div>
    </CuentaLayout>
  );
}
