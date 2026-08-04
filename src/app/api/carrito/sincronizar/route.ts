/**
 * Street Candy — API de Sincronización de Carrito de Invitado
 * POST /api/carrito/sincronizar
 *
 * Sincroniza el carrito de invitado (session_id) con el carrito
 * del usuario autenticado al iniciar sesión.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { carritoServicio } from '@/lib/cart/cart-service';
import { validarPais } from '@/lib/cart/utils';

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

// POST /api/carrito/sincronizar
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

    const body = await request.json() as { session_id?: string; pais?: string };
    const codigoPais = body.pais ?? 'CO';
    const sessionId = request.headers.get('x-session-id') ?? body.session_id;

    if (!validarPais(codigoPais)) {
      return NextResponse.json(
        { exito: false, error: 'País no soportado.' },
        { status: 400 },
      );
    }

    if (!sessionId) {
      // Sin session_id, solo obtener/crear carrito del usuario
      const resultado = await carritoServicio.obtenerOCrearParaUsuario(user.id, codigoPais);
      return NextResponse.json(resultado);
    }

    const resultado = await carritoServicio.sincronizarCarritoInvitado(
      sessionId,
      user.id,
      codigoPais,
    );

    if (!resultado.exito) {
      return NextResponse.json(resultado, { status: 400 });
    }
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('[POST /api/carrito/sincronizar]', error);
    return NextResponse.json(
      { exito: false, error: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}
