/**
 * Street Candy — API de Mis Reseñas
 * GET /api/cuenta/resenas — Lista todas las reseñas del usuario autenticado
 */

import { NextResponse } from 'next/server';
import { resenasRepositorio } from '@/lib/products/reviews-repository';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase?.auth?.getUser();
    if (!user) return NextResponse?.json({ exito: false, error: 'No autorizado' }, { status: 401 });

    const resenas = await resenasRepositorio?.obtenerPorPerfil(user?.id);
    return NextResponse?.json({ exito: true, datos: resenas });
  } catch (err) {
    return NextResponse?.json({ exito: false, error: err instanceof Error ? err?.message : 'Error interno' }, { status: 500 });
  }
}
