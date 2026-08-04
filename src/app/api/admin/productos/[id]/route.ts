/**
 * GET /api/admin/productos/[id] — Get full product details for admin editing
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

    const { data: producto, error } = await supabase
      .from('products')
      .select(`
        *,
        categories(id, name, slug),
        inventory!inventory_product_id_fkey(*),
        product_variants(
          *,
          inventory!inventory_variant_id_fkey(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !producto) {
      return NextResponse.json({ exito: false, error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ exito: true, datos: producto }, { status: 200 });
  } catch {
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
