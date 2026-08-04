/**
 * Street Candy — API de Productos Relacionados
 * GET /api/productos/[slug]/relacionados?limite=4
 */

import { NextRequest, NextResponse } from 'next/server';
import { productoServicio } from '@/lib/products/product-service';
import { productoRepositorio } from '@/lib/products/product-repository';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const { searchParams } = request.nextUrl;
    const limite = parseInt(searchParams.get('limite') ?? '4', 10);

    const producto = await productoRepositorio.obtenerPorSlug(slug);
    if (!producto) {
      return NextResponse.json(
        { exito: false, error: 'Producto no encontrado' },
        { status: 404 },
      );
    }

    const resultado = await productoServicio.obtenerRelacionados(producto.id, Math.min(limite, 12));

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
