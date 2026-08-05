/**
 * Street Candy — Admin Promotions Page
 * Full CRUD management for promotions & discounts
 */
'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/UXHelpers';
import type { Promotion, PromotionFormData, PromotionType } from '@/lib/promotions/types';
import {
  PROMOTION_TYPE_LABELS,
  PROMOTION_TYPE_COLORS,
  COUNTRY_OPTIONS,
  TIER_OPTIONS,
  INITIAL_FORM,
} from '@/lib/promotions/types';
import { formatPromotionDiscount } from '@/lib/promotions/promotions-service';

// ─── Helpers ─────────────────────────────────────────────────
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ active, expired }: { active: boolean; expired: boolean }) {
  if (expired) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Expirada</span>;
  if (active) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Activa</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pausada</span>;
}

function TypeBadge({ type }: { type: PromotionType }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PROMOTION_TYPE_COLORS[type]}`}>
      {PROMOTION_TYPE_LABELS[type]}
    </span>
  );
}

function RowSkeleton() {
  return (
    <tr className="animate-pulse">
      {[1,2,3,4,5,6,7].map(i => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-full" /></td>
      ))}
    </tr>
  );
}

// ─── Analytics Card ───────────────────────────────────────────
interface AnalyticsCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}
function AnalyticsCard({ label, value, sub, icon, color }: AnalyticsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-lg font-bold text-sc-forest leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Promotion Form Modal ─────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (form: PromotionFormData) => Promise<void>;
  initial?: PromotionFormData;
  saving: boolean;
  title: string;
}

function PromotionModal({ open, onClose, onSave, initial, saving, title }: ModalProps) {
  const [form, setForm] = useState<PromotionFormData>(initial || INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof PromotionFormData, string>>>({});
  const [tab, setTab] = useState<'basic' | 'conditions' | 'targeting'>('basic');
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(initial || INITIAL_FORM);
      setErrors({});
      setTab('basic');
      setTimeout(() => firstRef.current?.focus(), 50);
    }
  }, [open, initial]);

  const set = (k: keyof PromotionFormData, v: string | boolean | string[]) =>
    setForm(f => ({ ...f, [k]: v }));

  const toggleArrayItem = (k: keyof PromotionFormData, val: string) => {
    const arr = (form[k] as string[]) || [];
    set(k, arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const validate = () => {
    const e: Partial<Record<keyof PromotionFormData, string>> = {};
    if (!form.name.trim()) e.name = 'Requerido';
    if (!form.discount_value && form.promotion_type !== 'free_shipping' && form.promotion_type !== 'buy_x_get_y') {
      e.discount_value = 'Requerido';
    }
    if (form.promotion_type === 'coupon_code' && !form.coupon_code.trim()) {
      e.coupon_code = 'El código es requerido para este tipo';
    }
    if (form.promotion_type === 'percentage' && Number(form.discount_value) > 100) {
      e.discount_value = 'Máximo 100%';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  if (!open) return null;

  const needsDiscountValue = !['free_shipping', 'buy_x_get_y'].includes(form.promotion_type);
  const isBuyXGetY = form.promotion_type === 'buy_x_get_y';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-sc-forest font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 flex-shrink-0">
          {(['basic', 'conditions', 'targeting'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-sc-forest text-sc-forest' : 'border-transparent text-gray-500 hover:text-sc-forest'}`}
            >
              {t === 'basic' ? 'Configuración' : t === 'conditions' ? 'Condiciones' : 'Segmentación'}
            </button>
          ))}
        </div>

        {/* Body */}
        <form
          onSubmit={e => { e.preventDefault(); if (validate()) onSave(form); }}
          className="flex-1 overflow-y-auto"
        >
          <div className="px-6 py-5 space-y-4">
            {/* ── BASIC TAB ── */}
            {tab === 'basic' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-sc-forest mb-1">Nombre de la promoción *</label>
                    <input
                      ref={firstRef}
                      value={form.name}
                      onChange={e => set('name', e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
                      placeholder="Ej: Descuento de verano 20%"
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sc-forest mb-1">Tipo de promoción</label>
                    <select
                      value={form.promotion_type}
                      onChange={e => set('promotion_type', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                    >
                      {(Object.entries(PROMOTION_TYPE_LABELS) as [PromotionType, string][]).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {form.promotion_type === 'coupon_code' && (
                    <div>
                      <label className="block text-sm font-medium text-sc-forest mb-1">Código de cupón *</label>
                      <input
                        value={form.coupon_code}
                        onChange={e => set('coupon_code', e.target.value.toUpperCase())}
                        className={`w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-sc-forest/30 ${errors.coupon_code ? 'border-red-400' : 'border-gray-300'}`}
                        placeholder="PROMO20"
                      />
                      {errors.coupon_code && <p className="text-red-500 text-xs mt-1">{errors.coupon_code}</p>}
                    </div>
                  )}

                  {needsDiscountValue && (
                    <div>
                      <label className="block text-sm font-medium text-sc-forest mb-1">
                        {form.promotion_type === 'percentage' || form.promotion_type === 'automatic_cart' || form.promotion_type === 'coupon_code' ? 'Porcentaje (%)' : 'Monto fijo'} *
                      </label>
                      <input
                        type="number"
                        value={form.discount_value}
                        onChange={e => set('discount_value', e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 ${errors.discount_value ? 'border-red-400' : 'border-gray-300'}`}
                        placeholder={form.promotion_type === 'percentage' ? '20' : '10000'}
                        min="0" step="0.01"
                      />
                      {errors.discount_value && <p className="text-red-500 text-xs mt-1">{errors.discount_value}</p>}
                    </div>
                  )}

                  {isBuyXGetY && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-sc-forest mb-1">Compra cantidad (X)</label>
                        <input type="number" value={form.buy_quantity} onChange={e => set('buy_quantity', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                          min="1" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-sc-forest mb-1">Lleva cantidad (Y)</label>
                        <input type="number" value={form.get_quantity} onChange={e => set('get_quantity', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                          min="1" />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-sc-forest mb-1">Fecha inicio</label>
                    <input type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-sc-forest mb-1">Fecha fin</label>
                    <input type="datetime-local" value={form.ends_at} onChange={e => set('ends_at', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-sc-forest mb-1">Límite de usos totales</label>
                    <input type="number" value={form.usage_limit} onChange={e => set('usage_limit', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                      placeholder="Sin límite" min="1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-sc-forest mb-1">Usos por cliente</label>
                    <input type="number" value={form.per_customer_limit} onChange={e => set('per_customer_limit', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                      min="1" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-sc-forest mb-1">Descripción interna</label>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 resize-none"
                    placeholder="Descripción visible para el cliente" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-sc-forest mb-1">Notas internas</label>
                  <textarea value={form.internal_notes} onChange={e => set('internal_notes', e.target.value)} rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 resize-none"
                    placeholder="Solo visible para administradores" />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-sc-forest focus:ring-sc-forest/30" />
                  <span className="text-sm text-sc-forest font-medium">Promoción activa</span>
                </label>
              </>
            )}

            {/* ── CONDITIONS TAB ── */}
            {tab === 'conditions' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-sc-forest mb-1">Compra mínima</label>
                  <input type="number" value={form.minimum_purchase} onChange={e => set('minimum_purchase', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                    placeholder="0" min="0" step="0.01" />
                  <p className="text-xs text-gray-400 mt-1">Monto mínimo del carrito para aplicar</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-sc-forest mb-1">Descuento máximo</label>
                  <input type="number" value={form.maximum_discount} onChange={e => set('maximum_discount', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                    placeholder="Sin límite" min="0" step="0.01" />
                  <p className="text-xs text-gray-400 mt-1">Límite máximo del descuento calculado</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-sc-forest mb-2">Países elegibles</label>
                  <div className="flex flex-wrap gap-2">
                    {COUNTRY_OPTIONS.map(c => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => toggleArrayItem('country_codes', c.code)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          form.country_codes.includes(c.code)
                            ? 'bg-sc-forest text-white border-sc-forest'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-sc-forest'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Sin selección = todos los países</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-sc-forest mb-2">Tiers de lealtad elegibles</label>
                  <div className="flex flex-wrap gap-2">
                    {TIER_OPTIONS.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => toggleArrayItem('eligible_tiers', t.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          form.eligible_tiers.includes(t.value)
                            ? 'bg-sc-forest text-white border-sc-forest'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-sc-forest'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Sin selección = todos los tiers</p>
                </div>
              </div>
            )}

            {/* ── TARGETING TAB ── */}
            {tab === 'targeting' && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-700">
                    <strong>Segmentación avanzada:</strong> Ingresa IDs separados por coma. Deja vacío para aplicar a todos.
                  </p>
                </div>
                {[
                  { key: 'product_ids' as const, label: 'IDs de productos específicos', placeholder: 'uuid1, uuid2, ...' },
                  { key: 'category_ids' as const, label: 'IDs de categorías específicas', placeholder: 'uuid1, uuid2, ...' },
                  { key: 'brand_ids' as const, label: 'IDs de marcas específicas', placeholder: 'uuid1, uuid2, ...' },
                  { key: 'customer_ids' as const, label: 'IDs de clientes específicos', placeholder: 'uuid1, uuid2, ...' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-sc-forest mb-1">{label}</label>
                    <textarea
                      value={(form[key] as string[]).join(', ')}
                      onChange={e => {
                        const vals = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        set(key, vals);
                      }}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 resize-none font-mono"
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex gap-3 flex-shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-sc-forest rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-sc-forest text-white rounded-lg py-2.5 text-sm font-medium hover:bg-sc-darkforest transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/></svg>}
              {saving ? 'Guardando...' : 'Guardar promoción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Analytics Drawer ─────────────────────────────────────────
interface AnalyticsDrawerProps {
  promotion: Promotion | null;
  onClose: () => void;
}

function AnalyticsDrawer({ promotion, onClose }: AnalyticsDrawerProps) {
  if (!promotion) return null;
  const conversionRate = promotion.usage_limit
    ? Math.round((promotion.usage_count / promotion.usage_limit) * 100)
    : null;
  const avgOrderValue = promotion.usage_count > 0
    ? Math.round(promotion.total_revenue_generated / promotion.usage_count)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-sc-forest font-bold text-base">Analíticas</h2>
            <p className="text-gray-500 text-xs truncate max-w-[220px]">{promotion.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-sc-forest/5 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-sc-forest">{promotion.usage_count}</p>
              <p className="text-xs text-gray-500 mt-1">Usos totales</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-green-700">
                ${promotion.total_revenue_generated.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Ingresos generados</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-red-600">
                ${promotion.total_discount_given.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Descuentos dados</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-blue-700">
                {conversionRate !== null ? `${conversionRate}%` : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Tasa de conversión</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-sc-forest">Detalles de la promoción</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tipo</span>
                <TypeBadge type={promotion.promotion_type} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Descuento</span>
                <span className="font-medium text-sc-forest">
                  {formatPromotionDiscount(promotion.promotion_type, promotion.discount_value)}
                </span>
              </div>
              {promotion.coupon_code && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Código</span>
                  <span className="font-mono font-bold text-sc-forest">{promotion.coupon_code}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Valor promedio por orden</span>
                <span className="font-medium">${avgOrderValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Límite de usos</span>
                <span className="font-medium">{promotion.usage_limit ?? 'Ilimitado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Inicio</span>
                <span className="font-medium">{formatDate(promotion.starts_at)}</span>
              </div>
              {promotion.ends_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Fin</span>
                  <span className="font-medium">{formatDate(promotion.ends_at)}</span>
                </div>
              )}
              {promotion.country_codes && promotion.country_codes.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Países</span>
                  <span className="font-medium">{promotion.country_codes.join(', ')}</span>
                </div>
              )}
              {promotion.eligible_tiers && promotion.eligible_tiers.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tiers</span>
                  <span className="font-medium capitalize">{promotion.eligible_tiers.join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          {promotion.internal_notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-700 mb-1">Notas internas</p>
              <p className="text-sm text-amber-800">{promotion.internal_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function AdminPromocionesPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [analyticsPromotion, setAnalyticsPromotion] = useState<Promotion | null>(null);
  const [saving, setSaving] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const PER_PAGE = 15;

  useEffect(() => {
    if (!authLoading && profile && !['admin', 'staff'].includes(profile.role)) {
      router.replace('/');
    }
  }, [authLoading, profile, router]);

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('promotions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

      if (search.trim()) query = query.ilike('name', `%${search}%`);
      if (filterType) query = query.eq('promotion_type', filterType);
      if (filterStatus === 'active') query = query.eq('is_active', true);
      if (filterStatus === 'inactive') query = query.eq('is_active', false);
      if (filterCountry) query = query.contains('country_codes', [filterCountry]);

      const { data, error: err, count } = await query;
      if (err) throw err;
      setPromotions((data as Promotion[]) || []);
      setTotal(count || 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando promociones');
    } finally {
      setLoading(false);
    }
  }, [supabase, page, search, filterType, filterStatus, filterCountry]);

  useEffect(() => {
    if (profile && ['admin', 'staff'].includes(profile.role)) fetchPromotions();
  }, [profile, fetchPromotions]);

  const showToast = (msg: string, type?: string) => {
    if (type === 'error') toastError(msg);
    else toastSuccess(msg);
  };

  const formFromPromotion = (p: Promotion): PromotionFormData => ({
    name: p.name,
    description: p.description || '',
    internal_notes: p.internal_notes || '',
    promotion_type: p.promotion_type,
    coupon_code: p.coupon_code || '',
    discount_value: p.discount_value.toString(),
    buy_quantity: p.buy_quantity?.toString() || '1',
    get_quantity: p.get_quantity?.toString() || '1',
    minimum_purchase: p.minimum_purchase.toString(),
    maximum_discount: p.maximum_discount?.toString() || '',
    starts_at: p.starts_at.slice(0, 16),
    ends_at: p.ends_at ? p.ends_at.slice(0, 16) : '',
    is_active: p.is_active,
    usage_limit: p.usage_limit?.toString() || '',
    per_customer_limit: p.per_customer_limit.toString(),
    country_codes: p.country_codes || [],
    product_ids: p.product_ids || [],
    category_ids: p.category_ids || [],
    brand_ids: p.brand_ids || [],
    customer_ids: p.customer_ids || [],
    eligible_tiers: p.eligible_tiers || [],
  });

  const handleSave = async (form: PromotionFormData) => {
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || null,
        internal_notes: form.internal_notes || null,
        promotion_type: form.promotion_type,
        coupon_code: form.coupon_code ? form.coupon_code.trim().toUpperCase() : null,
        discount_value: Number(form.discount_value) || 0,
        buy_quantity: form.buy_quantity ? Number(form.buy_quantity) : null,
        get_quantity: form.get_quantity ? Number(form.get_quantity) : null,
        minimum_purchase: Number(form.minimum_purchase) || 0,
        maximum_discount: form.maximum_discount ? Number(form.maximum_discount) : null,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        is_active: form.is_active,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        per_customer_limit: Number(form.per_customer_limit) || 1,
        country_codes: form.country_codes.length > 0 ? form.country_codes : null,
        product_ids: form.product_ids.length > 0 ? form.product_ids : null,
        category_ids: form.category_ids.length > 0 ? form.category_ids : null,
        brand_ids: form.brand_ids.length > 0 ? form.brand_ids : null,
        customer_ids: form.customer_ids.length > 0 ? form.customer_ids : null,
        eligible_tiers: form.eligible_tiers.length > 0 ? form.eligible_tiers : null,
      };

      if (editingPromotion) {
        const { error: err } = await supabase
          .from('promotions')
          .update(payload)
          .eq('id', editingPromotion.id);
        if (err) throw err;
        showToast('Promoción actualizada correctamente');
      } else {
        const { error: err } = await supabase
          .from('promotions')
          .insert({ ...payload, created_by: profile?.id });
        if (err) throw err;
        showToast('Promoción creada correctamente');
      }

      setModalOpen(false);
      setEditingPromotion(null);
      fetchPromotions();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error guardando promoción', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (p: Promotion) => {
    try {
      const { error: err } = await supabase
        .from('promotions')
        .update({ is_active: !p.is_active })
        .eq('id', p.id);
      if (err) throw err;
      showToast(p.is_active ? 'Promoción pausada' : 'Promoción activada');
      fetchPromotions();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error actualizando estado', 'error');
    }
  };

  const handleDuplicate = async (p: Promotion) => {
    try {
      const { id, usage_count, total_revenue_generated, total_discount_given, created_at, updated_at, ...rest } = p;
      const { error: err } = await supabase.from('promotions').insert({
        ...rest,
        name: `${p.name} (copia)`,
        coupon_code: p.coupon_code ? `${p.coupon_code}_COPY` : null,
        usage_count: 0,
        total_revenue_generated: 0,
        total_discount_given: 0,
        is_active: false,
        created_by: profile?.id,
      });
      if (err) throw err;
      showToast('Promoción duplicada');
      fetchPromotions();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error duplicando', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '¿Eliminar esta promoción?',
      message: 'Esta acción no se puede deshacer. Los datos de uso se perderán.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const { error: err } = await supabase.from('promotions').delete().eq('id', id);
      if (err) throw err;
      showToast('Promoción eliminada');
      fetchPromotions();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error eliminando', 'error');
    }
  };

  const isExpired = (p: Promotion) => !!p.ends_at && new Date(p.ends_at) <= new Date();

  // Summary stats
  const activeCount = promotions.filter(p => p.is_active && !isExpired(p)).length;
  const totalUses = promotions.reduce((acc, p) => acc + p.usage_count, 0);
  const totalRevenue = promotions.reduce((acc, p) => acc + p.total_revenue_generated, 0);
  const totalDiscount = promotions.reduce((acc, p) => acc + p.total_discount_given, 0);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <AdminLayout title="Promociones" subtitle="Gestión de descuentos y promociones">
      {confirmDialog}
      {/* Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <AnalyticsCard
          label="Promociones activas"
          value={activeCount.toString()}
          sub={`de ${total} totales`}
          color="bg-green-100 text-green-700"
          icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2l1.8 3.6L15 6.5l-3 2.9.7 4.1L9 11.4l-3.7 2.1.7-4.1L3 6.5l4.2-.9L9 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>}
        />
        <AnalyticsCard
          label="Usos totales"
          value={totalUses.toLocaleString()}
          color="bg-blue-100 text-blue-700"
          icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M9 6v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        />
        <AnalyticsCard
          label="Ingresos generados"
          value={`$${totalRevenue.toLocaleString()}`}
          color="bg-emerald-100 text-emerald-700"
          icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v14M5 5h5.5a2.5 2.5 0 010 5H5m0 0h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        />
        <AnalyticsCard
          label="Descuentos dados"
          value={`$${totalDiscount.toLocaleString()}`}
          color="bg-red-100 text-red-600"
          icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        />
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
              placeholder="Buscar por nombre..."
            />
          </div>
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 bg-white">
            <option value="">Todos los tipos</option>
            {(Object.entries(PROMOTION_TYPE_LABELS) as [PromotionType, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 bg-white">
            <option value="">Todos los estados</option>
            <option value="active">Activas</option>
            <option value="inactive">Pausadas</option>
          </select>
          <select value={filterCountry} onChange={e => { setFilterCountry(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 bg-white">
            <option value="">Todos los países</option>
            {COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
          <button
            onClick={() => { setEditingPromotion(null); setModalOpen(true); }}
            className="bg-sc-forest text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sc-darkforest transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Nueva promoción
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-red-700 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Descuento</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Usos</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Vigencia</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
              ) : promotions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" viewBox="0 0 40 40" fill="none">
                      <rect x="4" y="8" width="32" height="24" rx="4" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 16h16M12 22h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <p className="font-medium">No hay promociones</p>
                    <p className="text-xs mt-1">Crea tu primera promoción con el botón de arriba</p>
                  </td>
                </tr>
              ) : (
                promotions.map(p => {
                  const expired = isExpired(p);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-sc-forest">{p.name}</p>
                          {p.coupon_code && (
                            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{p.coupon_code}</span>
                          )}
                          {p.country_codes && p.country_codes.length > 0 && (
                            <span className="text-xs text-gray-400 ml-1">{p.country_codes.join(', ')}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3"><TypeBadge type={p.promotion_type} /></td>
                      <td className="px-4 py-3 font-medium text-sc-forest">
                        {formatPromotionDiscount(p.promotion_type, p.discount_value)}
                        {p.maximum_discount && (
                          <span className="text-xs text-gray-400 ml-1">(máx ${p.maximum_discount.toLocaleString()})</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{p.usage_count}</span>
                        {p.usage_limit && <span className="text-gray-400">/{p.usage_limit}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        <div>{formatDate(p.starts_at)}</div>
                        {p.ends_at && <div className={expired ? 'text-red-500' : ''}>→ {formatDate(p.ends_at)}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge active={p.is_active} expired={expired} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Analytics */}
                          <button
                            onClick={() => setAnalyticsPromotion(p)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver analíticas"
                          >
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 11l3-4 2.5 2 3-5 2.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                          {/* Toggle active */}
                          <button
                            onClick={() => handleToggleActive(p)}
                            className={`p-1.5 rounded-lg transition-colors ${p.is_active ? 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                            title={p.is_active ? 'Pausar' : 'Activar'}
                          >
                            {p.is_active
                              ? <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="3" y="2" width="3" height="11" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="9" y="2" width="3" height="11" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg>
                              : <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M4 2l9 5.5L4 13V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                            }
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => { setEditingPromotion(p); setModalOpen(true); }}
                            className="p-1.5 text-gray-400 hover:text-sc-forest hover:bg-sc-forest/10 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M10 2l3 3-8 8H2v-3l8-8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                          </button>
                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicate(p)}
                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Duplicar"
                          >
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M2 10V3a1 1 0 011-1h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 4h11M5 4V2h5v2M6 7v5M9 7v5M3 4l1 9h7l1-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} de {total}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <PromotionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingPromotion(null); }}
        onSave={handleSave}
        initial={editingPromotion ? formFromPromotion(editingPromotion) : undefined}
        saving={saving}
        title={editingPromotion ? 'Editar promoción' : 'Nueva promoción'}
      />

      <AnalyticsDrawer
        promotion={analyticsPromotion}
        onClose={() => setAnalyticsPromotion(null)}
      />
    </AdminLayout>
  );
}
