'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLogo from '@/components/ui/AppLogo';

export default function NuevaContrasenaPage() {
  const router = useRouter();
  const { updatePassword, user, loading: authLoading } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // If no user session after auth loads, redirect to reset page
    if (!authLoading && !user) {
      router.replace('/recuperar-contrasena');
    }
  }, [authLoading, user, router]);

  const passwordStrength = (() => {
    if (password.length === 0) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const strengthLabel = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'][passwordStrength];
  const strengthColor = ['', '#FF3B3B', '#FFD700', '#ff69b4', '#e91e8c'][passwordStrength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => router.push('/iniciar-sesion'), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No pudimos actualizar tu contraseña.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #fff0f5 0%, #ffe4ef 100%)' }}
      >
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: '#e91e8c', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{ background: 'linear-gradient(135deg, #fff0f5 0%, #ffe4ef 60%, #ffd6e8 100%)' }}
    >
      {/* Decorative circles */}
      <div
        className="fixed top-0 right-0 w-80 h-80 rounded-full pointer-events-none opacity-30"
        style={{
          background: 'radial-gradient(circle, #ff69b4 0%, transparent 70%)',
          transform: 'translate(40%, -40%)',
        }}
        aria-hidden="true"
      />
      <div
        className="fixed bottom-0 left-0 w-64 h-64 rounded-full pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle, #e91e8c 0%, transparent 70%)',
          transform: 'translate(-40%, 40%)',
        }}
        aria-hidden="true"
      />

      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-1 group relative z-10">
        <AppLogo variant="light" height={52} />
      </Link>

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div
          className="bg-white rounded-3xl p-8 shadow-xl"
          style={{ border: '1.5px solid #ffd6e8' }}
        >
          {success ? (
            /* ── Success state ── */
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-md mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, #e91e8c 0%, #ff69b4 100%)' }}
              >
                ✅
              </div>
              <h2 className="text-2xl font-black text-center mb-1" style={{ color: '#1a1a1a' }}>
                ¡Contraseña actualizada!
              </h2>
              <p className="text-sm text-center mb-6" style={{ color: '#888' }}>
                Redirigiendo a inicio de sesión…
              </p>
              <Link
                href="/iniciar-sesion"
                className="text-sm font-bold hover:underline"
                style={{ color: '#e91e8c' }}
              >
                ← Ir a iniciar sesión
              </Link>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              {/* Candy icon */}
              <div className="flex justify-center mb-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-md"
                  style={{ background: 'linear-gradient(135deg, #e91e8c 0%, #ff69b4 100%)' }}
                >
                  🔒
                </div>
              </div>

              <h1
                className="text-2xl font-black text-center mb-1"
                style={{ color: '#1a1a1a' }}
              >
                Nueva contraseña
              </h1>
              <p className="text-sm text-center mb-6" style={{ color: '#888' }}>
                Elige una contraseña segura para tu cuenta.
              </p>

              {/* Error */}
              {error && (
                <div
                  className="mb-5 p-4 rounded-xl text-sm"
                  style={{
                    background: 'rgba(233,30,140,0.08)',
                    border: '1px solid rgba(233,30,140,0.3)',
                    color: '#c0006a',
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* New password */}
                <div className="mb-4">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold mb-1.5"
                    style={{ color: '#444' }}
                  >
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none transition-all duration-150"
                      style={{
                        background: '#fff0f5',
                        border: '1.5px solid #ffd6e8',
                        color: '#1a1a1a',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#e91e8c';
                        e.target.style.boxShadow = '0 0 0 3px rgba(233,30,140,0.12)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#ffd6e8';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: '#e91e8c' }}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  {/* Password strength */}
                  {password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="h-1.5 flex-1 rounded-full transition-all duration-200"
                            style={{ backgroundColor: i <= passwordStrength ? strengthColor : '#ffd6e8' }}
                          />
                        ))}
                      </div>
                      <p className="text-xs font-medium" style={{ color: strengthColor }}>
                        {strengthLabel}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="mb-6">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-semibold mb-1.5"
                    style={{ color: '#444' }}
                  >
                    Confirmar contraseña
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-150"
                    style={{
                      background: '#fff0f5',
                      border: `1.5px solid ${confirmPassword && confirmPassword !== password ? '#FF3B3B' : '#ffd6e8'}`,
                      color: '#1a1a1a',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#e91e8c';
                      e.target.style.boxShadow = '0 0 0 3px rgba(233,30,140,0.12)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor =
                        confirmPassword && confirmPassword !== password ? '#FF3B3B' : '#ffd6e8';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-xs mt-1.5" style={{ color: '#FF3B3B' }}>
                      Las contraseñas no coinciden.
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !password || !confirmPassword}
                  className="w-full font-bold text-sm rounded-full py-4 text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #e91e8c 0%, #ff69b4 100%)' }}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    '🔒 Guardar contraseña'
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: '#aaa' }}>
          © 2026 Street Candy&apos;s. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
