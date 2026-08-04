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
  const nextParam = searchParams.get('next') ?? '/';

  // Validate the redirect target to prevent open redirect attacks
  const next = isSafeRedirectPath(nextParam) ? nextParam : '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // On error, redirect to login with error param
  return NextResponse.redirect(`${origin}/iniciar-sesion?error=enlace-invalido`);
}
