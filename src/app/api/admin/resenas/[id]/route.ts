/**
 * Street Candy — Admin API de Reseña Individual
 * PATCH /api/admin/resenas/[id] — Moderar (approve/reject/hide/feature/reply)
 * DELETE /api/admin/resenas/[id] — Eliminar reseña
 */

import { NextRequest, NextResponse } from 'next/server';
import { resenasRepositorio } from '@/lib/products/reviews-repository';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

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

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const admin = await verificarAdmin(supabase);
    if (!admin) return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { accion, status, reply, is_featured } = body;

    if (accion === 'moderar' && status) {
      const resena = await resenasRepositorio.moderarResena(id, admin.id, status);
      return NextResponse.json({ exito: true, datos: resena });
    }

    if (accion === 'destacar') {
      await resenasRepositorio.toggleDestacada(id, is_featured);
      return NextResponse.json({ exito: true, mensaje: is_featured ? 'Reseña destacada' : 'Reseña quitada de destacados' });
    }

    if (accion === 'responder' && reply !== undefined) {
      await resenasRepositorio.responder(id, reply);
      return NextResponse.json({ exito: true, mensaje: 'Respuesta guardada' });
    }

    return NextResponse.json({ exito: false, error: 'Acción no válida' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ exito: false, error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const admin = await verificarAdmin(supabase);
    if (!admin) return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 403 });

    const { id } = await params;
    await resenasRepositorio.eliminarAdmin(id);
    return NextResponse.json({ exito: true, mensaje: 'Reseña eliminada' });
  } catch (err) {
    return NextResponse.json({ exito: false, error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
