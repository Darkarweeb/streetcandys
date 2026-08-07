'use client';
import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ShippingMethod {
  id: string;
  code: string;
  name: string;
  description: string | null;
  base_cost_co: number;
  base_cost_cr: number;
  delivery_time: string | null;
  display_order: number;
  is_active: boolean;
}

interface CountrySetting {
  id: string;
  country_code: string;
  is_enabled: boolean;
  free_shipping_threshold: number;
  currency_code: string;
  currency_symbol: string;
  tax_rate: number;
}

interface ShippingRegion {
  id: string;
  country_code: string;
  name: string;
  code: string | null;
  is_active: boolean;
}

interface ShippingRate {
  id: string;
  region_id: string;
  shipping_method_id: string;
  price: number;
  is_enabled: boolean;
  method?: { code: string; name: string };
  region?: { name: string; country_code: string };
}

interface SameDayConfig {
  id: string;
  shipping_method_id: string;
  cutoff_time: string;
  available_days: number[];
  delivery_message: string | null;
  is_active: boolean;
  method?: { code: string; name: string };
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const COUNTRY_NAMES: Record<string, string> = { CO: '🇨🇴 Colombia', CR: '🇨🇷 Costa Rica' };

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white transition-all ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {message}
    </div>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-800 text-base">{title}</h3>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-green-500' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ShippingManagementPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'methods' | 'countries' | 'regions' | 'sameday'>('methods');

  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [countrySettings, setCountrySettings] = useState<CountrySetting[]>([]);
  const [regions, setRegions] = useState<ShippingRegion[]>([]);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [sameDayConfigs, setSameDayConfigs] = useState<SameDayConfig[]>([]);

  // Region management state
  const [selectedCountry, setSelectedCountry] = useState<string>('CO');
  const [selectedRegion, setSelectedRegion] = useState<ShippingRegion | null>(null);
  const [newRegionName, setNewRegionName] = useState('');
  const [addingRegion, setAddingRegion] = useState(false);

  // New method form
  const [showNewMethod, setShowNewMethod] = useState(false);
  const [newMethod, setNewMethod] = useState({ code: '', name: '', description: '', base_cost_co: 0, base_cost_cr: 0, delivery_time: '', display_order: 99 });

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/shipping');
      const json = await res.json();
      if (json.success) {
        setMethods(json.data.methods ?? []);
        setCountrySettings(json.data.countrySettings ?? []);
        setRegions(json.data.regions ?? []);
        setRates(json.data.rates ?? []);
        setSameDayConfigs(json.data.sameDayConfig ?? []);
      }
    } catch {
      showToast('Error al cargar configuración de envíos', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const save = useCallback(async (type: string, data: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Error al guardar');
      showToast('Guardado correctamente', 'success');
      await fetchData();
    } catch (err: any) {
      showToast(err.message ?? 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  }, [fetchData, showToast]);

  // ── Methods Tab ────────────────────────────────────────────────────────────
  const renderMethodsTab = () => (
    <div className="space-y-4">
      {methods.map((method) => (
        <div key={method.id} className="border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-gray-800">{method.name}</span>
              <span className="ml-2 text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded">{method.code}</span>
            </div>
            <Toggle
              checked={method.is_active}
              onChange={(v) => save('method', { id: method.id, is_active: v })}
              label={method.is_active ? 'Activo' : 'Inactivo'}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Nombre</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
                defaultValue={method.name}
                onBlur={(e) => { if (e.target.value !== method.name) save('method', { id: method.id, name: e.target.value }); }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Descripción</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
                defaultValue={method.description ?? ''}
                onBlur={(e) => { if (e.target.value !== (method.description ?? '')) save('method', { id: method.id, description: e.target.value }); }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Tiempo de entrega</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
                defaultValue={method.delivery_time ?? ''}
                onBlur={(e) => { if (e.target.value !== (method.delivery_time ?? '')) save('method', { id: method.id, delivery_time: e.target.value }); }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Costo base CO (COP)</label>
              <input
                type="number"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
                defaultValue={method.base_cost_co}
                onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v !== method.base_cost_co) save('method', { id: method.id, base_cost_co: v }); }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Costo base CR (CRC)</label>
              <input
                type="number"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
                defaultValue={method.base_cost_cr}
                onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v !== method.base_cost_cr) save('method', { id: method.id, base_cost_cr: v }); }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Orden de visualización</label>
              <input
                type="number"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
                defaultValue={method.display_order}
                onBlur={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v !== method.display_order) save('method', { id: method.id, display_order: v }); }}
              />
            </div>
          </div>
        </div>
      ))}

      {/* Add new method */}
      {showNewMethod ? (
        <div className="border-2 border-dashed border-green-300 rounded-xl p-5 space-y-4 bg-green-50">
          <p className="font-semibold text-green-800 text-sm">Nuevo método de envío</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'code', label: 'Código (único)', type: 'text' },
              { key: 'name', label: 'Nombre', type: 'text' },
              { key: 'description', label: 'Descripción', type: 'text' },
              { key: 'delivery_time', label: 'Tiempo de entrega', type: 'text' },
              { key: 'base_cost_co', label: 'Costo base CO', type: 'number' },
              { key: 'base_cost_cr', label: 'Costo base CR', type: 'number' },
              { key: 'display_order', label: 'Orden', type: 'number' },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-gray-500 block mb-1">{label}</label>
                <input
                  type={type}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                  value={(newMethod as any)[key]}
                  onChange={(e) => setNewMethod((prev) => ({ ...prev, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (!newMethod.code || !newMethod.name) { showToast('Código y nombre son requeridos', 'error'); return; }
                save('method', { ...newMethod, is_active: true });
                setShowNewMethod(false);
                setNewMethod({ code: '', name: '', description: '', base_cost_co: 0, base_cost_cr: 0, delivery_time: '', display_order: 99 });
              }}
              className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
            >
              Guardar método
            </button>
            <button onClick={() => setShowNewMethod(false)} className="px-4 py-2 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNewMethod(true)}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl py-4 text-gray-500 text-sm font-semibold hover:border-green-400 hover:text-green-600 transition-colors"
        >
          + Agregar método de envío
        </button>
      )}
    </div>
  );

  // ── Countries Tab ──────────────────────────────────────────────────────────
  const renderCountriesTab = () => (
    <div className="space-y-6">
      {countrySettings.map((cs) => (
        <div key={cs.id} className="border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-800">{COUNTRY_NAMES[cs.country_code] ?? cs.country_code}</h4>
            <Toggle
              checked={cs.is_enabled}
              onChange={(v) => save('country_setting', { id: cs.id, is_enabled: v })}
              label={cs.is_enabled ? 'Habilitado' : 'Deshabilitado'}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Umbral envío gratis ({cs.currency_code})</label>
              <input
                type="number"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
                defaultValue={cs.free_shipping_threshold}
                onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v !== cs.free_shipping_threshold) save('country_setting', { id: cs.id, free_shipping_threshold: v }); }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Moneda (código)</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
                defaultValue={cs.currency_code}
                onBlur={(e) => { if (e.target.value !== cs.currency_code) save('country_setting', { id: cs.id, currency_code: e.target.value }); }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Símbolo moneda</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
                defaultValue={cs.currency_symbol}
                onBlur={(e) => { if (e.target.value !== cs.currency_symbol) save('country_setting', { id: cs.id, currency_symbol: e.target.value }); }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Tasa de impuesto (ej: 0.19)</label>
              <input
                type="number"
                step="0.01"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
                defaultValue={cs.tax_rate}
                onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v !== cs.tax_rate) save('country_setting', { id: cs.id, tax_rate: v }); }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // ── Regions Tab ────────────────────────────────────────────────────────────
  const renderRegionsTab = () => {
    const filteredRegions = regions.filter((r) => r.country_code === selectedCountry);
    const regionRates = selectedRegion
      ? rates.filter((r) => r.region_id === selectedRegion.id)
      : [];

    return (
      <div className="space-y-6">
        {/* Country selector */}
        <div className="flex gap-3">
          {['CO', 'CR'].map((cc) => (
            <button
              key={cc}
              onClick={() => { setSelectedCountry(cc); setSelectedRegion(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${selectedCountry === cc ? 'bg-sc-forest text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {COUNTRY_NAMES[cc]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Region list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Regiones / Departamentos</p>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-1 pr-1">
              {filteredRegions.map((region) => (
                <button
                  key={region.id}
                  onClick={() => setSelectedRegion(region.id === selectedRegion?.id ? null : region)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${selectedRegion?.id === region.id ? 'border-sc-forest bg-sc-forest/5' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <span className={`text-sm font-medium ${region.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{region.name}</span>
                  <Toggle
                    checked={region.is_active}
                    onChange={(v) => { save('region', { id: region.id, is_active: v }); }}
                  />
                </button>
              ))}
            </div>

            {/* Add region */}
            {addingRegion ? (
              <div className="flex gap-2 mt-2">
                <input
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                  placeholder="Nombre de la región"
                  value={newRegionName}
                  onChange={(e) => setNewRegionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newRegionName.trim()) {
                      save('region', { country_code: selectedCountry, name: newRegionName.trim(), is_active: true });
                      setNewRegionName('');
                      setAddingRegion(false);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newRegionName.trim()) {
                      save('region', { country_code: selectedCountry, name: newRegionName.trim(), is_active: true });
                      setNewRegionName('');
                      setAddingRegion(false);
                    }
                  }}
                  className="px-3 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700"
                >
                  Agregar
                </button>
                <button onClick={() => setAddingRegion(false)} className="px-3 py-2 text-gray-500 text-sm rounded-lg hover:bg-gray-100">
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingRegion(true)}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-gray-500 text-sm font-semibold hover:border-green-400 hover:text-green-600 transition-colors mt-2"
              >
                + Agregar región
              </button>
            )}
          </div>

          {/* Regional rates */}
          <div>
            {selectedRegion ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">Tarifas para: <span className="text-sc-forest">{selectedRegion.name}</span></p>
                {methods.map((method) => {
                  const rate = regionRates.find((r) => r.shipping_method_id === method.id);
                  return (
                    <div key={method.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">{method.name}</span>
                        <Toggle
                          checked={rate?.is_enabled ?? false}
                          onChange={(v) => {
                            if (rate) {
                              save('rate', { id: rate.id, is_enabled: v });
                            } else {
                              save('rate', { region_id: selectedRegion.id, shipping_method_id: method.id, price: selectedCountry === 'CO' ? method.base_cost_co : method.base_cost_cr, is_enabled: v });
                            }
                          }}
                          label={rate?.is_enabled ? 'Habilitado' : 'Deshabilitado'}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 block mb-1">
                          Precio ({selectedCountry === 'CO' ? 'COP' : 'CRC'})
                        </label>
                        <input
                          type="number"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                          defaultValue={rate?.price ?? (selectedCountry === 'CO' ? method.base_cost_co : method.base_cost_cr)}
                          key={`${selectedRegion.id}-${method.id}-${rate?.price}`}
                          onBlur={(e) => {
                            const v = parseFloat(e.target.value);
                            if (isNaN(v)) return;
                            if (rate) {
                              save('rate', { id: rate.id, price: v });
                            } else {
                              save('rate', { region_id: selectedRegion.id, shipping_method_id: method.id, price: v, is_enabled: true });
                            }
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                Selecciona una región para ver sus tarifas
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Same Day Tab ───────────────────────────────────────────────────────────
  const renderSameDayTab = () => {
    const config = sameDayConfigs[0] ?? null;
    if (!config) {
      return <p className="text-gray-500 text-sm">No hay configuración de envío mismo día. Asegúrate de que el método &quot;same_day&quot; exista.</p>;
    }

    return (
      <div className="space-y-6">
        <div className="border border-gray-200 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-800">Envío Mismo Día</h4>
            <Toggle
              checked={config.is_active}
              onChange={(v) => save('same_day', { id: config.id, is_active: v })}
              label={config.is_active ? 'Activo' : 'Inactivo'}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Hora de corte (HH:MM)</label>
              <input
                type="time"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
                defaultValue={config.cutoff_time.slice(0, 5)}
                onBlur={(e) => {
                  const val = e.target.value + ':00';
                  if (val !== config.cutoff_time) save('same_day', { id: config.id, cutoff_time: val });
                }}
              />
              <p className="text-xs text-gray-400 mt-1">Pedidos después de esta hora no recibirán envío mismo día</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Mensaje al cliente</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
                defaultValue={config.delivery_message ?? ''}
                onBlur={(e) => { if (e.target.value !== (config.delivery_message ?? '')) save('same_day', { id: config.id, delivery_message: e.target.value }); }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-2">Días disponibles</label>
            <div className="flex gap-2 flex-wrap">
              {DAY_LABELS.map((day, idx) => {
                const active = config.available_days.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const newDays = active
                        ? config.available_days.filter((d) => d !== idx)
                        : [...config.available_days, idx].sort();
                      save('same_day', { id: config.id, available_days: newDays });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${active ? 'bg-sc-forest text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Regional availability for same day */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">Disponibilidad por región</p>
          <p className="text-xs text-gray-500 mb-4">
            Activa o desactiva el envío mismo día por región en la pestaña <strong>Regiones</strong> — selecciona una región y ajusta la tarifa del método &quot;Envío mismo día&quot;.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rates
              .filter((r) => {
                const method = methods.find((m) => m.id === r.shipping_method_id);
                return method?.code === 'same_day';
              })
              .map((rate) => (
                <div key={rate.id} className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{rate.region?.name}</p>
                    <p className="text-xs text-gray-400">{rate.region?.country_code === 'CO' ? `$${Number(rate.price).toLocaleString('es-CO')}` : `₡${Number(rate.price).toLocaleString('es-CR')}`}</p>
                  </div>
                  <Toggle
                    checked={rate.is_enabled}
                    onChange={(v) => save('rate', { id: rate.id, is_enabled: v })}
                  />
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'methods', label: 'Métodos de envío' },
    { id: 'countries', label: 'Configuración por país' },
    { id: 'regions', label: 'Regiones y tarifas' },
    { id: 'sameday', label: 'Mismo día' },
  ] as const;

  return (
    <AdminLayout title="Gestión de Envíos" subtitle="Configura métodos, tarifas y reglas de envío">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-sc-forest border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-start gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-blue-500 flex-shrink-0 mt-0.5" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p className="text-blue-800 text-sm">
              Los cambios se aplican inmediatamente al checkout. Los pedidos existentes no se ven afectados.
              {saving && <span className="ml-2 font-semibold">Guardando...</span>}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-white text-sc-forest shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <SectionCard title={tabs.find((t) => t.id === activeTab)?.label ?? ''}>
            {activeTab === 'methods' && renderMethodsTab()}
            {activeTab === 'countries' && renderCountriesTab()}
            {activeTab === 'regions' && renderRegionsTab()}
            {activeTab === 'sameday' && renderSameDayTab()}
          </SectionCard>
        </div>
      )}
    </AdminLayout>
  );
}
