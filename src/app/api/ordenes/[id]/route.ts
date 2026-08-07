/**
 * GET    /api/ordenes/[id] — Obtiene una orden por ID
 * DELETE /api/ordenes/[id] — Cancela una orden
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { servicioOrdenes } from '@/lib/payment/order-service';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const orden = await servicioOrdenes.obtenerOrden(id);

    if (!orden) {
      return NextResponse.json({ exito: false, error: 'Orden no encontrada' }, { status: 404 });
    }

    // Allow access if:
    // 1. Authenticated user who owns the order
    // 2. Authenticated admin/staff
    // 3. Guest order (profile_id is null) — accessible without auth for confirmation page
    const esOrdenInvitado = orden.profile_id === null;

    if (!user) {
      // Only allow unauthenticated access for guest orders (order confirmation page)
      if (!esOrdenInvitado) {
        return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
      }
      return NextResponse.json({ exito: true, datos: orden });
    }

    // Check admin/staff role
    const { data: perfil } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const esAdmin = perfil?.role === 'admin' || perfil?.role === 'staff';

    if (orden.profile_id !== user.id && !esAdmin && !esOrdenInvitado) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json({ exito: true, datos: orden });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error obteniendo orden';
    return NextResponse.json({ exito: false, error: mensaje }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const motivo = body.motivo as string | undefined;

    const resultado = await servicioOrdenes.cancelarOrden(id, user.id, motivo);

    if (!resultado.exito) {
      return NextResponse.json({ exito: false, error: resultado.mensaje }, { status: 400 });
    }

    return NextResponse.json({ exito: true, mensaje: resultado.mensaje });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error cancelando orden';
    return NextResponse.json({ exito: false, error: mensaje }, { status: 500 });
  }
}
