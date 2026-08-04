'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

// ─── Types ───────────────────────────────────────────────────
interface KPI {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ReactNode;
  color: string;
}

interface OrdenReciente {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  currency_code: string;
  created_at: string;
  profile_id: string | null;
}

interface ProductoInventario {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  low_stock_threshold: number;
}

// ─── Helpers ─────────────────────────────────────────────────
const ESTADO_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  processing: 'Procesando',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};

const ESTADO_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

function formatCurrency(amount: number, currency: string) {
  if (currency === 'COP') return `$${amount.toLocaleString('es-CO')} COP`;
  if (currency === 'CRC') return `₡${amount.toLocaleString('es-CR')} CRC`;
  return `${amount}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Skeleton ────────────────────────────────────────────────
function KPISkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
        <div className="w-16 h-5 bg-gray-200 rounded" />
      </div>
      <div className="w-24 h-7 bg-gray-200 rounded mb-1" />
      <div className="w-32 h-4 bg-gray-200 rounded" />
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-gray-100">
          <div className="w-24 h-4 bg-gray-200 rounded" />
          <div className="flex-1 h-4 bg-gray-200 rounded" />
          <div className="w-20 h-4 bg-gray-200 rounded" />
          <div className="w-16 h-4 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function AdminDashboardPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [ordenes, setOrdenes] = useState<OrdenReciente[]>([]);
  const [productos, setProductos] = useState<{ datos: ProductoInventario[] }>({ datos: [] });
  const [loadingOrdenes, setLoadingOrdenes] = useState(true);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && profile && !['admin', 'staff'].includes(profile.role)) {
      router.replace('/');
    }
  }, [authLoading, profile, router]);

  const fetchOrdenes = useCallback(async () => {
    try {
      setLoadingOrdenes(true);
      const res = await fetch('/api/admin/pedidos?por_pagina=100');
      const data = await res.json();
      if (data.exito) setOrdenes(data.datos?.datos || data.datos || []);
      else setError(data.error || 'Error cargando pedidos');
    } catch {
      setError('Error de conexión');
    } finally {
      setLoadingOrdenes(false);
    }
  }, []);

  const fetchProductos = useCallback(async () => {
    try {
      setLoadingProductos(true);
      const res = await fetch('/api/productos?por_pagina=50');
      const data = await res.json();
      if (data.exito) setProductos(data.datos || { datos: [] });
    } catch {
      // silent
    } finally {
      setLoadingProductos(false);
    }
  }, []);

  useEffect(() => {
    if (profile && ['admin', 'staff'].includes(profile.role)) {
      fetchOrdenes();
      fetchProductos();
    }
  }, [profile, fetchOrdenes, fetchProductos]);

  if (authLoading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => <KPISkeleton key={i} />)}
        </div>
      </AdminLayout>
    );
  }

  // Auth resolved but profile is null — likely an RLS issue or new session
  // Show a retry button instead of a blank/infinite skeleton
  if (!profile) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-gray-300">
            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2"/>
            <path d="M24 14v10l6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p className="text-gray-500 text-sm">Cargando perfil de usuario...</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-sc-forest text-white rounded-lg text-sm hover:bg-sc-forest/90 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </AdminLayout>
    );
  }

  if (!['admin', 'staff'].includes(profile.role)) {
    return null;
  }

  // Compute KPIs from real data
  const totalOrdenes = ordenes.length;
  const totalVentas = ordenes.reduce((sum, o) => sum + (o.total || 0), 0);
  const ordenesPendientes = ordenes.filter((o) => o.status === 'pending').length;
  const ordenesEntregadas = ordenes.filter((o) => o.status === 'delivered').length;

  const productosLista: ProductoInventario[] = Array.isArray(productos)
    ? productos
    : (productos as { datos?: ProductoInventario[] }).datos || [];

  const kpis: KPI[] = [
    {
      label: 'Pedidos Recientes',
      value: String(totalOrdenes),
      change: `${ordenesPendientes} pendientes`,
      positive: ordenesPendientes === 0,
      color: 'bg-blue-50 text-blue-600',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 2h14a1 1 0 011 1v14a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M6 7h8M6 10h8M6 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: 'Ventas Totales',
      value: totalVentas > 0 ? `$${(totalVentas / 1000).toFixed(0)}K` : '$0',
      change: `${ordenesEntregadas} entregados`,
      positive: true,
      color: 'bg-green-50 text-green-600',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2v16M6 6l4-4 4 4M6 14l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      label: 'Productos',
      value: String(productosLista.length),
      change: 'en catálogo',
      positive: true,
      color: 'bg-purple-50 text-purple-600',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M2 6l8-4 8 4v8l-8 4-8-4V6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      label: 'Stock Bajo',
      value: String(productosLista.filter((p) => p.quantity <= p.low_stock_threshold).length),
      change: 'requieren atención',
      positive: false,
      color: 'bg-red-50 text-red-600',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 3l7.5 13H2.5L10 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M10 8v4M10 14v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
  ];

  // Chart data — orders by status
  const statusData = Object.entries(
    ordenes.reduce((acc: Record<string, number>, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({ name: ESTADO_LABELS[status] || status, total: count }));

  // Sales by day (last 7 days from ordenes)
  const salesByDay = (() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('es-CO', { weekday: 'short' });
      days[key] = 0;
    }
    ordenes.forEach((o) => {
      const d = new Date(o.created_at);
      const key = d.toLocaleDateString('es-CO', { weekday: 'short' });
      if (key in days) days[key] += o.total || 0;
    });
    return Object.entries(days).map(([name, total]) => ({ name, total }));
  })();

  return (
    <AdminLayout title="Dashboard" subtitle="Resumen general de la tienda">
      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-red-500 flex-shrink-0">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10 6v4M10 13v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={() => { setError(null); fetchOrdenes(); }} className="ml-auto text-red-600 text-sm underline">
            Reintentar
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-5 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kpi.color}`}>
                {kpi.icon}
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${kpi.positive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {kpi.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-sc-forest">{kpi.value}</p>
            <p className="text-gray-500 text-sm mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sales chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sc-forest font-semibold mb-4">Ventas últimos 7 días</h2>
          {loadingOrdenes ? (
            <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
          ) : salesByDay.every((d) => d.total === 0) ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Sin datos de ventas disponibles
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={salesByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString('es-CO')}`, 'Ventas']} />
                <Line type="monotone" dataKey="total" stroke="#163317" strokeWidth={2} dot={{ fill: '#163317', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Orders by status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sc-forest font-semibold mb-4">Pedidos por estado</h2>
          {loadingOrdenes ? (
            <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
          ) : statusData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Sin pedidos registrados
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#4571CB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sc-forest font-semibold">Pedidos Recientes</h2>
            <Link href="/admin/pedidos" className="text-sc-periwinkle text-sm hover:underline">
              Ver todos
            </Link>
          </div>
          {loadingOrdenes ? (
            <TableSkeleton rows={5} />
          ) : ordenes.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mx-auto mb-2 opacity-40">
                <rect x="4" y="4" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M12 14h16M12 20h16M12 26h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p className="text-sm">No hay pedidos recientes</p>
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-gray-100">
              {ordenes.slice(0, 6).map((orden) => (
                <div key={orden.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sc-forest text-sm font-medium truncate">#{orden.order_number}</p>
                    <p className="text-gray-400 text-xs">{formatDate(orden.created_at)}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${ESTADO_COLORS[orden.status] || 'bg-gray-100 text-gray-600'}`}>
                    {ESTADO_LABELS[orden.status] || orden.status}
                  </span>
                  <span className="text-sc-forest text-sm font-semibold whitespace-nowrap">
                    {formatCurrency(orden.total, orden.currency_code)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low stock alerts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sc-forest font-semibold">Alertas de Stock Bajo</h2>
            <Link href="/admin/inventario" className="text-sc-periwinkle text-sm hover:underline">
              Ver inventario
            </Link>
          </div>
          {loadingProductos ? (
            <TableSkeleton rows={5} />
          ) : productosLista.filter((p) => p.quantity <= p.low_stock_threshold).length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mx-auto mb-2 opacity-40">
                <path d="M20 6l15 26H5L20 6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M20 16v8M20 27v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p className="text-sm">Todo el inventario está en orden</p>
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-gray-100">
              {productosLista
                .filter((p) => p.quantity <= p.low_stock_threshold)
                .slice(0, 6)
                .map((p) => (
                  <div key={p.id} className="py-3 flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-red-500">
                        <path d="M8 2l6 11H2L8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                        <path d="M8 6v3M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sc-forest text-sm font-medium truncate">{p.name}</p>
                      {p.sku && <p className="text-gray-400 text-xs">SKU: {p.sku}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-red-600 text-sm font-bold">{p.quantity} uds.</p>
                      <p className="text-gray-400 text-xs">mín. {p.low_stock_threshold}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
