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

  // ── Path A (recovery): token_hash + type=recovery ────────────────────────
  if (type === 'recovery') {
    const recoveryToken = searchParams.get('token') ?? searchParams.get('token_hash');

    if (recoveryToken) {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: recoveryToken,
        type: 'recovery',
      });

      if (!error && data?.session) {
        return NextResponse.redirect(`${origin}/nueva-contrasena`);
      }

      return NextResponse.redirect(`${origin}/iniciar-sesion?error=enlace-invalido`);
    }

    return NextResponse.redirect(`${origin}/iniciar-sesion?error=enlace-invalido`);
  }

  // ── Path B: token_hash flow (signup or other OTP types) ──────────────────
  const tokenHash = searchParams.get('token_hash') ?? searchParams.get('token');
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

    if (!error) {
      return NextResponse.redirect(`${origin}/cuenta`);
    }

    return NextResponse.redirect(`${origin}/iniciar-sesion?error=enlace-invalido`);
  }

  // ── Path C: PKCE authorization code flow (OAuth, magic link, recovery) ───
  if (code) {
    const supabase = await createClient();
    const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError && exchangeData?.session) {
      // Detect recovery session via AMR (Authentication Methods Reference)
      const amr = (exchangeData.session as any).amr as Array<{ method: string }> | undefined;
      const isRecovery = Array.isArray(amr) && amr.some((a) => a.method === 'otp');
      const destination = isRecovery ? '/nueva-contrasena' : next;
      return NextResponse.redirect(`${origin}${destination}`);
    }

    return NextResponse.redirect(`${origin}/iniciar-sesion?error=enlace-invalido`);
  }

  // ── Path D: Implicit flow — forward to client-side handler ───────────────
  const clientUrl = new URL(`${origin}/auth/confirmar`);
  if (nextParam && isSafeRedirectPath(nextParam)) {
    clientUrl.searchParams.set('next', nextParam);
  }
  return NextResponse.redirect(clientUrl.toString());
}
