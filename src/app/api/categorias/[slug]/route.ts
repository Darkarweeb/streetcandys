/**
 * Street Candy — API de Categoría Individual
 * GET /api/categorias/[slug] — Obtiene una categoría por slug
 * PATCH /api/categorias/[slug] — Actualiza una categoría (admin)
 * DELETE /api/categorias/[slug] — Desactiva una categoría (admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { categoriaServicio } from '@/lib/products/category-service';
import { categoriaRepositorio } from '@/lib/products/category-repository';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const resultado = await categoriaServicio.obtenerPorSlug(slug);

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
    const categoria = await categoriaRepositorio.obtenerPorSlug(slug);
    if (!categoria) {
      return NextResponse.json({ exito: false, error: 'Categoría no encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const resultado = await categoriaServicio.actualizar(categoria.id, body);

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
    const categoria = await categoriaRepositorio.obtenerPorSlug(slug);
    if (!categoria) {
      return NextResponse.json({ exito: false, error: 'Categoría no encontrada' }, { status: 404 });
    }

    const resultado = await categoriaServicio.desactivar(categoria.id);
    return NextResponse.json(resultado, { status: 200 });
  } catch {
    return NextResponse.json(
      { exito: false, error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
