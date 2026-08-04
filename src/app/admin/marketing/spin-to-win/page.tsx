'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_SPIN_SETTINGS, SpinToWinSettings, SpinPrize } from '@/hooks/useSpinToWinSettings';

// ─── Types ────────────────────────────────────────────────────
interface SpinLead {
  id: string;
  email: string;
  name: string | null;
  prize: string | null;
  coupon_code: string | null;
  created_at: string;
  verification_status: string | null;
}

interface PrizeBreakdown {
  label: string;
  count: number;
}

// ─── Toggle Component ─────────────────────────────────────────
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-sc-forest font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">{checked ? 'Activo' : 'Inactivo'}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={onChange}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sc-forest/40 ${checked ? 'bg-sc-forest' : 'bg-gray-300'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
    </label>
  );
}

// ─── Stats Section ────────────────────────────────────────────
function StatsSection() {
  const supabase = createClient();
  const [leads, setLeads] = useState<SpinLead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('spin_leads')
      .select('id, email, name, prize, coupon_code, created_at, verification_status')
      .order('created_at', { ascending: false })
      .limit(200);
    setLeads(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const totalLeads = leads.length;
  const totalSpins = leads.filter(l => l.prize).length;

  const prizeBreakdown: PrizeBreakdown[] = leads.reduce<PrizeBreakdown[]>((acc, lead) => {
    if (!lead.prize) return acc;
    const existing = acc.find(p => p.label === lead.prize);
    if (existing) { existing.count++; } else { acc.push({ label: lead.prize, count: 1 }); }
    return acc;
  }, []).sort((a, b) => b.count - a.count);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg className="animate-spin w-6 h-6 text-sc-forest" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mb-1">Total leads</p>
          <p className="text-3xl font-black text-sc-forest">{totalLeads}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mb-1">Giros completados</p>
          <p className="text-3xl font-black text-sc-forest">{totalSpins}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mb-1">Premios distintos</p>
          <p className="text-3xl font-black text-sc-forest">{prizeBreakdown.length}</p>
        </div>
      </div>

      {/* Prize breakdown */}
      {prizeBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h4 className="font-semibold text-sc-forest text-sm">Desglose de premios</h4>
          </div>
          <div className="px-6 py-4 space-y-3">
            {prizeBreakdown.map(({ label, count }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-sm font-medium text-sc-forest w-28 flex-shrink-0">{label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-sc-forest h-2 rounded-full transition-all"
                    style={{ width: `${totalSpins > 0 ? (count / totalSpins) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-10 text-right flex-shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leads table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h4 className="font-semibold text-sc-forest text-sm">Leads capturados</h4>
          <button
            onClick={fetchLeads}
            className="text-xs text-sc-periwinkle hover:text-sc-forest transition-colors flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Actualizar
          </button>
        </div>
        {leads.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            Aún no hay leads registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Premio</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cupón</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sc-forest font-medium truncate max-w-[180px]">{lead.email}</td>
                    <td className="px-4 py-3 text-gray-600">{lead.name ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sc-forest/10 text-sc-forest">
                        {lead.prize ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{lead.coupon_code ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        lead.verification_status === 'verified'
                          ? 'bg-green-100 text-green-700'
                          : lead.verification_status === 'rejected' ?'bg-red-100 text-red-700' :'bg-yellow-100 text-yellow-700'
                      }`}>
                        {lead.verification_status === 'verified' ? '✓ Verificado' : lead.verification_status === 'rejected' ? '✗ Rechazado' : '⏳ Pendiente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(lead.created_at))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Settings Section ─────────────────────────────────────────
interface SettingsSectionProps {
  settingId: string | null;
  initialForm: SpinToWinSettings;
  onSaved: () => void;
}

function SettingsSection({ settingId, initialForm, onSaved }: SettingsSectionProps) {
  const supabase = createClient();
  const [form, setForm] = useState<SpinToWinSettings>(initialForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [prizeError, setPrizeError] = useState<string | null>(null);

  useEffect(() => { setForm(initialForm); }, [settingId, initialForm]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const totalWeight = form.prizes.reduce((s, p) => s + p.weight, 0);

  const handlePrizeChange = (idx: number, field: keyof SpinPrize, val: string | number | null) => {
    setForm(f => {
      const prizes = f.prizes.map((p, i) => i === idx ? { ...p, [field]: val } : p);
      return { ...f, prizes };
    });
    setPrizeError(null);
  };

  const handleSave = async () => {
    if (totalWeight !== 100) {
      setPrizeError(`Las probabilidades deben sumar 100. Suma actual: ${totalWeight}`);
      return;
    }
    setSaving(true);
    try {
      const value = form as unknown as Record<string, unknown>;
      if (settingId) {
        const { error } = await supabase.from('settings').update({ value }).eq('id', settingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('settings').insert({
          key: 'spin_to_win',
          value,
          description: 'Configuración del popup Spin to Win.',
          is_public: true,
        });
        if (error) throw error;
      }
      showToast('Configuración guardada correctamente');
      onSaved();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error al guardar');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-sc-forest text-white px-4 py-3 rounded-xl shadow-lg text-sm animate-slide-up">
          {toast}
        </div>
      )}

      {/* Enable/disable + triggers */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-sc-forest/5">
          <div className="w-10 h-10 rounded-full bg-sc-forest flex items-center justify-center flex-shrink-0">
            <span className="text-xl">🎰</span>
          </div>
          <div>
            <h3 className="font-bold text-sc-forest">Spin to Win</h3>
            <p className="text-gray-500 text-xs">Popup de ruleta de premios para captura de leads</p>
          </div>
        </div>
        <div className="px-6 py-2">
          <Toggle
            checked={form.enabled}
            onChange={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
            label="Popup activo"
          />
          <Toggle
            checked={form.exit_intent}
            onChange={() => setForm(f => ({ ...f, exit_intent: !f.exit_intent }))}
            label="Exit-intent (escritorio)"
          />
        </div>
      </div>

      {/* Timing */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h4 className="font-semibold text-sc-forest text-sm">Temporización</h4>
        </div>
        <div className="px-6 py-5">
          <label className="block text-sm font-medium text-sc-forest mb-1">
            Delay antes de mostrar el popup <span className="text-gray-400 font-normal">(segundos)</span>
          </label>
          <input
            type="number"
            min={0}
            max={60}
            value={form.delay_seconds}
            onChange={e => setForm(f => ({ ...f, delay_seconds: Number(e.target.value) }))}
            className="w-32 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
          />
        </div>
      </div>

      {/* Texts */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h4 className="font-semibold text-sc-forest text-sm">Textos del popup</h4>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-sc-forest mb-1">Título</label>
            <input
              type="text"
              value={form.popup_title}
              onChange={e => setForm(f => ({ ...f, popup_title: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-sc-forest mb-1">Subtítulo</label>
            <textarea
              value={form.popup_subtitle}
              onChange={e => setForm(f => ({ ...f, popup_subtitle: e.target.value }))}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Coupon settings */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h4 className="font-semibold text-sc-forest text-sm">Configuración de cupones</h4>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-sc-forest mb-1">
              Expiración del cupón <span className="text-gray-400 font-normal">(días)</span>
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={form.coupon_expiration_days}
              onChange={e => setForm(f => ({ ...f, coupon_expiration_days: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-sc-forest mb-1">
              Compra mínima <span className="text-gray-400 font-normal">(COP)</span>
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              value={form.minimum_purchase}
              onChange={e => setForm(f => ({ ...f, minimum_purchase: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
            />
          </div>
        </div>
      </div>

      {/* Prize probabilities */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-sc-forest text-sm">Probabilidades de premios</h4>
            <p className="text-gray-400 text-xs mt-0.5">Los pesos deben sumar exactamente 100.</p>
          </div>
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${totalWeight === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            Suma: {totalWeight}
          </span>
        </div>
        <div className="px-6 py-4 space-y-3">
          {form.prizes.map((prize, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-5 flex-shrink-0">{idx + 1}</span>
              <input
                type="text"
                value={prize.label}
                onChange={e => handlePrizeChange(idx, 'label', e.target.value)}
                placeholder="Etiqueta"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
              />
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <label className="text-xs text-gray-500">Peso</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={prize.weight}
                  onChange={e => handlePrizeChange(idx, 'weight', Number(e.target.value))}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
                />
              </div>
            </div>
          ))}
          {prizeError && (
            <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">{prizeError}</p>
          )}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-sc-forest text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-sc-darkforest transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {saving && (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
            </svg>
          )}
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function SpinToWinAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'settings' | 'stats'>('settings');
  const [settingId, setSettingId] = useState<string | null>(null);
  const [initialForm, setInitialForm] = useState<SpinToWinSettings>(DEFAULT_SPIN_SETTINGS);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    if (!authLoading && profile?.role !== 'admin' && profile?.role !== 'staff') {
      router.replace('/admin');
    }
  }, [authLoading, profile, router]);

  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    const { data } = await supabase
      .from('settings')
      .select('id, value')
      .eq('key', 'spin_to_win')
      .single();

    if (data) {
      setSettingId(data.id);
      const raw = data.value as Partial<SpinToWinSettings>;
      setInitialForm({
        enabled:                raw.enabled                ?? DEFAULT_SPIN_SETTINGS.enabled,
        delay_seconds:          raw.delay_seconds          ?? DEFAULT_SPIN_SETTINGS.delay_seconds,
        exit_intent:            raw.exit_intent            ?? DEFAULT_SPIN_SETTINGS.exit_intent,
        popup_title:            raw.popup_title            ?? DEFAULT_SPIN_SETTINGS.popup_title,
        popup_subtitle:         raw.popup_subtitle         ?? DEFAULT_SPIN_SETTINGS.popup_subtitle,
        coupon_expiration_days: raw.coupon_expiration_days ?? DEFAULT_SPIN_SETTINGS.coupon_expiration_days,
        minimum_purchase:       raw.minimum_purchase       ?? DEFAULT_SPIN_SETTINGS.minimum_purchase,
        prizes: Array.isArray(raw.prizes) && raw.prizes.length > 0
          ? raw.prizes
          : DEFAULT_SPIN_SETTINGS.prizes,
      });
    }
    setLoadingSettings(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  if (authLoading || loadingSettings) {
    return (
      <AdminLayout title="Marketing — Spin to Win">
        <div className="flex items-center justify-center py-24">
          <svg className="animate-spin w-8 h-8 text-sc-forest" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
          </svg>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Marketing — Spin to Win"
      subtitle="Configura el popup de ruleta y consulta los leads capturados"
    >
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'settings' ?'bg-white text-sc-forest shadow-sm' :'text-gray-500 hover:text-sc-forest'
          }`}
        >
          ⚙️ Configuración
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'stats' ?'bg-white text-sc-forest shadow-sm' :'text-gray-500 hover:text-sc-forest'
          }`}
        >
          📊 Estadísticas y Leads
        </button>
      </div>

      {activeTab === 'settings' && (
        <SettingsSection
          settingId={settingId}
          initialForm={initialForm}
          onSaved={fetchSettings}
        />
      )}

      {activeTab === 'stats' && <StatsSection />}
    </AdminLayout>
  );
}
