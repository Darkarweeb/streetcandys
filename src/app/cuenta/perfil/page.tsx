'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import CuentaLayout from '@/components/cuenta/CuentaLayout';
import { createClient } from '@/lib/supabase/client';
import type { DbDireccion } from '@/lib/payment/types';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface ProfileFormData {
  fullName: string;
  phone: string;
  dateOfBirth: string;
}

interface PasswordFormData {
  newPassword: string;
  confirmPassword: string;
}

interface RecentOrder {
  id: string;
  order_number: string;
  status: string;
  total: number;
  currency_code: string;
  created_at: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Pendiente',    color: 'bg-yellow-100 text-yellow-800' },
  confirmed:  { label: 'Confirmado',   color: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Procesando',   color: 'bg-purple-100 text-purple-800' },
  preparing:  { label: 'Preparando',   color: 'bg-orange-100 text-orange-800' },
  ready:      { label: 'Listo',        color: 'bg-teal-100 text-teal-800' },
  shipped:    { label: 'Enviado',      color: 'bg-indigo-100 text-indigo-800' },
  delivered:  { label: 'Entregado',    color: 'bg-green-100 text-green-800' },
  cancelled:  { label: 'Cancelado',    color: 'bg-red-100 text-red-800' },
  refunded:   { label: 'Reembolsado',  color: 'bg-gray-100 text-gray-700' },
};

function formatCurrency(amount: number, currency: string) {
  const symbol = currency === 'CRC' ? '₡' : '$';
  try {
    return `${symbol}${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(amount)}`;
  } catch {
    return `${symbol}${amount}`;
  }
}

function formatDate(dateStr: string) {
  try {
    return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function InputField({
  label, id, type = 'text', value, onChange, disabled, placeholder, required,
}: {
  label: string; id: string; type?: string; value: string;
  onChange: (v: string) => void; disabled?: boolean; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sc-forest text-sm font-medium mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-sc-border rounded-sm2 text-sc-forest text-sm bg-white placeholder-sc-muted/60 focus:outline-none focus:border-sc-forest transition-colors disabled:bg-sc-beige disabled:cursor-not-allowed"
      />
    </div>
  );
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white border border-sc-border rounded-card overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-sc-border">
        <h2 className="text-sc-forest font-semibold text-base">{title}</h2>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Alert({ type, message }: { type: 'error' | 'success'; message: string }) {
  const styles = type === 'error' ?'bg-red-50 border-red-200 text-red-700' :'bg-green-50 border-green-200 text-green-700';
  return (
    <div className={`border rounded-sm2 px-4 py-3 text-sm mb-4 ${styles}`} role={type === 'error' ? 'alert' : 'status'}>
      {message}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function PerfilPage() {
  const { profile, user, refreshProfile, updatePassword, signOut } = useAuth();
  const supabase = useRef(createClient()).current;
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Profile form */
  const [profileForm, setProfileForm] = useState<ProfileFormData>({ fullName: '', phone: '', dateOfBirth: '' });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  /* Password form */
  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({ newPassword: '', confirmPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  /* Addresses */
  const [addresses, setAddresses] = useState<DbDireccion[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  /* Orders */
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  /* Account settings */
  const [signingOut, setSigningOut] = useState(false);

  /* ── Init ── */
  useEffect(() => {
    if (profile) {
      setProfileForm({
        fullName: profile.fullName || '',
        phone: profile.phone || '',
        dateOfBirth: profile.dateOfBirth || '',
      });
      setAvatarPreview(profile.avatarUrl || null);
    }
  }, [profile]);

  const loadAddresses = useCallback(async () => {
    if (!user) return;
    setLoadingAddresses(true);
    try {
      const { data } = await supabase
        .from('addresses')
        .select('*')
        .eq('profile_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3);
      setAddresses((data as DbDireccion[]) || []);
    } catch {
      // non-critical
    } finally {
      setLoadingAddresses(false);
    }
  }, [user, supabase]);

  const loadRecentOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch('/api/ordenes?pagina=1&por_pagina=3');
      const data = await res.json();
      if (data.exito) setRecentOrders(data.datos || []);
    } catch {
      // non-critical
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
    loadRecentOrders();
  }, [loadAddresses, loadRecentOrders]);

  /* ── Avatar ── */
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setProfileError('La imagen no puede superar 2 MB.'); return; }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  /* ── Save profile ── */
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setSavingProfile(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      let avatarUrl = profile.avatarUrl;
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const path = `avatars/${user.id}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true });
        if (uploadError) throw new Error('Error subiendo imagen: ' + uploadError.message);
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.fullName.trim(),
          phone: profileForm.phone.trim() || null,
          date_of_birth: profileForm.dateOfBirth || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (error) throw new Error(error.message);
      await refreshProfile();
      setProfileSuccess('Perfil actualizado correctamente.');
      setAvatarFile(null);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Error actualizando perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  /* ── Change password ── */
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (passwordForm.newPassword.length < 8) { setPasswordError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { setPasswordError('Las contraseñas no coinciden.'); return; }
    setSavingPassword(true);
    try {
      await updatePassword(passwordForm.newPassword);
      setPasswordSuccess('Contraseña actualizada correctamente.');
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Error actualizando contraseña.');
    } finally {
      setSavingPassword(false);
    }
  };

  /* ── Sign out ── */
  const handleSignOut = async () => {
    if (!confirm('¿Cerrar sesión?')) return;
    setSigningOut(true);
    try { await signOut(); } catch { setSigningOut(false); }
  };

  const initials = profile?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U';
  const isGuest = !profile?.role || profile.role === 'customer';

  return (
    <CuentaLayout>
      <div className="animate-fade-in space-y-6">

        {/* ── Page header ── */}
        <div>
          <h1 className="text-2xl font-bold text-sc-forest tracking-tight">Mi Perfil</h1>
          <p className="text-sc-muted text-sm mt-1">Gestiona tu información personal y preferencias de cuenta</p>
        </div>

        {/* ── Customer summary card ── */}
        <div className="bg-white border border-sc-border rounded-card p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-full bg-sc-forest flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Foto de perfil" className="w-20 h-20 object-cover" />
                ) : (
                  <span className="text-sc-cream text-2xl font-bold">{initials}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-sc-forest text-sc-cream rounded-full flex items-center justify-center hover:bg-sc-darkforest transition-colors"
                aria-label="Cambiar foto de perfil"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} aria-label="Subir foto de perfil" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-sc-forest font-bold text-lg leading-tight">{profile?.fullName || 'Sin nombre'}</h2>
                {profile?.role === 'admin' && (
                  <span className="bg-sc-forest text-sc-cream text-xs font-semibold px-2 py-0.5 rounded-badge">Admin</span>
                )}
                {isGuest && profile?.ageVerified && (
                  <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-badge">Verificado ✓</span>
                )}
              </div>
              <p className="text-sc-muted text-sm">{user?.email}</p>
              {profile?.phone && <p className="text-sc-muted text-sm mt-0.5">{profile.phone}</p>}
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-sc-muted">
                {profile?.countryCode && (
                  <span>{profile.countryCode === 'CO' ? '🇨🇴 Colombia' : '🇨🇷 Costa Rica'}</span>
                )}
                {profile?.createdAt && (
                  <span>Miembro desde {new Date(profile.createdAt).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</span>
                )}
                {profile?.referralCode && (
                  <span className="font-mono bg-sc-beige px-1.5 py-0.5 rounded">Ref: {profile.referralCode}</span>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              <Link href="/cuenta/pedidos" className="text-sc-periwinkle text-xs font-medium hover:underline flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="2" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4 2V1.5a.5.5 0 011 0V2M7 2V1.5a.5.5 0 011 0V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                Ver pedidos
              </Link>
              <Link href="/cuenta/direcciones" className="text-sc-periwinkle text-xs font-medium hover:underline flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1C4.343 1 3 2.343 3 4c0 2.5 3 7 3 7s3-4.5 3-7c0-1.657-1.343-3-3-3zm0 4a1 1 0 110-2 1 1 0 010 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                Mis direcciones
              </Link>
            </div>
          </div>
        </div>

        {/* ── Personal info form ── */}
        <form onSubmit={handleSaveProfile}>
          <SectionCard title="Información personal">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <InputField label="Nombre completo" id="fullName" value={profileForm.fullName} onChange={(v) => setProfileForm(p => ({ ...p, fullName: v }))} required placeholder="Tu nombre completo" />
              <div>
                <label className="block text-sc-forest text-sm font-medium mb-1.5">
                  Correo electrónico
                </label>
                <div className="w-full px-4 py-2.5 border border-sc-border rounded-sm2 text-sc-forest text-sm bg-sc-beige flex items-center justify-between">
                  <span className="truncate">{user?.email}</span>
                  <span className="text-sc-muted text-xs ml-2 flex-shrink-0">No editable</span>
                </div>
              </div>
              <InputField label="Teléfono" id="phone" type="tel" value={profileForm.phone} onChange={(v) => setProfileForm(p => ({ ...p, phone: v }))} placeholder="+506 8888 0000" />
              <InputField label="Fecha de nacimiento" id="dateOfBirth" type="date" value={profileForm.dateOfBirth} onChange={(v) => setProfileForm(p => ({ ...p, dateOfBirth: v }))} />
              <div>
                <label className="block text-sc-forest text-sm font-medium mb-1.5">País</label>
                <div className="w-full px-4 py-2.5 border border-sc-border rounded-sm2 text-sc-forest text-sm bg-sc-beige flex items-center justify-between">
                  <span>{profile?.countryCode === 'CO' ? '🇨🇴 Colombia' : profile?.countryCode === 'CR' ? '🇨🇷 Costa Rica' : '—'}</span>
                  <span className="text-sc-muted text-xs">No editable</span>
                </div>
              </div>
            </div>

            {profileError && <Alert type="error" message={profileError} />}
            {profileSuccess && <Alert type="success" message={profileSuccess} />}

            <button
              type="submit"
              disabled={savingProfile}
              className="bg-sc-forest text-sc-cream px-6 py-2.5 rounded-pill text-sm font-medium hover:bg-sc-darkforest transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {savingProfile && <span className="w-4 h-4 border-2 border-sc-cream border-t-transparent rounded-full animate-spin" />}
              {savingProfile ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </SectionCard>
        </form>

        {/* ── Saved addresses preview ── */}
        <SectionCard
          title="Direcciones guardadas"
          action={
            <Link href="/cuenta/direcciones" className="text-sc-periwinkle text-sm font-medium hover:underline flex items-center gap-1">
              Gestionar
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          }
        >
          {loadingAddresses ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="animate-pulse h-16 bg-sc-beige rounded-sm2" />
              ))}
            </div>
          ) : addresses.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-3xl mb-2">📍</p>
              <p className="text-sc-forest text-sm font-medium mb-1">Sin direcciones guardadas</p>
              <p className="text-sc-muted text-xs mb-4">Agrega una dirección para agilizar tus pedidos</p>
              <Link
                href="/cuenta/direcciones"
                className="inline-block bg-sc-forest text-sc-cream px-4 py-2 rounded-pill text-xs font-medium hover:bg-sc-darkforest transition-colors"
              >
                Agregar dirección
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div key={addr.id} className="flex items-start justify-between gap-3 p-4 border border-sc-border rounded-sm2 bg-sc-beige/30">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-sc-forest/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-sc-forest">
                        <path d="M7 1C5.067 1 3.5 2.567 3.5 4.5c0 2.917 3.5 8.167 3.5 8.167S10.5 7.417 10.5 4.5C10.5 2.567 8.933 1 7 1zm0 4.667a1.167 1.167 0 110-2.334 1.167 1.167 0 010 2.334z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sc-forest text-sm font-semibold">{addr.label || 'Dirección'}</span>
                        {addr.is_default && (
                          <span className="bg-sc-forest text-sc-cream text-xs px-1.5 py-0.5 rounded-badge font-medium">Principal</span>
                        )}
                      </div>
                      <p className="text-sc-muted text-xs mt-0.5 truncate">{addr.full_name} · {addr.address_line1}</p>
                      <p className="text-sc-muted text-xs">{addr.city}, {addr.state_province}</p>
                    </div>
                  </div>
                  <Link href="/cuenta/direcciones" className="text-sc-periwinkle text-xs font-medium hover:underline flex-shrink-0">
                    Editar
                  </Link>
                </div>
              ))}
              <Link
                href="/cuenta/direcciones"
                className="flex items-center gap-2 text-sc-periwinkle text-sm font-medium hover:underline mt-1"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                Agregar nueva dirección
              </Link>
            </div>
          )}
        </SectionCard>

        {/* ── Order history ── */}
        <SectionCard
          title="Historial de pedidos"
          action={
            <Link href="/cuenta/pedidos" className="text-sc-periwinkle text-sm font-medium hover:underline flex items-center gap-1">
              Ver todos
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          }
        >
          {loadingOrders ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center justify-between gap-4 py-3 border-b border-sc-border/50 last:border-0">
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 bg-sc-beige rounded w-28" />
                    <div className="h-3 bg-sc-beige rounded w-20" />
                  </div>
                  <div className="h-6 bg-sc-beige rounded w-20" />
                </div>
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-3xl mb-2">📦</p>
              <p className="text-sc-forest text-sm font-medium mb-1">Sin pedidos aún</p>
              <p className="text-sc-muted text-xs mb-4">Cuando realices tu primera compra, aparecerá aquí.</p>
              <Link
                href="/productos"
                className="inline-block bg-sc-forest text-sc-cream px-4 py-2 rounded-pill text-xs font-medium hover:bg-sc-darkforest transition-colors"
              >
                Explorar productos
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-sc-border/50">
              {recentOrders.map((orden) => {
                const estado = ESTADO_LABELS[orden.status] || { label: orden.status, color: 'bg-gray-100 text-gray-700' };
                return (
                  <Link
                    key={orden.id}
                    href={`/cuenta/pedidos/${orden.id}`}
                    className="flex items-center justify-between gap-4 py-3.5 hover:bg-sc-beige/30 -mx-6 px-6 transition-colors"
                  >
                    <div>
                      <p className="text-sc-forest text-sm font-semibold">#{orden.order_number}</p>
                      <p className="text-sc-muted text-xs mt-0.5">{formatDate(orden.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-badge text-xs font-medium ${estado.color}`}>{estado.label}</span>
                      <span className="text-sc-forest text-sm font-semibold">{formatCurrency(orden.total, orden.currency_code)}</span>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-sc-muted flex-shrink-0">
                        <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* ── Account info ── */}
        <SectionCard title="Información de cuenta">
          <div className="space-y-0 divide-y divide-sc-border/50">
            {[
              { label: 'Correo electrónico', value: user?.email || '—' },
              { label: 'Código de referido', value: profile?.referralCode || '—', mono: true },
              { label: 'Verificación de edad', value: profile?.ageVerified ? 'Verificado ✓' : 'Pendiente', highlight: profile?.ageVerified ? 'text-green-600' : 'text-amber-600' },
              { label: 'Estado de cuenta', value: profile?.isActive ? 'Activa' : 'Inactiva', highlight: profile?.isActive ? 'text-green-600' : 'text-red-600' },
              { label: 'Miembro desde', value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : '—' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-3 text-sm">
                <span className="text-sc-muted">{row.label}</span>
                <span className={`font-medium ${row.highlight || 'text-sc-forest'} ${row.mono ? 'font-mono text-xs bg-sc-beige px-2 py-0.5 rounded' : ''}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Security / Password ── */}
        <form onSubmit={handleChangePassword}>
          <SectionCard title="Seguridad">
            <p className="text-sc-muted text-sm mb-4">Actualiza tu contraseña periódicamente para mantener tu cuenta segura.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <InputField label="Nueva contraseña" id="newPassword" type="password" value={passwordForm.newPassword} onChange={(v) => setPasswordForm(p => ({ ...p, newPassword: v }))} required placeholder="Mínimo 8 caracteres" />
              <InputField label="Confirmar contraseña" id="confirmPassword" type="password" value={passwordForm.confirmPassword} onChange={(v) => setPasswordForm(p => ({ ...p, confirmPassword: v }))} required placeholder="Repite la contraseña" />
            </div>
            {passwordError && <Alert type="error" message={passwordError} />}
            {passwordSuccess && <Alert type="success" message={passwordSuccess} />}
            <button
              type="submit"
              disabled={savingPassword}
              className="bg-sc-forest text-sc-cream px-6 py-2.5 rounded-pill text-sm font-medium hover:bg-sc-darkforest transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {savingPassword && <span className="w-4 h-4 border-2 border-sc-cream border-t-transparent rounded-full animate-spin" />}
              {savingPassword ? 'Actualizando...' : 'Cambiar contraseña'}
            </button>
          </SectionCard>
        </form>

        {/* ── Account settings ── */}
        <SectionCard title="Configuración de cuenta">
          <div className="space-y-4">
            {/* Quick links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { href: '/cuenta/notificaciones', label: 'Preferencias de notificaciones', icon: '🔔', desc: 'Gestiona alertas y correos' },
                { href: '/cuenta/recompensas', label: 'Programa de recompensas', icon: '⭐', desc: 'Puntos y beneficios' },
                { href: '/cuenta/favoritos', label: 'Productos favoritos', icon: '❤️', desc: 'Tu lista de deseos' },
                { href: '/cuenta/direcciones', label: 'Direcciones de envío', icon: '📍', desc: 'Gestiona tus direcciones' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 p-4 border border-sc-border rounded-sm2 hover:border-sc-forest hover:bg-sc-beige/30 transition-colors group"
                >
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sc-forest text-sm font-medium group-hover:text-sc-forest">{item.label}</p>
                    <p className="text-sc-muted text-xs">{item.desc}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-sc-muted ml-auto flex-shrink-0">
                    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              ))}
            </div>

            {/* Danger zone */}
            <div className="border-t border-sc-border pt-4 mt-2">
              <p className="text-sc-muted text-xs font-medium uppercase tracking-wide mb-3">Sesión</p>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex items-center gap-2 text-red-600 text-sm font-medium hover:text-red-700 transition-colors disabled:opacity-60"
              >
                {signingOut ? (
                  <span className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {signingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
              </button>
            </div>
          </div>
        </SectionCard>

      </div>
    </CuentaLayout>
  );
}
