/**
 * Street Candy — API de Ítems del Carrito
 * POST   /api/carrito/items  — Agrega un ítem al carrito
 * PATCH  /api/carrito/items  — Actualiza la cantidad de un ítem
 * DELETE /api/carrito/items  — Elimina un ítem del carrito
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { carritoServicio } from '@/lib/cart/cart-service';
import { carritoRepositorio } from '@/lib/cart/cart-repository';
import { validarPais } from '@/lib/cart/utils';
import type { AgregarItemInput, ActualizarItemInput } from '@/lib/cart/types';

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

async function resolverCarritoId(
  request: NextRequest,
  userId: string | null,
): Promise<{ carritoId: string | null; codigoPais: string }> {
  const { searchParams } = new URL(request.url);
  const codigoPais = searchParams.get('pais') ?? 'CO';
  const sessionId = request.headers.get('x-session-id') ?? searchParams.get('session_id');

  if (userId) {
    let carrito = await carritoRepositorio.obtenerPorProfileId(userId);
    return { carritoId: carrito?.id ?? null, codigoPais };
  }

  if (sessionId) {
    let carrito = await carritoRepositorio.obtenerPorSessionId(sessionId);
    return { carritoId: carrito?.id ?? null, codigoPais };
  }

  return { carritoId: null, codigoPais };
}

// POST /api/carrito/items — Agregar ítem
export async function POST(request: NextRequest) {
  try {
    const supabase = await crearSupabaseServidor();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json() as AgregarItemInput & { pais?: string; session_id?: string };
    const codigoPais = body.pais ?? 'CO';
    const sessionId = request.headers.get('x-session-id') ?? body.session_id;

    if (!validarPais(codigoPais)) {
      return NextResponse.json(
        { exito: false, error: 'País no soportado.' },
        { status: 400 },
      );
    }

    if (!body.producto_id || !body.cantidad) {
      return NextResponse.json(
        { exito: false, error: 'Se requiere producto_id y cantidad.' },
        { status: 400 },
      );
    }

    // Obtener o crear carrito
    let carritoId: string;
    if (user) {
      let carrito = await carritoRepositorio.obtenerPorProfileId(user.id);
      if (!carrito) {
        carrito = await carritoRepositorio.crearParaUsuario(user.id, codigoPais);
      }
      carritoId = carrito.id;
    } else if (sessionId) {
      let carrito = await carritoRepositorio.obtenerPorSessionId(sessionId);
      if (!carrito) {
        carrito = await carritoRepositorio.crearParaInvitado(sessionId, codigoPais);
      }
      carritoId = carrito.id;
    } else {
      return NextResponse.json(
        { exito: false, error: 'Se requiere autenticación o session_id.' },
        { status: 400 },
      );
    }

    const resultado = await carritoServicio.agregarItem(
      carritoId,
      { producto_id: body.producto_id, variante_id: body.variante_id, cantidad: body.cantidad },
      codigoPais,
      user?.id,
    );

    if (!resultado.exito) {
      const status = resultado.codigo === 'STOCK_INSUFICIENTE' ? 409 : 400;
      return NextResponse.json(resultado, { status });
    }
    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    console.error('[POST /api/carrito/items]', error);
    return NextResponse.json(
      { exito: false, error: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}

// PATCH /api/carrito/items — Actualizar cantidad
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await crearSupabaseServidor();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json() as ActualizarItemInput & { pais?: string };
    const codigoPais = body.pais ?? 'CO';

    if (!body.item_id || body.cantidad === undefined) {
      return NextResponse.json(
        { exito: false, error: 'Se requiere item_id y cantidad.' },
        { status: 400 },
      );
    }

    const { carritoId } = await resolverCarritoId(request, user?.id ?? null);
    if (!carritoId) {
      return NextResponse.json(
        { exito: false, error: 'Carrito no encontrado.' },
        { status: 404 },
      );
    }

    const resultado = await carritoServicio.actualizarItem(
      carritoId,
      { item_id: body.item_id, cantidad: body.cantidad },
      codigoPais,
      user?.id,
    );

    if (!resultado.exito) {
      return NextResponse.json(resultado, { status: 400 });
    }
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('[PATCH /api/carrito/items]', error);
    return NextResponse.json(
      { exito: false, error: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}

// DELETE /api/carrito/items?item_id=xxx — Eliminar ítem
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await crearSupabaseServidor();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('item_id');
    const codigoPais = searchParams.get('pais') ?? 'CO';

    if (!itemId) {
      return NextResponse.json(
        { exito: false, error: 'Se requiere item_id.' },
        { status: 400 },
      );
    }

    const { carritoId } = await resolverCarritoId(request, user?.id ?? null);
    if (!carritoId) {
      return NextResponse.json(
        { exito: false, error: 'Carrito no encontrado.' },
        { status: 404 },
      );
    }

    const resultado = await carritoServicio.eliminarItem(carritoId, itemId, codigoPais, user?.id);
    if (!resultado.exito) {
      return NextResponse.json(resultado, { status: 400 });
    }
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('[DELETE /api/carrito/items]', error);
    return NextResponse.json(
      { exito: false, error: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}
