'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLogo from '@/components/ui/AppLogo';

function IniciarSesionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nextPath = searchParams.get('next') || '/';
  const urlError = searchParams.get('error');

  useEffect(() => {
    if (urlError === 'enlace-invalido') {
      setError('El enlace no es válido o ya expiró. Intenta de nuevo.');
    }
  }, [urlError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);

      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      console.log('[Login] session user.id:', userId ?? 'NULL — session not ready yet');

      if (userId) {
        const { data: perfil, error: perfilError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        console.log('[Login] profile role from DB:', perfil?.role ?? 'null/undefined');
        console.log('[Login] profiles query error:', perfilError?.message ?? 'none');
        console.log('[Login] will redirect to:', (perfil?.role === 'admin' || perfil?.role === 'staff') ? '/admin' : nextPath);

        if (perfil?.role === 'admin' || perfil?.role === 'staff') {
          router.push('/admin');
          router.refresh();
          return;
        }
      } else {
        console.log('[Login] WARNING: session was null after signIn — falling back to nextPath redirect.');
      }

      router.push(nextPath);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fff0f5 0%, #ffe4ef 100%)' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#e91e8c', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{ background: 'linear-gradient(135deg, #fff0f5 0%, #ffe4ef 60%, #ffd6e8 100%)' }}
    >
      {/* Decorative circles */}
      <div className="fixed top-0 right-0 w-80 h-80 rounded-full pointer-events-none opacity-30" style={{ background: 'radial-gradient(circle, #ff69b4 0%, transparent 70%)', transform: 'translate(40%, -40%)' }} aria-hidden="true" />
      <div className="fixed bottom-0 left-0 w-64 h-64 rounded-full pointer-events-none opacity-20" style={{ background: 'radial-gradient(circle, #e91e8c 0%, transparent 70%)', transform: 'translate(-40%, 40%)' }} aria-hidden="true" />

      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-1 group relative z-10">
        <AppLogo variant="light" height={52} />
      </Link>

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-xl" style={{ border: '1.5px solid #ffd6e8' }}>
          {/* Candy icon */}
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-md" style={{ background: 'linear-gradient(135deg, #e91e8c 0%, #ff69b4 100%)' }}>
              🍬
            </div>
          </div>

          <h1 className="text-2xl font-black text-center mb-1" style={{ color: '#1a1a1a' }}>Bienvenido de vuelta</h1>
          <p className="text-sm text-center mb-6" style={{ color: '#888' }}>Ingresa a tu cuenta para continuar.</p>

          {error && (
            <div className="mb-5 p-4 rounded-xl text-sm" style={{ background: 'rgba(233,30,140,0.08)', border: '1px solid rgba(233,30,140,0.3)', color: '#c0006a' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-semibold mb-1.5" style={{ color: '#444' }}>
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
                onFocus={(e) => { e.target.style.borderColor = '#e91e8c'; e.target.style.boxShadow = '0 0 0 3px rgba(233,30,140,0.12)'; }}
                onBlur={(e) => { e.target.style.borderColor = '#ffd6e8'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Password */}
            <div className="mb-2">
              <label htmlFor="password" className="block text-sm font-semibold mb-1.5" style={{ color: '#444' }}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none transition-all duration-150"
                  style={{
                    background: '#fff0f5',
                    border: '1.5px solid #ffd6e8',
                    color: '#1a1a1a',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#e91e8c'; e.target.style.boxShadow = '0 0 0 3px rgba(233,30,140,0.12)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#ffd6e8'; e.target.style.boxShadow = 'none'; }}
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
            </div>

            {/* Forgot password */}
            <div className="flex justify-end mb-6">
              <Link href="/recuperar-contrasena" className="text-xs font-medium hover:underline" style={{ color: '#e91e8c' }}>
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full font-bold text-sm rounded-full py-4 text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #e91e8c 0%, #ff69b4 100%)' }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Ingresando...
                </>
              ) : (
                '🍬 Iniciar sesión'
              )}
            </button>
          </form>
        </div>

        {/* Register link */}
        <p className="text-center text-sm mt-6" style={{ color: '#888' }}>
          ¿No tienes cuenta?{' '}
          <Link href="/registro" className="font-bold hover:underline" style={{ color: '#e91e8c' }}>
            Únete ahora
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function IniciarSesionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fff0f5 0%, #ffe4ef 100%)' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#e91e8c', borderTopColor: 'transparent' }} />
      </div>
    }>
      <IniciarSesionForm />
    </Suspense>
  );
}
