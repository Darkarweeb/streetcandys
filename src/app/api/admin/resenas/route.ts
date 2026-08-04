/**
 * Street Candy — Admin API de Reseñas
 * GET /api/admin/resenas — Lista todas las reseñas con filtros
 */

import { NextRequest, NextResponse } from 'next/server';
import { resenasRepositorio } from '@/lib/products/reviews-repository';
import { createClient } from '@/lib/supabase/server';

async function verificarAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
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
    const supabase = await createClient();
    const admin = await verificarAdmin(supabase);
    if (!admin) return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 403 });

    const { searchParams } = request.nextUrl;
    const filtros = {
      busqueda: searchParams.get('busqueda') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      rating: searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : undefined,
      producto_id: searchParams.get('producto_id') ?? undefined,
      pais: searchParams.get('pais') ?? undefined,
      pagina: parseInt(searchParams.get('pagina') ?? '1'),
      por_pagina: parseInt(searchParams.get('por_pagina') ?? '20'),
    };

    const resultado = await resenasRepositorio.obtenerTodasAdmin(filtros);
    const pendientes = await resenasRepositorio.contarPendientes();

    return NextResponse.json({
      exito: true,
      datos: resultado.resenas,
      total: resultado.total,
      pendientes,
      paginacion: {
        pagina_actual: filtros.pagina,
        por_pagina: filtros.por_pagina,
        total: resultado.total,
        total_paginas: Math.ceil(resultado.total / filtros.por_pagina),
      },
    });
  } catch (err) {
    return NextResponse.json({ exito: false, error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
