/**
 * Street Candy — API de Validación de Inventario del Carrito
 * GET /api/carrito/validar?session_id=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { carritoServicio } from '@/lib/cart/cart-service';
import { carritoRepositorio } from '@/lib/cart/cart-repository';

function crearSupabaseServidor() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}

// GET /api/carrito/validar
export async function GET(request: NextRequest) {
  try {
    const supabase = crearSupabaseServidor();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const sessionId = request.headers.get('x-session-id') ?? searchParams.get('session_id');

    let carritoId: string | null = null;

    if (user) {
      const carrito = await carritoRepositorio.obtenerPorProfileId(user.id);
      carritoId = carrito?.id ?? null;
    } else if (sessionId) {
      const carrito = await carritoRepositorio.obtenerPorSessionId(sessionId);
      carritoId = carrito?.id ?? null;
    }

    if (!carritoId) {
      return NextResponse.json(
        { exito: false, error: 'Carrito no encontrado.' },
        { status: 404 },
      );
    }

    const resultado = await carritoServicio.validarInventario(carritoId);
    if (!resultado.exito) {
      return NextResponse.json(resultado, { status: 400 });
    }
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('[GET /api/carrito/validar]', error);
    return NextResponse.json(
      { exito: false, error: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}
