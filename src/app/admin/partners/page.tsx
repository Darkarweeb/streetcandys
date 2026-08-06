'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { useToast } from '@/components/ui/Toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Partner {
  id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface PartnerForm {
  name: string;
  logo_url: string;
  website_url: string;
  display_order: number;
  is_active: boolean;
}

const EMPTY_FORM: PartnerForm = {
  name: '',
  logo_url: '',
  website_url: '',
  display_order: 0,
  is_active: true,
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function RowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3">
        <div className="w-12 h-12 bg-gray-200 rounded-lg" />
      </td>
      <td className="px-4 py-3"><div className="w-32 h-4 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="w-40 h-4 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="w-10 h-4 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="w-16 h-5 bg-gray-200 rounded-full" /></td>
      <td className="px-4 py-3"><div className="w-20 h-7 bg-gray-200 rounded-lg ml-auto" /></td>
    </tr>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function PartnerModal({
  open,
  partner,
  onClose,
  onSave,
}: {
  open: boolean;
  partner: Partner | null;
  onClose: () => void;
  onSave: (form: PartnerForm) => Promise<void>;
}) {
  const [form, setForm] = useState<PartnerForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { error: toastError } = useToast();

  useEffect(() => {
    if (partner) {
      setForm({
        name: partner.name,
        logo_url: partner.logo_url,
        website_url: partner.website_url ?? '',
        display_order: partner.sort_order,
        is_active: partner.is_active,
      });
      setPreviewUrl(partner.logo_url);
    } else {
      setForm(EMPTY_FORM);
      setPreviewUrl('');
    }
  }, [partner, open]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/partners/upload-logo', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.exito) {
        setForm((prev) => ({ ...prev, logo_url: data.datos.url }));
        setPreviewUrl(data.datos.url);
      } else {
        toastError(data.error || 'Error al subir imagen');
      }
    } catch {
      toastError('Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toastError('El nombre es requerido'); return; }
    if (!form.logo_url) { toastError('El logo es requerido'); return; }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sc-forest font-bold text-lg">
            {partner ? 'Editar partner' : 'Nuevo partner'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Logo upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo <span className="text-red-500">*</span>
            </label>
            <div className="flex items-start gap-4">
              <div
                className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 flex-shrink-0 overflow-hidden cursor-pointer hover:border-sc-forest transition-colors"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                aria-label="Subir logo"
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Vista previa del logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-300">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Subiendo...' : 'Subir imagen'}
                </button>
                <p className="text-xs text-gray-400 mt-1.5">PNG, JPG, WebP o SVG. Máx 5MB.</p>
                {form.logo_url && (
                  <input
                    type="text"
                    value={form.logo_url}
                    onChange={(e) => { setForm((p) => ({ ...p, logo_url: e.target.value })); setPreviewUrl(e.target.value); }}
                    placeholder="O pega una URL de imagen"
                    className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-sc-forest/20"
                  />
                )}
                {!form.logo_url && (
                  <input
                    type="text"
                    value={form.logo_url}
                    onChange={(e) => { setForm((p) => ({ ...p, logo_url: e.target.value })); setPreviewUrl(e.target.value); }}
                    placeholder="O pega una URL de imagen"
                    className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-sc-forest/20"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="partner-name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Nombre de la marca <span className="text-red-500">*</span>
            </label>
            <input
              id="partner-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ej: Marca Aliada"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/20"
              required
            />
          </div>

          {/* Website URL */}
          <div>
            <label htmlFor="partner-url" className="block text-sm font-medium text-gray-700 mb-1.5">
              URL del sitio web <span className="text-gray-400 text-xs">(opcional)</span>
            </label>
            <input
              id="partner-url"
              type="url"
              value={form.website_url}
              onChange={(e) => setForm((p) => ({ ...p, website_url: e.target.value }))}
              placeholder="https://ejemplo.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/20"
            />
          </div>

          {/* Display order */}
          <div>
            <label htmlFor="partner-order" className="block text-sm font-medium text-gray-700 mb-1.5">
              Orden de visualización
            </label>
            <input
              id="partner-order"
              type="number"
              min={0}
              value={form.display_order}
              onChange={(e) => setForm((p) => ({ ...p, display_order: Number(e.target.value) }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/20"
            />
            <p className="text-xs text-gray-400 mt-1">Menor número = aparece primero</p>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-700">Visible en homepage</p>
              <p className="text-xs text-gray-400">Mostrar este partner en la página principal</p>
            </div>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.is_active ? 'bg-sc-forest' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={form.is_active}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.is_active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Actions */}
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
              disabled={saving || uploading}
              className="flex-1 px-4 py-2.5 bg-sc-forest text-white rounded-xl text-sm font-bold hover:bg-sc-green transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : partner ? 'Guardar cambios' : 'Crear partner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminPartnersPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && profile && !['admin', 'staff'].includes(profile.role)) {
      router.replace('/');
    }
  }, [authLoading, profile, router]);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/partners');
      const data = await res.json();
      if (data.exito) setPartners(data.datos ?? []);
      else toastError(data.error || 'Error cargando partners');
    } catch {
      toastError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    if (profile && ['admin', 'staff'].includes(profile.role)) {
      fetchPartners();
    }
  }, [profile, fetchPartners]);

  const handleSave = async (form: PartnerForm) => {
    try {
      const url = editing ? `/api/admin/partners/${editing.id}` : '/api/admin/partners';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.exito) {
        success(editing ? 'Partner actualizado' : 'Partner creado');
        setModalOpen(false);
        setEditing(null);
        fetchPartners();
      } else {
        toastError(data.error || 'Error al guardar');
      }
    } catch {
      toastError('Error de conexión');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este partner? Esta acción no se puede deshacer.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/partners/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.exito) {
        success('Partner eliminado');
        setPartners((prev) => prev.filter((p) => p.id !== id));
      } else {
        toastError(data.error || 'Error al eliminar');
      }
    } catch {
      toastError('Error de conexión');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (partner: Partner) => {
    try {
      const res = await fetch(`/api/admin/partners/${partner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !partner.is_active }),
      });
      const data = await res.json();
      if (data.exito) {
        setPartners((prev) =>
          prev.map((p) => (p.id === partner.id ? { ...p, is_active: !p.is_active } : p)),
        );
      } else {
        toastError(data.error || 'Error al actualizar');
      }
    } catch {
      toastError('Error de conexión');
    }
  };

  if (authLoading || !profile) return null;
  if (!['admin', 'staff'].includes(profile.role)) return null;

  return (
    <AdminLayout
      title="Partners / Marcas Aliadas"
      subtitle="Gestiona los logos de marcas aliadas que aparecen en la homepage"
    >
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-500">
            {partners.filter((p) => p.is_active).length} de {partners.length} partners activos
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="inline-flex items-center gap-2 bg-sc-forest text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-sc-green transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Nuevo partner
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Logo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Sitio web</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Orden</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)
              ) : partners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-gray-200">
                        <rect x="4" y="4" width="32" height="32" rx="8" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M14 20h12M20 14v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <p className="text-gray-400 text-sm">No hay partners aún</p>
                      <button
                        onClick={() => { setEditing(null); setModalOpen(true); }}
                        className="text-sc-forest text-sm font-medium hover:underline"
                      >
                        Agregar el primero
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                partners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="w-12 h-12 rounded-lg border border-gray-100 bg-white flex items-center justify-center overflow-hidden">
                        <img
                          src={partner.logo_url}
                          alt={`Logo de ${partner.name}`}
                          className="w-full h-full object-contain p-1"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sc-forest">{partner.name}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {partner.website_url ? (
                        <a
                          href={partner.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sc-periwinkle hover:underline text-xs truncate max-w-[200px] block"
                        >
                          {partner.website_url}
                        </a>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-600 font-mono text-xs">{partner.sort_order}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(partner)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          partner.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' :'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                        title={partner.is_active ? 'Clic para desactivar' : 'Clic para activar'}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${partner.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {partner.is_active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditing(partner); setModalOpen(true); }}
                          className="p-2 text-gray-400 hover:text-sc-forest hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar"
                          aria-label={`Editar ${partner.name}`}
                        >
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                            <path d="M10.5 2.5l2 2-8 8H2.5v-2l8-8z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(partner.id)}
                          disabled={deletingId === partner.id}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Eliminar"
                          aria-label={`Eliminar ${partner.name}`}
                        >
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                            <path d="M2 4h11M5 4V2.5h5V4M6 7v4M9 7v4M3 4l1 9h7l1-9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
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

      {/* Info card */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-blue-400 flex-shrink-0 mt-0.5">
          <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9 8v5M9 6v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="text-blue-700 text-sm">
          Los partners con estado <strong>Activo</strong> aparecerán en la sección &quot;Marcas Aliadas&quot; de la homepage, ordenados por el número de orden asignado.
        </p>
      </div>

      {/* Modal */}
      <PartnerModal
        open={modalOpen}
        partner={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
      />
    </AdminLayout>
  );
}
