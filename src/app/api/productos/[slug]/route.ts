/**
 * Street Candy — API de Producto Individual
 * GET /api/productos/[slug] — Obtiene un producto completo por slug
 * PATCH /api/productos/[slug] — Actualiza un producto (admin)
 * DELETE /api/productos/[slug] — Desactiva un producto (admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { productoServicio } from '@/lib/products/product-service';
import { productoRepositorio } from '@/lib/products/product-repository';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const resultado = await productoServicio.obtenerPorSlug(slug);

    if (!resultado.exito) {
      return NextResponse.json(resultado, { status: 404 });
    }

    return NextResponse.json(resultado, { status: 200 });
  } catch {
    return NextResponse.json(
      { exito: false, error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const { slug } = await params;
    const producto = await productoRepositorio.obtenerPorSlug(slug);
    if (!producto) {
      return NextResponse.json({ exito: false, error: 'Producto no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const resultado = await productoServicio.actualizar(producto.id, body);

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

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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

    if (!perfil || perfil.role !== 'admin') {
      return NextResponse.json({ exito: false, error: 'Acceso denegado' }, { status: 403 });
    }

    const { slug } = await params;
    const producto = await productoRepositorio.obtenerPorSlug(slug);
    if (!producto) {
      return NextResponse.json({ exito: false, error: 'Producto no encontrado' }, { status: 404 });
    }

    const resultado = await productoServicio.desactivar(producto.id);
    return NextResponse.json(resultado, { status: 200 });
  } catch {
    return NextResponse.json(
      { exito: false, error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
