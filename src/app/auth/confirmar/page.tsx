'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function AuthConfirmarInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const supabase = createClient();

    async function handleHash() {
      const hash = window.location.hash.slice(1); // remove leading '#'

      if (!hash) {
        router.replace('/iniciar-sesion?error=enlace-invalido');
        return;
      }

      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');
      const errorCode = params.get('error');
      const errorDescription = params.get('error_description');

      if (errorCode) {
        setStatus('error');
        setErrorMsg(errorDescription || errorCode);
        setTimeout(() => {
          router.replace('/iniciar-sesion?error=enlace-invalido');
        }, 2000);
        return;
      }

      if (!accessToken || !refreshToken) {
        router.replace('/iniciar-sesion?error=enlace-invalido');
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        setStatus('error');
        setErrorMsg(sessionError.message);
        setTimeout(() => {
          router.replace('/iniciar-sesion?error=enlace-invalido');
        }, 2000);
        return;
      }

      const nextParam = searchParams.get('next');
      let destination = '/cuenta';

      if (type === 'recovery') {
        destination = '/nueva-contrasena';
      } else if (
        nextParam &&
        nextParam.startsWith('/') &&
        !nextParam.startsWith('//') &&
        !nextParam.includes(':')
      ) {
        destination = nextParam;
      }

      // Wait for auth state to propagate before navigating
      await new Promise<void>((resolve) => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            subscription.unsubscribe();
            resolve();
          }
        });
        setTimeout(resolve, 1500);
      });

      router.replace(destination);
    }

    handleHash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #fff0f5 0%, #ffe4ef 60%, #ffd6e8 100%)' }}
    >
      {status === 'processing' ? (
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
          <p className="text-sm mt-2" style={{ color: '#888' }}>
            Un momento, estamos confirmando tu sesión.
          </p>
        </div>
      ) : (
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl"
            style={{ background: 'rgba(255,59,59,0.1)', border: '1px solid #FF3B3B' }}
          >
            ⚠️
          </div>
          <p className="text-lg font-semibold" style={{ color: '#1a1a1a' }}>
            Enlace inválido
          </p>
          {errorMsg && (
            <p className="text-sm mt-2" style={{ color: '#888' }}>
              {errorMsg}
            </p>
          )}
          <p className="text-sm mt-2" style={{ color: '#888' }}>
            Redirigiendo…
          </p>
        </div>
      )}
    </div>
  );
}

export default function AuthConfirmarPage() {
  return (
    <Suspense
      fallback={
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
      }
    >
      <AuthConfirmarInner />
    </Suspense>
  );
}
