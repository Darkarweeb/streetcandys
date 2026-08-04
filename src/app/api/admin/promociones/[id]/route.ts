/**
 * Street Candy — Admin Promotions [id] API
 * GET    /api/admin/promociones/[id]  — Get single promotion
 * PUT    /api/admin/promociones/[id]  — Update promotion
 * DELETE /api/admin/promociones/[id]  — Delete promotion
 * PATCH  /api/admin/promociones/[id]  — Toggle active / duplicate
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServer();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { id } = await params;
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[GET /api/admin/promociones/[id]]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServer();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { data, error } = await supabase
      .from('promotions')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[PUT /api/admin/promociones/[id]]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServer();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { id } = await params;
    const body = await request.json() as { action: string };

    if (body.action === 'duplicate') {
      const { data: original, error: fetchErr } = await supabase
        .from('promotions')
        .select('*')
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;

      const { id: _id, usage_count, total_revenue_generated, total_discount_given, created_at, updated_at, ...rest } = original;
      const { data, error } = await supabase
        .from('promotions')
        .insert({
          ...rest,
          name: `${original.name} (copia)`,
          coupon_code: original.coupon_code ? `${original.coupon_code}_COPY` : null,
          usage_count: 0,
          total_revenue_generated: 0,
          total_discount_given: 0,
          is_active: false,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data }, { status: 201 });
    }

    // Toggle active or other partial updates
    const { data, error } = await supabase
      .from('promotions')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[PATCH /api/admin/promociones/[id]]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServer();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { id } = await params;
    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/admin/promociones/[id]]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
