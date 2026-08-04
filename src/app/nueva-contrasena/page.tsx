'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

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
  const strengthColor = ['', '#FF3B3B', '#FFD700', '#00E5FF', '#C8FF00'][passwordStrength];

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
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C8FF00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="mb-10 flex items-center gap-1 group">
        <span className="text-[#FAFAFA] font-black text-3xl tracking-tight uppercase leading-none group-hover:text-[#C8FF00] transition-colors duration-200">Street</span>
        <span className="text-[#C8FF00] font-black text-3xl tracking-tight uppercase leading-none">Candy</span>
      </Link>

      <div className="w-full max-w-md">
        <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-8">
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[rgba(57,255,20,0.1)] border border-[#39FF14] flex items-center justify-center mx-auto mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#39FF14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h2 className="text-[#FAFAFA] font-bold text-xl mb-3">Contraseña actualizada</h2>
              <p className="text-[rgba(250,250,250,0.65)] text-sm">
                Redirigiendo a inicio de sesión...
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-[#FAFAFA] font-bold text-2xl mb-1">Nueva contraseña</h1>
              <p className="text-[rgba(250,250,250,0.65)] text-sm mb-8">
                Elige una contraseña segura para tu cuenta.
              </p>

              {error && (
                <div className="mb-6 p-4 bg-[rgba(255,59,59,0.1)] border border-[#FF3B3B] rounded-lg">
                  <p className="text-[#FF3B3B] text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-5">
                  <label htmlFor="password" className="block text-[rgba(250,250,250,0.65)] text-sm mb-2">
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
                      className="w-full bg-[#0A0A0A] border border-[#2E2E2E] rounded-lg px-4 py-3 pr-12 text-[#FAFAFA] text-sm placeholder-[rgba(250,250,250,0.35)] focus:outline-none focus:border-[#C8FF00] focus:shadow-[0_0_0_1px_#C8FF00] transition-all duration-150"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(250,250,250,0.35)] hover:text-[rgba(250,250,250,0.65)] transition-colors"
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
                  {password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="h-1 flex-1 rounded-full transition-all duration-200"
                            style={{ backgroundColor: i <= passwordStrength ? strengthColor : '#2E2E2E' }}
                          />
                        ))}
                      </div>
                      <p className="text-xs" style={{ color: strengthColor }}>{strengthLabel}</p>
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <label htmlFor="confirmPassword" className="block text-[rgba(250,250,250,0.65)] text-sm mb-2">
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
                    className={`w-full bg-[#0A0A0A] border rounded-lg px-4 py-3 text-[#FAFAFA] text-sm placeholder-[rgba(250,250,250,0.35)] focus:outline-none transition-all duration-150 ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-[#FF3B3B]'
                        : 'border-[#2E2E2E] focus:border-[#C8FF00] focus:shadow-[0_0_0_1px_#C8FF00]'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !password || !confirmPassword}
                  className="w-full bg-[#C8FF00] text-[#0A0A0A] font-bold text-sm uppercase tracking-widest rounded-full py-4 hover:shadow-[0_0_16px_rgba(200,255,0,0.35)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar contraseña'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
