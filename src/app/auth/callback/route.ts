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
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get('code');
  const type = searchParams.get('type') as EmailOtpType | null;
  const nextParam = searchParams.get('next') ?? '/cuenta';
  const next = isSafeRedirectPath(nextParam) ? nextParam : '/cuenta';

  // ── Path A (recovery): PKCE recovery flow ────────────────────────────────
  // Supabase sends the parameter as "token" in recovery links.
  // token_hash is kept as fallback for compatibility.
  if (type === 'recovery') {
    const recoveryToken = searchParams.get('token') ?? searchParams.get('token_hash');

    if (recoveryToken) {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: recoveryToken,
        type: 'recovery',
      });

      if (!error) {
        // Confirm session exists before redirecting
        const session = data?.session;
        if (session) {
          return NextResponse.redirect(`${origin}/nueva-contrasena`);
        }
        // verifyOtp succeeded but no session — expose this state
        return NextResponse.redirect(
          `${origin}/iniciar-sesion?error=sesion-no-establecida`
        );
      }

      // Expose the actual Supabase error temporarily for debugging
      const errorMsg = encodeURIComponent(error.message ?? 'unknown');
      return NextResponse.redirect(
        `${origin}/iniciar-sesion?error=recovery-failed&detail=${errorMsg}`
      );
    }

    // type=recovery but no token at all
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

    return NextResponse.redirect(`${origin}/iniciar-sesion?error=enlace-invalido`);
  }

  // ── Path C: PKCE code flow (OAuth, magic link) ────────────────────────────
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    return NextResponse.redirect(`${origin}/iniciar-sesion?error=enlace-invalido`);
  }

  // ── Path D: Implicit flow — session arrives in URL hash (browser-only) ────
  // The hash fragment is never sent to the server. Forward to the client-side
  // handler which will read window.location.hash and call setSession().
  const clientUrl = new URL(`${origin}/auth/confirmar`);
  if (nextParam && isSafeRedirectPath(nextParam)) {
    clientUrl.searchParams.set('next', nextParam);
  }
  return NextResponse.redirect(clientUrl.toString());
}
