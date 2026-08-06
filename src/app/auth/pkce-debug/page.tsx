'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function PkceDebugInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [countdown, setCountdown] = useState(12);

  const pkceArrived = searchParams?.get('pkce_arrived') === 'true';
  const cookieNamesRaw = searchParams?.get('cookie_names') ?? '';
  const cookieNames = cookieNamesRaw ? cookieNamesRaw?.split(',')?.filter(Boolean) : [];
  const destination = searchParams?.get('dest') ?? '/iniciar-sesion';
  const exchangeError = searchParams?.get('exchange_error') ?? '';

  useEffect(() => {
    if (countdown <= 0) {
      router?.replace(destination);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, destination, router]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: '#0d1117' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 font-mono text-sm"
        style={{ background: '#161b22', border: '1px solid #30363d', color: '#c9d1d9' }}
      >
        <p
          className="text-xs font-bold uppercase tracking-widest mb-4"
          style={{ color: '#58a6ff' }}
        >
          🔍 PKCE Debug — /auth/callback
        </p>

        {/* PKCE verifier arrived */}
        <div className="flex items-center gap-3 mb-3 p-3 rounded-lg" style={{ background: '#0d1117' }}>
          <span style={{ color: '#8b949e' }}>Verifier cookie llegó al callback:</span>
          <span
            className="font-bold px-2 py-0.5 rounded text-xs"
            style={{
              background: pkceArrived ? 'rgba(63,185,80,0.15)' : 'rgba(248,81,73,0.15)',
              color: pkceArrived ? '#3fb950' : '#f85149',
            }}
          >
            {pkceArrived ? 'true ✓' : 'false ✗'}
          </span>
        </div>

        {/* Cookie names */}
        <div className="mb-3 p-3 rounded-lg" style={{ background: '#0d1117' }}>
          <p style={{ color: '#8b949e' }} className="mb-1">
            Cookies recibidas ({cookieNames?.length}):
          </p>
          {cookieNames?.length === 0 ? (
            <span style={{ color: '#f85149' }}>ninguna</span>
          ) : (
            <ul className="space-y-0.5 ml-2">
              {cookieNames?.map((name) => (
                <li key={name} style={{ color: '#e6edf3' }}>
                  • {name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Exchange error if any */}
        {exchangeError && (
          <div className="mb-3 p-3 rounded-lg" style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.3)' }}>
            <p style={{ color: '#f85149' }} className="text-xs font-bold mb-1">
              exchangeCodeForSession error:
            </p>
            <p style={{ color: '#ffa198' }}>{decodeURIComponent(exchangeError)}</p>
          </div>
        )}

        {/* Diagnosis hint */}
        <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: '#0d1117', color: '#8b949e' }}>
          <p className="font-bold mb-1" style={{ color: '#d2a8ff' }}>Diagnóstico:</p>
          {!pkceArrived && (
            <p>❌ Cookie NO llegó → se perdió antes del callback (creada pero no enviada, o nunca creada)</p>
          )}
          {pkceArrived && !exchangeError && (
            <p>✅ Cookie llegó y exchange fue exitoso</p>
          )}
          {pkceArrived && exchangeError && (
            <p>⚠️ Cookie llegó pero Supabase no pudo leerla / exchange falló</p>
          )}
        </div>

        <p className="mt-4 text-xs text-center" style={{ color: '#484f58' }}>
          Redirigiendo en {countdown}s…
        </p>
      </div>
    </div>
  );
}

export default function PkceDebugPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: '#0d1117', color: '#c9d1d9', fontFamily: 'monospace' }}
        >
          Cargando debug…
        </div>
      }
    >
      <PkceDebugInner />
    </Suspense>
  );
}
