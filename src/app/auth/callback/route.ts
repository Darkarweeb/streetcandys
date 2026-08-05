import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
  const nextParam = searchParams.get('next') ?? '/cuenta';

  // Validate the redirect target to prevent open redirect attacks
  const next = isSafeRedirectPath(nextParam) ? nextParam : '/cuenta';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // If the callback is for email verification (next points to /email-verificado),
      // redirect there so the user sees the success page.
      // For all other flows (password reset, etc.) redirect to the requested path.
      return NextResponse.redirect(`${origin}${next}`);
    }

    // Token exchange failed — could be expired or already used
    if (next === '/email-verificado') {
      // Email verification link was invalid/expired — show friendly error page
      return NextResponse.redirect(`${origin}/verificar-email?error=enlace-invalido`);
    }
  }

  // On error, redirect to login with error param
  return NextResponse.redirect(`${origin}/iniciar-sesion?error=enlace-invalido`);
}
