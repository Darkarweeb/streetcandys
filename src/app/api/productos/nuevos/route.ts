/**
 * Street Candy — API de Productos Nuevos
 * GET /api/productos/nuevos?limite=8
 */

import { NextRequest, NextResponse } from 'next/server';
import { productoServicio } from '@/lib/products/product-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limite = parseInt(searchParams.get('limite') ?? '8', 10);

    const resultado = await productoServicio.obtenerNuevos(Math.min(limite, 24));

    if (!resultado.exito) {
      return NextResponse.json(resultado, { status: 400 });
    }

    return NextResponse.json(resultado, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch {
    return NextResponse.json(
      { exito: false, error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
