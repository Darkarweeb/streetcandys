/**
 * GET /api/checkout/resumen?carrito_id=xxx&pais=CO
 * Calcula el resumen del checkout sin crear la orden
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { servicioCheckout } from '@/lib/payment/checkout-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { exito: false, error: 'No autorizado' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const carritoId = searchParams.get('carrito_id');
    const pais = searchParams.get('pais');

    if (!carritoId || !pais) {
      return NextResponse.json(
        { exito: false, error: 'Parámetros requeridos: carrito_id, pais' },
        { status: 400 },
      );
    }

    const resumen = await servicioCheckout.calcularResumen(carritoId, pais);

    return NextResponse.json({ exito: true, datos: resumen });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error calculando resumen';
    return NextResponse.json({ exito: false, error: mensaje }, { status: 400 });
  }
}
