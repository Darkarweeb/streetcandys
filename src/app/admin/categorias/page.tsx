'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import type { DbCategory } from '@/lib/products/types';

// ─── Types ───────────────────────────────────────────────────
interface CategoriaForm {
  name: string;
  slug: string;
  description: string;
  parent_id: string;
  icon_name: string;
  is_active: boolean;
  sort_order: string;
}

const FORM_INICIAL: CategoriaForm = {
  name: '',
  slug: '',
  description: '',
  parent_id: '',
  icon_name: '',
  is_active: true,
  sort_order: '0',
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

interface CategoriaConHijos extends DbCategory {
  children?: CategoriaConHijos[];
  product_count?: number;
}

// ─── Skeleton ────────────────────────────────────────────────
function RowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3"><div className="w-28 h-4 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="w-20 h-4 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="w-16 h-4 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="w-12 h-4 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="w-16 h-4 bg-gray-200 rounded" /></td>
    </tr>
  );
}

// ─── Modal ────────────────────────────────────────────────────
interface ModalCategoriaProps {
  open: boolean;
  onClose: () => void;
  onSave: (form: CategoriaForm) => Promise<void>;
  initial?: CategoriaForm;
  categorias: DbCategory[];
  saving: boolean;
  title: string;
  editingId?: string;
}

function ModalCategoria({ open, onClose, onSave, initial, categorias, saving, title, editingId }: ModalCategoriaProps) {
  const [form, setForm] = useState<CategoriaForm>(initial || FORM_INICIAL);
  const [errors, setErrors] = useState<Partial<CategoriaForm>>({});
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(initial || FORM_INICIAL);
      setErrors({});
      setTimeout(() => firstRef.current?.focus(), 50);
    }
  }, [open, initial]);

  const set = (field: keyof CategoriaForm, value: string | boolean) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'name' && !initial) next.slug = slugify(String(value));
      return next;
    });
  };

  const validate = () => {
    const e: Partial<CategoriaForm> = {};
    if (!form.name.trim()) e.name = 'Requerido';
    if (!form.slug.trim()) e.slug = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSave(form);
  };

  // Filter out self and children from parent options
  const parentOptions = categorias.filter((c) => c.id !== editingId);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-sc-forest font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-sc-forest mb-1">Nombre *</label>
              <input ref={firstRef} value={form.name} onChange={(e) => set('name', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
                placeholder="Nombre de la categoría" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-sc-forest mb-1">Slug *</label>
              <input value={form.slug} onChange={(e) => set('slug', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 ${errors.slug ? 'border-red-400' : 'border-gray-300'}`}
                placeholder="slug-categoria" />
              {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-sc-forest mb-1">Categoría padre</label>
              <select value={form.parent_id} onChange={(e) => set('parent_id', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30">
                <option value="">Sin padre (raíz)</option>
                {parentOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-sc-forest mb-1">Ícono</label>
              <input value={form.icon_name} onChange={(e) => set('icon_name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                placeholder="nombre-icono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-sc-forest mb-1">Orden</label>
              <input type="number" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                placeholder="0" min="0" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-sc-forest mb-1">Descripción</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 resize-none"
              rows={2} placeholder="Descripción de la categoría" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-sc-forest" />
            <span className="text-sm text-sc-forest">Categoría activa</span>
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

// ─── Recursive row ────────────────────────────────────────────
interface CatRowProps {
  cat: CategoriaConHijos;
  depth: number;
  onEdit: (c: CategoriaConHijos) => void;
  onDelete: (slug: string) => void;
  deletingSlug: string | null;
}

function CatRow({ cat, depth, onEdit, onDelete, deletingSlug }: CatRowProps) {
  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
            {depth > 0 && <span className="text-gray-300 text-xs">└</span>}
            <span className="text-sc-forest font-medium">{cat.name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-gray-500 text-sm">{cat.slug}</td>
        <td className="px-4 py-3 text-gray-500 text-sm">{cat.product_count ?? '—'}</td>
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {cat.is_active ? 'Activa' : 'Inactiva'}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => onEdit(cat)}
              className="p-1.5 text-gray-500 hover:text-sc-forest hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={`Editar ${cat.name}`}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M10.5 2.5l2 2-8 8H2.5v-2l8-8z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              </svg>
            </button>
            <button onClick={() => onDelete(cat.slug)} disabled={deletingSlug === cat.slug}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              aria-label={`Desactivar ${cat.name}`}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M2 4h11M5 4V2.5h5V4M6 7v4M9 7v4M3 4l.5 9h8l.5-9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
      {cat.children?.map((child) => (
        <CatRow key={child.id} cat={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} deletingSlug={deletingSlug} />
      ))}
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function AdminCategoriasPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [categorias, setCategorias] = useState<CategoriaConHijos[]>([]);
  const [categoriasFlat, setCategoriasFlat] = useState<DbCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<CategoriaConHijos | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && profile && !['admin', 'staff'].includes(profile.role)) {
      router.replace('/');
    }
  }, [authLoading, profile, router]);

  const fetchCategorias = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let res = await fetch('/api/categorias');
      const data = await res.json();
      if (data.exito) {
        setCategorias(data.datos || []);
        const flat: DbCategory[] = [];
        const flatten = (items: CategoriaConHijos[]) => items.forEach((c) => {
          flat.push(c);
          if (c.children) flatten(c.children);
        });
        flatten(data.datos || []);
        setCategoriasFlat(flat);
      } else {
        setError(data.error || 'Error cargando categorías');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile && ['admin', 'staff'].includes(profile.role)) {
      fetchCategorias();
    }
  }, [profile, fetchCategorias]);

  const handleNuevo = () => {
    setEditando(null);
    setSaveError(null);
    setModalOpen(true);
  };

  const handleEditar = (c: CategoriaConHijos) => {
    setEditando(c);
    setSaveError(null);
    setModalOpen(true);
  };

  const handleGuardar = async (form: CategoriaForm) => {
    setSaving(true);
    setSaveError(null);
    try {
      const body = {
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
        parent_id: form.parent_id || null,
        icon_name: form.icon_name || undefined,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
      };

      let res: Response;
      if (editando) {
        res = await fetch(`/api/categorias/${editando.slug}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/categorias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      const data = await res.json();
      if (data.exito) {
        setModalOpen(false);
        fetchCategorias();
      } else {
        setSaveError(data.error || 'Error guardando categoría');
      }
    } catch {
      setSaveError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (slug: string) => {
    if (!confirm('¿Desactivar esta categoría?')) return;
    setDeletingSlug(slug);
    try {
      let res = await fetch(`/api/categorias/${slug}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.exito) fetchCategorias();
      else alert(data.error || 'Error eliminando categoría');
    } catch {
      alert('Error de conexión');
    } finally {
      setDeletingSlug(null);
    }
  };

  // Filter
  const filtradas = busqueda
    ? categoriasFlat.filter((c) => c.name.toLowerCase().includes(busqueda.toLowerCase()) || c.slug.includes(busqueda.toLowerCase()))
    : null;

  const formInicial = editando
    ? {
        name: editando.name,
        slug: editando.slug,
        description: editando.description || '',
        parent_id: editando.parent_id || '',
        icon_name: editando.icon_name || '',
        is_active: editando.is_active,
        sort_order: String(editando.sort_order),
      }
    : undefined;

  if (authLoading || (!profile && !authLoading)) return null;
  if (!['admin', 'staff'].includes(profile?.role || '')) return null;

  return (
    <AdminLayout title="Categorías" subtitle={`${categoriasFlat.length} categorías`}>
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar categorías..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
            aria-label="Buscar categorías"
          />
        </div>
        <button
          onClick={handleNuevo}
          className="bg-sc-forest text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sc-darkforest transition-colors flex items-center gap-2 ml-auto"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Nueva categoría
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-red-500 flex-shrink-0">
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9 5v4M9 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={fetchCategorias} className="ml-auto text-red-600 text-sm underline">Reintentar</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table" aria-label="Tabla de categorías">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Productos</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
              ) : filtradas !== null ? (
                filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400 text-sm">
                      No se encontraron categorías con &quot;{busqueda}&quot;
                    </td>
                  </tr>
                ) : (
                  filtradas.map((c) => (
                    <CatRow key={c.id} cat={c} depth={0} onEdit={handleEditar} onDelete={handleEliminar} deletingSlug={deletingSlug} />
                  ))
                )
              ) : categorias.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-3 text-gray-300">
                      <path d="M4 10h40M4 24h28M4 38h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <p className="text-gray-500 font-medium">No hay categorías</p>
                    <button onClick={handleNuevo} className="mt-4 bg-sc-forest text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sc-darkforest transition-colors">
                      Crear categoría
                    </button>
                  </td>
                </tr>
              ) : (
                categorias.map((c) => (
                  <CatRow key={c.id} cat={c} depth={0} onEdit={handleEditar} onDelete={handleEliminar} deletingSlug={deletingSlug} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <ModalCategoria
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleGuardar}
        initial={formInicial}
        categorias={categoriasFlat}
        saving={saving}
        title={editando ? 'Editar categoría' : 'Nueva categoría'}
        editingId={editando?.id}
      />
      {saveError && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm animate-slide-up z-50">
          {saveError}
        </div>
      )}
    </AdminLayout>
  );
}
