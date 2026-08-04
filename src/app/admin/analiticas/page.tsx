'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { createClient } from '@/lib/supabase/client';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────
interface AnalyticsData {
  ventas: {
    hoy: number;
    semana: number;
    mes: number;
    por_pais: Record<string, number>;
  };
  pedidos: {
    total: number;
    por_estado: Record<string, number>;
    pendiente: number;
    procesando: number;
    enviado: number;
    entregado: number;
    cancelado: number;
  };
  clientes: {
    total: number;
    nuevos: number;
    recurrentes: number;
    top: Array<{ profile_id: string; total: number }>;
  };
  productos: {
    total: number;
    activos: number;
    stock_bajo: number;
    sin_stock: number;
    mas_vendidos: Array<{ name: string; quantity: number; total: number }>;
  };
  recompensas: { puntos_emitidos: number; puntos_canjeados: number };
  blog: { publicados: number; total_vistas: number };
  ventas_por_dia: Array<{ fecha: string; ventas: number; pedidos: number }>;
}

// ─── Helpers ─────────────────────────────────────────────────
const CHART_COLORS = ['#163317', '#2d6a4f', '#52b788', '#95d5b2', '#b7e4c7', '#d8f3dc', '#4571CB', '#6b8dd6'];
const ESTADO_LABELS: Record<string, string> = {
  pending: 'Pendiente', confirmed: 'Confirmado', processing: 'Procesando',
  shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado', refunded: 'Reembolsado',
  preparing: 'Preparando', ready: 'Listo', out_for_delivery: 'En camino',
};

function formatNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatCurrencyShort(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

// ─── KPI Card ─────────────────────────────────────────────────
function KPICard({ label, value, sub, color, icon, trend }: {
  label: string; value: string; sub: string; color: string; icon: React.ReactNode; trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trend === 'up' ? 'bg-green-100 text-green-700' : trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-sc-forest">{value}</p>
      <p className="text-sm font-medium text-sc-forest mt-0.5">{label}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}

function KPISkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3"><div className="w-10 h-10 bg-gray-200 rounded-lg" /></div>
      <div className="w-24 h-7 bg-gray-200 rounded mb-1" />
      <div className="w-32 h-4 bg-gray-200 rounded" />
    </div>
  );
}

function ChartSkeleton() {
  return <div className="animate-pulse bg-gray-100 rounded-xl h-64" />;
}

// ─── Section Card ─────────────────────────────────────────────
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-bold text-sc-forest mb-4 text-sm uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function AdminAnaliticasPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<'7d' | '30d' | '90d'>('30d');
  const [tab, setTab] = useState<'ventas' | 'pedidos' | 'clientes' | 'productos' | 'recompensas'>('ventas');
  const [realtimeUpdates, setRealtimeUpdates] = useState(0);

  useEffect(() => {
    if (!authLoading && profile && !['admin', 'staff'].includes(profile.role)) router.replace('/');
  }, [authLoading, profile, router]);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/analiticas?periodo=${periodo}`);
      const json = await res.json();
      if (!json.exito) throw new Error(json.error);
      setData(json.datos);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando analíticas');
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => {
    if (profile && ['admin', 'staff'].includes(profile.role)) fetchData();
  }, [profile, fetchData]);

  // Realtime subscriptions
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  useEffect(() => {
    if (!profile || !['admin', 'staff'].includes(profile.role)) return;
    const channel = supabase.channel('admin-analytics-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        setRealtimeUpdates(c => c + 1);
        fetchData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        setRealtimeUpdates(c => c + 1);
        fetchData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles', filter: 'role=eq.customer' }, () => {
        setRealtimeUpdates(c => c + 1);
        fetchData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'inventory' }, () => {
        setRealtimeUpdates(c => c + 1);
        fetchData();
      })
      .subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [profile, supabase, fetchData]);

  if (authLoading) return <AdminLayout title="Analíticas"><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <KPISkeleton key={i} />)}</div></AdminLayout>;
  if (!profile || !['admin', 'staff'].includes(profile.role)) return null;

  const d = data;

  // Pie chart data for orders by status
  const pedidosPieData = d ? Object.entries(d.pedidos.por_estado).map(([status, count]) => ({
    name: ESTADO_LABELS[status] || status, value: count,
  })) : [];

  // Revenue by country
  const ventasPaisData = d ? Object.entries(d.ventas.por_pais).map(([pais, total]) => ({
    pais: pais === 'CO' ? 'Colombia' : pais === 'CR' ? 'Costa Rica' : pais, total,
  })) : [];

  return (
    <AdminLayout title="Analytics Dashboard" subtitle="KPIs en tiempo real del negocio">
      {/* Realtime indicator */}
      {realtimeUpdates > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-sm text-blue-700 font-medium">Dashboard actualizado en tiempo real · {realtimeUpdates} actualizaciones</span>
          <button onClick={() => setRealtimeUpdates(0)} className="ml-auto text-xs text-blue-500 hover:text-blue-700">Limpiar</button>
        </div>
      )}

      {/* Period selector */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(['7d', '30d', '90d'] as const).map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${periodo === p ? 'bg-white text-sc-forest shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {p === '7d' ? 'Últimos 7 días' : p === '30d' ? 'Últimos 30 días' : 'Últimos 90 días'}
            </button>
          ))}
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? [1,2,3,4].map(i => <KPISkeleton key={i} />) : d ? (
          <>
            <KPICard label="Ventas hoy" value={formatCurrencyShort(d.ventas.hoy)} sub={`Semana: ${formatCurrencyShort(d.ventas.semana)}`}
              color="bg-green-50 text-green-600" trend="up"
              icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2v16M6 6l4-4 4 4M6 14l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>} />
            <KPICard label="Ventas del mes" value={formatCurrencyShort(d.ventas.mes)} sub={`${d.pedidos.total} pedidos en período`}
              color="bg-blue-50 text-blue-600" trend="up"
              icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 2h14a1 1 0 011 1v14a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5"/></svg>} />
            <KPICard label="Total clientes" value={formatNum(d.clientes.total)} sub={`${d.clientes.nuevos} nuevos en período`}
              color="bg-purple-50 text-purple-600" trend="up"
              icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>} />
            <KPICard label="Stock bajo / sin stock" value={`${d.productos.stock_bajo} / ${d.productos.sin_stock}`} sub={`${d.productos.activos} productos activos`}
              color="bg-red-50 text-red-600" trend={d.productos.sin_stock > 0 ? 'down' : 'neutral'}
              icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 3l7.5 13H2.5L10 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M10 8v4M10 14v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>} />
          </>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6 overflow-x-auto">
        {(['ventas', 'pedidos', 'clientes', 'productos', 'recompensas'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t ? 'bg-white text-sc-forest shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'ventas' ? 'Ventas' : t === 'pedidos' ? 'Pedidos' : t === 'clientes' ? 'Clientes' : t === 'productos' ? 'Productos' : 'Recompensas'}
          </button>
        ))}
      </div>

      {/* ─── Tab: Ventas ─── */}
      {tab === 'ventas' && (
        <div className="space-y-6">
          {/* Sales by day chart */}
          <SectionCard title="Ventas por día">
            {loading ? <ChartSkeleton /> : d ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={d.ventas_por_dia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => [formatCurrencyShort(v), 'Ventas']} />
                  <Line type="monotone" dataKey="ventas" stroke="#163317" strokeWidth={2} dot={false} name="Ventas" />
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </SectionCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by country */}
            <SectionCard title="Ingresos por país">
              {loading ? <ChartSkeleton /> : d ? (
                ventasPaisData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={ventasPaisData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="pais" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v: number) => [formatCurrencyShort(v), 'Ingresos']} />
                      <Bar dataKey="total" fill="#163317" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-400 text-sm text-center py-8">Sin datos de ventas</p>
              ) : null}
            </SectionCard>

            {/* Orders per day */}
            <SectionCard title="Pedidos por día">
              {loading ? <ChartSkeleton /> : d ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={d.ventas_por_dia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="pedidos" fill="#4571CB" radius={[4, 4, 0, 0]} name="Pedidos" />
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </SectionCard>
          </div>
        </div>
      )}

      {/* ─── Tab: Pedidos ─── */}
      {tab === 'pedidos' && d && (
        <div className="space-y-6">
          {/* Status KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Pendientes', value: d.pedidos.pendiente, color: 'bg-yellow-50 text-yellow-700' },
              { label: 'Procesando', value: d.pedidos.procesando, color: 'bg-purple-50 text-purple-700' },
              { label: 'Enviados', value: d.pedidos.enviado, color: 'bg-indigo-50 text-indigo-700' },
              { label: 'Entregados', value: d.pedidos.entregado, color: 'bg-green-50 text-green-700' },
              { label: 'Cancelados', value: d.pedidos.cancelado, color: 'bg-red-50 text-red-700' },
            ].map(item => (
              <div key={item.label} className={`rounded-xl p-4 ${item.color.split(' ')[0]}`}>
                <p className={`text-2xl font-black ${item.color.split(' ')[1]}`}>{item.value}</p>
                <p className={`text-xs font-medium ${item.color.split(' ')[1]} mt-0.5`}>{item.label}</p>
              </div>
            ))}
          </div>

          {/* Pie chart */}
          <SectionCard title="Distribución por estado">
            {pedidosPieData.length > 0 ? (
              <div className="flex flex-col lg:flex-row items-center gap-6">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pedidosPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                      {pedidosPieData.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-gray-400 text-sm text-center py-8">Sin datos de pedidos</p>}
          </SectionCard>
        </div>
      )}

      {/* ─── Tab: Clientes ─── */}
      {tab === 'clientes' && d && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <KPICard label="Total clientes" value={formatNum(d.clientes.total)} sub="registrados"
              color="bg-purple-50 text-purple-600"
              icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>} />
            <KPICard label="Nuevos clientes" value={formatNum(d.clientes.nuevos)} sub={`en los últimos ${periodo === '7d' ? '7' : periodo === '30d' ? '30' : '90'} días`}
              color="bg-green-50 text-green-600"
              icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 5v10M5 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>} />
            <KPICard label="Clientes recurrentes" value={formatNum(d.clientes.recurrentes)} sub="con pedidos en el período"
              color="bg-blue-50 text-blue-600"
              icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10a6 6 0 1112 0 6 6 0 01-12 0z" stroke="currentColor" strokeWidth="1.5"/><path d="M10 7v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>} />
          </div>

          {d.clientes.top.length > 0 && (
            <SectionCard title="Top clientes por gasto">
              <div className="space-y-2">
                {d.clientes.top.map((c, idx) => (
                  <div key={c.profile_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-sc-forest/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sc-forest text-xs font-bold">#{idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 font-mono">{c.profile_id.slice(0, 8)}...</p>
                    </div>
                    <p className="font-bold text-sc-forest text-sm">{formatCurrencyShort(c.total)}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* ─── Tab: Productos ─── */}
      {tab === 'productos' && d && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Total productos" value={String(d.productos.total)} sub={`${d.productos.activos} activos`}
              color="bg-blue-50 text-blue-600"
              icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2 6l8-4 8 4v8l-8 4-8-4V6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>} />
            <KPICard label="Stock bajo" value={String(d.productos.stock_bajo)} sub="requieren reposición"
              color="bg-amber-50 text-amber-600" trend={d.productos.stock_bajo > 0 ? 'down' : 'neutral'}
              icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 3l7.5 13H2.5L10 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>} />
            <KPICard label="Sin stock" value={String(d.productos.sin_stock)} sub="agotados"
              color="bg-red-50 text-red-600" trend={d.productos.sin_stock > 0 ? 'down' : 'neutral'}
              icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>} />
            <KPICard label="Activos" value={String(d.productos.activos)} sub="en catálogo"
              color="bg-green-50 text-green-600"
              icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 10l4 4 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>} />
          </div>

          {d.productos.mas_vendidos.length > 0 && (
            <SectionCard title="Productos más vendidos">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={d.productos.mas_vendidos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip formatter={(v: number) => [v, 'Unidades']} />
                  <Bar dataKey="quantity" fill="#163317" radius={[0, 4, 4, 0]} name="Unidades" />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          )}
        </div>
      )}

      {/* ─── Tab: Recompensas ─── */}
      {tab === 'recompensas' && d && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <KPICard label="Puntos emitidos" value={formatNum(d.recompensas.puntos_emitidos)} sub="en el período"
              color="bg-amber-50 text-amber-600"
              icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2l2.4 4.8L18 8l-4 3.9 1 5.6L10 15l-5 2.5 1-5.6L2 8l5.6-.8L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>} />
            <KPICard label="Puntos canjeados" value={formatNum(d.recompensas.puntos_canjeados)} sub="en el período"
              color="bg-purple-50 text-purple-600"
              icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 10h10M10 5l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>} />
          </div>

          <SectionCard title="Blog">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-black text-sc-forest">{d.blog.publicados}</p>
                <p className="text-sm text-gray-500 mt-1">Artículos publicados</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-black text-sc-forest">{formatNum(d.blog.total_vistas)}</p>
                <p className="text-sm text-gray-500 mt-1">Vistas totales</p>
              </div>
            </div>
          </SectionCard>
        </div>
      )}
    </AdminLayout>
  );
}
