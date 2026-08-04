/**
 * Street Candy — API de Estimación de Envío
 * GET /api/carrito/envio?pais=CO&session_id=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { carritoServicio } from '@/lib/cart/cart-service';
import { carritoRepositorio } from '@/lib/cart/cart-repository';
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

// GET /api/carrito/envio
export async function GET(request: NextRequest) {
  try {
    const supabase = await crearSupabaseServidor();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const codigoPais = searchParams.get('pais') ?? 'CO';
    const sessionId = request.headers.get('x-session-id') ?? searchParams.get('session_id');

    if (!validarPais(codigoPais)) {
      return NextResponse.json(
        { exito: false, error: 'País no soportado. Use CO o CR.' },
        { status: 400 },
      );
    }

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

    const resultado = await carritoServicio.estimarEnvio(carritoId, codigoPais);
    if (!resultado.exito) {
      return NextResponse.json(resultado, { status: 400 });
    }
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('[GET /api/carrito/envio]', error);
    return NextResponse.json(
      { exito: false, error: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}
