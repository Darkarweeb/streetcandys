'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLogo from '@/components/ui/AppLogo';

function VerificarEmailContent() {
  const searchParams = useSearchParams();
  const { resendConfirmationEmail } = useAuth();

  const errorParam = searchParams?.get('error');
  const emailParam = searchParams?.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const isExpired = errorParam === 'enlace-invalido';

  const startCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading || !email?.trim()) return;
    setResendLoading(true);
    setResendMessage('');
    try {
      await resendConfirmationEmail(email?.trim());
      setResendMessage('✅ Correo reenviado. Revisa tu bandeja de entrada.');
      startCooldown();
    } catch {
      setResendMessage('❌ No se pudo reenviar. Verifica el correo e intenta de nuevo.');
    } finally {
      setResendLoading(false);
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
      <Link href="/" className="mb-8 relative z-10">
        <AppLogo variant="light" height={52} />
      </Link>
      <div className="w-full max-w-md relative z-10">
        <div
          className="bg-white rounded-3xl shadow-xl overflow-hidden"
          style={{ border: '1.5px solid #ffd6e8' }}
        >
          {/* Header */}
          <div
            className="px-8 pt-8 pb-6 text-center"
            style={{ background: 'linear-gradient(135deg, #e91e8c 0%, #ff69b4 100%)' }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-lg"
              style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
            >
              {isExpired ? '⏰' : '📧'}
            </div>
            <h1 className="text-2xl font-black text-white mb-1">
              {isExpired ? 'Enlace Expirado' : 'Verifica tu Correo'}
            </h1>
            <p className="text-sm text-white opacity-90">Street Candy&apos;s — Premium Hemp Wellness</p>
          </div>

          {/* Body */}
          <div className="px-8 py-6">
            {/* Error notice */}
            {isExpired && (
              <div
                className="rounded-2xl p-4 mb-5"
                style={{
                  background: 'rgba(233,30,140,0.06)',
                  border: '1px solid rgba(233,30,140,0.2)',
                }}
              >
                <p className="text-sm font-semibold mb-1 text-center" style={{ color: '#1a1a1a' }}>
                  El enlace de verificación no es válido o ya expiró
                </p>
                <p className="text-xs text-center" style={{ color: '#888' }}>
                  Los enlaces de verificación son válidos por 24 horas. Solicita uno nuevo ingresando
                  tu correo a continuación.
                </p>
              </div>
            )}

            {/* Email input */}
            <div className="mb-4">
              <label
                htmlFor="resend-email"
                className="block text-sm font-semibold mb-1.5"
                style={{ color: '#444' }}
              >
                Tu correo electrónico
              </label>
              <input
                id="resend-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e?.target?.value);
                  setResendMessage('');
                }}
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

            {/* Resend button */}
            <button
              onClick={handleResend}
              disabled={resendLoading || resendCooldown > 0 || !email?.trim()}
              className="w-full font-bold text-sm rounded-full py-4 text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #e91e8c 0%, #ff69b4 100%)' }}
            >
              {resendLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enviando...
                </>
              ) : resendCooldown > 0 ? (
                `Reenviar en ${resendCooldown}s`
              ) : (
                '📧 Reenviar correo de verificación'
              )}
            </button>

            {resendMessage && (
              <p
                className="text-xs mt-3 text-center font-medium"
                style={{ color: resendMessage?.startsWith('✅') ? '#16a34a' : '#c0006a' }}
              >
                {resendMessage}
              </p>
            )}

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: '#ffd6e8' }} />
              <span className="text-xs" style={{ color: '#ccc' }}>
                o
              </span>
              <div className="flex-1 h-px" style={{ background: '#ffd6e8' }} />
            </div>

            {/* Secondary actions */}
            <Link
              href="/iniciar-sesion"
              className="block w-full text-center font-semibold text-sm rounded-full py-3 border-2 transition-all duration-200"
              style={{ borderColor: '#e91e8c', color: '#e91e8c' }}
            >
              Iniciar sesión
            </Link>

            <Link
              href="/registro"
              className="block w-full text-center font-semibold text-sm rounded-full py-3 mt-2 transition-all duration-200"
              style={{ color: '#aaa' }}
            >
              Crear una cuenta nueva
            </Link>
          </div>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: '#aaa' }}>
          ¿Necesitas ayuda?{' '}
          <Link href="/contacto" className="underline" style={{ color: '#e91e8c' }}>
            Contáctanos
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerificarEmailPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #fff0f5 0%, #ffe4ef 100%)' }}
        >
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: '#e91e8c', borderTopColor: 'transparent' }}
          />
        </div>
      }
    >
      <VerificarEmailContent />
    </Suspense>
  );
}
