/**
 * GET  /api/ordenes — Lista órdenes del usuario autenticado (o admin con filtros)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { servicioOrdenes } from '@/lib/payment/order-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pagina = parseInt(searchParams.get('pagina') ?? '1', 10);
    const porPagina = Math.min(parseInt(searchParams.get('por_pagina') ?? '10', 10), 50);

    // Check if admin/staff — if so, return all orders with server-side filters
    const { data: perfil } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const esAdmin = perfil?.role === 'admin' || perfil?.role === 'staff';

    if (esAdmin) {
      const filtros = {
        estado: searchParams.get('estado') || undefined,
        pago: searchParams.get('pago') || undefined,
        busqueda: searchParams.get('busqueda') || undefined,
      };
      const resultado = await servicioOrdenes.listarOrdenesAdmin(pagina, porPagina, filtros);
      return NextResponse.json({
        exito: true,
        datos: resultado.ordenes,
        paginacion: {
          pagina_actual: pagina,
          por_pagina: porPagina,
          total: resultado.total,
          total_paginas: resultado.paginas,
        },
      });
    }

    // Regular user — own orders only
    const resultado = await servicioOrdenes.listarOrdenesUsuario(user.id, pagina, porPagina);

    return NextResponse.json({
      exito: true,
      datos: resultado.ordenes,
      paginacion: {
        pagina_actual: pagina,
        por_pagina: porPagina,
        total: resultado.total,
        total_paginas: resultado.paginas,
      },
    });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error listando órdenes';
    return NextResponse.json({ exito: false, error: mensaje }, { status: 500 });
  }
}
