/**
 * Street Candy — API de Productos
 * GET /api/productos — Lista productos con filtros, ordenamiento y paginación
 * POST /api/productos — Crea un nuevo producto (admin)
 *
 * Query params:
 *   categoria, precio_min, precio_max, efectos, etiquetas,
 *   intensidad_min, intensidad_max, en_stock, destacado, nuevo,
 *   busqueda, ordenar, pagina, por_pagina
 */

import { NextRequest, NextResponse } from 'next/server';
import { productoServicio } from '@/lib/products/product-service';
import { createClient } from '@/lib/supabase/server';
import type { ProductFilters, ProductSortField } from '@/lib/products/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // Construye filtros desde query params
    const filtros: ProductFilters = {};

    const categoria = searchParams.get('categoria');
    if (categoria) filtros.categoria = categoria;

    const precioMin = searchParams.get('precio_min');
    if (precioMin) filtros.precio_min = parseFloat(precioMin);

    const precioMax = searchParams.get('precio_max');
    if (precioMax) filtros.precio_max = parseFloat(precioMax);

    const efectos = searchParams.get('efectos');
    if (efectos) filtros.efectos = efectos.split(',').map((e) => e.trim());

    const etiquetas = searchParams.get('etiquetas');
    if (etiquetas) filtros.etiquetas = etiquetas.split(',').map((t) => t.trim());

    const intensidadMin = searchParams.get('intensidad_min');
    if (intensidadMin) filtros.intensidad_min = parseInt(intensidadMin, 10);

    const intensidadMax = searchParams.get('intensidad_max');
    if (intensidadMax) filtros.intensidad_max = parseInt(intensidadMax, 10);

    const enStock = searchParams.get('en_stock');
    if (enStock !== null) filtros.en_stock = enStock === 'true';

    const destacado = searchParams.get('destacado');
    if (destacado !== null) filtros.destacado = destacado === 'true';

    const nuevo = searchParams.get('nuevo');
    if (nuevo !== null) filtros.nuevo = nuevo === 'true';

    const busqueda = searchParams.get('busqueda') || searchParams.get('q');
    if (busqueda) filtros.busqueda = busqueda;

    // Country filter: CR requires price_crc to be set
    const pais = searchParams.get('pais');
    if (pais === 'CR') filtros.solo_con_precio_crc = true;

    const ordenar = (searchParams.get('ordenar') as ProductSortField) || undefined;
    const pagina = parseInt(searchParams.get('pagina') ?? '1', 10);
    const porPagina = parseInt(searchParams.get('por_pagina') ?? '12', 10);

    const resultado = await productoServicio.listar(filtros, ordenar, { pagina, por_pagina: porPagina });

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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const { data: perfil } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!perfil || !['admin', 'staff'].includes(perfil.role)) {
      return NextResponse.json({ exito: false, error: 'Acceso denegado' }, { status: 403 });
    }

    const body = await request.json();
    const resultado = await productoServicio.crear(body);

    if (!resultado.exito) {
      return NextResponse.json(resultado, { status: 400 });
    }

    return NextResponse.json(resultado, { status: 201 });
  } catch {
    return NextResponse.json(
      { exito: false, error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
