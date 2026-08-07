/**
 * Street Candy — API de Cupones del Carrito
 * POST   /api/carrito/cupon  — Aplica un cupón al carrito
 * DELETE /api/carrito/cupon  — Elimina el cupón del carrito
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { carritoServicio } from '@/lib/cart/cart-service';
import { carritoRepositorio } from '@/lib/cart/cart-repository';

async function crearSupabaseServidor() {
  const cookieStore = await cookies();
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

async function obtenerCarritoId(
  request: NextRequest,
  userId: string | null,
  bodyCarritoId?: string | null,
): Promise<string | null> {
  // If the frontend already resolved the cart ID, use it directly
  if (bodyCarritoId) return bodyCarritoId;

  const { searchParams } = new URL(request.url);
  const sessionId = request.headers.get('x-session-id') ?? searchParams.get('session_id');

  if (userId) {
    const carrito = await carritoRepositorio.obtenerPorProfileId(userId);
    return carrito?.id ?? null;
  }
  if (sessionId) {
    const carrito = await carritoRepositorio.obtenerPorSessionId(sessionId);
    return carrito?.id ?? null;
  }
  return null;
}

// POST /api/carrito/cupon
export async function POST(request: NextRequest) {
  try {
    const supabase = await crearSupabaseServidor();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json() as { codigo: string; pais?: string; carrito_id?: string };
    const codigoPais = body.pais ?? 'CO';

    if (!body.codigo) {
      return NextResponse.json(
        { exito: false, error: 'Se requiere el código del cupón.' },
        { status: 400 },
      );
    }

    const carritoId = await obtenerCarritoId(request, user?.id ?? null, body.carrito_id ?? null);
    if (!carritoId) {
      return NextResponse.json(
        { exito: false, error: 'Carrito no encontrado.' },
        { status: 404 },
      );
    }

    const resultado = await carritoServicio.aplicarCupon(
      carritoId,
      { codigo: body.codigo },
      codigoPais,
      user?.id,
    );

    if (!resultado.exito) {
      return NextResponse.json(resultado, { status: 400 });
    }
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('[POST /api/carrito/cupon]', error);
    return NextResponse.json(
      { exito: false, error: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}

// DELETE /api/carrito/cupon
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await crearSupabaseServidor();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const codigoPais = searchParams.get('pais') ?? 'CO';

    const carritoId = await obtenerCarritoId(request, user?.id ?? null);
    if (!carritoId) {
      return NextResponse.json(
        { exito: false, error: 'Carrito no encontrado.' },
        { status: 404 },
      );
    }

    const resultado = await carritoServicio.eliminarCupon(carritoId, codigoPais, user?.id);
    if (!resultado.exito) {
      return NextResponse.json(resultado, { status: 400 });
    }
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('[DELETE /api/carrito/cupon]', error);
    return NextResponse.json(
      { exito: false, error: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}
