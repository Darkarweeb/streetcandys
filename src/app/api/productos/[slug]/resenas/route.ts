/**
 * Street Candy — API de Reseñas de Producto
 * GET /api/productos/[slug]/resenas — Lista reseñas aprobadas paginadas
 * POST /api/productos/[slug]/resenas — Crea una reseña (solo compradores verificados)
 */

import { NextRequest, NextResponse } from 'next/server';
import { resenasRepositorio } from '@/lib/products/reviews-repository';
import { productoRepositorio } from '@/lib/products/product-repository';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const { searchParams } = request.nextUrl;

    const producto = await productoRepositorio.obtenerPorSlug(slug);
    if (!producto) {
      return NextResponse.json({ exito: false, error: 'Producto no encontrado' }, { status: 404 });
    }

    const pagina = parseInt(searchParams.get('pagina') ?? '1', 10);
    const porPagina = parseInt(searchParams.get('por_pagina') ?? '10', 10);
    const sort = searchParams.get('sort') ?? 'reciente';

    const [resenasPaginadas, resumen, destacadas] = await Promise.all([
      resenasRepositorio.obtenerPaginadas(producto.id, pagina, porPagina, sort),
      resenasRepositorio.obtenerResumen(producto.id),
      pagina === 1 ? resenasRepositorio.obtenerDestacadas(producto.id, 3) : Promise.resolve([]),
    ]);

    const { resenas, total } = resenasPaginadas;

    return NextResponse.json({
      exito: true,
      datos: {
        resenas,
        resumen,
        destacadas,
        paginacion: {
          pagina_actual: pagina,
          por_pagina: porPagina,
          total,
          total_paginas: Math.ceil(total / porPagina),
          tiene_siguiente: pagina * porPagina < total,
          tiene_anterior: pagina > 1,
        },
      },
    });
  } catch {
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ exito: false, error: 'Debes iniciar sesión para dejar una reseña' }, { status: 401 });
    }

    const { slug } = await params;
    const producto = await productoRepositorio.obtenerPorSlug(slug);
    if (!producto) {
      return NextResponse.json({ exito: false, error: 'Producto no encontrado' }, { status: 404 });
    }

    // Check verified purchase
    const { comprado, orderId } = await resenasRepositorio.haComprado(user.id, producto.id);
    if (!comprado) {
      return NextResponse.json(
        { exito: false, error: 'Solo los compradores verificados pueden dejar reseñas' },
        { status: 403 },
      );
    }

    // Check duplicate
    const yaReseno = await resenasRepositorio.existeResena(producto.id, user.id);
    if (yaReseno) {
      return NextResponse.json({ exito: false, error: 'Ya has enviado una reseña para este producto' }, { status: 400 });
    }

    const body = await request.json();

    if (!body.rating || body.rating < 1 || body.rating > 5) {
      return NextResponse.json({ exito: false, error: 'La calificación debe estar entre 1 y 5' }, { status: 400 });
    }

    const resena = await resenasRepositorio.crear(user.id, {
      product_id: producto.id,
      order_id: orderId ?? undefined,
      rating: body.rating,
      title: body.title,
      body: body.body,
      photos: body.photos ?? [],
    });

    return NextResponse.json({
      exito: true,
      datos: resena,
      mensaje: 'Reseña enviada exitosamente. Será publicada después de revisión.',
    }, { status: 201 });
  } catch {
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
