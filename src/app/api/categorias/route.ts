/**
 * Street Candy — API de Categorías
 * GET /api/categorias — Lista todas las categorías
 * POST /api/categorias — Crea una nueva categoría (admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { categoriaServicio } from '@/lib/products/category-service';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const resultado = await categoriaServicio.obtenerArbol();

    if (!resultado.exito) {
      return NextResponse.json(resultado, { status: 400 });
    }

    return NextResponse.json(resultado, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    });
  } catch {
    return NextResponse.json(
      { exito: false, error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticación y rol admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { exito: false, error: 'No autorizado' },
        { status: 401 },
      );
    }

    const { data: perfil } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!perfil || !['admin', 'staff'].includes(perfil.role)) {
      return NextResponse.json(
        { exito: false, error: 'Acceso denegado' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const resultado = await categoriaServicio.crear(body);

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
