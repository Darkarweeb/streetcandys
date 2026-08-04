/**
 * GET /api/pagos/estado?orden_id=xxx — Verifica el estado de pago de una orden
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { servicioPagos } from '@/lib/payment/payment-service';
import { servicioOrdenes } from '@/lib/payment/order-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ordenId = searchParams.get('orden_id');

    if (!ordenId) {
      return NextResponse.json(
        { exito: false, error: 'Parámetro requerido: orden_id' },
        { status: 400 },
      );
    }

    const orden = await servicioOrdenes.obtenerOrden(ordenId);
    if (!orden) {
      return NextResponse.json({ exito: false, error: 'Orden no encontrada' }, { status: 404 });
    }

    if (orden.profile_id !== user.id) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 403 });
    }

    // Sincronizar con el proveedor
    const estadoActual = await servicioPagos.sincronizarEstadoPago(
      ordenId,
      orden.country_code,
    );

    return NextResponse.json({
      exito: true,
      datos: {
        orden_id: ordenId,
        numero_orden: orden.order_number,
        estado_pago: estadoActual,
        estado_orden: orden.status,
        total: orden.total,
        moneda: orden.currency_code,
      },
    });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error verificando estado';
    return NextResponse.json({ exito: false, error: mensaje }, { status: 500 });
  }
}
