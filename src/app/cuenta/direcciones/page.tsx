'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import CuentaLayout from '@/components/cuenta/CuentaLayout';
import { createClient } from '@/lib/supabase/client';
import type { DbDireccion } from '@/lib/payment/types';

// ─── Country & Region Data ────────────────────────────────────────────────────

type SupportedCountry = 'CO' | 'CR';

const COUNTRY_OPTIONS: { code: SupportedCountry; name: string; flag: string }[] = [
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
];

const COUNTRY_NAMES: Record<SupportedCountry, string> = {
  CO: 'Colombia',
  CR: 'Costa Rica',
};

const COLOMBIA_DEPARTMENTS = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá',
  'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba',
  'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena',
  'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda',
  'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima',
  'Valle del Cauca', 'Vaupés', 'Vichada',
];

const COSTA_RICA_PROVINCES = [
  'San José', 'Alajuela', 'Cartago', 'Heredia',
  'Guanacaste', 'Puntarenas', 'Limón',
];

const REGIONS: Record<SupportedCountry, string[]> = {
  CO: COLOMBIA_DEPARTMENTS,
  CR: COSTA_RICA_PROVINCES,
};

const REGION_LABEL: Record<SupportedCountry, string> = {
  CO: 'Departamento',
  CR: 'Provincia',
};

const PHONE_PLACEHOLDER: Record<SupportedCountry, string> = {
  CO: '+57 300 000 0000',
  CR: '+506 8000 0000',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface DireccionForm {
  label: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state_province: string;
  postal_code: string;
  country_code: SupportedCountry;
  is_default: boolean;
}

const EMPTY_FORM: DireccionForm = {
  label: '',
  full_name: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state_province: '',
  postal_code: '',
  country_code: 'CO',
  is_default: false,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function InputField({
  label, id, value, onChange, placeholder, required,
}: {
  label: string; id: string; value: string;
  onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sc-forest text-xs font-medium mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-sc-border rounded-sm2 text-sc-forest text-sm bg-white placeholder-sc-muted/60 focus:outline-none focus:border-sc-forest transition-colors"
      />
    </div>
  );
}

function SelectField({
  label, id, value, onChange, options, required, placeholder,
}: {
  label: string; id: string; value: string;
  onChange: (v: string) => void; options: string[];
  required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sc-forest text-xs font-medium mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-sc-border rounded-sm2 text-sc-forest text-sm bg-white focus:outline-none focus:border-sc-forest transition-colors appearance-none"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function AddressSkeleton() {
  return (
    <div className="bg-white border border-sc-border rounded-card p-5 animate-pulse space-y-3">
      <div className="h-4 bg-sc-beige rounded w-1/3" />
      <div className="h-3 bg-sc-beige rounded w-2/3" />
      <div className="h-3 bg-sc-beige rounded w-1/2" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DireccionesPage() {
  const { user, profile } = useAuth();
  const supabase = useRef(createClient()).current;

  const [addresses, setAddresses] = useState<DbDireccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DireccionForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const loadAddresses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('addresses')
        .select('*')
        .eq('profile_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (dbError) throw new Error(dbError.message);
      setAddresses((data as DbDireccion[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando direcciones');
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => { loadAddresses(); }, [loadAddresses]);

  // When country changes in form, reset state_province
  const handleCountryChange = (code: string) => {
    setForm(p => ({ ...p, country_code: code as SupportedCountry, state_province: '' }));
  };

  const openNew = () => {
    const defaultCountry = (profile?.countryCode as SupportedCountry) || 'CO';
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      full_name: profile?.fullName || '',
      phone: profile?.phone || '',
      country_code: defaultCountry,
    });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (addr: DbDireccion) => {
    setEditingId(addr.id);
    setForm({
      label: addr.label,
      full_name: addr.full_name,
      phone: addr.phone || '',
      address_line1: addr.address_line1,
      address_line2: addr.address_line2 || '',
      city: addr.city,
      state_province: addr.state_province,
      postal_code: addr.postal_code || '',
      country_code: (addr.country_code as SupportedCountry) || 'CO',
      is_default: addr.is_default,
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.full_name.trim() || !form.address_line1.trim() || !form.city.trim() || !form.state_province.trim()) {
      setFormError('Completa los campos obligatorios.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      // If setting as default, unset others first
      if (form.is_default) {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('profile_id', user.id);
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from('addresses')
          .update({
            label: form.label.trim() || 'Casa',
            full_name: form.full_name.trim(),
            phone: form.phone.trim() || null,
            address_line1: form.address_line1.trim(),
            address_line2: form.address_line2.trim() || null,
            city: form.city.trim(),
            state_province: form.state_province.trim(),
            postal_code: form.postal_code.trim() || null,
            country_code: form.country_code,
            is_default: form.is_default,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);
        if (updateError) throw new Error(updateError.message);
      } else {
        const { error: insertError } = await supabase
          .from('addresses')
          .insert({
            profile_id: user.id,
            country_code: form.country_code,
            label: form.label.trim() || 'Casa',
            full_name: form.full_name.trim(),
            phone: form.phone.trim() || null,
            address_line1: form.address_line1.trim(),
            address_line2: form.address_line2.trim() || null,
            city: form.city.trim(),
            state_province: form.state_province.trim(),
            postal_code: form.postal_code.trim() || null,
            is_default: form.is_default,
          });
        if (insertError) throw new Error(insertError.message);
      }

      await loadAddresses();
      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error guardando dirección');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta dirección?')) return;
    setDeletingId(id);
    try {
      const { error: delError } = await supabase.from('addresses').delete().eq('id', id);
      if (delError) throw new Error(delError.message);
      await loadAddresses();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error eliminando dirección');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    setSettingDefaultId(id);
    try {
      await supabase.from('addresses').update({ is_default: false }).eq('profile_id', user.id);
      await supabase.from('addresses').update({ is_default: true, updated_at: new Date().toISOString() }).eq('id', id);
      await loadAddresses();
    } catch {
      alert('Error actualizando dirección predeterminada');
    } finally {
      setSettingDefaultId(null);
    }
  };

  const selectedCountry = form.country_code as SupportedCountry;
  const regionOptions = REGIONS[selectedCountry] || [];
  const regionLabel = REGION_LABEL[selectedCountry] || 'Provincia / Departamento';

  return (
    <CuentaLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-sc-forest tracking-tight">Mis Direcciones</h1>
            <p className="text-sc-muted text-sm mt-1">Gestiona tus direcciones de envío</p>
          </div>
          {!showForm && (
            <button
              onClick={openNew}
              className="bg-sc-forest text-sc-cream px-4 py-2 rounded-pill text-sm font-medium hover:bg-sc-darkforest transition-colors flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Nueva dirección
            </button>
          )}
        </div>

        {/* ── Form ─────────────────────────────────────────────────────── */}
        {showForm && (
          <form onSubmit={handleSave} className="bg-white border border-sc-border rounded-card p-6 mb-6 animate-slide-up">
            <h2 className="text-sc-forest font-semibold text-base mb-5">
              {editingId ? 'Editar dirección' : 'Nueva dirección'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Country selector */}
              <div className="sm:col-span-2">
                <label className="block text-sc-forest text-xs font-medium mb-1">
                  País<span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="flex gap-3">
                  {COUNTRY_OPTIONS.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleCountryChange(c.code)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-sm2 border text-sm font-medium transition-colors ${
                        form.country_code === c.code
                          ? 'border-sc-forest bg-sc-forest/5 text-sc-forest'
                          : 'border-sc-border bg-white text-sc-muted hover:border-sc-forest/40'
                      }`}
                    >
                      <span>{c.flag}</span>
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <InputField
                label="Etiqueta (ej: Casa, Oficina)"
                id="label"
                value={form.label}
                onChange={(v) => setForm(p => ({ ...p, label: v }))}
                placeholder="Casa"
              />
              <InputField
                label="Nombre completo"
                id="full_name"
                value={form.full_name}
                onChange={(v) => setForm(p => ({ ...p, full_name: v }))}
                required
              />
              <InputField
                label="Teléfono"
                id="phone"
                value={form.phone}
                onChange={(v) => setForm(p => ({ ...p, phone: v }))}
                placeholder={PHONE_PLACEHOLDER[selectedCountry]}
              />
              <InputField
                label="Dirección línea 1"
                id="address_line1"
                value={form.address_line1}
                onChange={(v) => setForm(p => ({ ...p, address_line1: v }))}
                required
                placeholder="Calle, número, barrio"
              />
              <InputField
                label="Dirección línea 2"
                id="address_line2"
                value={form.address_line2}
                onChange={(v) => setForm(p => ({ ...p, address_line2: v }))}
                placeholder="Apto, piso, torre (opcional)"
              />
              <InputField
                label="Ciudad"
                id="city"
                value={form.city}
                onChange={(v) => setForm(p => ({ ...p, city: v }))}
                required
              />

              {/* Province / Department dropdown */}
              <SelectField
                label={regionLabel}
                id="state_province"
                value={form.state_province}
                onChange={(v) => setForm(p => ({ ...p, state_province: v }))}
                options={regionOptions}
                required
                placeholder={`Selecciona ${regionLabel.toLowerCase()}`}
              />

              <InputField
                label="Código postal"
                id="postal_code"
                value={form.postal_code}
                onChange={(v) => setForm(p => ({ ...p, postal_code: v }))}
              />
            </div>

            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm(p => ({ ...p, is_default: e.target.checked }))}
                className="w-4 h-4 rounded border-sc-border text-sc-forest focus:ring-sc-forest"
              />
              <span className="text-sc-forest text-sm">Establecer como dirección predeterminada</span>
            </label>

            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-sm2 px-4 py-3 text-red-700 text-sm mb-4" role="alert">
                {formError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-sc-forest text-sc-cream px-5 py-2.5 rounded-pill text-sm font-medium hover:bg-sc-darkforest transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {saving && (
                  <span className="w-4 h-4 border-2 border-sc-cream border-t-transparent rounded-full animate-spin" />
                )}
                {saving ? 'Guardando...' : 'Guardar dirección'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="px-5 py-2.5 border border-sc-border rounded-pill text-sm font-medium text-sc-forest hover:bg-sc-beige transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* ── Address list ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(3)].map((_, i) => <AddressSkeleton key={i} />)}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-card p-5 text-red-700 text-sm">{error}</div>
        ) : addresses.length === 0 && !showForm ? (
          <div className="bg-white border border-sc-border rounded-card py-16 text-center">
            <p className="text-4xl mb-3">📍</p>
            <p className="text-sc-forest font-semibold mb-1">No tienes direcciones guardadas</p>
            <p className="text-sc-muted text-sm mb-5">Agrega una dirección para agilizar tus compras</p>
            <button
              onClick={openNew}
              className="bg-sc-forest text-sc-cream px-5 py-2.5 rounded-pill text-sm font-medium hover:bg-sc-darkforest transition-colors"
            >
              Agregar dirección
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {addresses.map((addr) => {
              const countryName = COUNTRY_NAMES[(addr.country_code as SupportedCountry)] || addr.country_code;
              const countryFlag = COUNTRY_OPTIONS.find(c => c.code === addr.country_code)?.flag || '🌎';
              return (
                <div
                  key={addr.id}
                  className={`bg-white border rounded-card p-5 relative transition-all ${
                    addr.is_default ? 'border-sc-forest ring-1 ring-sc-forest' : 'border-sc-border'
                  }`}
                >
                  {addr.is_default && (
                    <span className="absolute top-3 right-3 bg-sc-forest text-sc-cream text-[10px] font-bold px-2 py-0.5 rounded-badge uppercase tracking-wide">
                      Predeterminada
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-sc-forest font-semibold text-sm">{addr.label || 'Dirección'}</p>
                  </div>
                  <p className="text-sc-forest text-sm">{addr.full_name}</p>
                  <p className="text-sc-muted text-xs mt-1">{addr.address_line1}</p>
                  {addr.address_line2 && <p className="text-sc-muted text-xs">{addr.address_line2}</p>}
                  <p className="text-sc-muted text-xs">{addr.city}, {addr.state_province}</p>
                  {addr.postal_code && <p className="text-sc-muted text-xs">{addr.postal_code}</p>}
                  <p className="text-sc-muted text-xs mt-0.5 flex items-center gap-1">
                    <span>{countryFlag}</span>
                    <span>{countryName}</span>
                  </p>
                  {addr.phone && <p className="text-sc-muted text-xs mt-1">{addr.phone}</p>}

                  <div className="flex items-center gap-3 mt-4 pt-3 border-t border-sc-border/50">
                    <button
                      onClick={() => openEdit(addr)}
                      className="text-sc-periwinkle text-xs font-medium hover:underline"
                    >
                      Editar
                    </button>
                    {!addr.is_default && (
                      <button
                        onClick={() => handleSetDefault(addr.id)}
                        disabled={settingDefaultId === addr.id}
                        className="text-sc-forest text-xs font-medium hover:underline disabled:opacity-60"
                      >
                        {settingDefaultId === addr.id ? 'Actualizando...' : 'Predeterminar'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(addr.id)}
                      disabled={deletingId === addr.id}
                      className="text-red-500 text-xs font-medium hover:underline ml-auto disabled:opacity-60"
                    >
                      {deletingId === addr.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CuentaLayout>
  );
}
