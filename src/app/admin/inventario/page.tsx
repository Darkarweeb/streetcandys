'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { createClient } from '@/lib/supabase/client';
import type { DbInventory, DbProduct } from '@/lib/products/types';

// ─── Types ───────────────────────────────────────────────────
interface InventarioItem extends DbInventory {
  product?: Pick<DbProduct, 'id' | 'name' | 'slug' | 'sku' | 'thumbnail_url'>;
}

// ─── Skeleton ────────────────────────────────────────────────
function RowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3"><div className="w-32 h-4 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="w-16 h-4 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="w-16 h-4 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="w-16 h-4 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="w-20 h-4 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="w-16 h-4 bg-gray-200 rounded" /></td>
    </tr>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────
interface EditModalProps {
  item: InventarioItem | null;
  onClose: () => void;
  onSave: (id: string, quantity: number, threshold: number, backorder: boolean) => Promise<void>;
  saving: boolean;
}

function EditModal({ item, onClose, onSave, saving }: EditModalProps) {
  const [quantity, setQuantity] = useState('');
  const [threshold, setThreshold] = useState('');
  const [backorder, setBackorder] = useState(false);

  useEffect(() => {
    if (item) {
      setQuantity(String(item.quantity));
      setThreshold(String(item.low_stock_threshold));
      setBackorder(item.allow_backorder);
    }
  }, [item]);

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(item.id, Number(quantity), Number(threshold), backorder);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-sc-forest font-bold text-lg">Editar inventario</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <p className="text-sc-forest font-medium mb-1">{item.product?.name || 'Producto'}</p>
            {item.product?.sku && <p className="text-gray-400 text-xs">SKU: {item.product.sku}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-sc-forest mb-1">Cantidad disponible</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-sc-forest mb-1">Umbral stock bajo</label>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                min="0"
                required
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={backorder} onChange={(e) => setBackorder(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300" />
            <span className="text-sm text-sc-forest">Permitir pedidos sin stock</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-sc-forest rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-sc-forest text-white rounded-lg py-2.5 text-sm font-medium hover:bg-sc-darkforest transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/></svg>}
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function AdminInventarioPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroStock, setFiltroStock] = useState<'todos' | 'bajo' | 'sin_stock'>('todos');
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 20;

  const [editando, setEditando] = useState<InventarioItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && profile && !['admin', 'staff'].includes(profile.role)) {
      router.replace('/');
    }
  }, [authLoading, profile, router]);

  const fetchInventario = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('inventory')
        .select(`
          *,
          product:products(id, name, slug, sku, thumbnail_url)
        `)
        .order('quantity', { ascending: true });

      if (dbError) throw dbError;
      setInventario((data || []) as InventarioItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando inventario');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (profile && ['admin', 'staff'].includes(profile.role)) {
      fetchInventario();
    }
  }, [profile, fetchInventario]);

  const handleGuardar = async (id: string, quantity: number, threshold: number, backorder: boolean) => {
    setSaving(true);
    setSaveError(null);
    try {
      const { error: dbError } = await supabase
        .from('inventory')
        .update({
          quantity,
          low_stock_threshold: threshold,
          allow_backorder: backorder,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (dbError) throw dbError;
      setEditando(null);
      fetchInventario();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error guardando');
    } finally {
      setSaving(false);
    }
  };

  // Filter
  const filtrado = inventario.filter((item) => {
    const matchBusqueda = !busqueda ||
      item.product?.name?.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.product?.sku?.toLowerCase().includes(busqueda.toLowerCase());

    const disponible = item.quantity - item.reserved_quantity;
    const matchStock =
      filtroStock === 'todos' ? true :
      filtroStock === 'bajo' ? disponible <= item.low_stock_threshold && disponible > 0 :
      disponible <= 0;

    return matchBusqueda && matchStock;
  });

  const totalPaginas = Math.ceil(filtrado.length / POR_PAGINA);
  const paginado = filtrado.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const stockBajo = inventario.filter((i) => {
    const d = i.quantity - i.reserved_quantity;
    return d <= i.low_stock_threshold && d > 0;
  }).length;
  const sinStock = inventario.filter((i) => (i.quantity - i.reserved_quantity) <= 0).length;

  if (authLoading || (!profile && !authLoading)) return null;
  if (!['admin', 'staff'].includes(profile?.role || '')) return null;

  return (
    <AdminLayout title="Inventario" subtitle={`${inventario.length} registros · ${stockBajo} stock bajo · ${sinStock} sin stock`}>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total registros', value: inventario.length, color: 'bg-blue-50 text-blue-600' },
          { label: 'Stock bajo', value: stockBajo, color: 'bg-yellow-50 text-yellow-600' },
          { label: 'Sin stock', value: sinStock, color: 'bg-red-50 text-red-600' },
          { label: 'Con backorder', value: inventario.filter((i) => i.allow_backorder).length, color: 'bg-purple-50 text-purple-600' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4 animate-fade-in">
            <p className={`text-2xl font-bold ${card.color.split(' ')[1]}`}>{card.value}</p>
            <p className="text-gray-500 text-sm mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
            placeholder="Buscar por nombre o SKU..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
            aria-label="Buscar inventario"
          />
        </div>
        <div className="flex gap-2">
          {(['todos', 'bajo', 'sin_stock'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFiltroStock(f); setPagina(1); }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtroStock === f
                  ? 'bg-sc-forest text-white'
                  : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f === 'todos' ? 'Todos' : f === 'bajo' ? 'Stock bajo' : 'Sin stock'}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-red-500 flex-shrink-0">
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9 5v4M9 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={fetchInventario} className="ml-auto text-red-600 text-sm underline">Reintentar</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table" aria-label="Tabla de inventario">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Disponible</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Reservado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Umbral</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
              ) : paginado.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-3 text-gray-300">
                      <rect x="4" y="8" width="40" height="32" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M12 18h24M12 26h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <p className="text-gray-500 font-medium">No hay registros de inventario</p>
                    <p className="text-gray-400 text-sm mt-1">
                      {busqueda || filtroStock !== 'todos' ? 'Ajusta los filtros de búsqueda' : 'El inventario aparecerá aquí cuando se creen productos'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginado.map((item) => {
                  const disponible = item.quantity - item.reserved_quantity;
                  const esBajo = disponible <= item.low_stock_threshold && disponible > 0;
                  const esSinStock = disponible <= 0;
                  return (
                    <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${esSinStock ? 'bg-red-50/30' : esBajo ? 'bg-yellow-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.product?.thumbnail_url ? (
                            <img src={item.product.thumbnail_url} alt={item.product.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 bg-sc-beige rounded-lg flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sc-forest font-medium truncate max-w-[200px]">{item.product?.name || 'Producto eliminado'}</p>
                            {item.product?.sku && <p className="text-gray-400 text-xs">SKU: {item.product.sku}</p>}
                            {item.variant_id && <p className="text-gray-400 text-xs">Variante</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${esSinStock ? 'text-red-600' : esBajo ? 'text-yellow-600' : 'text-sc-forest'}`}>
                          {disponible}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{item.reserved_quantity}</td>
                      <td className="px-4 py-3 text-gray-500">{item.low_stock_threshold}</td>
                      <td className="px-4 py-3">
                        {esSinStock ? (
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-700">Sin stock</span>
                        ) : esBajo ? (
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-yellow-100 text-yellow-700">Stock bajo</span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700">Disponible</span>
                        )}
                        {item.allow_backorder && (
                          <span className="ml-1 text-xs px-2 py-1 rounded-full font-medium bg-purple-100 text-purple-700">Backorder</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button
                            onClick={() => setEditando(item)}
                            className="p-1.5 text-gray-500 hover:text-sc-forest hover:bg-gray-100 rounded-lg transition-colors"
                            aria-label={`Editar inventario de ${item.product?.name}`}
                          >
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                              <path d="M10.5 2.5l2 2-8 8H2.5v-2l8-8z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                            </svg>
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
              Página {pagina} de {totalPaginas} · {filtrado.length} registros
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 transition-colors">
                ← Anterior
              </button>
              <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 transition-colors">
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <EditModal item={editando} onClose={() => setEditando(null)} onSave={handleGuardar} saving={saving} />
      {saveError && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm animate-slide-up z-50">
          {saveError}
        </div>
      )}
    </AdminLayout>
  );
}
