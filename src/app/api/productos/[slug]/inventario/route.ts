/**
 * Street Candy — API de Inventario de Producto
 * GET /api/productos/[slug]/inventario — Estado de inventario
 * GET /api/productos/[slug]/inventario?variante_id=xxx — Inventario de variante
 */

import { NextRequest, NextResponse } from 'next/server';
import { inventarioServicio } from '@/lib/products/inventory-service';
import { productoRepositorio } from '@/lib/products/product-repository';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const { searchParams } = request.nextUrl;
    const varianteId = searchParams.get('variante_id') || undefined;

    const producto = await productoRepositorio.obtenerPorSlug(slug);
    if (!producto) {
      return NextResponse.json(
        { exito: false, error: 'Producto no encontrado' },
        { status: 404 },
      );
    }

    const resultado = varianteId
      ? await inventarioServicio.obtenerEstado(producto.id, varianteId)
      : await inventarioServicio.obtenerTodo(producto.id);

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
