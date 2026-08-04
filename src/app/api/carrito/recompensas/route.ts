/**
 * Street Candy — API de Recompensas del Carrito
 * POST   /api/carrito/recompensas  — Aplica puntos de recompensa al carrito
 * DELETE /api/carrito/recompensas  — Elimina los puntos aplicados
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

// POST /api/carrito/recompensas
export async function POST(request: NextRequest) {
  try {
    const supabase = await crearSupabaseServidor();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { exito: false, error: 'Debes iniciar sesión para usar tus recompensas.' },
        { status: 401 },
      );
    }

    const body = await request.json() as { puntos_a_usar: number; pais?: string };
    const codigoPais = body.pais ?? 'CO';

    if (typeof body.puntos_a_usar !== 'number' || body.puntos_a_usar <= 0) {
      return NextResponse.json(
        { exito: false, error: 'Se requiere puntos_a_usar mayor a 0.' },
        { status: 400 },
      );
    }

    const carrito = await carritoRepositorio.obtenerPorProfileId(user.id);
    if (!carrito) {
      return NextResponse.json(
        { exito: false, error: 'Carrito no encontrado.' },
        { status: 404 },
      );
    }

    const resultado = await carritoServicio.aplicarRecompensas(
      carrito.id,
      { puntos_a_usar: body.puntos_a_usar },
      codigoPais,
      user.id,
    );

    if (!resultado.exito) {
      return NextResponse.json(resultado, { status: 400 });
    }
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('[POST /api/carrito/recompensas]', error);
    return NextResponse.json(
      { exito: false, error: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}

// DELETE /api/carrito/recompensas
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await crearSupabaseServidor();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { exito: false, error: 'Debes iniciar sesión.' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const codigoPais = searchParams.get('pais') ?? 'CO';

    const carrito = await carritoRepositorio.obtenerPorProfileId(user.id);
    if (!carrito) {
      return NextResponse.json(
        { exito: false, error: 'Carrito no encontrado.' },
        { status: 404 },
      );
    }

    const resultado = await carritoServicio.eliminarRecompensas(carrito.id, codigoPais, user.id);
    if (!resultado.exito) {
      return NextResponse.json(resultado, { status: 400 });
    }
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('[DELETE /api/carrito/recompensas]', error);
    return NextResponse.json(
      { exito: false, error: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}
