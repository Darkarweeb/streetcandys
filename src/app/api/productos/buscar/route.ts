/**
 * Street Candy — API de Búsqueda de Productos
 * GET /api/productos/buscar?q=texto&pagina=1&por_pagina=12
 */

import { NextRequest, NextResponse } from 'next/server';
import { productoServicio } from '@/lib/products/product-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const texto = searchParams.get('q') || searchParams.get('busqueda') || '';

    if (!texto.trim()) {
      return NextResponse.json(
        { exito: false, error: 'El parámetro de búsqueda "q" es requerido' },
        { status: 400 },
      );
    }

    const pagina = parseInt(searchParams.get('pagina') ?? '1', 10);
    const porPagina = parseInt(searchParams.get('por_pagina') ?? '12', 10);

    const resultado = await productoServicio.buscar(texto, { pagina, por_pagina: porPagina });

    if (!resultado.exito) {
      return NextResponse.json(resultado, { status: 400 });
    }

    return NextResponse.json(resultado, { status: 200 });
  } catch {
    return NextResponse.json(
      { exito: false, error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
