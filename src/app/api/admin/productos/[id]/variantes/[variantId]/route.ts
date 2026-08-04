/**
 * PATCH /api/admin/productos/[id]/variantes/[variantId] — Update a variant
 * DELETE /api/admin/productos/[id]/variantes/[variantId] — Delete a variant
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string; variantId: string }>;
}

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
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

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const user = await checkAdmin(supabase);
    if (!user) return NextResponse.json({ exito: false, error: 'Acceso denegado' }, { status: 403 });

    const { variantId } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.value !== undefined) updateData.value = body.value;
    if (body.sku !== undefined) updateData.sku = body.sku || null;
    if (body.price_modifier !== undefined) updateData.price_modifier = body.price_modifier;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order;
    if (body.variant_type !== undefined) updateData.variant_type = body.variant_type;

    const { data: variante, error } = await supabase
      .from('product_variants')
      .update(updateData)
      .eq('id', variantId)
      .select()
      .single();

    if (error) return NextResponse.json({ exito: false, error: error.message }, { status: 500 });

    return NextResponse.json({ exito: true, datos: variante }, { status: 200 });
  } catch {
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const user = await checkAdmin(supabase);
    if (!user) return NextResponse.json({ exito: false, error: 'Acceso denegado' }, { status: 403 });

    const { id, variantId } = await params;

    // Delete inventory first
    await supabase.from('inventory').delete().eq('variant_id', variantId);

    const { error } = await supabase
      .from('product_variants')
      .delete()
      .eq('id', variantId)
      .eq('product_id', id);

    if (error) return NextResponse.json({ exito: false, error: error.message }, { status: 500 });

    return NextResponse.json({ exito: true }, { status: 200 });
  } catch {
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
