'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SetupState {
  checking: boolean;
  available: boolean;
  error: string | null;
}

interface FormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function AdminSetupPage() {
  const router = useRouter();
  const [setup, setSetup] = useState<SetupState>({ checking: true, available: false, error: null });
  const [form, setForm] = useState<FormData>({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch('/api/admin/setup');
        const data = await res.json();
        if (!data.exito) {
          setSetup({ checking: false, available: false, error: data.error || 'Error verificando estado.' });
          return;
        }
        if (data.adminExists) {
          setSetup({ checking: false, available: false, error: null });
        } else {
          setSetup({ checking: false, available: true, error: null });
        }
      } catch {
        setSetup({ checking: false, available: false, error: 'No se pudo conectar con el servidor.' });
      }
    }
    checkSetup();
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSubmitError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!form.fullName.trim()) {
      setSubmitError('El nombre completo es requerido.');
      return;
    }
    if (!form.email.trim()) {
      setSubmitError('El correo electrónico es requerido.');
      return;
    }
    if (form.password.length < 8) {
      setSubmitError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setSubmitError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
        }),
      });
      const data = await res.json();
      if (!data.exito) {
        setSubmitError(data.error || 'Error al crear la cuenta.');
        return;
      }
      setSuccess(true);
    } catch {
      setSubmitError('Error de conexión. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state
  if (setup.checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-sc-forest border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Verificando estado del sistema...</p>
        </div>
      </div>
    );
  }

  // Setup disabled — admin already exists
  if (!setup.available) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-red-500">
              <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="2"/>
              <path d="M9 9l10 10M19 9L9 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-500 text-sm mb-6">
            {setup.error || 'El sistema ya tiene un administrador configurado. Esta página está deshabilitada.'}
          </p>
          <Link
            href="/iniciar-sesion"
            className="inline-block bg-sc-forest text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-sc-forest/90 transition-colors"
          >
            Iniciar Sesión
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-green-600">
              <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="2"/>
              <path d="M8 14l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">¡Cuenta Creada!</h1>
          <p className="text-gray-500 text-sm mb-2">
            Tu cuenta de Super Admin ha sido creada exitosamente.
          </p>
          <p className="text-gray-400 text-xs mb-6">
            Esta página de configuración ha sido deshabilitada automáticamente.
          </p>
          <button
            onClick={() => router.push('/iniciar-sesion?next=/admin')}
            className="w-full bg-sc-forest text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-sc-forest/90 transition-colors"
          >
            Iniciar Sesión como Admin
          </button>
        </div>
      </div>
    );
  }

  // Setup form
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-sc-forest rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M12 2l2.4 4.8L20 8l-4 3.9.9 5.5L12 15l-4.9 2.4.9-5.5L4 8l5.6-1.2L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración Inicial</h1>
          <p className="text-gray-500 text-sm mt-1">Crea la primera cuenta de Super Admin</p>
        </div>

        {/* Security notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex gap-2.5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-amber-600 flex-shrink-0 mt-0.5">
            <path d="M8 1l6.5 11.5H1.5L8 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            <path d="M8 6v3M8 11v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <p className="text-amber-700 text-xs leading-relaxed">
            Esta página se deshabilitará automáticamente después de crear la primera cuenta de administrador.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
              Nombre Completo
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Ej: Juan García"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 focus:border-sc-forest transition-colors"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Correo Electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              placeholder="admin@ejemplo.com"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 focus:border-sc-forest transition-colors"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mínimo 8 caracteres"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 focus:border-sc-forest transition-colors"
              required
              minLength={8}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirmar Contraseña
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Repite la contraseña"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 focus:border-sc-forest transition-colors"
              required
            />
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{submitError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-sc-forest text-white py-3 rounded-lg text-sm font-semibold hover:bg-sc-forest/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors mt-2"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creando cuenta...
              </span>
            ) : (
              'Crear Cuenta de Super Admin'
            )}
          </button>
        </form>

        {/* Admin permissions summary */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-3">Permisos de Super Admin:</p>
          <div className="grid grid-cols-2 gap-1.5">
            {['Dashboard', 'Productos', 'Pedidos', 'Usuarios', 'Recompensas', 'Blog', 'Analíticas', 'Configuración'].map((perm) => (
              <div key={perm} className="flex items-center gap-1.5 text-xs text-gray-600">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-green-500 flex-shrink-0">
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M3.5 6l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {perm}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
