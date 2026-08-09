/**
 * GET /api/admin/pedidos/[id] — Get full order details
 * POST /api/admin/pedidos/[id] — Add internal note
 * DELETE /api/admin/pedidos/[id] — Permanently delete an order (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // 1. Verify admin authorization using the user-session client
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ exito: false, error: 'Acceso denegado' }, { status: 403 });

    // 2. Validate order ID
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ exito: false, error: 'ID de pedido inválido' }, { status: 400 });
    }

    // Use the service-role admin client for all destructive operations so RLS is bypassed server-side
    const adminClient = createAdminClient();

    // 3. Verify the order exists
    const { data: orden, error: fetchError } = await adminClient
      .from('orders')
      .select('id, order_number')
      .eq('id', id)
      .single();

    if (fetchError || !orden) {
      return NextResponse.json({ exito: false, error: 'Pedido no encontrado' }, { status: 404 });
    }

    // 4. Delete exclusively-owned records first
    const { error: itemsError } = await adminClient
      .from('order_items')
      .delete()
      .eq('order_id', id);

    if (itemsError) {
      return NextResponse.json(
        { exito: false, error: `Error eliminando ítems del pedido: ${itemsError.message}` },
        { status: 500 }
      );
    }

    const { error: notasError } = await adminClient
      .from('order_internal_notes')
      .delete()
      .eq('order_id', id);

    if (notasError) {
      return NextResponse.json(
        { exito: false, error: `Error eliminando notas internas: ${notasError.message}` },
        { status: 500 }
      );
    }

    // 5. Delete coupon_redemptions for this order
    const { error: couponRedemptionsError } = await adminClient
      .from('coupon_redemptions')
      .delete()
      .eq('order_id', id);

    if (couponRedemptionsError) {
      return NextResponse.json(
        { exito: false, error: `Error eliminando redenciones de cupón: ${couponRedemptionsError.message}` },
        { status: 500 }
      );
    }

    // 6. Nullify order_id on shared records that reference this order
    const { error: rewardTxError } = await adminClient
      .from('reward_transactions')
      .update({ order_id: null })
      .eq('order_id', id);

    if (rewardTxError) {
      return NextResponse.json(
        { exito: false, error: `Error actualizando transacciones de recompensas: ${rewardTxError.message}` },
        { status: 500 }
      );
    }

    const { error: promoRedemptionsError } = await adminClient
      .from('promotion_redemptions')
      .update({ order_id: null })
      .eq('order_id', id);

    if (promoRedemptionsError) {
      return NextResponse.json(
        { exito: false, error: `Error actualizando redenciones de promociones: ${promoRedemptionsError.message}` },
        { status: 500 }
      );
    }

    const { error: reviewsError } = await adminClient
      .from('reviews')
      .update({ order_id: null })
      .eq('order_id', id);

    if (reviewsError) {
      return NextResponse.json(
        { exito: false, error: `Error actualizando reseñas: ${reviewsError.message}` },
        { status: 500 }
      );
    }

    // 7. Delete the order itself
    const { error: deleteError } = await adminClient
      .from('orders')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { exito: false, error: `Error eliminando pedido: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exito: true,
      mensaje: `Pedido #${orden.order_number} eliminado permanentemente`,
    });
  } catch (err) {
    return NextResponse.json(
      { exito: false, error: err instanceof Error ? err.message : 'Error inesperado al eliminar el pedido' },
      { status: 500 }
    );
  }
}
