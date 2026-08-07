/**
 * GET /api/shipping/calculate
 * ?country=CO&region=Bogotá D.C.&subtotal=200000
 * Returns available shipping options for checkout
 */
import { NextRequest, NextResponse } from 'next/server';
import { calculateShippingOptions } from '@/lib/shipping';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') ?? 'CO';
    const region = searchParams.get('region') ?? null;
    const subtotal = parseFloat(searchParams.get('subtotal') ?? '0') || 0;

    const result = await calculateShippingOptions(country, region, subtotal);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[GET /api/shipping/calculate]', error);
    return NextResponse.json({ success: false, error: 'Error al calcular envío' }, { status: 500 });
  }
}
