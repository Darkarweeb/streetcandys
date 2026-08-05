'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/UXHelpers';

// ─── Types ───────────────────────────────────────────────────
interface Cupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  minimum_order_amount: number;
  maximum_discount: number | null;
  usage_limit: number | null;
  usage_count: number;
  per_user_limit: number;
  country_code: string | null;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
}

interface CuponForm {
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
  minimum_order_amount: string;
  maximum_discount: string;
  usage_limit: string;
  per_user_limit: string;
  country_code: string;
  is_active: boolean;
  starts_at: string;
  expires_at: string;
}

const FORM_INICIAL: CuponForm = {
  code: '', description: '', discount_type: 'percentage', discount_value: '',
  minimum_order_amount: '0', maximum_discount: '', usage_limit: '',
  per_user_limit: '1', country_code: '', is_active: true,
  starts_at: new Date().toISOString().slice(0, 16), expires_at: '',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function RowSkeleton() {
  return (
    <tr className="animate-pulse">
      {[1,2,3,4,5,6,7].map(i => <td key={i} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-full" /></td>)}
    </tr>
  );
}

// ─── Modal Cupón ──────────────────────────────────────────────
interface ModalCuponProps {
  open: boolean;
  onClose: () => void;
  onSave: (form: CuponForm) => Promise<void>;
  initial?: CuponForm;
  saving: boolean;
  title: string;
}

function ModalCupon({ open, onClose, onSave, initial, saving, title }: ModalCuponProps) {
  const [form, setForm] = useState<CuponForm>(initial || FORM_INICIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof CuponForm, string>>>({});
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setForm(initial || FORM_INICIAL); setErrors({}); setTimeout(() => firstRef.current?.focus(), 50); }
  }, [open, initial]);

  const set = (k: keyof CuponForm, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Partial<Record<keyof CuponForm, string>> = {};
    if (!form.code.trim()) e.code = 'Requerido';
    if (!form.discount_value || isNaN(Number(form.discount_value))) e.discount_value = 'Valor inválido';
    if (form.discount_type === 'percentage' && Number(form.discount_value) > 100) e.discount_value = 'Máximo 100%';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-sc-forest font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (validate()) onSave(form); }} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-sc-forest mb-1">Código *</label>
              <input ref={firstRef} value={form.code} onChange={e => set('code', e.target.value.toUpperCase())}
                className={`w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-sc-forest/30 ${errors.code ? 'border-red-400' : 'border-gray-300'}`}
                placeholder="DESCUENTO20" />
              {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-sc-forest mb-1">Tipo de descuento</label>
              <select value={form.discount_type} onChange={e => set('discount_type', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30">
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Monto fijo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-sc-forest mb-1">Valor del descuento *</label>
              <input type="number" value={form.discount_value} onChange={e => set('discount_value', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 ${errors.discount_value ? 'border-red-400' : 'border-gray-300'}`}
                placeholder={form.discount_type === 'percentage' ? '20' : '10000'} min="0" step="0.01" />
              {errors.discount_value && <p className="text-red-500 text-xs mt-1">{errors.discount_value}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-sc-forest mb-1">Pedido mínimo</label>
              <input type="number" value={form.minimum_order_amount} onChange={e => set('minimum_order_amount', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                placeholder="0" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-sc-forest mb-1">Descuento máximo</label>
              <input type="number" value={form.maximum_discount} onChange={e => set('maximum_discount', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                placeholder="Sin límite" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-sc-forest mb-1">Límite de usos totales</label>
              <input type="number" value={form.usage_limit} onChange={e => set('usage_limit', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                placeholder="Sin límite" min="1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-sc-forest mb-1">Usos por usuario</label>
              <input type="number" value={form.per_user_limit} onChange={e => set('per_user_limit', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                placeholder="1" min="1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-sc-forest mb-1">País</label>
              <select value={form.country_code} onChange={e => set('country_code', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30">
                <option value="">Todos los países</option>
                <option value="CO">Colombia</option>
                <option value="CR">Costa Rica</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-sc-forest mb-1">Fecha inicio</label>
              <input type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-sc-forest mb-1">Fecha expiración</label>
              <input type="datetime-local" value={form.expires_at} onChange={e => set('expires_at', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-sc-forest mb-1">Descripción</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
              placeholder="Descripción interna del cupón" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-sc-forest focus:ring-sc-forest/30" />
            <span className="text-sm text-sc-forest">Cupón activo</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-sc-forest rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
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
export default function AdminCuponesPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const { success: toastSuccess, error: toastError } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [cupones, setCupones] = useState<Cupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Cupon | null>(null);
  const [saving, setSaving] = useState(false);
  const POR_PAGINA = 15;

  useEffect(() => {
    if (!authLoading && profile && !['admin', 'staff'].includes(profile.role)) router.replace('/');
  }, [authLoading, profile, router]);

  const fetchCupones = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let query = supabase.from('coupons').select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
      if (busqueda.trim()) query = query.ilike('code', `%${busqueda}%`);
      if (filtroEstado === 'activo') query = query.eq('is_active', true);
      if (filtroEstado === 'inactivo') query = query.eq('is_active', false);
      const { data, error: err, count } = await query;
      if (err) throw err;
      setCupones(data || []);
      setTotal(count || 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando cupones');
    } finally { setLoading(false); }
  }, [supabase, pagina, busqueda, filtroEstado]);

  useEffect(() => {
    if (profile && ['admin', 'staff'].includes(profile.role)) fetchCupones();
  }, [profile, fetchCupones]);

  const handleSave = async (form: CuponForm) => {
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        minimum_order_amount: Number(form.minimum_order_amount) || 0,
        maximum_discount: form.maximum_discount ? Number(form.maximum_discount) : null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        per_user_limit: Number(form.per_user_limit) || 1,
        country_code: form.country_code || null,
        is_active: form.is_active,
        starts_at: form.starts_at || new Date().toISOString(),
        expires_at: form.expires_at || null,
      };
      if (editando) {
        const { error: err } = await supabase.from('coupons').update(payload).eq('id', editando.id);
        if (err) throw err;
        toastSuccess('✓ Cupón actualizado');
      } else {
        const { error: err } = await supabase.from('coupons').insert(payload);
        if (err) throw err;
        toastSuccess('✓ Cupón creado');
      }
      setModalOpen(false); setEditando(null);
      fetchCupones();
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleEliminar = async (id: string) => {
    const confirmed = await confirm({
      title: '¿Eliminar este cupón?',
      message: 'Esta acción no se puede deshacer. Los usos existentes no se verán afectados.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const { error: err } = await supabase.from('coupons').delete().eq('id', id);
      if (err) throw err;
      toastSuccess('Cupón eliminado');
      fetchCupones();
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  const handleBulkDesactivar = async () => {
    if (!seleccionados.length) return;
    const confirmed = await confirm({
      title: `¿Desactivar ${seleccionados.length} cupón(es)?`,
      message: 'Los cupones seleccionados dejarán de ser válidos.',
      confirmLabel: 'Desactivar',
      cancelLabel: 'Cancelar',
      variant: 'warning',
    });
    if (!confirmed) return;
    setSaving(true);
    try {
      await supabase.from('coupons').update({ is_active: false }).in('id', seleccionados);
      toastSuccess(`${seleccionados.length} cupón(es) desactivado(s)`);
      setSeleccionados([]); fetchCupones();
    } catch { toastError('Error en acción masiva'); }
    finally { setSaving(false); }
  };

  const abrirEditar = (c: Cupon) => {
    setEditando(c);
    setModalOpen(true);
  };

  const formDesdeEdicion = (c: Cupon): CuponForm => ({
    code: c.code, description: c.description || '', discount_type: c.discount_type,
    discount_value: String(c.discount_value), minimum_order_amount: String(c.minimum_order_amount),
    maximum_discount: c.maximum_discount ? String(c.maximum_discount) : '',
    usage_limit: c.usage_limit ? String(c.usage_limit) : '', per_user_limit: String(c.per_user_limit),
    country_code: c.country_code || '', is_active: c.is_active,
    starts_at: c.starts_at?.slice(0, 16) || '', expires_at: c.expires_at?.slice(0, 16) || '',
  });

  const toggleSeleccion = (id: string) => setSeleccionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleTodos = () => setSeleccionados(prev => prev.length === cupones.length ? [] : cupones.map(c => c.id));
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  if (authLoading) return <AdminLayout title="Cupones"><div className="animate-pulse h-64 bg-gray-100 rounded-xl" /></AdminLayout>;
  if (!profile || !['admin', 'staff'].includes(profile.role)) return null;

  return (
    <AdminLayout title="Cupones" subtitle="Gestión de cupones de descuento y uso">
      {confirmDialog}
      {toastError && <div className="fixed top-4 right-4 z-50 bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm animate-slide-up">{toastError}</div>}
      {toastSuccess && <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm animate-slide-up">{toastSuccess}</div>}

      <ModalCupon
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null); }}
        onSave={handleSave}
        initial={editando ? formDesdeEdicion(editando) : undefined}
        saving={saving}
        title={editando ? 'Editar Cupón' : 'Nuevo Cupón'}
      />

      {/* Header actions */}
      <div className="flex flex-wrap gap-3 items-center mb-6">
        <div className="flex-1 min-w-48 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1); }} placeholder="Buscar código..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30" />
        </div>
        <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPagina(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30">
          <option value="">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
        <button onClick={() => { setEditando(null); setModalOpen(true); }}
          className="bg-sc-forest text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sc-darkforest transition-colors flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Nuevo cupón
        </button>
      </div>

      {seleccionados.length > 0 && (
        <div className="bg-sc-forest/5 border border-sc-forest/20 rounded-xl p-3 mb-4 flex items-center gap-3 animate-slide-up">
          <span className="text-sm font-medium text-sc-forest">{seleccionados.length} seleccionado(s)</span>
          <button onClick={handleBulkDesactivar} disabled={saving}
            className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60">
            Desactivar seleccionados
          </button>
          <button onClick={() => setSeleccionados([])} className="text-sm text-gray-500 hover:text-gray-700 ml-auto">Cancelar</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Tabla de cupones">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" checked={seleccionados.length === cupones.length && cupones.length > 0}
                    onChange={toggleTodos} className="w-4 h-4 rounded border-gray-300 text-sc-forest focus:ring-sc-forest/30" aria-label="Seleccionar todos" />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-sc-forest">Código</th>
                <th className="px-4 py-3 text-left font-semibold text-sc-forest">Descuento</th>
                <th className="px-4 py-3 text-right font-semibold text-sc-forest">Usos</th>
                <th className="px-4 py-3 text-left font-semibold text-sc-forest">Vigencia</th>
                <th className="px-4 py-3 text-left font-semibold text-sc-forest">Estado</th>
                <th className="px-4 py-3 text-left font-semibold text-sc-forest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />) :
                error ? <tr><td colSpan={7} className="px-4 py-12 text-center text-red-500">{error}</td></tr> :
                cupones.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-gray-300">
                        <rect x="4" y="14" width="40" height="20" rx="4" stroke="currentColor" strokeWidth="2"/>
                        <path d="M16 24h16M24 18v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <p className="text-gray-500 font-medium">No hay cupones</p>
                      <button onClick={() => setModalOpen(true)} className="text-sc-forest text-sm font-medium hover:underline">Crear primer cupón</button>
                    </div>
                  </td></tr>
                ) : cupones.map(c => {
                  const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
                  const usagePercent = c.usage_limit ? Math.round((c.usage_count / c.usage_limit) * 100) : null;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={seleccionados.includes(c.id)} onChange={() => toggleSeleccion(c.id)}
                          className="w-4 h-4 rounded border-gray-300 text-sc-forest focus:ring-sc-forest/30" aria-label={`Seleccionar ${c.code}`} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono font-semibold text-sc-forest">{c.code}</p>
                        {c.description && <p className="text-gray-500 text-xs">{c.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-sc-forest">
                          {c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${c.discount_value.toLocaleString('es-CO')}`}
                        </span>
                        {c.minimum_order_amount > 0 && <p className="text-gray-500 text-xs">Mín: ${c.minimum_order_amount.toLocaleString('es-CO')}</p>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-medium text-sc-forest">{c.usage_count}{c.usage_limit ? `/${c.usage_limit}` : ''}</p>
                        {usagePercent !== null && (
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1 ml-auto">
                            <div className={`h-full rounded-full ${usagePercent >= 90 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, usagePercent)}%` }} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        <p>Desde: {formatDate(c.starts_at)}</p>
                        {c.expires_at && <p className={isExpired ? 'text-red-500' : ''}>Hasta: {formatDate(c.expires_at)}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active && !isExpired ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${c.is_active && !isExpired ? 'bg-green-500' : 'bg-red-500'}`} />
                          {isExpired ? 'Expirado' : c.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => abrirEditar(c)}
                            className="text-sc-forest hover:bg-sc-forest/10 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors">Editar</button>
                          <button onClick={() => handleEliminar(c.id)}
                            className="text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
        {totalPaginas > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">Mostrando {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, total)} de {total}</p>
            <div className="flex gap-1">
              <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">← Anterior</button>
              <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">Siguiente →</button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
