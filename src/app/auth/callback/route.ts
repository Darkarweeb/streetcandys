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
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const nextParam = searchParams.get('next') ?? '/cuenta';

  // Validate the redirect target to prevent open redirect attacks
  const next = isSafeRedirectPath(nextParam) ? nextParam : '/cuenta';

  const supabase = await createClient();

  // ── Path A: token_hash flow (used by generateLink / action_link) ──────────
  if (tokenHash && type) {
    const verifyResult = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    const { data: verifyData, error } = verifyResult;

    if (!error) {
      // SUCCESS — continue normal redirect
      if (type === 'signup') {
        return NextResponse.redirect(`${origin}/email-verificado`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }

    // ── TEMPORARY DEBUG: return JSON instead of redirecting on failure ──────
    const redirectUrlThatWouldHaveBeenUsed =
      type === 'signup'
        ? `${origin}/email-verificado`
        : `${origin}${next}`;

    return NextResponse.json(
      {
        debug: true,
        token_hash_received: tokenHash,
        type_received: type,
        verifyOtp_error_code: (error as { code?: string }).code ?? null,
        verifyOtp_error_message: error.message ?? null,
        verifyOtp_status: (error as { status?: number }).status ?? null,
        verifyOtp_full_response: {
          data: verifyData,
          error: {
            name: error.name,
            message: error.message,
            status: (error as { status?: number }).status ?? null,
            code: (error as { code?: string }).code ?? null,
          },
        },
        redirect_url_that_would_have_been_used: redirectUrlThatWouldHaveBeenUsed,
      },
      { status: 200 }
    );
    // ── END TEMPORARY DEBUG ─────────────────────────────────────────────────
  }

  // ── Path B: PKCE code flow (OAuth, magic link, password reset) ────────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    if (next === '/email-verificado') {
      return NextResponse.redirect(`${origin}/verificar-email?error=enlace-invalido`);
    }
  }

  // Fallback — no valid params
  return NextResponse.redirect(`${origin}/iniciar-sesion?error=enlace-invalido`);
}
