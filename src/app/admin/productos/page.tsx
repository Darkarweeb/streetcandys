'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import type { ProductSummary, DbCategory } from '@/lib/products/types';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/UXHelpers';

// ─── Skeleton ────────────────────────────────────────────────
function RowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3"><div className="w-4 h-4 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-200 rounded-lg flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="w-32 h-3.5 bg-gray-200 rounded" />
            <div className="w-20 h-3 bg-gray-100 rounded" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><div className="w-20 h-3.5 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="w-16 h-3.5 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="w-16 h-5 bg-gray-200 rounded-full" /></td>
      <td className="px-4 py-3"><div className="w-20 h-3.5 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="w-16 h-7 bg-gray-200 rounded-lg ml-auto" /></td>
    </tr>
  );
}

// ─── Low Stock Alert Banner ───────────────────────────────────
interface LowStockItem {
  id: string;
  name: string;
  slug: string;
  quantity: number;
  threshold: number;
}

function LowStockBanner({ items }: { items: LowStockItem[] }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || items.length === 0) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-amber-500 flex-shrink-0 mt-0.5">
        <path d="M9 2l7 14H2L9 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M9 7v4M9 12.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-amber-800 font-medium text-sm">
          {items.length} producto{items.length > 1 ? 's' : ''} con stock bajo
        </p>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {items.slice(0, 5).map((item) => (
            <Link
              key={item.id}
              href={`/admin/productos/${item.id}`}
              className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full hover:bg-amber-200 transition-colors"
            >
              {item.name} ({item.quantity} uds.)
            </Link>
          ))}
          {items.length > 5 && (
            <span className="text-xs text-amber-600">+{items.length - 5} más</span>
          )}
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-400 hover:text-amber-600 transition-colors flex-shrink-0"
        aria-label="Cerrar alerta"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function AdminProductosPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [productos, setProductos] = useState<ProductSummary[]>([]);
  const [categorias, setCategorias] = useState<DbCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const POR_PAGINA = 20;

  // Filters
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [ordenar, setOrdenar] = useState('mas_nuevo');

  // Selection
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  // Actions
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Low stock
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);

  useEffect(() => {
    if (!authLoading && profile && !['admin', 'staff'].includes(profile.role)) {
      router.replace('/');
    }
  }, [authLoading, profile, router]);

  const fetchCategorias = useCallback(async () => {
    try {
      const res = await fetch('/api/categorias');
      const data = await res.json();
      if (data.exito) {
        const flat: DbCategory[] = [];
        const flatten = (items: DbCategory[]) => items.forEach((c) => {
          flat.push(c);
          if ((c as DbCategory & { children?: DbCategory[] }).children) {
            flatten((c as DbCategory & { children?: DbCategory[] }).children!);
          }
        });
        flatten(data.datos || []);
        setCategorias(flat);
      }
    } catch { /* silent */ }
  }, []);

  const fetchProductos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        pagina: String(pagina),
        por_pagina: String(POR_PAGINA),
        ordenar,
      });
      if (busqueda) params.set('busqueda', busqueda);
      if (filtroCategoria) params.set('categoria_id', filtroCategoria);
      if (filtroActivo !== '') params.set('activo', filtroActivo);

      const res = await fetch(`/api/productos?${params}`);
      const data = await res.json();
      if (data.exito) {
        const lista = Array.isArray(data.datos) ? data.datos : (data.datos?.datos || []);
        setProductos(lista);
        const pag = data.paginacion || data.datos?.paginacion;
        if (pag) {
          setTotalPaginas(pag.total_paginas || 1);
          setTotal(pag.total || lista.length);
        } else {
          setTotal(lista.length);
        }
      } else {
        setError(data.error || 'Error cargando productos');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [pagina, busqueda, filtroCategoria, filtroActivo, ordenar]);

  useEffect(() => {
    if (profile && ['admin', 'staff'].includes(profile.role)) {
      fetchCategorias();
    }
  }, [profile, fetchCategorias]);

  useEffect(() => {
    if (profile && ['admin', 'staff'].includes(profile.role)) {
      fetchProductos();
    }
  }, [profile, fetchProductos]);

  // Fetch low stock items on mount
  useEffect(() => {
    if (!profile || !['admin', 'staff'].includes(profile.role)) return;
    const fetchLowStock = async () => {
      try {
        const res = await fetch('/api/productos?por_pagina=100&en_stock=true');
        const data = await res.json();
        if (data.exito) {
          const lista = Array.isArray(data.datos) ? data.datos : (data.datos?.datos || []);
          const lowStock = lista
            .filter((p: ProductSummary) =>
              p.inventory_status?.is_low_stock && !p.inventory_status?.is_in_stock === false
            )
            .map((p: ProductSummary) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              quantity: p.inventory_status?.available_quantity ?? 0,
              threshold: 5,
            }));
          setLowStockItems(lowStock);
        }
      } catch { /* silent */ }
    };
    fetchLowStock();
  }, [profile]);

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    if (seleccionados.size === productos.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(productos.map((p) => p.id)));
    }
  };

  const handleTogglePublish = async (p: ProductSummary) => {
    setTogglingId(p.id);
    try {
      const res = await fetch(`/api/productos/${p.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !p.is_active }),
      });
      const data = await res.json();
      if (data.exito) {
        setProductos((prev) =>
          prev.map((item) => item.id === p.id ? { ...item, is_active: !p.is_active } : item)
        );
        toastSuccess(p.is_active ? `"${p.name}" despublicado` : `"${p.name}" publicado`);
      } else {
        toastError(data.error || 'Error actualizando producto');
      }
    } catch { toastError('Error de conexión'); }
    setTogglingId(null);
  };

  const handleEliminar = async (p: ProductSummary) => {
    const confirmed = await confirm({
      title: `¿Desactivar "${p.name}"?`,
      message: 'El producto dejará de aparecer en la tienda. Puedes volver a publicarlo en cualquier momento.',
      confirmLabel: 'Desactivar',
      cancelLabel: 'Cancelar',
      variant: 'warning',
    });
    if (!confirmed) return;
    setDeletingId(p.id);
    try {
      const res = await fetch(`/api/productos/${p.slug}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.exito) {
        setProductos((prev) => prev.filter((item) => item.id !== p.id));
        setTotal((t) => t - 1);
        toastSuccess(`"${p.name}" desactivado`);
      } else {
        toastError(data.error || 'Error eliminando producto');
      }
    } catch {
      toastError('Error de conexión');
    }
    setDeletingId(null);
  };

  const handleBulkDesactivar = async () => {
    const confirmed = await confirm({
      title: `¿Desactivar ${seleccionados.size} productos?`,
      message: 'Los productos seleccionados dejarán de aparecer en la tienda.',
      confirmLabel: 'Desactivar',
      cancelLabel: 'Cancelar',
      variant: 'warning',
    });
    if (!confirmed) return;
    const slugs = productos.filter((p) => seleccionados.has(p.id)).map((p) => p.slug);
    for (const slug of slugs) {
      await fetch(`/api/productos/${slug}`, { method: 'DELETE' });
    }
    setSeleccionados(new Set());
    fetchProductos();
    toastSuccess(`${slugs.length} productos desactivados`);
  };

  const handleBulkActivar = async () => {
    const confirmed = await confirm({
      title: `¿Publicar ${seleccionados.size} productos?`,
      message: 'Los productos seleccionados serán visibles en la tienda.',
      confirmLabel: 'Publicar',
      cancelLabel: 'Cancelar',
      variant: 'default',
    });
    if (!confirmed) return;
    const slugs = productos.filter((p) => seleccionados.has(p.id)).map((p) => p.slug);
    for (const slug of slugs) {
      await fetch(`/api/productos/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      });
    }
    setSeleccionados(new Set());
    fetchProductos();
    toastSuccess(`${slugs.length} productos publicados`);
  };

  if (authLoading || (!profile && !authLoading)) return null;
  if (!['admin', 'staff'].includes(profile?.role || '')) return null;

  return (
    <AdminLayout title="Productos" subtitle={`${total} productos en catálogo`}>
      {confirmDialog}
      <div className="space-y-4">
        {/* Low stock alerts */}
        <LowStockBanner items={lowStockItems} />

        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
              placeholder="Buscar productos..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
              aria-label="Buscar productos"
            />
          </div>

          {/* Category filter */}
          <select
            value={filtroCategoria}
            onChange={(e) => { setFiltroCategoria(e.target.value); setPagina(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Active filter */}
          <select
            value={filtroActivo}
            onChange={(e) => { setFiltroActivo(e.target.value); setPagina(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            <option value="true">Publicados</option>
            <option value="false">Borradores</option>
          </select>

          {/* Sort */}
          <select
            value={ordenar}
            onChange={(e) => { setOrdenar(e.target.value); setPagina(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
            aria-label="Ordenar por"
          >
            <option value="mas_nuevo">Más nuevo</option>
            <option value="nombre">Nombre A-Z</option>
            <option value="precio_asc">Precio ↑</option>
            <option value="precio_desc">Precio ↓</option>
            <option value="destacado">Destacados</option>
          </select>

          <Link
            href="/admin/productos/nuevo"
            className="bg-sc-forest text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sc-darkforest transition-colors flex items-center gap-2 ml-auto"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Nuevo producto
          </Link>
        </div>

        {/* Bulk actions */}
        {seleccionados.size > 0 && (
          <div className="bg-sc-periwinkle/10 border border-sc-periwinkle/30 rounded-xl p-3 flex items-center gap-3 flex-wrap">
            <span className="text-sc-periwinkle text-sm font-medium">{seleccionados.size} seleccionados</span>
            <button onClick={handleBulkActivar} className="text-green-600 text-sm hover:underline">
              Publicar seleccionados
            </button>
            <button onClick={handleBulkDesactivar} className="text-red-600 text-sm hover:underline">
              Despublicar seleccionados
            </button>
            <button onClick={() => setSeleccionados(new Set())} className="ml-auto text-gray-500 text-sm hover:underline">
              Cancelar
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-red-500 flex-shrink-0">
              <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9 5v4M9 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p className="text-red-700 text-sm">{error}</p>
            <button onClick={fetchProductos} className="ml-auto text-red-600 text-sm underline">Reintentar</button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table" aria-label="Tabla de productos">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={seleccionados.size === productos.length && productos.length > 0}
                      onChange={toggleTodos}
                      className="w-4 h-4 rounded border-gray-300"
                      aria-label="Seleccionar todos"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Categoría</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Precio</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
                ) : productos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-3 text-gray-300">
                        <path d="M4 12l20-8 20 8v24l-20 8-20-8V12z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                        <path d="M24 4v40M4 12l20 8 20-8" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                      <p className="text-gray-500 font-medium">No se encontraron productos</p>
                      <p className="text-gray-400 text-sm mt-1">Ajusta los filtros o crea un nuevo producto</p>
                      <Link
                        href="/admin/productos/nuevo"
                        className="mt-4 inline-block bg-sc-forest text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sc-darkforest transition-colors"
                      >
                        Crear producto
                      </Link>
                    </td>
                  </tr>
                ) : (
                  productos.map((p) => {
                    const isLowStock = p.inventory_status?.is_low_stock;
                    const isOutOfStock = !p.inventory_status?.is_in_stock && p.inventory_status?.available_quantity === 0;
                    return (
                      <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${seleccionados.has(p.id) ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={seleccionados.has(p.id)}
                            onChange={() => toggleSeleccion(p.id)}
                            className="w-4 h-4 rounded border-gray-300"
                            aria-label={`Seleccionar ${p.name}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {p.thumbnail_url ? (
                              <img src={p.thumbnail_url} alt={p.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-9 h-9 bg-sc-beige rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-sc-muted">
                                  <path d="M2 4l6-2 6 2v8l-6 2-6-2V4z" stroke="currentColor" strokeWidth="1.2"/>
                                </svg>
                              </div>
                            )}
                            <div className="min-w-0">
                              <Link
                                href={`/admin/productos/${p.id}`}
                                className="text-sc-forest font-medium truncate max-w-[180px] block hover:underline"
                              >
                                {p.name}
                              </Link>
                              <p className="text-gray-400 text-xs truncate">{p.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{p.category?.name || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-sc-forest font-semibold">${p.base_price.toLocaleString('es-CO')}</span>
                          {p.compare_at_price && (
                            <span className="text-gray-400 text-xs line-through ml-1">${p.compare_at_price.toLocaleString('es-CO')}</span>
                          )}
                          {p.price_crc && (
                            <p className="text-gray-400 text-xs">₡{p.price_crc.toLocaleString('es-CR')}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {p.is_active ? 'Publicado' : 'Borrador'}
                            </span>
                            {p.is_featured && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700 w-fit">Destacado</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isOutOfStock ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Sin stock</span>
                          ) : isLowStock ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium flex items-center gap-1 w-fit">
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1l4 8H1L5 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                              Stock bajo
                            </span>
                          ) : p.inventory_status ? (
                            <span className="text-xs text-gray-500">{p.inventory_status.available_quantity} uds.</span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {/* Toggle publish */}
                            <button
                              onClick={() => handleTogglePublish(p)}
                              disabled={togglingId === p.id}
                              className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                                p.is_active
                                  ? 'text-green-600 hover:bg-green-50' :'text-gray-400 hover:bg-gray-100'
                              }`}
                              title={p.is_active ? 'Despublicar' : 'Publicar'}
                              aria-label={p.is_active ? `Despublicar ${p.name}` : `Publicar ${p.name}`}
                            >
                              {togglingId === p.id ? (
                                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/></svg>
                              ) : (
                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                                  {p.is_active ? (
                                    <><circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/><path d="M5 7.5l2 2 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></>
                                  ) : (
                                    <><circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/><path d="M5.5 5.5l4 4M9.5 5.5l-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></>
                                  )}
                                </svg>
                              )}
                            </button>
                            {/* Edit */}
                            <Link
                              href={`/admin/productos/${p.id}`}
                              className="p-1.5 text-gray-500 hover:text-sc-forest hover:bg-gray-100 rounded-lg transition-colors"
                              aria-label={`Editar ${p.name}`}
                            >
                              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                                <path d="M10.5 2.5l2 2-8 8H2.5v-2l8-8z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                              </svg>
                            </Link>
                            {/* Delete */}
                            <button
                              onClick={() => handleEliminar(p)}
                              disabled={deletingId === p.id}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              aria-label={`Eliminar ${p.name}`}
                            >
                              {deletingId === p.id ? (
                                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/></svg>
                              ) : (
                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                                  <path d="M2 4h11M5 4V2.5h5V4M6 7v4M9 7v4M3 4l.5 9h8l.5-9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPaginas > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <p className="text-gray-500 text-sm">
                Página {pagina} de {totalPaginas} · {total} productos
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  aria-label="Página anterior"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  aria-label="Página siguiente"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
