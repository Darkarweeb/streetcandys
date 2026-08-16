/**
 * GET /api/admin/productos/[id]/variantes — Get variants for a product
 * POST /api/admin/productos/[id]/variantes — Create a variant
 * PUT /api/admin/productos/[id]/variantes/[variantId] — Update a variant
 * DELETE /api/admin/productos/[id]/variantes/[variantId] — Delete a variant
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
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

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const user = await checkAdmin(supabase);
    if (!user) return NextResponse.json({ exito: false, error: 'Acceso denegado' }, { status: 403 });

    const { id } = await params;

    const { data: variantes, error } = await supabase
      .from('product_variants')
      .select(`
        *,
        inventory(*)
      `)
      .eq('product_id', id)
      .order('sort_order');

    if (error) return NextResponse.json({ exito: false, error: error.message }, { status: 500 });

    return NextResponse.json({ exito: true, datos: variantes }, { status: 200 });
  } catch {
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const user = await checkAdmin(supabase);
    if (!user) return NextResponse.json({ exito: false, error: 'Acceso denegado' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();

    const { data: variante, error } = await supabase
      .from('product_variants')
      .insert({
        product_id: id,
        variant_type: body.variant_type ?? 'size',
        name: body.name,
        value: body.value,
        sku: body.sku || null,
        price_modifier: body.price_modifier ?? 0,
        price_cop: body.price_cop != null ? Number(body.price_cop) : null,
        price_crc: body.price_crc != null ? Number(body.price_crc) : null,
        weight_label: body.weight_label || null,
        is_active: body.is_active ?? true,
        sort_order: body.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ exito: false, error: error.message }, { status: 500 });

    // Create inventory for variant if quantity provided
    if (typeof body.quantity === 'number') {
      await supabase.rpc('upsert_product_inventory', {
        p_product_id: id,
        p_quantity: body.quantity,
        p_low_stock_threshold: body.low_stock_threshold ?? 5,
        p_allow_backorder: body.allow_backorder ?? false,
        p_variant_id: variante.id,
      });
    }

    return NextResponse.json({ exito: true, datos: variante }, { status: 201 });
  } catch {
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
