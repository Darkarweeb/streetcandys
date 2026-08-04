/**
 * PATCH /api/ordenes/[id]/estado — Actualiza el estado de una orden (admin/staff)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { servicioOrdenes } from '@/lib/payment/order-service';
import { repositorioCheckout } from '@/lib/payment/checkout-repository';
import { otorgarPuntosPorCompra } from '@/lib/rewards/rewards-service';
import type { EstadoOrden } from '@/lib/payment/types';
import {
  ALL_STATUSES,
  STATUS_NOTIFICATION_TYPE,
  STATUS_NOTIFICATION_TITLE,
  STATUS_NOTIFICATION_BODY,
} from '@/lib/order-status';

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    // Solo admin o staff
    const { data: perfil } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!perfil || !['admin', 'staff'].includes(perfil.role)) {
      return NextResponse.json({ exito: false, error: 'Acceso denegado' }, { status: 403 });
    }

    const body = await request.json();
    const { estado, numero_seguimiento, nota, estimated_delivery } = body;

    if (!estado || !(ALL_STATUSES as readonly string[]).includes(estado)) {
      return NextResponse.json(
        { exito: false, error: `Estado inválido. Válidos: ${ALL_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    // Fetch order before updating (for notification and rewards)
    const orden = await servicioOrdenes.obtenerOrden(id);
    if (!orden) {
      return NextResponse.json({ exito: false, error: 'Orden no encontrada' }, { status: 404 });
    }

    await servicioOrdenes.actualizarEstadoOrden(
      id,
      estado as EstadoOrden,
      numero_seguimiento,
      nota,
      estimated_delivery,
    );

    // ── Rewards: award points when order becomes delivered ───────────────────
    // Only award if:
    //   1. New status is 'delivered'
    //   2. Previous status was NOT already 'delivered' (idempotent guard)
    //   3. Order is not cancelled or refunded
    //   4. Order belongs to a registered customer (profile_id present)
    if (
      estado === 'delivered' &&
      orden.status !== 'delivered' &&
      orden.status !== 'cancelled' &&
      orden.status !== 'refunded' &&
      orden.profile_id
    ) {
      // Fire-and-forget: rewards failure must not block the status update response
      otorgarPuntosPorCompra(
        id,
        orden.profile_id,
        Number(orden.total),
        orden.country_code,
        orden.order_number,
      ).catch((err) => {
        console.error('[rewards] Error otorgando puntos para orden', id, err);
      });
    }

    // ── Notification ─────────────────────────────────────────────────────────
    if (orden.profile_id) {
      const notifType = STATUS_NOTIFICATION_TYPE[estado];
      const notifTitle = STATUS_NOTIFICATION_TITLE[estado];
      const notifBodyFn = STATUS_NOTIFICATION_BODY[estado];
      if (notifType && notifTitle && notifBodyFn) {
        await repositorioCheckout.crearNotificacion(
          orden.profile_id,
          notifType,
          notifTitle,
          notifBodyFn(orden.order_number),
          { orden_id: id, numero_orden: orden.order_number, estado },
        );
      }
    }

    return NextResponse.json({ exito: true, mensaje: `Estado actualizado a: ${estado}` });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error actualizando estado';
    return NextResponse.json({ exito: false, error: mensaje }, { status: 500 });
  }
}
