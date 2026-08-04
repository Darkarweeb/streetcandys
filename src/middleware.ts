import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function getProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return url.match(/https:\/\/([^.]+)\./)?.[1] ?? '';
}

function injectTokenFromHeader(request: NextRequest): void {
  const token = request.headers.get('x-sb-token');
  if (!token) return;
  const hasCookie = request.cookies.getAll().some((c) => c.name.includes('auth-token'));
  if (hasCookie) return;
  request.cookies.set(`sb-${getProjectRef()}-auth-token`, token);
}

// Routes that require authentication
const PROTECTED_ROUTES = ['/cuenta', '/pedidos', '/recompensas-cuenta'];

// Routes that should redirect to home if already authenticated
const AUTH_ROUTES = ['/iniciar-sesion', '/registro', '/recuperar-contrasena'];

/** Roles allowed to access /admin pages and admin API routes */
const ADMIN_ROLES = ['admin', 'staff'];

export async function middleware(request: NextRequest) {
  injectTokenFromHeader(request);

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith('/api/');

  // ── Admin setup route — allow through without auth ──────────────────────────
  if (pathname === '/admin/setup' || pathname === '/api/admin/setup') {
    return supabaseResponse;
  }

  // ── Admin diagnose route — allow through for debugging ──────────────────────
  if (pathname === '/api/admin/diagnose') {
    return supabaseResponse;
  }

  // ── Admin route protection (pages + API) ──────────────────────────────────
  if (pathname.startsWith('/admin')) {
    // 1. Not authenticated → redirect to login
    if (!user) {
      if (isApiRoute) {
        return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = '/iniciar-sesion';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }

    // 2. Authenticated — verify admin role from profiles table
    // IMPORTANT: profiles RLS now allows users to read their own row directly
    // (no is_admin() call on profiles SELECT = no circular dependency)
    const { data: perfil, error: perfilError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    // If profile query succeeded and role is valid, allow access
    if (perfil && ADMIN_ROLES.includes(perfil.role)) {
      return supabaseResponse;
    }

    // If profile query failed, check user metadata as fallback
    if (perfilError || !perfil) {
      const metaRole =
        (user.user_metadata?.role as string | undefined) ||
        (user.app_metadata?.role as string | undefined);
      if (metaRole && ADMIN_ROLES.includes(metaRole)) {
        return supabaseResponse;
      }
    }

    // No valid admin role found — deny access
    if (isApiRoute) {
      return NextResponse.json({ exito: false, error: 'Acceso denegado' }, { status: 403 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('error', 'forbidden');
    return NextResponse.redirect(url);
  }

  // ── Other authenticated routes ─────────────────────────────────────────────
  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/iniciar-sesion';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  // ── Redirect authenticated users away from auth pages ─────────────────────
  if (AUTH_ROUTES.some((route) => pathname === route) && user) {
    const url = request.nextUrl.clone();

    // Check if the authenticated user is an admin — redirect to /admin
    const { data: perfilAuth } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const authRole =
      perfilAuth?.role ||
      (user.user_metadata?.role as string | undefined) ||
      (user.app_metadata?.role as string | undefined);

    if (authRole && ADMIN_ROLES.includes(authRole)) {
      url.pathname = '/admin';
    } else {
      url.pathname = '/';
    }
    return NextResponse.redirect(url);
  }

  // NOTE: Removed the '/' → '/admin' redirect that was here previously.
  // That redirect caused an infinite loop when RLS blocked the profile query:
  //   admin visits '/' → middleware redirects to '/admin'
  //   → admin visits '/admin' → profile query fails → redirected to '/'
  //   → middleware redirects to '/admin' again → loop
  // The login page now handles the post-login redirect to /admin directly.

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
