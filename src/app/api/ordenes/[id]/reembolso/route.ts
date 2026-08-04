/**
 * POST /api/ordenes/[id]/reembolso — Procesa un reembolso (admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { servicioPagos } from '@/lib/payment/payment-service';
import { servicioOrdenes } from '@/lib/payment/order-service';
import { repositorioCheckout } from '@/lib/payment/checkout-repository';
import {
  STATUS_NOTIFICATION_TYPE,
  STATUS_NOTIFICATION_TITLE,
  STATUS_NOTIFICATION_BODY,
} from '@/lib/order-status';
import type { MotivoReembolso } from '@/lib/payment/types';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    // Solo admin
    const { data: perfil } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!perfil || perfil.role !== 'admin') {
      return NextResponse.json({ exito: false, error: 'Acceso denegado' }, { status: 403 });
    }

    const orden = await servicioOrdenes.obtenerOrden(id);
    if (!orden) {
      return NextResponse.json({ exito: false, error: 'Orden no encontrada' }, { status: 404 });
    }

    if (orden.payment_status !== 'paid') {
      return NextResponse.json(
        { exito: false, error: 'Solo se pueden reembolsar órdenes pagadas' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { monto, motivo } = body;

    const resultado = await servicioPagos.procesarReembolso(
      id,
      { monto, motivo: motivo as MotivoReembolso | undefined },
      orden.country_code,
    );

    // Send refund notification to customer
    if (orden.profile_id) {
      const notifType = STATUS_NOTIFICATION_TYPE['refunded'];
      const notifTitle = STATUS_NOTIFICATION_TITLE['refunded'];
      const notifBodyFn = STATUS_NOTIFICATION_BODY['refunded'];
      if (notifType && notifTitle && notifBodyFn) {
        await repositorioCheckout.crearNotificacion(
          orden.profile_id,
          notifType,
          notifTitle,
          notifBodyFn(orden.order_number),
          { orden_id: id, numero_orden: orden.order_number, estado: 'refunded' },
        );
      }
    }

    return NextResponse.json({ exito: true, datos: resultado });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error procesando reembolso';
    console.error('[POST /api/ordenes/[id]/reembolso]', mensaje);
    return NextResponse.json({ exito: false, error: mensaje }, { status: 500 });
  }
}
