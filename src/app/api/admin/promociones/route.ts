/**
 * Street Candy — Admin Promotions API
 * GET  /api/admin/promociones        — List promotions with filters
 * POST /api/admin/promociones        — Create promotion
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}

async function requireAdmin(supabase: Awaited<ReturnType<typeof createSupabaseServer>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !['admin', 'staff'].includes(profile.role)) return null;
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '15');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const country = searchParams.get('country') || '';

    let query = supabase
      .from('promotions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    if (search) query = query.ilike('name', `%${search}%`);
    if (type) query = query.eq('promotion_type', type);
    if (status === 'active') query = query.eq('is_active', true);
    if (status === 'inactive') query = query.eq('is_active', false);
    if (country) query = query.contains('country_codes', [country]);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ data, count, page, per_page: perPage });
  } catch (error) {
    console.error('[GET /api/admin/promociones]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const body = await request.json();
    const { error, data } = await supabase
      .from('promotions')
      .insert({ ...body, created_by: user.id })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/promociones]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
