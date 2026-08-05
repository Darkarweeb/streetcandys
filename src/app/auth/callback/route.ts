import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

// Allowed redirect paths — must start with / and not contain protocol or double-slash
function isSafeRedirectPath(path: string): boolean {
  return (
    typeof path === 'string' && path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes(':')
  );
}

export async function GET(request: NextRequest) {
  const { searchParams, origin, pathname } = new URL(request.url);

  const code = searchParams.get('code');
  const type = searchParams.get('type') as EmailOtpType | null;
  const nextParam = searchParams.get('next') ?? '/cuenta';
  const next = isSafeRedirectPath(nextParam) ? nextParam : '/cuenta';

  // ── DEBUG: recovery flow diagnostics (temporary) ─────────────────────────
  const paramNames = Array.from(searchParams.keys());
  console.log('[auth/callback] DEBUG pathname:', pathname);
  console.log('[auth/callback] DEBUG query param names received:', paramNames);
  console.log('[auth/callback] DEBUG detected type:', type);
  // ─────────────────────────────────────────────────────────────────────────

  // ── Path A (recovery): PKCE recovery flow ────────────────────────────────
  // Supabase sends the parameter as "token" in recovery links.
  // token_hash is kept as fallback for compatibility.
  if (type === 'recovery') {
    console.log('[auth/callback] DEBUG recovery branch: EXECUTING');

    const recoveryToken = searchParams.get('token') ?? searchParams.get('token_hash');
    console.log('[auth/callback] DEBUG recoveryToken present:', recoveryToken !== null);

    if (recoveryToken) {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: recoveryToken,
        type: 'recovery',
      });

      if (!error) {
        console.log('[auth/callback] DEBUG verifyOtp: SUCCESS');
        // Confirm session exists before redirecting
        const session = data?.session;
        console.log('[auth/callback] DEBUG session present after verifyOtp:', session !== null);
        if (session) {
          return NextResponse.redirect(`${origin}/nueva-contrasena`);
        }
        // verifyOtp succeeded but no session — expose this state
        return NextResponse.redirect(
          `${origin}/iniciar-sesion?error=sesion-no-establecida`
        );
      }

      // Log the actual Supabase error (message and status only — no tokens)
      console.log('[auth/callback] DEBUG verifyOtp: FAILED');
      console.log('[auth/callback] DEBUG verifyOtp error message:', error.message);
      console.log('[auth/callback] DEBUG verifyOtp error code:', (error as any).code ?? 'n/a');
      console.log('[auth/callback] DEBUG verifyOtp error status:', (error as any).status ?? 'n/a');

      // Expose the actual Supabase error for debugging
      const errorMsg = encodeURIComponent(error.message ?? 'unknown');
      const errorCode = encodeURIComponent((error as any).code ?? (error as any).status ?? 'unknown');
      return NextResponse.redirect(
        `${origin}/iniciar-sesion?error=recovery-failed&detail=${errorMsg}&code=${errorCode}`
      );
    }

    // type=recovery but no token at all
    console.log('[auth/callback] DEBUG recovery branch: no token found in params');
    return NextResponse.redirect(`${origin}/iniciar-sesion?error=token-ausente`);
  }

  // ── Path B: token_hash flow (PKCE — signup or other types) ───────────────
  const tokenHash = searchParams.get('token_hash') ?? searchParams.get('token');
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

    if (!error) {
      // signup via token_hash — session is now in cookies, go to /cuenta
      return NextResponse.redirect(`${origin}/cuenta`);
    }

    return NextResponse.redirect(
      `${origin}/iniciar-sesion?error=enlace-invalido&branch=path-b-token_hash&params=${encodeURIComponent(paramNames.join(','))}`
    );
  }

  // ── Path C: PKCE code flow (OAuth, magic link) ────────────────────────────
  if (code) {
    const supabase = await createClient();
    const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    // ── DEBUG: Path C detailed diagnostics (temporary) ───────────────────
    const sessionCreated = !!(exchangeData?.session);
    console.log('[auth/callback] DEBUG Path C: exchangeCodeForSession called');
    console.log('[auth/callback] DEBUG Path C: session created:', sessionCreated);
    if (exchangeError) {
      console.log('[auth/callback] DEBUG Path C: exchangeCodeForSession FAILED');
      console.log('[auth/callback] DEBUG Path C: error.message:', exchangeError.message);
      console.log('[auth/callback] DEBUG Path C: error.code:', (exchangeError as any).code ?? 'n/a');
      console.log('[auth/callback] DEBUG Path C: error.status:', (exchangeError as any).status ?? 'n/a');
    } else {
      console.log('[auth/callback] DEBUG Path C: exchangeCodeForSession SUCCESS');
    }
    // ─────────────────────────────────────────────────────────────────────

    if (!exchangeError) {
      // ── Recovery via code flow: redirect to password reset page ─────────
      // When Supabase sends an authorization code for password recovery,
      // the session is established here. Redirect to /nueva-contrasena
      // instead of the generic `next` destination.
      if (sessionCreated && exchangeData.session?.user) {
        // Check if this is a recovery session (AMR contains 'otp' or user has no confirmed email yet)
        // Supabase recovery code flows land here — redirect to password reset
        const amr = (exchangeData.session as any).amr as Array<{ method: string }> | undefined;
        const isRecovery = Array.isArray(amr) && amr.some((a) => a.method === 'otp');
        console.log('[auth/callback] DEBUG Path C: AMR methods:', JSON.stringify(amr ?? []));
        console.log('[auth/callback] DEBUG Path C: isRecovery (via AMR):', isRecovery);
        if (isRecovery) {
          return NextResponse.redirect(`${origin}/nueva-contrasena`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }

    // Surface the exact Supabase error in the redirect URL for browser-visible diagnosis
    const errMsg = encodeURIComponent(exchangeError.message ?? 'unknown');
    const errCode = encodeURIComponent(
      (exchangeError as any).code ?? (exchangeError as any).status ?? 'unknown'
    );
    const errSession = sessionCreated ? 'yes' : 'no';
    return NextResponse.redirect(
      `${origin}/iniciar-sesion?error=enlace-invalido&branch=path-c-code&params=${encodeURIComponent(paramNames.join(','))}&detail=${errMsg}&ecode=${errCode}&session=${errSession}`
    );
  }

  // ── Path D: Implicit flow — session arrives in URL hash (browser-only) ────
  // The hash fragment is never sent to the server. Forward to the client-side
  // handler which will read window.location.hash and call setSession().
  const clientUrl = new URL(`${origin}/auth/confirmar`);
  if (nextParam && isSafeRedirectPath(nextParam)) {
    clientUrl.searchParams.set('next', nextParam);
  }
  clientUrl.searchParams.set('branch', 'path-d-confirmar');
  clientUrl.searchParams.set('params', paramNames.join(','));
  return NextResponse.redirect(clientUrl.toString());
}
