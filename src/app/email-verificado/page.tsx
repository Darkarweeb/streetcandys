'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { createClient } from '@/lib/supabase/client';

export default function EmailVerificadoPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function checkAndRedirect() {
      // Give the auth state a moment to settle (setSession may have just fired)
      await new Promise((r) => setTimeout(r, 800));

      const { data: { session } } = await supabase?.auth?.getSession();

      if (session) {
        // Session is active — go straight to the account dashboard
        router?.replace('/cuenta');
        return;
      }

      // No session yet — show the page so the user can log in manually
      setChecking(false);
    }

    checkAndRedirect();
  }, [router]);

  if (checking) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: 'linear-gradient(135deg, #fff0f5 0%, #ffe4ef 60%, #ffd6e8 100%)' }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'linear-gradient(135deg, #e91e8c 0%, #ff69b4 100%)' }}
          >
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-lg font-semibold" style={{ color: '#1a1a1a' }}>
            Verificando tu cuenta…
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
              ✅
            </div>
            <h1 className="text-2xl font-black text-white mb-1">¡Correo Verificado!</h1>
            <p className="text-sm text-white opacity-90">Street Candy&apos;s — Premium Hemp Wellness</p>
          </div>

          {/* Body */}
          <div className="px-8 py-6">
            <div
              className="rounded-2xl p-4 mb-6 text-center"
              style={{
                background: 'rgba(22,163,74,0.06)',
                border: '1px solid rgba(22,163,74,0.25)',
              }}
            >
              <p className="text-sm font-semibold mb-1" style={{ color: '#1a1a1a' }}>
                Tu cuenta está activa 🎉
              </p>
              <p className="text-xs" style={{ color: '#888' }}>
                Tu correo electrónico ha sido verificado exitosamente. Ya puedes iniciar sesión y
                disfrutar de todos los beneficios del crew.
              </p>
            </div>

            {/* Benefits reminder */}
            <div className="space-y-3 mb-6">
              {[
                { icon: '🏆', title: 'Programa de Recompensas', desc: 'Acumula puntos en cada compra' },
                { icon: '🎁', title: 'Descuentos Exclusivos', desc: 'Ofertas solo para miembros del crew' },
                { icon: '🌿', title: 'Contenido Educativo', desc: 'Guías sobre hemp y bienestar' },
                { icon: '🚀', title: 'Acceso Anticipado', desc: 'Primero en conocer nuevos productos' },
              ]?.map((b) => (
                <div
                  key={b?.title}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: '#fff8fb' }}
                >
                  <span className="text-xl flex-shrink-0">{b?.icon}</span>
                  <div>
                    <p className="text-xs font-bold" style={{ color: '#1a1a1a' }}>
                      {b?.title}
                    </p>
                    <p className="text-xs" style={{ color: '#888' }}>
                      {b?.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <Link
              href="/iniciar-sesion"
              className="block w-full text-center font-bold text-sm rounded-full py-4 text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #e91e8c 0%, #ff69b4 100%)' }}
            >
              🍬 Iniciar sesión ahora
            </Link>

            <Link
              href="/productos"
              className="block w-full text-center font-semibold text-sm rounded-full py-3 mt-3 transition-all duration-200"
              style={{ color: '#e91e8c' }}
            >
              🍭 Explorar productos
            </Link>
          </div>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: '#aaa' }}>
          Al usar Street Candy&apos;s aceptas nuestros{' '}
          <Link href="/terminos" className="underline" style={{ color: '#e91e8c' }}>
            términos y condiciones
          </Link>
          .
        </p>

        {/* Footer */}
        <p className="text-center text-xs mt-3" style={{ color: '#aaa' }}>
          © 2026 Street Candy&apos;s. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
