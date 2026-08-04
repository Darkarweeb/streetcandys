/**
 * POST /api/pagos/webhook — Recibe eventos de webhook del proveedor de pago activo.
 * La autenticación del webhook depende del proveedor configurado por país.
 * Para proveedores con firma (ej. Stripe), enviar la firma en el header X-Payment-Signature.
 */

import { NextRequest, NextResponse } from 'next/server';
import { servicioPagos } from '@/lib/payment/payment-service';
import { loggerPagos } from '@/lib/payment/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let payload: string;
  try {
    payload = await request.text();
  } catch {
    return NextResponse.json({ error: 'Error leyendo payload' }, { status: 400 });
  }

  // Firma opcional — cada proveedor decide si la valida
  const firma = request.headers.get('x-payment-signature') ?? '';

  // Determinar país desde query param o header
  const { searchParams } = new URL(request.url);
  const pais = searchParams.get('pais') ?? 'CO';

  try {
    const resultado = await servicioPagos.procesarWebhook(payload, firma, pais);

    loggerPagos.info('Webhook procesado', {
      datos: { procesado: resultado.procesado, orden_id: resultado.orden_id },
    });

    return NextResponse.json({ recibido: true, ...resultado });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error procesando webhook';
    loggerPagos.error('Error en webhook', { datos: { error: mensaje } });

    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}
