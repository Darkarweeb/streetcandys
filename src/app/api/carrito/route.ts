/**
 * Street Candy — API del Carrito
 * GET  /api/carrito  — Obtiene el carrito actual
 * POST /api/carrito  — Crea o sincroniza el carrito
 *
 * Identificación del carrito:
 * - Usuario autenticado: por profile_id (sesión Supabase)
 * - Invitado: por header X-Session-Id o query param session_id
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { carritoServicio } from '@/lib/cart/cart-service';
import { validarPais } from '@/lib/cart/utils';
import type { SincronizarCarritoInput } from '@/lib/cart/types';

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

// GET /api/carrito
export async function GET(request: NextRequest) {
  try {
    const supabase = await crearSupabaseServidor();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const codigoPais = searchParams.get('pais') ?? 'CO';
    const sessionId = request.headers.get('x-session-id') ?? searchParams.get('session_id');

    if (!validarPais(codigoPais)) {
      return NextResponse.json(
        { exito: false, error: 'País no soportado. Use CO (Colombia) o CR (Costa Rica).' },
        { status: 400 },
      );
    }

    if (user) {
      const resultado = await carritoServicio.obtenerOCrearParaUsuario(user.id, codigoPais);
      if (!resultado.exito) {
        return NextResponse.json(resultado, { status: 400 });
      }
      return NextResponse.json(resultado);
    }

    if (!sessionId) {
      return NextResponse.json(
        { exito: false, error: 'Se requiere session_id para carritos de invitado.' },
        { status: 400 },
      );
    }

    const resultado = await carritoServicio.obtenerOCrearParaInvitado(sessionId, codigoPais);
    if (!resultado.exito) {
      return NextResponse.json(resultado, { status: 400 });
    }
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('[GET /api/carrito]', error);
    return NextResponse.json(
      { exito: false, error: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}

// POST /api/carrito — Sincronizar carrito de localStorage al iniciar sesión
export async function POST(request: NextRequest) {
  try {
    const supabase = await crearSupabaseServidor();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { exito: false, error: 'Debes iniciar sesión para sincronizar el carrito.' },
        { status: 401 },
      );
    }

    const body = await request.json() as SincronizarCarritoInput;
    const codigoPais = body.codigo_pais ?? 'CO';

    if (!validarPais(codigoPais)) {
      return NextResponse.json(
        { exito: false, error: 'País no soportado.' },
        { status: 400 },
      );
    }

    const resultado = await carritoServicio.sincronizarAlIniciarSesion(
      user.id,
      codigoPais,
      body,
    );

    if (!resultado.exito) {
      return NextResponse.json(resultado, { status: 400 });
    }
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('[POST /api/carrito]', error);
    return NextResponse.json(
      { exito: false, error: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}

// DELETE /api/carrito — Vaciar el carrito
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await crearSupabaseServidor();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const codigoPais = searchParams.get('pais') ?? 'CO';
    const sessionId = request.headers.get('x-session-id') ?? searchParams.get('session_id');

    let carritoId: string | null = null;

    if (user) {
      const { carritoRepositorio } = await import('@/lib/cart/cart-repository');
      const carrito = await carritoRepositorio.obtenerPorProfileId(user.id);
      carritoId = carrito?.id ?? null;
    } else if (sessionId) {
      const { carritoRepositorio } = await import('@/lib/cart/cart-repository');
      const carrito = await carritoRepositorio.obtenerPorSessionId(sessionId);
      carritoId = carrito?.id ?? null;
    }

    if (!carritoId) {
      return NextResponse.json(
        { exito: false, error: 'Carrito no encontrado.' },
        { status: 404 },
      );
    }

    const resultado = await carritoServicio.vaciar(carritoId, codigoPais, user?.id);
    if (!resultado.exito) {
      return NextResponse.json(resultado, { status: 400 });
    }
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('[DELETE /api/carrito]', error);
    return NextResponse.json(
      { exito: false, error: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}
