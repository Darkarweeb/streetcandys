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
  const tokenHash = searchParams.get('token_hash') ?? searchParams.get('token');
  const type = searchParams.get('type') as EmailOtpType | null;
  const nextParam = searchParams.get('next') ?? '/cuenta';
  const next = isSafeRedirectPath(nextParam) ? nextParam : '/cuenta';

  // ── Path A: token_hash flow (PKCE — used by password recovery action_link) ──
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/nueva-contrasena`);
      }
      // signup via token_hash — session is now in cookies, go to /cuenta
      return NextResponse.redirect(`${origin}/cuenta`);
    }

    // verifyOtp failed — send to login with error
    return NextResponse.redirect(`${origin}/iniciar-sesion?error=enlace-invalido`);
  }

  // ── Path B: PKCE code flow (OAuth, magic link) ────────────────────────────
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    return NextResponse.redirect(`${origin}/iniciar-sesion?error=enlace-invalido`);
  }

  // ── Path C: Implicit flow — session arrives in URL hash (browser-only) ────
  // The hash fragment is never sent to the server. Forward to the client-side
  // handler which will read window.location.hash and call setSession().
  // Preserve the ?next= param so the client page knows where to redirect.
  const clientUrl = new URL(`${origin}/auth/confirmar`);
  if (nextParam && isSafeRedirectPath(nextParam)) {
    clientUrl.searchParams.set('next', nextParam);
  }
  return NextResponse.redirect(clientUrl.toString());
}
