'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import type { DbCategory } from '@/lib/products/types';

// ─── Types ────────────────────────────────────────────────────
interface ProductImage {
  url: string;
  alt: string;
  position: number;
}

interface VariantForm {
  id?: string;
  variant_type: 'size' | 'flavor' | 'strength' | 'format';
  name: string;
  value: string;
  sku: string;
  price_modifier: string;
  is_active: boolean;
  quantity: string;
  low_stock_threshold: string;
}

interface InventoryData {
  quantity: number;
  low_stock_threshold: number;
  allow_backorder: boolean;
}

interface ProductFormData {
  name: string;
  slug: string;
  short_description: string;
  description: string;
  ingredients: string;
  usage_instructions: string;
  base_price: string;
  compare_at_price: string;
  price_crc: string;
  category_id: string;
  sku: string;
  brand: string;
  is_active: boolean;
  is_featured: boolean;
  requires_age_verification: boolean;
  tags: string;
  effects: string;
  intensity_level: string;
  origin_country: string;
  weight_grams: string;
  meta_title: string;
  meta_description: string;
  coa_url: string;
}

const FORM_INICIAL: ProductFormData = {
  name: '', slug: '', short_description: '', description: '',
  ingredients: '', usage_instructions: '',
  base_price: '', compare_at_price: '', price_crc: '',
  category_id: '', sku: '', brand: '',
  is_active: true, is_featured: false, requires_age_verification: true,
  tags: '', effects: '', intensity_level: '', origin_country: 'CO',
  weight_grams: '', meta_title: '', meta_description: '', coa_url: '',
};

function slugify(text: string) {
  return text.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Image Upload Component ───────────────────────────────────
function ImageManager({
  images,
  onChange,
}: {
  images: ProductImage[];
  onChange: (imgs: ProductImage[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);

    const newImages: ProductImage[] = [...images];
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        let res = await fetch('/api/admin/productos/upload-image', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.exito) {
          newImages.push({
            url: data.datos.url,
            alt: file.name.replace(/\.[^.]+$/, ''),
            position: newImages.length,
          });
        } else {
          setUploadError(data.error || 'Error al subir imagen');
        }
      } catch {
        setUploadError('Error de conexión al subir imagen');
      }
    }
    onChange(newImages);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleRemove = async (idx: number) => {
    const img = images[idx];
    // Try to delete from storage
    if (img.url.includes('product-images')) {
      try {
        await fetch('/api/admin/productos/delete-image', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: img.url }),
        });
      } catch { /* silent */ }
    }
    const updated = images.filter((_, i) => i !== idx).map((img, i) => ({ ...img, position: i }));
    onChange(updated);
  };

  const setFeatured = (idx: number) => {
    const updated = images.map((img, i) => ({ ...img, position: i === idx ? 0 : img.position + 1 }));
    updated.sort((a, b) => a.position - b.position);
    onChange(updated);
  };

  const updateAlt = (idx: number, alt: string) => {
    const updated = images.map((img, i) => i === idx ? { ...img, alt } : img);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="block text-sm font-medium text-sc-forest">Imágenes del producto</label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-xs bg-sc-forest text-white px-3 py-1.5 rounded-lg hover:bg-sc-darkforest transition-colors disabled:opacity-60 flex items-center gap-1.5"
        >
          {uploading ? (
            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          )}
          {uploading ? 'Subiendo...' : 'Subir imágenes'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {uploadError && (
        <p className="text-red-500 text-xs">{uploadError}</p>
      )}

      {images.length === 0 ? (
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-sc-forest/40 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mx-auto mb-2 text-gray-300">
            <rect x="2" y="6" width="28" height="20" rx="3" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="11" cy="13" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M2 22l7-5 5 4 5-6 11 8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          <p className="text-gray-400 text-sm">Haz clic para subir imágenes</p>
          <p className="text-gray-300 text-xs mt-1">JPG, PNG, WebP · Máx. 5MB por imagen</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((img, idx) => (
            <div key={idx} className={`relative group rounded-xl overflow-hidden border-2 transition-colors ${idx === 0 ? 'border-sc-forest' : 'border-gray-200'}`}>
              <img src={img.url} alt={img.alt} className="w-full aspect-square object-cover" />
              {idx === 0 && (
                <span className="absolute top-1 left-1 bg-sc-forest text-white text-xs px-1.5 py-0.5 rounded font-medium">Principal</span>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                {idx !== 0 && (
                  <button
                    type="button"
                    onClick={() => setFeatured(idx)}
                    className="text-white text-xs bg-sc-forest/80 px-2 py-1 rounded hover:bg-sc-forest transition-colors w-full text-center"
                  >
                    Hacer principal
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="text-white text-xs bg-red-600/80 px-2 py-1 rounded hover:bg-red-600 transition-colors w-full text-center"
                >
                  Eliminar
                </button>
              </div>
              <input
                type="text"
                value={img.alt}
                onChange={(e) => updateAlt(idx, e.target.value)}
                placeholder="Texto alternativo"
                className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 outline-none"
              />
            </div>
          ))}
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl aspect-square flex items-center justify-center cursor-pointer hover:border-sc-forest/40 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-300">
              <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Variant Manager ──────────────────────────────────────────
function VariantManager({
  productId,
  variants,
  onRefresh,
}: {
  productId: string;
  variants: VariantForm[];
  onRefresh: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newVariant, setNewVariant] = useState<VariantForm>({
    variant_type: 'size', name: '', value: '', sku: '',
    price_modifier: '0', is_active: true, quantity: '0', low_stock_threshold: '5',
  });

  const handleAdd = async () => {
    if (!newVariant.name || !newVariant.value) return;
    setSaving(true);
    try {
      let res = await fetch(`/api/admin/productos/${productId}/variantes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newVariant,
          price_modifier: Number(newVariant.price_modifier) || 0,
          quantity: Number(newVariant.quantity) || 0,
          low_stock_threshold: Number(newVariant.low_stock_threshold) || 5,
        }),
      });
      const data = await res.json();
      if (data.exito) {
        setAdding(false);
        setNewVariant({ variant_type: 'size', name: '', value: '', sku: '', price_modifier: '0', is_active: true, quantity: '0', low_stock_threshold: '5' });
        onRefresh();
      }
    } catch { /* silent */ }
    setSaving(false);
  };

  const handleDelete = async (variantId: string) => {
    if (!confirm('¿Eliminar esta variante?')) return;
    await fetch(`/api/admin/productos/${productId}/variantes/${variantId}`, { method: 'DELETE' });
    onRefresh();
  };

  const handleToggleActive = async (variantId: string, current: boolean) => {
    await fetch(`/api/admin/productos/${productId}/variantes/${variantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    });
    onRefresh();
  };

  const variantTypeLabels: Record<string, string> = {
    size: 'Tamaño', flavor: 'Sabor', strength: 'Potencia', format: 'Formato',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-sc-forest">Variantes del producto</label>
        <button
          type="button"
          onClick={() => setAdding(!adding)}
          className="text-xs bg-sc-forest text-white px-3 py-1.5 rounded-lg hover:bg-sc-darkforest transition-colors flex items-center gap-1.5"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Agregar variante
        </button>
      </div>

      {variants.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Tipo</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Nombre</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Valor</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">SKU</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">+Precio</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Estado</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {variants.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-600">{variantTypeLabels[v.variant_type] || v.variant_type}</td>
                  <td className="px-3 py-2 font-medium text-sc-forest">{v.name}</td>
                  <td className="px-3 py-2 text-gray-600">{v.value}</td>
                  <td className="px-3 py-2 text-gray-400 text-xs">{v.sku || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{v.price_modifier > 0 ? `+$${v.price_modifier}` : v.price_modifier < 0 ? `-$${Math.abs(Number(v.price_modifier))}` : '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => v.id && handleToggleActive(v.id, v.is_active)}
                        className="p-1 text-gray-400 hover:text-sc-forest rounded transition-colors"
                        title={v.is_active ? 'Desactivar' : 'Activar'}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                          {v.is_active && <circle cx="7" cy="7" r="2.5" fill="currentColor"/>}
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => v.id && handleDelete(v.id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                        title="Eliminar"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2 3.5h10M4.5 3.5V2.5h5v1M5 6v4M9 6v4M3 3.5l.5 8h7l.5-8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <div className="border border-sc-forest/20 rounded-xl p-4 bg-sc-beige/20 space-y-3">
          <p className="text-sm font-medium text-sc-forest">Nueva variante</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tipo</label>
              <select
                value={newVariant.variant_type}
                onChange={(e) => setNewVariant((p) => ({ ...p, variant_type: e.target.value as VariantForm['variant_type'] }))}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
              >
                <option value="size">Tamaño</option>
                <option value="flavor">Sabor</option>
                <option value="strength">Potencia</option>
                <option value="format">Formato</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Nombre *</label>
              <input
                value={newVariant.name}
                onChange={(e) => setNewVariant((p) => ({ ...p, name: e.target.value }))}
                placeholder="ej. Tamaño"
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Valor *</label>
              <input
                value={newVariant.value}
                onChange={(e) => setNewVariant((p) => ({ ...p, value: e.target.value }))}
                placeholder="ej. 3.5g"
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">SKU</label>
              <input
                value={newVariant.sku}
                onChange={(e) => setNewVariant((p) => ({ ...p, sku: e.target.value }))}
                placeholder="SKU-001-S"
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Modificador precio</label>
              <input
                type="number"
                value={newVariant.price_modifier}
                onChange={(e) => setNewVariant((p) => ({ ...p, price_modifier: e.target.value }))}
                placeholder="0"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Stock inicial</label>
              <input
                type="number"
                value={newVariant.quantity}
                onChange={(e) => setNewVariant((p) => ({ ...p, quantity: e.target.value }))}
                placeholder="0"
                min="0"
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="flex-1 border border-gray-300 text-sc-forest rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !newVariant.name || !newVariant.value}
              className="flex-1 bg-sc-forest text-white rounded-lg py-2 text-sm hover:bg-sc-darkforest transition-colors disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Agregar'}
            </button>
          </div>
        </div>
      )}

      {variants.length === 0 && !adding && (
        <p className="text-gray-400 text-sm text-center py-4 border border-dashed border-gray-200 rounded-xl">
          Sin variantes. Agrega tamaños, sabores u otras opciones.
        </p>
      )}
    </div>
  );
}

// ─── Inventory Panel ──────────────────────────────────────────
function InventoryPanel({
  productId,
  inventory,
  onSaved,
}: {
  productId: string;
  inventory: InventoryData | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    quantity: String(inventory?.quantity ?? 0),
    low_stock_threshold: String(inventory?.low_stock_threshold ?? 5),
    allow_backorder: inventory?.allow_backorder ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qty = Number(form.quantity);
  const threshold = Number(form.low_stock_threshold);
  const isLowStock = qty > 0 && qty <= threshold;
  const isOutOfStock = qty === 0;

  const handleSave = async () => {
    if (isNaN(qty) || qty < 0) { setError('Cantidad inválida'); return; }
    setSaving(true);
    setError(null);
    try {
      let res = await fetch(`/api/admin/productos/${productId}/inventario`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: qty,
          low_stock_threshold: threshold || 5,
          allow_backorder: form.allow_backorder,
        }),
      });
      const data = await res.json();
      if (data.exito) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        onSaved();
      } else {
        setError(data.error || 'Error guardando inventario');
      }
    } catch {
      setError('Error de conexión');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-sc-forest mb-1">Cantidad en stock</label>
          <input
            type="number"
            value={form.quantity}
            onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
            min="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-sc-forest mb-1">Umbral stock bajo</label>
          <input
            type="number"
            value={form.low_stock_threshold}
            onChange={(e) => setForm((p) => ({ ...p, low_stock_threshold: e.target.value }))}
            min="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
          />
        </div>
      </div>

      {/* Stock status badge */}
      <div className="flex items-center gap-3">
        {isOutOfStock ? (
          <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-red-100 text-red-700 font-medium">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2"/><path d="M3 3l4 4M7 3L3 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            Sin stock
          </span>
        ) : isLowStock ? (
          <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 font-medium">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1l4 8H1L5 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M5 4v2M5 7.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            Stock bajo ({qty} unidades)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-green-100 text-green-700 font-medium">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2"/><path d="M3 5l1.5 1.5L7 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            En stock ({qty} unidades)
          </span>
        )}

        <label className="flex items-center gap-2 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={form.allow_backorder}
            onChange={(e) => setForm((p) => ({ ...p, allow_backorder: e.target.checked }))}
            className="w-4 h-4 rounded border-gray-300 text-sc-forest"
          />
          <span className="text-sm text-sc-forest">Permitir pedidos sin stock</span>
        </label>
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="bg-sc-forest text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sc-darkforest transition-colors disabled:opacity-60 flex items-center gap-2"
      >
        {saving && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/></svg>}
        {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Actualizar inventario'}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function AdminProductoEditPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;
  const isNew = productId === 'nuevo';

  const [form, setForm] = useState<ProductFormData>(FORM_INICIAL);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const [variants, setVariants] = useState<VariantForm[]>([]);
  const [categorias, setCategorias] = useState<DbCategory[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'imagenes' | 'inventario' | 'variantes' | 'seo'>('general');

  useEffect(() => {
    if (!authLoading && profile && !['admin', 'staff'].includes(profile.role)) {
      router.replace('/');
    }
  }, [authLoading, profile, router]);

  const fetchCategorias = useCallback(async () => {
    try {
      let res = await fetch('/api/categorias');
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

  const fetchProduct = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      let res = await fetch(`/api/admin/productos/${productId}`);
      const data = await res.json();
      if (data.exito && data.datos) {
        const p = data.datos;
        setForm({
          name: p.name || '',
          slug: p.slug || '',
          short_description: p.short_description || '',
          description: p.description || '',
          ingredients: p.ingredients || '',
          usage_instructions: p.usage_instructions || '',
          base_price: String(p.base_price || ''),
          compare_at_price: p.compare_at_price ? String(p.compare_at_price) : '',
          price_crc: p.price_crc != null ? String(p.price_crc) : '',
          category_id: p.category_id || '',
          sku: p.sku || '',
          brand: p.brand || '',
          is_active: p.is_active ?? true,
          is_featured: p.is_featured ?? false,
          requires_age_verification: p.requires_age_verification ?? true,
          tags: (p.tags || []).join(', '),
          effects: (p.effects || []).join(', '),
          intensity_level: p.intensity_level ? String(p.intensity_level) : '',
          origin_country: p.origin_country || 'CO',
          weight_grams: p.weight_grams ? String(p.weight_grams) : '',
          meta_title: p.meta_title || '',
          meta_description: p.meta_description || '',
          coa_url: p.coa_url || '',
        });
        setImages(Array.isArray(p.images) ? p.images : []);
        // Get base inventory (no variant)
        const baseInv = (p.inventory || []).find((i: { variant_id: string | null }) => !i.variant_id);
        if (baseInv) {
          setInventory({
            quantity: baseInv.quantity,
            low_stock_threshold: baseInv.low_stock_threshold,
            allow_backorder: baseInv.allow_backorder,
          });
        }
        setVariants((p.product_variants || []).map((v: Record<string, unknown>) => ({
          id: v.id,
          variant_type: v.variant_type,
          name: v.name,
          value: v.value,
          sku: v.sku || '',
          price_modifier: String(v.price_modifier || 0),
          is_active: v.is_active ?? true,
          quantity: '0',
          low_stock_threshold: '5',
        })));
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [productId, isNew]);

  useEffect(() => {
    if (profile && ['admin', 'staff'].includes(profile.role)) {
      fetchCategorias();
      fetchProduct();
    }
  }, [profile, fetchCategorias, fetchProduct]);

  const set = (field: keyof ProductFormData, value: string | boolean) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'name' && isNew) next.slug = slugify(String(value));
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim() || !form.base_price) {
      setSaveError('Nombre, slug y precio base son requeridos');
      return;
    }
    setSaving(true);
    setSaveError(null);

    const thumbnail = images.length > 0 ? images[0].url : undefined;

    const body = {
      name: form.name,
      slug: form.slug,
      short_description: form.short_description || undefined,
      description: form.description || undefined,
      ingredients: form.ingredients || undefined,
      usage_instructions: form.usage_instructions || undefined,
      base_price: Number(form.base_price),
      compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : undefined,
      price_crc: form.price_crc ? Number(form.price_crc) : null,
      category_id: form.category_id || undefined,
      sku: form.sku || undefined,
      brand: form.brand || undefined,
      is_active: form.is_active,
      is_featured: form.is_featured,
      requires_age_verification: form.requires_age_verification,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      effects: form.effects ? form.effects.split(',').map((e) => e.trim()).filter(Boolean) : [],
      intensity_level: form.intensity_level ? Number(form.intensity_level) : undefined,
      origin_country: form.origin_country,
      weight_grams: form.weight_grams ? Number(form.weight_grams) : undefined,
      meta_title: form.meta_title || undefined,
      meta_description: form.meta_description || undefined,
      coa_url: form.coa_url || undefined,
      images,
      thumbnail_url: thumbnail,
    };

    try {
      let res: Response;
      if (isNew) {
        res = await fetch('/api/productos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`/api/productos/${form.slug}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      const data = await res.json();
      if (data.exito) {
        router.push('/admin/productos');
      } else {
        setSaveError(data.error || 'Error guardando producto');
      }
    } catch {
      setSaveError('Error de conexión');
    }
    setSaving(false);
  };

  if (authLoading || (!profile && !authLoading)) return null;
  if (!['admin', 'staff'].includes(profile?.role || '')) return null;

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'imagenes', label: 'Imágenes' },
    { id: 'inventario', label: 'Inventario' },
    { id: 'variantes', label: 'Variantes' },
    { id: 'seo', label: 'SEO' },
  ] as const;

  return (
    <AdminLayout
      title={isNew ? 'Nuevo producto' : 'Editar producto'}
      subtitle={isNew ? 'Crear un nuevo producto en el catálogo' : form.name || 'Cargando...'}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin w-8 h-8 text-sc-forest" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/>
          </svg>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header actions */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => router.push('/admin/productos')}
              className="flex items-center gap-2 text-gray-500 hover:text-sc-forest text-sm transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Volver a productos
            </button>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => set('is_active', !form.is_active)}
                  className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${form.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-sc-forest">{form.is_active ? 'Publicado' : 'Borrador'}</span>
              </label>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-sc-forest text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-sc-darkforest transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {saving && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/></svg>}
                {saving ? 'Guardando...' : isNew ? 'Crear producto' : 'Guardar cambios'}
              </button>
            </div>
          </div>

          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-red-500 flex-shrink-0">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 4.5v3M8 9.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p className="text-red-700 text-sm">{saveError}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? 'border-sc-forest text-sc-forest'
                      : 'border-transparent text-gray-500 hover:text-sc-forest'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* General Tab */}
              {activeTab === 'general' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-sc-forest mb-1">Nombre *</label>
                      <input
                        value={form.name}
                        onChange={(e) => set('name', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                        placeholder="Nombre del producto"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-sc-forest mb-1">Slug *</label>
                      <input
                        value={form.slug}
                        onChange={(e) => set('slug', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                        placeholder="slug-del-producto"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sc-forest mb-1">Descripción corta</label>
                    <textarea
                      value={form.short_description}
                      onChange={(e) => set('short_description', e.target.value)}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 resize-none"
                      placeholder="Descripción breve del producto"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sc-forest mb-1">Descripción completa</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => set('description', e.target.value)}
                      rows={5}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 resize-y"
                      placeholder="Descripción detallada del producto..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-sc-forest mb-1">Precio base (USD) *</label>
                      <input
                        type="number"
                        value={form.base_price}
                        onChange={(e) => set('base_price', e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-sc-forest mb-1">Precio comparación</label>
                      <input
                        type="number"
                        value={form.compare_at_price}
                        onChange={(e) => set('compare_at_price', e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-sc-forest mb-1">
                        Precio Costa Rica (CRC)
                        <span className="ml-1 text-xs text-gray-400 font-normal">colones</span>
                      </label>
                      <input
                        type="number"
                        value={form.price_crc}
                        onChange={(e) => set('price_crc', e.target.value)}
                        min="0"
                        step="1"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-sc-forest mb-1">Categoría</label>
                      <select
                        value={form.category_id}
                        onChange={(e) => set('category_id', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                      >
                        <option value="">Sin categoría</option>
                        {categorias.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-sc-forest mb-1">SKU</label>
                      <input
                        value={form.sku}
                        onChange={(e) => set('sku', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                        placeholder="SKU-001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-sc-forest mb-1">Marca</label>
                      <input
                        value={form.brand}
                        onChange={(e) => set('brand', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                        placeholder="Street Candy"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-sc-forest mb-1">País de origen</label>
                      <select
                        value={form.origin_country}
                        onChange={(e) => set('origin_country', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                      >
                        <option value="CO">Colombia</option>
                        <option value="CR">Costa Rica</option>
                        <option value="US">Estados Unidos</option>
                        <option value="MX">México</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-sc-forest mb-1">Peso (gramos)</label>
                      <input
                        type="number"
                        value={form.weight_grams}
                        onChange={(e) => set('weight_grams', e.target.value)}
                        min="0"
                        step="0.1"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-sc-forest mb-1">Intensidad (1-5)</label>
                      <input
                        type="number"
                        value={form.intensity_level}
                        onChange={(e) => set('intensity_level', e.target.value)}
                        min="1"
                        max="5"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                        placeholder="1-5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-sc-forest mb-1">Etiquetas (separadas por coma)</label>
                      <input
                        value={form.tags}
                        onChange={(e) => set('tags', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                        placeholder="premium, orgánico, local"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-sc-forest mb-1">Efectos (separados por coma)</label>
                      <input
                        value={form.effects}
                        onChange={(e) => set('effects', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                        placeholder="relajante, energizante"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sc-forest mb-1">Ingredientes</label>
                    <textarea
                      value={form.ingredients}
                      onChange={(e) => set('ingredients', e.target.value)}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 resize-none"
                      placeholder="Lista de ingredientes..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sc-forest mb-1">Instrucciones de uso</label>
                    <textarea
                      value={form.usage_instructions}
                      onChange={(e) => set('usage_instructions', e.target.value)}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 resize-none"
                      placeholder="Cómo usar el producto..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sc-forest mb-1">URL Certificado de Análisis (COA)</label>
                    <input
                      type="url"
                      value={form.coa_url}
                      onChange={(e) => set('coa_url', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-gray-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(e) => set('is_active', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-sc-forest"
                      />
                      <span className="text-sm text-sc-forest">Publicado (visible en tienda)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.is_featured}
                        onChange={(e) => set('is_featured', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-sc-forest"
                      />
                      <span className="text-sm text-sc-forest">Producto destacado</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.requires_age_verification}
                        onChange={(e) => set('requires_age_verification', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-sc-forest"
                      />
                      <span className="text-sm text-sc-forest">Requiere verificación de edad</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Images Tab */}
              {activeTab === 'imagenes' && (
                <ImageManager images={images} onChange={setImages} />
              )}

              {/* Inventory Tab */}
              {activeTab === 'inventario' && (
                isNew ? (
                  <div className="text-center py-8 text-gray-400">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mx-auto mb-3 text-gray-200">
                      <rect x="4" y="8" width="32" height="24" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M12 16h16M12 22h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <p className="text-sm">Guarda el producto primero para gestionar el inventario</p>
                  </div>
                ) : (
                  <InventoryPanel
                    productId={productId}
                    inventory={inventory}
                    onSaved={fetchProduct}
                  />
                )
              )}

              {/* Variants Tab */}
              {activeTab === 'variantes' && (
                isNew ? (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">Guarda el producto primero para agregar variantes</p>
                  </div>
                ) : (
                  <VariantManager
                    productId={productId}
                    variants={variants}
                    onRefresh={fetchProduct}
                  />
                )
              )}

              {/* SEO Tab */}
              {activeTab === 'seo' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-sc-forest mb-1">Meta título</label>
                    <input
                      value={form.meta_title}
                      onChange={(e) => set('meta_title', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                      placeholder="Título para motores de búsqueda"
                      maxLength={70}
                    />
                    <p className="text-gray-400 text-xs mt-1">{form.meta_title.length}/70 caracteres</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-sc-forest mb-1">Meta descripción</label>
                    <textarea
                      value={form.meta_description}
                      onChange={(e) => set('meta_description', e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 resize-none"
                      placeholder="Descripción para motores de búsqueda"
                      maxLength={160}
                    />
                    <p className="text-gray-400 text-xs mt-1">{form.meta_description.length}/160 caracteres</p>
                  </div>
                  {/* Preview */}
                  {(form.meta_title || form.name) && (
                    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                      <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Vista previa en Google</p>
                      <p className="text-blue-600 text-base font-medium truncate">{form.meta_title || form.name}</p>
                      <p className="text-green-700 text-xs truncate">streetcandys.com/productos/{form.slug}</p>
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">{form.meta_description || form.short_description || 'Sin descripción'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom save */}
          <div className="flex justify-end gap-3 pb-8">
            <button
              onClick={() => router.push('/admin/productos')}
              className="border border-gray-300 text-sc-forest px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-sc-forest text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-sc-darkforest transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {saving && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/></svg>}
              {saving ? 'Guardando...' : isNew ? 'Crear producto' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
