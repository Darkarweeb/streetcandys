'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AppLogo from '@/components/ui/AppLogo';

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
      setError(
        err instanceof Error ? err.message : 'No pudimos enviar el correo. Intenta de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  };

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
          {sent ? (
            /* ── Success state ── */
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-md mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, #e91e8c 0%, #ff69b4 100%)' }}
              >
                📧
              </div>
              <h2 className="text-2xl font-black text-center mb-1" style={{ color: '#1a1a1a' }}>
                Revisa tu correo
              </h2>
              <p className="text-sm text-center mb-2" style={{ color: '#888' }}>
                Enviamos un enlace a{' '}
                <span className="font-bold" style={{ color: '#e91e8c' }}>
                  {email}
                </span>
                .
              </p>
              <p className="text-sm text-center mb-6" style={{ color: '#888' }}>
                Sigue las instrucciones para restablecer tu contraseña.
              </p>

              <Link
                href="/iniciar-sesion"
                className="text-sm font-bold hover:underline"
                style={{ color: '#e91e8c' }}
              >
                ← Volver a iniciar sesión
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
                  🔑
                </div>
              </div>

              <h1
                className="text-2xl font-black text-center mb-1"
                style={{ color: '#1a1a1a' }}
              >
                Recupera tu acceso
              </h1>
              <p className="text-sm text-center mb-6" style={{ color: '#888' }}>
                Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
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
                {/* Email */}
                <div className="mb-6">
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold mb-1.5"
                    style={{ color: '#444' }}
                  >
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
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-150"
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
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full font-bold text-sm rounded-full py-4 text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #e91e8c 0%, #ff69b4 100%)' }}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'ENVIAR ENLACE'
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Back to login */}
        {!sent && (
          <p className="text-center text-sm mt-6" style={{ color: '#888' }}>
            ¿Recordaste tu contraseña?{' '}
            <Link
              href="/iniciar-sesion"
              className="font-bold hover:underline"
              style={{ color: '#e91e8c' }}
            >
              Iniciar sesión
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
