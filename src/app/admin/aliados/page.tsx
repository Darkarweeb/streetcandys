'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/UXHelpers';

// ─── Types ────────────────────────────────────────────────────
interface PartnerLogo {
  id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
  country_code: 'CO' | 'CR';
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface FormState {
  name: string;
  country_code: 'CO' | 'CR';
  website_url: string;
  sort_order: number;
  is_active: boolean;
  logo_url: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  country_code: 'CO',
  website_url: '',
  sort_order: 0,
  is_active: true,
  logo_url: '',
};

// ─── Row Skeleton ─────────────────────────────────────────────
function RowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3"><div className="w-10 h-10 bg-gray-200 rounded-lg" /></td>
      <td className="px-4 py-3"><div className="w-32 h-4 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="w-12 h-5 bg-gray-200 rounded-full" /></td>
      <td className="px-4 py-3"><div className="w-10 h-4 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="w-16 h-5 bg-gray-200 rounded-full" /></td>
      <td className="px-4 py-3"><div className="flex gap-2"><div className="w-8 h-8 bg-gray-200 rounded" /><div className="w-8 h-8 bg-gray-200 rounded" /></div></td>
    </tr>
  );
}

// ─── Logo Upload ──────────────────────────────────────────────
function LogoUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const { error: toastError } = useToast();

  useEffect(() => { setPreview(value); }, [value]);

  const handleFile = async (file: File) => {
    const allowed = ['image/png', 'image/svg+xml', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toastError('Solo se permiten PNG, SVG y WebP');
      return;
    }
    // Local preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/aliados/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.exito) {
        onChange(data.url);
      } else {
        toastError(data.error || 'Error subiendo imagen');
        setPreview(value);
      }
    } catch {
      toastError('Error de conexión');
      setPreview(value);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Logo <span className="text-red-500">*</span>
      </label>
      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center gap-3 cursor-pointer hover:border-sc-forest transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        {preview ? (
          <img
            src={preview}
            alt="Vista previa del logo"
            className="h-16 w-auto max-w-[160px] object-contain"
          />
        ) : (
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-400">
              <path d="M4 16l4-4 4 4 4-6 4 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="2" y="3" width="20" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
        )}
        <p className="text-xs text-gray-500 text-center">
          {uploading ? 'Subiendo...' : 'Arrastra o haz clic para subir'}
        </p>
        <p className="text-xs text-gray-400 text-center">PNG, SVG o WebP · Fondo transparente recomendado</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      {/* Manual URL fallback */}
      <input
        type="url"
        value={value}
        onChange={(e) => { onChange(e.target.value); setPreview(e.target.value); }}
        placeholder="O pega una URL directamente"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
      />
    </div>
  );
}

// ─── Form Modal ───────────────────────────────────────────────
function AliadoFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial: (PartnerLogo & { _new?: boolean }) | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          name: initial.name,
          country_code: initial.country_code,
          website_url: initial.website_url ?? '',
          sort_order: initial.sort_order,
          is_active: initial.is_active,
          logo_url: initial.logo_url,
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  const isNew = !initial || initial._new;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toastError('El nombre es requerido'); return; }
    if (!form.logo_url.trim()) { toastError('El logo es requerido'); return; }

    setSaving(true);
    try {
      const url = isNew ? '/api/admin/aliados' : `/api/admin/aliados/${initial!.id}`;
      const method = isNew ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          website_url: form.website_url.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.exito) {
        toastSuccess(isNew ? 'Aliado creado' : 'Aliado actualizado');
        onSave();
      } else {
        toastError(data.error || 'Error guardando');
      }
    } catch {
      toastError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {isNew ? 'Nuevo Aliado' : 'Editar Aliado'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Logo upload */}
          <LogoUpload
            value={form.logo_url}
            onChange={(url) => setForm((f) => ({ ...f, logo_url: url }))}
          />

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
              placeholder="Nombre del aliado"
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              País <span className="text-red-500">*</span>
            </label>
            <select
              value={form.country_code}
              onChange={(e) => setForm((f) => ({ ...f, country_code: e.target.value as 'CO' | 'CR' }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
            >
              <option value="CO">🇨🇴 Colombia (CO)</option>
              <option value="CR">🇨🇷 Costa Rica (CR)</option>
            </select>
          </div>

          {/* Website URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sitio web <span className="text-gray-400 text-xs">(opcional)</span>
            </label>
            <input
              type="url"
              value={form.website_url}
              onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
              placeholder="https://ejemplo.com"
            />
          </div>

          {/* Sort order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
              min={0}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Activo</span>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.is_active ? 'bg-sc-forest' : 'bg-gray-300'
              }`}
              aria-pressed={form.is_active}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.is_active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-sc-forest text-white rounded-xl text-sm font-bold hover:bg-sc-forest/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function AdminAliadosPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [logos, setLogos] = useState<PartnerLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCountry, setFilterCountry] = useState<string>('');
  const [editItem, setEditItem] = useState<(PartnerLogo & { _new?: boolean }) | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderValue, setOrderValue] = useState<number>(0);

  useEffect(() => {
    if (!authLoading && profile && !['admin', 'staff'].includes(profile.role)) {
      router.replace('/');
    }
  }, [authLoading, profile, router]);

  const fetchLogos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterCountry) params.set('country', filterCountry);
      const res = await fetch(`/api/admin/aliados?${params}`);
      const data = await res.json();
      if (data.exito) setLogos(data.datos ?? []);
      else setError(data.error || 'Error cargando aliados');
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [filterCountry]);

  useEffect(() => {
    if (profile && ['admin', 'staff'].includes(profile.role)) {
      fetchLogos();
    }
  }, [profile, fetchLogos]);

  const handleToggleActive = async (logo: PartnerLogo) => {
    setTogglingId(logo.id);
    try {
      const res = await fetch(`/api/admin/aliados/${logo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !logo.is_active }),
      });
      const data = await res.json();
      if (data.exito) {
        setLogos((prev) => prev.map((l) => l.id === logo.id ? { ...l, is_active: !logo.is_active } : l));
        toastSuccess(logo.is_active ? `"${logo.name}" desactivado` : `"${logo.name}" activado`);
      } else {
        toastError(data.error || 'Error actualizando');
      }
    } catch { toastError('Error de conexión'); }
    setTogglingId(null);
  };

  const handleSaveOrder = async (logo: PartnerLogo) => {
    try {
      const res = await fetch(`/api/admin/aliados/${logo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: orderValue }),
      });
      const data = await res.json();
      if (data.exito) {
        setLogos((prev) => prev.map((l) => l.id === logo.id ? { ...l, sort_order: orderValue } : l));
        toastSuccess('Orden actualizado');
      } else {
        toastError(data.error || 'Error');
      }
    } catch { toastError('Error de conexión'); }
    setEditingOrderId(null);
  };

  const handleDelete = async (logo: PartnerLogo) => {
    const confirmed = await confirm({
      title: `¿Eliminar "${logo.name}"?`,
      message: 'Esta acción no se puede deshacer. El logo será eliminado del almacenamiento.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/aliados/${logo.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.exito) {
        setLogos((prev) => prev.filter((l) => l.id !== logo.id));
        toastSuccess(`"${logo.name}" eliminado`);
      } else {
        toastError(data.error || 'Error eliminando');
      }
    } catch { toastError('Error de conexión'); }
  };

  if (authLoading) {
    return <AdminLayout title="Aliados Estratégicos"><div className="animate-pulse h-64 bg-gray-100 rounded-xl" /></AdminLayout>;
  }
  if (!profile || !['admin', 'staff'].includes(profile.role)) return null;

  return (
    <AdminLayout title="Aliados Estratégicos" subtitle="Gestiona los logos de aliados por país">
      {confirmDialog}

      {showForm && (
        <AliadoFormModal
          initial={editItem}
          onSave={() => { setShowForm(false); setEditItem(null); fetchLogos(); }}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {/* Country filter */}
          <select
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
          >
            <option value="">Todos los países</option>
            <option value="CO">🇨🇴 Colombia</option>
            <option value="CR">🇨🇷 Costa Rica</option>
          </select>
          <span className="text-sm text-gray-500">{logos.length} aliado{logos.length !== 1 ? 's' : ''}</span>
        </div>
        <button
          onClick={() => { setEditItem(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 bg-sc-forest text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-sc-forest/90 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Nuevo Aliado
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Logo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">País</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Orden</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)
              ) : logos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-gray-400 text-sm">
                    No hay aliados{filterCountry ? ` para ${filterCountry}` : ''}. Crea el primero.
                  </td>
                </tr>
              ) : (
                logos.map((logo) => (
                  <tr key={logo.id} className="hover:bg-gray-50 transition-colors">
                    {/* Logo thumbnail */}
                    <td className="px-4 py-3">
                      <div className="w-12 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                        <img
                          src={logo.logo_url}
                          alt={logo.name}
                          className="w-full h-full object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{logo.name}</p>
                      {logo.website_url && (
                        <a
                          href={logo.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-sc-periwinkle hover:underline truncate block max-w-[180px]"
                        >
                          {logo.website_url}
                        </a>
                      )}
                    </td>

                    {/* Country */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        logo.country_code === 'CO' ?'bg-yellow-100 text-yellow-800' :'bg-blue-100 text-blue-800'
                      }`}>
                        {logo.country_code === 'CO' ? '🇨🇴' : '🇨🇷'} {logo.country_code}
                      </span>
                    </td>

                    {/* Sort order (inline edit) */}
                    <td className="px-4 py-3">
                      {editingOrderId === logo.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={orderValue}
                            onChange={(e) => setOrderValue(parseInt(e.target.value) || 0)}
                            className="w-16 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sc-forest/30"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveOrder(logo);
                              if (e.key === 'Escape') setEditingOrderId(null);
                            }}
                          />
                          <button
                            onClick={() => handleSaveOrder(logo)}
                            className="text-green-600 hover:text-green-700"
                            aria-label="Guardar orden"
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => setEditingOrderId(null)}
                            className="text-gray-400 hover:text-gray-600"
                            aria-label="Cancelar"
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingOrderId(logo.id); setOrderValue(logo.sort_order); }}
                          className="text-gray-600 hover:text-sc-forest transition-colors text-sm font-mono"
                          title="Clic para editar orden"
                        >
                          {logo.sort_order}
                        </button>
                      )}
                    </td>

                    {/* Active toggle */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(logo)}
                        disabled={togglingId === logo.id}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                          logo.is_active ? 'bg-sc-forest' : 'bg-gray-300'
                        }`}
                        aria-pressed={logo.is_active}
                        aria-label={logo.is_active ? 'Desactivar' : 'Activar'}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            logo.is_active ? 'translate-x-4.5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditItem(logo); setShowForm(true); }}
                          className="p-2 text-gray-400 hover:text-sc-forest hover:bg-gray-100 rounded-lg transition-colors"
                          aria-label={`Editar ${logo.name}`}
                        >
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                            <path d="M10.5 2.5l2 2-8 8H2.5v-2l8-8z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(logo)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label={`Eliminar ${logo.name}`}
                        >
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                            <path d="M2 4h11M5 4V2h5v2M6 7v5M9 7v5M3 4l1 9h7l1-9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
