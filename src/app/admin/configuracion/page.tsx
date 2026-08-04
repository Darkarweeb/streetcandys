'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { createClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────
interface Pais {
  id: string;
  code: string;
  name: string;
  currency_code: string;
  currency_symbol: string;
  locale: string;
  tax_rate: number;
  is_active: boolean;
  shipping_config: Record<string, unknown>;
  payment_methods: string[];
  legal_config: Record<string, unknown>;
}

interface Setting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  country_code: string | null;
  description: string | null;
  is_public: boolean;
}

// ─── WhatsApp Config Section ──────────────────────────────────
interface WhatsAppConfig {
  phone: string;
  support_message: string;
  purchase_message: string;
  floating_button_enabled: boolean;
  buy_via_whatsapp_enabled: boolean;
  checkout_via_whatsapp_enabled: boolean;
}

interface WhatsAppSectionProps {
  settings: Setting[];
  onSaved: () => void;
}

function WhatsAppSection({ settings, onSaved }: WhatsAppSectionProps) {
  const supabase = createClient();
  const setting = settings.find(s => s.key === 'whatsapp_support');
  const rawVal = setting?.value as Partial<WhatsAppConfig & { phone: string; message: string; enabled: boolean }> | undefined;

  const [form, setForm] = useState<WhatsAppConfig>({
    phone: rawVal?.phone ?? '',
    support_message: rawVal?.support_message ?? rawVal?.message ?? 'Hola 👋, necesito ayuda con un pedido en Street Candy.',
    purchase_message: rawVal?.purchase_message ?? 'Hola 👋, me interesa comprar este producto en Street Candy.',
    floating_button_enabled: rawVal?.floating_button_enabled ?? rawVal?.enabled ?? false,
    buy_via_whatsapp_enabled: rawVal?.buy_via_whatsapp_enabled ?? false,
    checkout_via_whatsapp_enabled: rawVal?.checkout_via_whatsapp_enabled ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (rawVal) {
      setForm({
        phone: rawVal.phone ?? '',
        support_message: rawVal.support_message ?? rawVal.message ?? 'Hola 👋, necesito ayuda con un pedido en Street Candy.',
        purchase_message: rawVal.purchase_message ?? 'Hola 👋, me interesa comprar este producto en Street Candy.',
        floating_button_enabled: rawVal.floating_button_enabled ?? rawVal.enabled ?? false,
        buy_via_whatsapp_enabled: rawVal.buy_via_whatsapp_enabled ?? false,
        checkout_via_whatsapp_enabled: rawVal.checkout_via_whatsapp_enabled ?? false,
      });
    }
  }, [setting?.id]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (setting) {
        const { error } = await supabase.from('settings').update({ value: form as unknown as Record<string, unknown> }).eq('id', setting.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('settings').insert({
          key: 'whatsapp_support',
          value: form as unknown as Record<string, unknown>,
          description: 'Configuración completa de WhatsApp: botón flotante, compra y checkout.',
          is_public: true,
        });
        if (error) throw error;
      }
      showToast('Configuración de WhatsApp guardada');
      onSaved();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error al guardar');
    } finally { setSaving(false); }
  };

  const cleanPhone = form.phone.replace(/\D/g, '');
  const previewSupportUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(form.support_message)}`
    : null;
  const previewPurchaseUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(form.purchase_message)}`
    : null;

  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
    <label className="flex items-center justify-between cursor-pointer py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-sc-forest font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">{checked ? 'Activo' : 'Inactivo'}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={onChange}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sc-forest/40 ${checked ? 'bg-[#25D366]' : 'bg-gray-300'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
    </label>
  );

  return (
    <div className="space-y-5">
      {toast && <div className="fixed top-4 right-4 z-50 bg-sc-forest text-white px-4 py-3 rounded-xl shadow-lg text-sm animate-slide-up">{toast}</div>}

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-[#25D366]/5">
          <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-6 h-6 fill-white" aria-hidden="true">
              <path d="M16.003 2.667C8.639 2.667 2.667 8.639 2.667 16c0 2.354.627 4.657 1.817 6.677L2.667 29.333l6.823-1.789A13.27 13.27 0 0 0 16.003 29.333C23.364 29.333 29.333 23.361 29.333 16S23.364 2.667 16.003 2.667zm0 2.4c5.878 0 10.93 5.052 10.93 10.933 0 5.878-5.052 10.933-10.93 10.933a10.89 10.89 0 0 1-5.56-1.524l-.397-.24-4.05 1.063 1.08-3.944-.262-.41A10.89 10.89 0 0 1 5.07 16c0-5.881 5.052-10.933 10.933-10.933zm-3.11 5.6c-.22 0-.578.082-.882.41-.303.328-1.158 1.132-1.158 2.762s1.185 3.204 1.35 3.426c.165.22 2.32 3.546 5.625 4.832 2.784 1.098 3.35.88 3.952.825.603-.055 1.944-.795 2.218-1.562.275-.767.275-1.424.193-1.562-.082-.137-.303-.22-.632-.385-.33-.165-1.944-.96-2.247-1.07-.303-.11-.523-.165-.743.165-.22.33-.852 1.07-1.044 1.29-.193.22-.385.247-.715.082-.33-.165-1.393-.514-2.655-1.638-.98-.875-1.643-1.956-1.835-2.286-.193-.33-.02-.508.145-.672.149-.148.33-.385.495-.578.165-.193.22-.33.33-.55.11-.22.055-.412-.027-.578-.083-.165-.743-1.797-1.018-2.456-.27-.645-.544-.558-.743-.568l-.633-.01z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-sc-forest">WhatsApp</h3>
            <p className="text-gray-500 text-xs">Número, mensajes y funcionalidades de WhatsApp</p>
          </div>
        </div>

        {/* Phone number */}
        <div className="px-6 py-5">
          <label className="block text-sm font-medium text-sc-forest mb-1">
            Número de WhatsApp <span className="text-gray-400 font-normal">(con código de país, sin + ni espacios)</span>
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="573001234567"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
          />
          <p className="text-gray-400 text-xs mt-1">Ejemplo Colombia: 573001234567 · Costa Rica: 50688887777</p>
        </div>
      </div>

      {/* Messages card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h4 className="font-semibold text-sc-forest text-sm">Mensajes predeterminados</h4>
          <p className="text-gray-400 text-xs mt-0.5">Estos mensajes se pre-llenarán cuando el cliente abra WhatsApp.</p>
        </div>
        <div className="px-6 py-5 space-y-5">
          {/* Support message */}
          <div>
            <label className="block text-sm font-medium text-sc-forest mb-1">Mensaje de soporte</label>
            <textarea
              value={form.support_message}
              onChange={e => setForm(f => ({ ...f, support_message: e.target.value }))}
              rows={3}
              placeholder="Hola 👋, necesito ayuda con un pedido en Street Candy."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 resize-none"
            />
            <p className="text-gray-400 text-xs mt-1">Se usa en el botón flotante de soporte.</p>
            {previewSupportUrl && (
              <a href={previewSupportUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sc-periwinkle text-xs underline mt-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                Probar enlace de soporte
              </a>
            )}
          </div>

          {/* Purchase message */}
          <div>
            <label className="block text-sm font-medium text-sc-forest mb-1">Mensaje de compra</label>
            <textarea
              value={form.purchase_message}
              onChange={e => setForm(f => ({ ...f, purchase_message: e.target.value }))}
              rows={3}
              placeholder="Hola 👋, me interesa comprar este producto en Street Candy."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 resize-none"
            />
            <p className="text-gray-400 text-xs mt-1">Se usa en los botones de compra y checkout por WhatsApp.</p>
            {previewPurchaseUrl && (
              <a href={previewPurchaseUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sc-periwinkle text-xs underline mt-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                Probar enlace de compra
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Toggles card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h4 className="font-semibold text-sc-forest text-sm">Funcionalidades</h4>
          <p className="text-gray-400 text-xs mt-0.5">Activa o desactiva cada canal de WhatsApp de forma independiente.</p>
        </div>
        <div className="px-6 py-2">
          <Toggle
            checked={form.floating_button_enabled}
            onChange={() => setForm(f => ({ ...f, floating_button_enabled: !f.floating_button_enabled }))}
            label="Botón flotante de soporte"
          />
          <Toggle
            checked={form.buy_via_whatsapp_enabled}
            onChange={() => setForm(f => ({ ...f, buy_via_whatsapp_enabled: !f.buy_via_whatsapp_enabled }))}
            label="Comprar por WhatsApp"
          />
          <Toggle
            checked={form.checkout_via_whatsapp_enabled}
            onChange={() => setForm(f => ({ ...f, checkout_via_whatsapp_enabled: !f.checkout_via_whatsapp_enabled }))}
            label="Checkout por WhatsApp"
          />
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-sc-forest text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-sc-darkforest transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {saving && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/></svg>}
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </div>
  );
}

// ─── Modal País ───────────────────────────────────────────────
interface ModalPaisProps {
  pais: Pais | null;
  onClose: () => void;
  onSave: (id: string, changes: Partial<Pais>) => Promise<void>;
  saving: boolean;
}

function ModalPais({ pais, onClose, onSave, saving }: ModalPaisProps) {
  const [form, setForm] = useState({ tax_rate: 0, is_active: true, payment_methods: '' });

  useEffect(() => {
    if (pais) setForm({
      tax_rate: pais.tax_rate * 100,
      is_active: pais.is_active,
      payment_methods: pais.payment_methods?.join(', ') || '',
    });
  }, [pais]);

  if (!pais) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-sc-forest font-bold text-lg">Configurar {pais.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-3 text-sm">
            <div><span className="text-gray-500">Código:</span> <strong>{pais.code}</strong></div>
            <div><span className="text-gray-500">Moneda:</span> <strong>{pais.currency_code}</strong></div>
            <div><span className="text-gray-500">Símbolo:</span> <strong>{pais.currency_symbol}</strong></div>
            <div><span className="text-gray-500">Locale:</span> <strong>{pais.locale}</strong></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-sc-forest mb-1">Tasa de impuesto (%)</label>
            <input type="number" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
              min="0" max="100" step="0.01" placeholder="19" />
          </div>
          <div>
            <label className="block text-sm font-medium text-sc-forest mb-1">Métodos de pago (separados por coma)</label>
            <input value={form.payment_methods} onChange={e => setForm(f => ({ ...f, payment_methods: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
              placeholder="stripe, pse, nequi" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-sc-forest focus:ring-sc-forest/30" />
            <span className="text-sm text-sc-forest">País activo</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border border-gray-300 text-sc-forest rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
            <button
              onClick={() => onSave(pais.id, {
                tax_rate: form.tax_rate / 100,
                is_active: form.is_active,
                payment_methods: form.payment_methods.split(',').map(m => m.trim()).filter(Boolean),
              })}
              disabled={saving}
              className="flex-1 bg-sc-forest text-white rounded-lg py-2.5 text-sm font-medium hover:bg-sc-darkforest transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/></svg>}
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Setting ────────────────────────────────────────────
interface ModalSettingProps {
  setting: Setting | null;
  onClose: () => void;
  onSave: (id: string, value: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

function ModalSetting({ setting, onClose, onSave, saving }: ModalSettingProps) {
  const [valueStr, setValueStr] = useState('');
  const [jsonError, setJsonError] = useState('');

  useEffect(() => {
    if (setting) { setValueStr(JSON.stringify(setting.value, null, 2)); setJsonError(''); }
  }, [setting]);

  if (!setting) return null;

  const handleSave = () => {
    try {
      const parsed = JSON.parse(valueStr);
      setJsonError('');
      onSave(setting.id, parsed);
    } catch {
      setJsonError('JSON inválido');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-sc-forest font-bold text-lg">Editar Configuración</h2>
            <p className="text-gray-500 text-xs font-mono">{setting.key}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {setting.description && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{setting.description}</p>}
          <div>
            <label className="block text-sm font-medium text-sc-forest mb-1">Valor (JSON)</label>
            <textarea value={valueStr} onChange={e => setValueStr(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sc-forest/30 resize-none ${jsonError ? 'border-red-400' : 'border-gray-300'}`}
              rows={8} />
            {jsonError && <p className="text-red-500 text-xs mt-1">{jsonError}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border border-gray-300 text-sc-forest rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-sc-forest text-white rounded-lg py-2.5 text-sm font-medium hover:bg-sc-darkforest transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/></svg>}
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function AdminConfiguracionPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<'paises' | 'tienda' | 'whatsapp'>('paises');
  const [paises, setPaises] = useState<Pais[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalPais, setModalPais] = useState<Pais | null>(null);
  const [modalSetting, setModalSetting] = useState<Setting | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && profile && !['admin'].includes(profile.role)) router.replace('/admin');
  }, [authLoading, profile, router]);

  const fetchPaises = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data, error: err } = await supabase.from('countries').select('*').order('name');
      if (err) throw err;
      setPaises(data || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando países');
    } finally { setLoading(false); }
  }, [supabase]);

  const fetchSettings = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data, error: err } = await supabase.from('settings').select('*').order('key');
      if (err) throw err;
      setSettings(data || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando configuraciones');
    } finally { setLoading(false); }
  }, [supabase]);

  useEffect(() => {
    if (profile && ['admin'].includes(profile.role)) {
      if (tab === 'paises') fetchPaises();
      else fetchSettings();
    }
  }, [profile, tab, fetchPaises, fetchSettings]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleSavePais = async (id: string, changes: Partial<Pais>) => {
    setSaving(true);
    try {
      const { error: err } = await supabase.from('countries').update(changes).eq('id', id);
      if (err) throw err;
      showToast('País actualizado');
      setModalPais(null); fetchPaises();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleSaveSetting = async (id: string, value: Record<string, unknown>) => {
    setSaving(true);
    try {
      const { error: err } = await supabase.from('settings').update({ value }).eq('id', id);
      if (err) throw err;
      showToast('Configuración guardada');
      setModalSetting(null); fetchSettings();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error al guardar');
    } finally { setSaving(false); }
  };

  if (authLoading) return <AdminLayout title="Configuración"><div className="animate-pulse h-64 bg-gray-100 rounded-xl" /></AdminLayout>;
  if (!profile || !['admin'].includes(profile.role)) {
    return (
      <AdminLayout title="Configuración">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-800 font-medium">Acceso restringido</p>
          <p className="text-amber-700 text-sm mt-1">Solo los administradores pueden acceder a la configuración.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Configuración" subtitle="Configuración de países y tienda">
      {toast && <div className="fixed top-4 right-4 z-50 bg-sc-forest text-white px-4 py-3 rounded-xl shadow-lg text-sm animate-slide-up">{toast}</div>}

      <ModalPais pais={modalPais} onClose={() => setModalPais(null)} onSave={handleSavePais} saving={saving} />
      <ModalSetting setting={modalSetting} onClose={() => setModalSetting(null)} onSave={handleSaveSetting} saving={saving} />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {(['paises', 'tienda', 'whatsapp'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white text-sc-forest shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'paises' ? 'Países' : t === 'tienda' ? 'Tienda' : 'WhatsApp'}
          </button>
        ))}
      </div>

      {/* Países */}
      {tab === 'paises' && (
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1,2].map(i => <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-40" />)}
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-600">{error}</div>
          ) : paises.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-500 font-medium">No hay países configurados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {paises.map(p => (
                <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-sc-forest/30 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{p.code === 'CO' ? '🇨🇴' : p.code === 'CR' ? '🇨🇷' : '🌍'}</span>
                        <h3 className="font-bold text-sc-forest text-lg">{p.name}</h3>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                        {p.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <button onClick={() => setModalPais(p)}
                      className="text-sc-forest hover:bg-sc-forest/10 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                      Editar
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-0.5">Moneda</p>
                      <p className="font-semibold text-sc-forest">{p.currency_symbol} {p.currency_code}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-0.5">Impuesto</p>
                      <p className="font-semibold text-sc-forest">{(p.tax_rate * 100).toFixed(1)}%</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                      <p className="text-gray-500 text-xs mb-0.5">Métodos de pago</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.payment_methods?.length > 0 ? p.payment_methods.map(m => (
                          <span key={m} className="bg-white border border-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{m}</span>
                        )) : <span className="text-gray-400 text-xs">Sin configurar</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Configuraciones de tienda */}
      {tab === 'tienda' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1,2,3,4].map(i => <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-lg" />)}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-600">{error}</div>
          ) : settings.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 font-medium">No hay configuraciones registradas</p>
              <p className="text-gray-400 text-sm mt-1">Las configuraciones se crean automáticamente con el sistema.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {settings.map(s => (
                <div key={s.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-semibold text-sc-forest">{s.key}</p>
                      {s.is_public && (
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">Público</span>
                      )}
                      {s.country_code && (
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{s.country_code}</span>
                      )}
                    </div>
                    {s.description && <p className="text-gray-500 text-xs mt-0.5">{s.description}</p>}
                    <p className="text-gray-400 text-xs mt-1 font-mono truncate max-w-md">{JSON.stringify(s.value)}</p>
                  </div>
                  <button onClick={() => setModalSetting(s)}
                    className="text-sc-forest hover:bg-sc-forest/10 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0">
                    Editar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WhatsApp */}
      {tab === 'whatsapp' && (
        <WhatsAppSection settings={settings} onSaved={fetchSettings} />
      )}
    </AdminLayout>
  );
}
