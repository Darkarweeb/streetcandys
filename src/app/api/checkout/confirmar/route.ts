/**
 * POST /api/checkout/confirmar — Confirma el pago de una orden
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { servicioCheckout } from '@/lib/payment/checkout-service';
import type { InputConfirmarPago } from '@/lib/payment/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { exito: false, error: 'No autorizado' },
        { status: 401 },
      );
    }

    const body: InputConfirmarPago = await request.json();

    if (!body.orden_id || !body.referencia_proveedor) {
      return NextResponse.json(
        { exito: false, error: 'Faltan campos: orden_id, referencia_proveedor' },
        { status: 400 },
      );
    }

    const resultado = await servicioCheckout.confirmarPago(user.id, body);

    return NextResponse.json({ exito: true, datos: resultado });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error confirmando pago';
    console.error('[POST /api/checkout/confirmar]', mensaje);
    return NextResponse.json({ exito: false, error: mensaje }, { status: 400 });
  }
}
