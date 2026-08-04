/**
 * GET /api/admin/pedidos — List all orders with filters (admin/staff)
 * POST /api/admin/pedidos — Create internal note for an order
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: perfil } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!perfil || !['admin', 'staff'].includes(perfil.role)) return null;
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ exito: false, error: 'Acceso denegado' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const pagina = parseInt(searchParams.get('pagina') || '1');
    const porPagina = parseInt(searchParams.get('por_pagina') || '20');
    const busqueda = searchParams.get('busqueda') || '';
    const estado = searchParams.get('estado') || '';
    const estadoPago = searchParams.get('estado_pago') || '';
    const pais = searchParams.get('pais') || '';
    const desde = searchParams.get('desde') || '';
    const hasta = searchParams.get('hasta') || '';

    let query = supabase
      .from('orders')
      .select(`
        id, order_number, profile_id, country_code, status, payment_status,
        payment_method, subtotal, discount_amount, shipping_cost, tax_amount,
        total, currency_code, tracking_number, notes, coupon_code_snapshot,
        created_at, updated_at, status_updated_at, metadata,
        shipping_address:addresses!orders_shipping_address_id_fkey(
          full_name, address_line1, city, state_province, country_code, phone
        ),
        profile:profiles!orders_profile_id_fkey(
          id, full_name, email, phone
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((pagina - 1) * porPagina, pagina * porPagina - 1);

    if (busqueda.trim()) {
      query = query.or(`order_number.ilike.%${busqueda}%`);
    }
    if (estado) query = query.eq('status', estado);
    if (estadoPago) query = query.eq('payment_status', estadoPago);
    if (pais) query = query.eq('country_code', pais);
    if (desde) query = query.gte('created_at', desde);
    if (hasta) query = query.lte('created_at', hasta);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ exito: true, datos: data || [], total: count || 0 });
  } catch (err) {
    return NextResponse.json({ exito: false, error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
