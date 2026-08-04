/**
 * Street Candy — Public Promotions Validation API
 * POST /api/promociones/validar  — Validate a promotion coupon code for a cart
 * GET  /api/promociones/activas  — Get active automatic promotions for a cart
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function createSupabaseServer() {
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json() as {
      code: string;
      subtotal: number;
      country_code: string;
    };

    if (!body.code || !body.subtotal || !body.country_code) {
      return NextResponse.json(
        { valid: false, reason: 'Parámetros incompletos.' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.rpc('validate_promotion_coupon', {
      p_code: body.code.trim().toUpperCase(),
      p_subtotal: body.subtotal,
      p_country_code: body.country_code,
      p_profile_id: user?.id ?? null,
    });

    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;
    return NextResponse.json(result);
  } catch (error) {
    console.error('[POST /api/promociones/validar]', error);
    return NextResponse.json(
      { valid: false, reason: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}
