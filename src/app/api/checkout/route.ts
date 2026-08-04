/**
 * POST /api/checkout — Inicia el proceso de checkout
 * GET  /api/checkout/resumen — Calcula el resumen sin crear orden
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { servicioCheckout } from '@/lib/payment/checkout-service';
import type { InputIniciarCheckout } from '@/lib/payment/types';

// ── Idempotency store (in-memory, per-process, 10-minute TTL) ─────────────────
// Prevents duplicate orders from network retries or double-clicks.
const idempotencyCache = new Map<string, { ordenId: string; expiresAt: number }>();
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000; // 10 minutes

function pruneIdempotencyCache() {
  const now = Date.now();
  for (const [key, entry] of idempotencyCache) {
    if (entry.expiresAt < now) idempotencyCache.delete(key);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body: InputIniciarCheckout & {
      email_contacto?: string;
      metodo_pago?: string;
      metodo_entrega?: string;
      propina?: number;
    } = await request.json();

    if (!body.carrito_id || !body.codigo_pais || !body.direccion_envio) {
      return NextResponse.json(
        { exito: false, error: 'Faltan campos requeridos: carrito_id, codigo_pais, direccion_envio' },
        { status: 400 },
      );
    }

    // Require email for guest checkout
    const emailContacto = user?.email ?? body.email_contacto ?? '';
    if (!emailContacto) {
      return NextResponse.json(
        { exito: false, error: 'Se requiere un correo electrónico para continuar' },
        { status: 400 },
      );
    }

    // For guest checkout, use a stable guest profile ID derived from the cart
    // For authenticated users, use their real profile ID
    const profileId = user?.id ?? `guest-${body.carrito_id}`;

    // ── Idempotency check ─────────────────────────────────────────────────────
    const idempotencyKey = request.headers.get('X-Idempotency-Key');
    if (idempotencyKey) {
      pruneIdempotencyCache();
      const cached = idempotencyCache.get(`${profileId}:${idempotencyKey}`);
      if (cached && cached.expiresAt > Date.now()) {
        // Return the same order without creating a duplicate
        return NextResponse.json(
          { exito: true, datos: { orden_id: cached.ordenId }, _idempotent: true },
          { status: 200 },
        );
      }
    }

    // Obtener perfil del usuario autenticado (si existe)
    let nombreCompleto = body.direccion_envio.nombre_completo ?? emailContacto;
    if (user) {
      const { data: perfil } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();
      if (perfil?.full_name) nombreCompleto = perfil.full_name;
    }

    const resultado = await servicioCheckout.iniciarCheckout(
      profileId,
      emailContacto,
      nombreCompleto,
      body,
    );

    // Store idempotency result
    if (idempotencyKey) {
      idempotencyCache.set(`${profileId}:${idempotencyKey}`, {
        ordenId: resultado.orden_id,
        expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
      });
    }

    return NextResponse.json({ exito: true, datos: resultado }, { status: 201 });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error iniciando checkout';
    console.error('[POST /api/checkout]', mensaje);
    return NextResponse.json({ exito: false, error: mensaje }, { status: 400 });
  }
}
