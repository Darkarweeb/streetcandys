'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { createClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────
interface Rewards {
  points_balance: number;
  points_lifetime: number;
  tier: string;
}

interface Customer {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  country_code: string | null;
  is_active: boolean;
  age_verified: boolean;
  referral_code: string | null;
  created_at: string;
  total_orders: number;
  lifetime_spending: number;
  last_purchase: string | null;
  rewards: Rewards;
}

interface OrderSummary {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  currency_code: string;
  created_at: string;
  country_code: string;
}

interface Address {
  id: string;
  label: string;
  full_name: string;
  address_line1: string;
  city: string;
  state_province: string;
  country_code: string;
  is_default: boolean;
}

interface RewardTransaction {
  id: string;
  transaction_type: string;
  points: number;
  balance_after: number;
  description: string;
  created_at: string;
}

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

interface CustomerDetail {
  perfil: Customer;
  ordenes: OrderSummary[];
  recompensas: Rewards | null;
  transacciones: RewardTransaction[];
  direcciones: Address[];
  notificaciones: Notification[];
  stats: { total_orders: number; lifetime_spending: number; last_purchase: string | null };
}

// ─── Helpers ─────────────────────────────────────────────────
const TIER_LABELS: Record<string, string> = { crew: 'Crew', og: 'OG', legend: 'Legend', icon: 'Icon' };
const TIER_COLORS: Record<string, string> = {
  crew: 'bg-gray-100 text-gray-700',
  og: 'bg-blue-100 text-blue-700',
  legend: 'bg-purple-100 text-purple-700',
  icon: 'bg-amber-100 text-amber-700',
};
const ESTADO_LABELS: Record<string, string> = {
  pending: 'Pendiente', confirmed: 'Confirmado', processing: 'Procesando',
  shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado', refunded: 'Reembolsado',
  preparing: 'Preparando', ready: 'Listo', out_for_delivery: 'En camino',
};
const ESTADO_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700', shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-700', preparing: 'bg-orange-100 text-orange-700',
  ready: 'bg-teal-100 text-teal-700', out_for_delivery: 'bg-cyan-100 text-cyan-700',
};
const PAIS_LABELS: Record<string, string> = { CO: 'Colombia', CR: 'Costa Rica' };
const TX_LABELS: Record<string, string> = {
  earned_purchase: 'Compra', earned_review: 'Reseña', earned_referral: 'Referido',
  redeemed: 'Canjeado', expired: 'Expirado', adjusted: 'Ajuste',
};

function formatCurrency(amount: number, currency: string) {
  if (currency === 'COP') return `$${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(amount)} COP`;
  if (currency === 'CRC') return `₡${new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 }).format(amount)} CRC`;
  return `$${amount.toLocaleString()}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Skeleton ─────────────────────────────────────────────────
function RowSkeleton() {
  return (
    <tr className="animate-pulse">
      {[1,2,3,4,5,6,7].map(i => <td key={i} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-full" /></td>)}
    </tr>
  );
}

// ─── Customer Detail Drawer ───────────────────────────────────
function CustomerDrawer({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'perfil' | 'pedidos' | 'recompensas' | 'notificaciones'>('perfil');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/clientes/${customerId}`);
        const data = await res.json();
        if (data.exito) setDetail(data.datos);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [customerId]);

  const p = detail?.perfil;
  const stats = detail?.stats;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sc-forest/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sc-forest font-bold uppercase">{p?.full_name?.charAt(0) || '?'}</span>
            </div>
            <div>
              <h2 className="text-sc-forest font-bold text-lg">{p?.full_name || 'Cargando...'}</h2>
              <p className="text-gray-400 text-xs">{p?.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="px-6 py-3 grid grid-cols-3 gap-4 border-b border-gray-100 flex-shrink-0">
            <div className="text-center">
              <p className="text-lg font-black text-sc-forest">{stats.total_orders}</p>
              <p className="text-xs text-gray-500">Pedidos</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-sc-forest">${(stats.lifetime_spending / 1000).toFixed(0)}K</p>
              <p className="text-xs text-gray-500">Gasto total</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-sc-forest">{detail?.recompensas?.points_balance || 0}</p>
              <p className="text-xs text-gray-500">Puntos</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 px-6 py-2 border-b border-gray-100 flex-shrink-0 overflow-x-auto">
          {(['perfil', 'pedidos', 'recompensas', 'notificaciones'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === t ? 'bg-sc-forest text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
              {t === 'perfil' ? 'Perfil' : t === 'pedidos' ? `Pedidos (${detail?.ordenes?.length || 0})` : t === 'recompensas' ? 'Recompensas' : 'Notificaciones'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading && <div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}</div>}

          {!loading && activeTab === 'perfil' && p && (
            <>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Información personal</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500 text-xs">Nombre</p><p className="font-medium text-sc-forest">{p.full_name}</p></div>
                  <div><p className="text-gray-500 text-xs">Email</p><p className="font-medium text-sc-forest">{p.email}</p></div>
                  <div><p className="text-gray-500 text-xs">Teléfono</p><p className="font-medium text-sc-forest">{p.phone || '—'}</p></div>
                  <div><p className="text-gray-500 text-xs">País</p><p className="font-medium text-sc-forest">{PAIS_LABELS[p.country_code || ''] || p.country_code || '—'}</p></div>
                  <div><p className="text-gray-500 text-xs">Registro</p><p className="font-medium text-sc-forest">{formatDate(p.created_at)}</p></div>
                  <div><p className="text-gray-500 text-xs">Estado</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${p.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                      {p.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              </div>

              {detail?.recompensas && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Programa de recompensas</p>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="text-center bg-white rounded-lg p-3">
                      <p className="text-xl font-black text-sc-forest">{detail.recompensas.points_balance}</p>
                      <p className="text-xs text-gray-500">Puntos actuales</p>
                    </div>
                    <div className="text-center bg-white rounded-lg p-3">
                      <p className="text-xl font-black text-sc-forest">{detail.recompensas.points_lifetime}</p>
                      <p className="text-xs text-gray-500">Puntos totales</p>
                    </div>
                    <div className="text-center bg-white rounded-lg p-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${TIER_COLORS[detail.recompensas.tier] || 'bg-gray-100 text-gray-700'}`}>
                        {TIER_LABELS[detail.recompensas.tier] || detail.recompensas.tier}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">Tier</p>
                    </div>
                  </div>
                </div>
              )}

              {detail?.direcciones && detail.direcciones.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Direcciones</p>
                  <div className="space-y-2">
                    {detail.direcciones.map(dir => (
                      <div key={dir.id} className="bg-gray-50 rounded-lg p-3 flex items-start gap-3">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-gray-400 flex-shrink-0 mt-0.5">
                          <path d="M7 1a4.5 4.5 0 014.5 4.5C11.5 9 7 13 7 13S2.5 9 2.5 5.5A4.5 4.5 0 017 1z" stroke="currentColor" strokeWidth="1.2"/>
                          <circle cx="7" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                        </svg>
                        <div className="flex-1 text-sm">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sc-forest">{dir.label}</p>
                            {dir.is_default && <span className="text-xs bg-sc-forest/10 text-sc-forest px-1.5 py-0.5 rounded">Principal</span>}
                          </div>
                          <p className="text-gray-600">{dir.full_name}</p>
                          <p className="text-gray-500 text-xs">{dir.address_line1}, {dir.city}, {dir.state_province}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {p.referral_code && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Código de referido</p>
                  <span className="font-mono text-sc-forest bg-sc-beige px-3 py-1.5 rounded-lg text-sm">{p.referral_code}</span>
                </div>
              )}
            </>
          )}

          {!loading && activeTab === 'pedidos' && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Historial de pedidos</p>
              {(detail?.ordenes || []).length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Sin pedidos</p>
              ) : (
                <div className="space-y-2">
                  {(detail?.ordenes || []).map(o => (
                    <div key={o.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono font-semibold text-sc-forest text-sm">#{o.order_number}</p>
                        <p className="text-gray-400 text-xs">{formatDate(o.created_at)} · {PAIS_LABELS[o.country_code] || o.country_code}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                          {ESTADO_LABELS[o.status] || o.status}
                        </span>
                        <span className="font-semibold text-sc-forest text-sm">{formatCurrency(o.total, o.currency_code)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && activeTab === 'recompensas' && (
            <div className="space-y-4">
              {detail?.recompensas && (
                <div className="bg-gradient-to-br from-sc-forest to-sc-darkforest rounded-xl p-5 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-white/70 text-xs uppercase tracking-wide">Tier actual</p>
                      <p className="text-2xl font-black">{TIER_LABELS[detail.recompensas.tier] || detail.recompensas.tier}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/70 text-xs uppercase tracking-wide">Puntos disponibles</p>
                      <p className="text-2xl font-black">{detail.recompensas.points_balance.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <p className="text-white/70 text-xs">Puntos acumulados de por vida</p>
                    <p className="text-xl font-bold">{detail.recompensas.points_lifetime.toLocaleString()}</p>
                  </div>
                </div>
              )}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Historial de transacciones</p>
              {(detail?.transacciones || []).length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Sin transacciones</p>
              ) : (
                <div className="space-y-2">
                  {(detail?.transacciones || []).map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-sc-forest">{TX_LABELS[tx.transaction_type] || tx.transaction_type}</p>
                        <p className="text-xs text-gray-500">{tx.description}</p>
                        <p className="text-xs text-gray-400">{formatDate(tx.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${tx.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.points > 0 ? '+' : ''}{tx.points}
                        </p>
                        <p className="text-xs text-gray-400">Saldo: {tx.balance_after}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && activeTab === 'notificaciones' && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Historial de notificaciones</p>
              {(detail?.notificaciones || []).length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Sin notificaciones</p>
              ) : (
                <div className="space-y-2">
                  {(detail?.notificaciones || []).map(n => (
                    <div key={n.id} className={`p-3 rounded-lg border ${n.is_read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-sc-forest">{n.title}</p>
                        <span className="text-xs text-gray-400">{formatDate(n.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-600">{n.body}</p>
                      {!n.is_read && <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">No leída</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function AdminClientesPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [clientes, setClientes] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [filtroPais, setFiltroPais] = useState('');
  const [filtroTier, setFiltroTier] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null);
  const [realtimeNew, setRealtimeNew] = useState(0);
  const POR_PAGINA = 20;

  useEffect(() => {
    if (!authLoading && profile && !['admin', 'staff'].includes(profile.role)) {
      router.replace('/');
    }
  }, [authLoading, profile, router]);

  const fetchClientes = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({
        pagina: String(pagina), por_pagina: String(POR_PAGINA),
        ...(busqueda && { busqueda }),
        ...(filtroPais && { pais: filtroPais }),
        ...(filtroTier && { tier: filtroTier }),
      });
      const res = await fetch(`/api/admin/clientes?${params}`);
      const data = await res.json();
      if (!data.exito) throw new Error(data.error);
      setClientes(data.datos || []);
      setTotal(data.total || 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando clientes');
    } finally {
      setLoading(false);
    }
  }, [pagina, busqueda, filtroPais, filtroTier]);

  useEffect(() => {
    if (profile && ['admin', 'staff'].includes(profile.role)) fetchClientes();
  }, [profile, fetchClientes]);

  // Realtime: new customer registrations
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  useEffect(() => {
    if (!profile || !['admin', 'staff'].includes(profile.role)) return;
    const channel = supabase.channel('admin-customers-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles', filter: 'role=eq.customer' }, () => {
        setRealtimeNew(c => c + 1);
        fetchClientes();
      })
      .subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [profile, supabase, fetchClientes]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  if (authLoading) return <AdminLayout title="Clientes"><div className="animate-pulse h-64 bg-gray-100 rounded-xl" /></AdminLayout>;
  if (!profile || !['admin', 'staff'].includes(profile.role)) return null;

  return (
    <AdminLayout title="Gestión de Clientes" subtitle={`${total} clientes registrados`}>
      {realtimeNew > 0 && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-green-700 font-medium">{realtimeNew} nuevo(s) cliente(s) registrado(s)</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-48 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
            placeholder="Buscar por nombre o email..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30" />
        </div>
        <select value={filtroPais} onChange={e => { setFiltroPais(e.target.value); setPagina(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30">
          <option value="">Todos los países</option>
          <option value="CO">Colombia</option>
          <option value="CR">Costa Rica</option>
        </select>
        <select value={filtroTier} onChange={e => { setFiltroTier(e.target.value); setPagina(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30">
          <option value="">Todos los tiers</option>
          <option value="crew">Crew</option>
          <option value="og">OG</option>
          <option value="legend">Legend</option>
          <option value="icon">Icon</option>
        </select>
        <span className="text-sm text-gray-500 ml-auto">{total} cliente(s)</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-sc-forest">Cliente</th>
                <th className="px-4 py-3 text-left font-semibold text-sc-forest">País</th>
                <th className="px-4 py-3 text-left font-semibold text-sc-forest">Tier</th>
                <th className="px-4 py-3 text-left font-semibold text-sc-forest">Pedidos</th>
                <th className="px-4 py-3 text-left font-semibold text-sc-forest">Gasto total</th>
                <th className="px-4 py-3 text-left font-semibold text-sc-forest">Puntos</th>
                <th className="px-4 py-3 text-left font-semibold text-sc-forest">Última compra</th>
                <th className="px-4 py-3 text-left font-semibold text-sc-forest">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
              ) : error ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-red-500">{error}</td></tr>
              ) : clientes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-gray-300">
                        <circle cx="24" cy="16" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M6 44c0-9.941 8.059-18 18-18s18 8.059 18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <p className="text-gray-500 font-medium">No se encontraron clientes</p>
                    </div>
                  </td>
                </tr>
              ) : (
                clientes.map(c => (
                  <tr key={c.id} onClick={() => setClienteSeleccionado(c.id)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sc-forest/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sc-forest text-xs font-bold uppercase">{c.full_name?.charAt(0) || c.email.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sc-forest">{c.full_name || '—'}</p>
                          <p className="text-gray-500 text-xs">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{PAIS_LABELS[c.country_code || ''] || c.country_code || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[c.rewards?.tier || 'crew']}`}>
                        {TIER_LABELS[c.rewards?.tier || 'crew']}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sc-forest font-semibold text-sm">{c.total_orders || 0}</td>
                    <td className="px-4 py-3 text-sc-forest font-semibold text-sm">
                      ${((c.lifetime_spending || 0) / 1000).toFixed(0)}K
                    </td>
                    <td className="px-4 py-3 text-sc-forest font-semibold text-sm">{c.rewards?.points_balance || 0}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.last_purchase ? formatDate(c.last_purchase) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                        {c.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPaginas > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Mostrando {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, total)} de {total}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">← Anterior</button>
              <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">Siguiente →</button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Drawer */}
      {clienteSeleccionado && (
        <CustomerDrawer customerId={clienteSeleccionado} onClose={() => setClienteSeleccionado(null)} />
      )}
    </AdminLayout>
  );
}
