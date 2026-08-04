/**
 * Street Candy — API de Reseña Individual
 * PUT /api/productos/[slug]/resenas/[id] — Edita reseña pendiente propia
 * DELETE /api/productos/[slug]/resenas/[id] — Elimina reseña pendiente propia
 */

import { NextRequest, NextResponse } from 'next/server';
import { resenasRepositorio } from '@/lib/products/reviews-repository';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ slug: string; id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const resena = await resenasRepositorio.actualizar(id, user.id, {
      rating: body.rating,
      title: body.title,
      body: body.body,
      photos: body.photos ?? [],
    });

    return NextResponse.json({ exito: true, datos: resena });
  } catch (err) {
    return NextResponse.json({ exito: false, error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    await resenasRepositorio.eliminar(id, user.id);

    return NextResponse.json({ exito: true, mensaje: 'Reseña eliminada' });
  } catch (err) {
    return NextResponse.json({ exito: false, error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
