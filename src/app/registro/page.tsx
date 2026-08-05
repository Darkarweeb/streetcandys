'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { CountryCode } from '@/contexts/AuthContext';
import AppLogo from '@/components/ui/AppLogo';

const COUNTRIES = [
  { code: 'CO' as CountryCode, name: 'Colombia', flag: '🇨🇴' },
  { code: 'CR' as CountryCode, name: 'Costa Rica', flag: '🇨🇷' },
];

export default function RegistroPage() {
  const router = useRouter();
  const { signUp, resendConfirmationEmail } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>('CO');
  const [showPassword, setShowPassword] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

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

  const startCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setResendMessage('');
    try {
      await resendConfirmationEmail(email);
      setResendMessage('✅ Correo reenviado. Revisa tu bandeja de entrada.');
      startCooldown();
    } catch {
      setResendMessage('❌ No se pudo reenviar. Intenta en unos minutos.');
    } finally {
      setResendLoading(false);
    }
  };

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
    if (!ageConfirmed) {
      setError('Debes confirmar que eres mayor de edad para continuar.');
      return;
    }

    setLoading(true);
    try {
      await signUp({ email, password, fullName, countryCode });
      setSuccess(true);

      // Fire-and-forget welcome email — registration success is never blocked by this
      fetch('/api/email/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName }),
      }).catch((err) => {
        console.warn('[registro] Welcome email request failed (non-fatal):', err);
      });
    } catch (err: unknown) {
      let msg = 'Error al crear la cuenta. Intenta de nuevo.';
      if (err instanceof Error && err.message) {
        msg = err.message;
      } else if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string' && (err as { message: string }).message) {
        msg = (err as { message: string }).message;
      }
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('User already registered')) {
        setError('Este correo ya está registrado. ¿Quieres iniciar sesión?');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: '#fff0f5',
    border: '1.5px solid #ffd6e8',
    color: '#1a1a1a',
  };

  const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = '#e91e8c';
    e.target.style.boxShadow = '0 0 0 3px rgba(233,30,140,0.12)';
  };
  const inputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = '#ffd6e8';
    e.target.style.boxShadow = 'none';
  };

  if (success) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
        style={{ background: 'linear-gradient(135deg, #fff0f5 0%, #ffe4ef 60%, #ffd6e8 100%)' }}
      >
        {/* Decorative circles */}
        <div className="fixed top-0 right-0 w-80 h-80 rounded-full pointer-events-none opacity-30" style={{ background: 'radial-gradient(circle, #ff69b4 0%, transparent 70%)', transform: 'translate(40%, -40%)' }} aria-hidden="true" />
        <div className="fixed bottom-0 left-0 w-64 h-64 rounded-full pointer-events-none opacity-20" style={{ background: 'radial-gradient(circle, #e91e8c 0%, transparent 70%)', transform: 'translate(-40%, 40%)' }} aria-hidden="true" />

        <Link href="/" className="mb-8 relative z-10">
          <AppLogo variant="light" height={52} />
        </Link>

        <div className="w-full max-w-md relative z-10">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden" style={{ border: '1.5px solid #ffd6e8' }}>
            {/* Header gradient banner */}
            <div className="px-8 pt-8 pb-6 text-center" style={{ background: 'linear-gradient(135deg, #e91e8c 0%, #ff69b4 100%)' }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-lg" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
                🎉
              </div>
              <h2 className="text-2xl font-black text-white mb-1">Bienvenido al Crew</h2>
              <p className="text-sm text-white opacity-90">Street Candy&apos;s — Premium Hemp Wellness</p>
            </div>

            {/* Body */}
            <div className="px-8 py-6">
              {/* Email confirmation notice */}
              <div className="rounded-2xl p-4 mb-5 text-center" style={{ background: 'rgba(233,30,140,0.06)', border: '1px solid rgba(233,30,140,0.2)' }}>
                <p className="text-sm font-semibold mb-1" style={{ color: '#1a1a1a' }}>
                  Confirma tu correo para activar tu cuenta
                </p>
                <p className="text-xs" style={{ color: '#888' }}>
                  Enviamos un enlace de confirmación a{' '}
                  <span className="font-bold" style={{ color: '#e91e8c' }}>{email}</span>
                </p>
              </div>

              {/* Benefits */}
              <div className="space-y-3 mb-6">
                {[
                  { icon: '🏆', title: 'Programa de Recompensas', desc: 'Acumula puntos en cada compra' },
                  { icon: '🎁', title: 'Descuentos Exclusivos', desc: 'Ofertas solo para miembros del crew' },
                  { icon: '🌿', title: 'Contenido Educativo', desc: 'Guías y artículos sobre hemp y bienestar' },
                  { icon: '🚀', title: 'Acceso Anticipado', desc: 'Sé el primero en conocer nuevos productos' },
                ].map((b) => (
                  <div key={b.title} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#fff8fb' }}>
                    <span className="text-xl flex-shrink-0">{b.icon}</span>
                    <div>
                      <p className="text-xs font-bold" style={{ color: '#1a1a1a' }}>{b.title}</p>
                      <p className="text-xs" style={{ color: '#888' }}>{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resend section */}
              <div className="text-center mb-5">
                <p className="text-xs mb-3" style={{ color: '#aaa' }}>
                  ¿No recibiste el correo? Revisa tu carpeta de spam o reenvíalo.
                </p>
                <button
                  onClick={handleResend}
                  disabled={resendLoading || resendCooldown > 0}
                  className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-full border-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ borderColor: '#e91e8c', color: '#e91e8c', background: 'transparent' }}
                >
                  {resendLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : resendCooldown > 0 ? (
                    `Reenviar en ${resendCooldown}s`
                  ) : (
                    '📧 Reenviar confirmación'
                  )}
                </button>
                {resendMessage && (
                  <p className="text-xs mt-2 font-medium" style={{ color: resendMessage.startsWith('✅') ? '#16a34a' : '#c0006a' }}>
                    {resendMessage}
                  </p>
                )}
              </div>

              {/* CTA */}
              <Link
                href="/iniciar-sesion"
                className="block w-full text-center font-bold text-sm rounded-full py-4 text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #e91e8c 0%, #ff69b4 100%)' }}
              >
                🍬 Ya confirmé — Iniciar sesión
              </Link>
            </div>
          </div>

          <p className="text-center text-xs mt-5" style={{ color: '#aaa' }}>
            Al confirmar tu correo aceptas nuestros{' '}
            <Link href="/terminos" className="underline" style={{ color: '#e91e8c' }}>términos y condiciones</Link>.
          </p>
        </div>
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
      <Link href="/" className="mb-8 relative z-10">
        <AppLogo variant="light" height={52} />
      </Link>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-3xl p-8 shadow-xl" style={{ border: '1.5px solid #ffd6e8' }}>
          {/* Candy icon */}
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-md" style={{ background: 'linear-gradient(135deg, #e91e8c 0%, #ff69b4 100%)' }}>
              🍭
            </div>
          </div>

          <h1 className="text-2xl font-black text-center mb-1" style={{ color: '#1a1a1a' }}>Únete al crew</h1>
          <p className="text-sm text-center mb-6" style={{ color: '#888' }}>Crea tu cuenta y empieza a explorar.</p>

          {error && (
            <div className="mb-5 p-4 rounded-xl text-sm" style={{ background: 'rgba(233,30,140,0.08)', border: '1px solid rgba(233,30,140,0.3)', color: '#c0006a' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Full name */}
            <div className="mb-4">
              <label htmlFor="fullName" className="block text-sm font-semibold mb-1.5" style={{ color: '#444' }}>
                Nombre completo
              </label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-150"
                style={inputStyle}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </div>

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
                style={inputStyle}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </div>

            {/* Country */}
            <div className="mb-4">
              <label htmlFor="country" className="block text-sm font-semibold mb-1.5" style={{ color: '#444' }}>
                País
              </label>
              <select
                id="country"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value as CountryCode)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-150 appearance-none cursor-pointer"
                style={inputStyle}
                onFocus={inputFocus}
                onBlur={inputBlur}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
              <p className="text-xs mt-1.5" style={{ color: '#aaa' }}>
                Street Candy opera en Colombia y Costa Rica.
              </p>
            </div>

            {/* Password */}
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-semibold mb-1.5" style={{ color: '#444' }}>
                Contraseña
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
                  style={inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
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
                  <p className="text-xs font-medium" style={{ color: strengthColor }}>{strengthLabel}</p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="mb-5">
              <label htmlFor="confirmPassword" className="block text-sm font-semibold mb-1.5" style={{ color: '#444' }}>
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
                  ...inputStyle,
                  borderColor: confirmPassword && confirmPassword !== password ? '#FF3B3B' : '#ffd6e8',
                }}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs mt-1.5" style={{ color: '#FF3B3B' }}>Las contraseñas no coinciden.</p>
              )}
            </div>

            {/* Age confirmation */}
            <label className="flex items-start gap-3 mb-6 cursor-pointer group">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="sr-only"
                  aria-label="Confirmar mayoría de edad"
                />
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center transition-all duration-150"
                  style={{
                    background: ageConfirmed ? 'linear-gradient(135deg, #e91e8c 0%, #ff69b4 100%)' : 'white',
                    border: ageConfirmed ? 'none' : '2px solid #ffd6e8',
                  }}
                >
                  {ageConfirmed && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <polyline points="2 6 5 9 10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm leading-relaxed" style={{ color: '#666' }}>
                Confirmo que soy mayor de edad y acepto los{' '}
                <Link href="/terminos" className="font-medium hover:underline" style={{ color: '#e91e8c' }}>términos y condiciones</Link>.
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !fullName || !email || !password || !confirmPassword || !ageConfirmed}
              className="w-full font-bold text-sm rounded-full py-4 text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #e91e8c 0%, #ff69b4 100%)' }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                '🍭 Crear cuenta'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: '#888' }}>
          ¿Ya tienes cuenta?{' '}
          <Link href="/iniciar-sesion" className="font-bold hover:underline" style={{ color: '#e91e8c' }}>
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
