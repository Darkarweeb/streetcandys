'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function RecuperarContrasenaPage() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No pudimos enviar el correo. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4 py-16">
      {/* Logo */}
      <Link href="/" className="mb-10 flex items-center gap-1 group">
        <span className="text-[#FAFAFA] font-black text-3xl tracking-tight uppercase leading-none group-hover:text-[#C8FF00] transition-colors duration-200">Street</span>
        <span className="text-[#C8FF00] font-black text-3xl tracking-tight uppercase leading-none">Candy</span>
      </Link>

      <div className="w-full max-w-md">
        <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[rgba(0,229,255,0.1)] border border-[#00E5FF] flex items-center justify-center mx-auto mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <h2 className="text-[#FAFAFA] font-bold text-xl mb-3">Revisa tu correo</h2>
              <p className="text-[rgba(250,250,250,0.65)] text-sm mb-2">
                Enviamos un enlace a <span className="text-[#C8FF00]">{email}</span>.
              </p>
              <p className="text-[rgba(250,250,250,0.65)] text-sm mb-8">
                Sigue las instrucciones para restablecer tu contraseña.
              </p>
              <Link
                href="/iniciar-sesion"
                className="inline-block text-[#C8FF00] text-sm font-medium hover:underline"
              >
                ← Volver a iniciar sesión
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <Link href="/iniciar-sesion" className="flex items-center gap-2 text-[rgba(250,250,250,0.35)] hover:text-[rgba(250,250,250,0.65)] text-sm transition-colors mb-6">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Volver
                </Link>
                <h1 className="text-[#FAFAFA] font-bold text-2xl mb-1">Recupera tu acceso</h1>
                <p className="text-[rgba(250,250,250,0.65)] text-sm">
                  Ingresa tu correo y te enviamos un enlace para crear una nueva contraseña.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-[rgba(255,59,59,0.1)] border border-[#FF3B3B] rounded-lg">
                  <p className="text-[#FF3B3B] text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-6">
                  <label htmlFor="email" className="block text-[rgba(250,250,250,0.65)] text-sm mb-2">
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full bg-[#0A0A0A] border border-[#2E2E2E] rounded-lg px-4 py-3 text-[#FAFAFA] text-sm placeholder-[rgba(250,250,250,0.35)] focus:outline-none focus:border-[#C8FF00] focus:shadow-[0_0_0_1px_#C8FF00] transition-all duration-150"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-[#C8FF00] text-[#0A0A0A] font-bold text-sm uppercase tracking-widest rounded-full py-4 hover:shadow-[0_0_16px_rgba(200,255,0,0.35)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar enlace'
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
