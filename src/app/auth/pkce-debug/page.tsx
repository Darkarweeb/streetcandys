'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function PkceDebugInner() {
  const searchParams = useSearchParams();

  const hasCode  = searchParams?.get('has_code')  === 'true';
  const hasToken = searchParams?.get('has_token') === 'true';
  const hasType  = searchParams?.get('has_type')  === 'true';
  const cookieNamesRaw = searchParams?.get('cookie_names') ?? '';
  const cookieNames = cookieNamesRaw ? cookieNamesRaw.split(',').filter(Boolean) : [];

  const badge = (val: boolean) => (
    <span
      className="font-bold px-2 py-0.5 rounded text-xs"
      style={{
        background: val ? 'rgba(63,185,80,0.15)' : 'rgba(248,81,73,0.15)',
        color: val ? '#3fb950' : '#f85149',
      }}
    >
      {val ? 'true ✓' : 'false ✗'}
    </span>
  );

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
          🔍 PKCE Redirect Trace — /auth/callback
        </p>

        {/* URL params */}
        <div className="mb-3 p-3 rounded-lg space-y-2" style={{ background: '#0d1117' }}>
          <p className="text-xs font-bold mb-2" style={{ color: '#d2a8ff' }}>URL params recibidos:</p>
          <div className="flex items-center gap-3">
            <span style={{ color: '#8b949e' }}>code existe:</span>
            {badge(hasCode)}
          </div>
          <div className="flex items-center gap-3">
            <span style={{ color: '#8b949e' }}>token existe:</span>
            {badge(hasToken)}
          </div>
          <div className="flex items-center gap-3">
            <span style={{ color: '#8b949e' }}>type existe:</span>
            {badge(hasType)}
          </div>
        </div>

        {/* Cookie names */}
        <div className="mb-3 p-3 rounded-lg" style={{ background: '#0d1117' }}>
          <p style={{ color: '#8b949e' }} className="mb-1">
            Cookies recibidas en callback ({cookieNames.length}):
          </p>
          {cookieNames.length === 0 ? (
            <span style={{ color: '#f85149' }}>ninguna</span>
          ) : (
            <ul className="space-y-0.5 ml-2">
              {cookieNames.map((name) => (
                <li key={name} style={{ color: '#e6edf3' }}>
                  • {name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Diagnosis */}
        <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: '#0d1117', color: '#8b949e' }}>
          <p className="font-bold mb-1" style={{ color: '#d2a8ff' }}>Diagnóstico:</p>
          {hasCode && (
            <p>✅ code llegó → flujo PKCE activo</p>
          )}
          {!hasCode && !hasToken && (
            <p>❌ ni code ni token → Supabase no envió parámetros esperados</p>
          )}
          {!hasCode && hasToken && (
            <p>⚠️ token llegó pero no code → flujo token_hash (no PKCE)</p>
          )}
          {cookieNames.length === 0 && (
            <p>❌ Sin cookies → verifier nunca llegó al servidor</p>
          )}
          {cookieNames.some((n) => n.includes('code-verifier') || n.includes('pkce') || n.includes('auth-code')) && (
            <p>✅ Cookie PKCE verifier presente en callback</p>
          )}
        </div>

        <p className="mt-4 text-xs text-center" style={{ color: '#484f58' }}>
          [DIAGNÓSTICO TEMPORAL — eliminar después]
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
