/**
 * GET /api/admin/pedidos/[id] — Get full order details
 * POST /api/admin/pedidos/[id]/notas — Add internal note
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

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ exito: false, error: 'Acceso denegado' }, { status: 403 });

    const { data: orden, error } = await supabase
      .from('orders')
      .select(`
        *,
        shipping_address:addresses!orders_shipping_address_id_fkey(*),
        billing_address:addresses!orders_billing_address_id_fkey(*),
        profile:profiles!orders_profile_id_fkey(id, full_name, email, phone, country_code),
        items:order_items(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!orden) return NextResponse.json({ exito: false, error: 'Orden no encontrada' }, { status: 404 });

    // Fetch internal notes
    const { data: notas } = await supabase
      .from('order_internal_notes')
      .select('*, admin:profiles!order_internal_notes_admin_id_fkey(full_name, email)')
      .eq('order_id', id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ exito: true, datos: { ...orden, notas_internas: notas || [] } });
  } catch (err) {
    return NextResponse.json({ exito: false, error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ exito: false, error: 'Acceso denegado' }, { status: 403 });

    const { nota } = await request.json();
    if (!nota?.trim()) return NextResponse.json({ exito: false, error: 'Nota requerida' }, { status: 400 });

    const { data, error } = await supabase
      .from('order_internal_notes')
      .insert({ order_id: id, admin_id: user.id, note: nota.trim() })
      .select('*, admin:profiles!order_internal_notes_admin_id_fkey(full_name, email)')
      .single();

    if (error) throw error;
    return NextResponse.json({ exito: true, datos: data });
  } catch (err) {
    return NextResponse.json({ exito: false, error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
