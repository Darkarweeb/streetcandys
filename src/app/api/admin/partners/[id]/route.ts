/**
 * GET    /api/admin/partners/[id] - Get single partner
 * PUT    /api/admin/partners/[id] - Update partner
 * DELETE /api/admin/partners/[id] - Delete partner
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!perfil || !['admin', 'staff'].includes(perfil.role)) return null;
  return user;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, logo_url, website_url, display_order, is_active } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (logo_url !== undefined) updateData.logo_url = logo_url;
    if (website_url !== undefined) updateData.website_url = website_url || null;
    if (display_order !== undefined) updateData.sort_order = display_order;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('partner_logos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ exito: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ exito: true, datos: data });
  } catch {
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const { error } = await supabase
      .from('partner_logos')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ exito: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ exito: true });
  } catch {
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
