/**
 * GET /api/admin/productos/[id]/inventario — Get full inventory for a product
 * PUT /api/admin/productos/[id]/inventario — Update inventory for product or variant
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const { data: perfil } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!perfil || !['admin', 'staff'].includes(perfil.role)) {
      return NextResponse.json({ exito: false, error: 'Acceso denegado' }, { status: 403 });
    }

    const { id } = await params;

    const { data: inventario, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('product_id', id)
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ exito: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ exito: true, datos: inventario }, { status: 200 });
  } catch {
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const { data: perfil } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!perfil || !['admin', 'staff'].includes(perfil.role)) {
      return NextResponse.json({ exito: false, error: 'Acceso denegado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { quantity, low_stock_threshold, allow_backorder, variant_id } = body;

    if (typeof quantity !== 'number' || quantity < 0) {
      return NextResponse.json({ exito: false, error: 'Cantidad inválida' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('upsert_product_inventory', {
      p_product_id: id,
      p_quantity: quantity,
      p_low_stock_threshold: low_stock_threshold ?? 5,
      p_allow_backorder: allow_backorder ?? false,
      p_variant_id: variant_id ?? null,
    });

    if (error) {
      return NextResponse.json({ exito: false, error: error.message }, { status: 500 });
    }

    if (data && !data.success) {
      return NextResponse.json({ exito: false, error: data.error }, { status: 400 });
    }

    return NextResponse.json({ exito: true, datos: data }, { status: 200 });
  } catch {
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
