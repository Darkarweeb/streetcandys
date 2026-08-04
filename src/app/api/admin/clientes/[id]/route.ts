/**
 * GET /api/admin/clientes/[id] — Get full customer profile with history
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

    // Profile
    const { data: perfil, error: perfilError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (perfilError || !perfil) return NextResponse.json({ exito: false, error: 'Cliente no encontrado' }, { status: 404 });

    // Orders
    const { data: ordenes } = await supabase
      .from('orders')
      .select('id, order_number, status, payment_status, total, currency_code, created_at, country_code')
      .eq('profile_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Rewards
    const { data: recompensas } = await supabase
      .from('rewards')
      .select('*')
      .eq('profile_id', id)
      .single();

    // Reward transactions
    const { data: transacciones } = await supabase
      .from('reward_transactions')
      .select('*')
      .eq('profile_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Addresses
    const { data: direcciones } = await supabase
      .from('addresses')
      .select('*')
      .eq('profile_id', id)
      .order('is_default', { ascending: false });

    // Notifications
    const { data: notificaciones } = await supabase
      .from('notifications')
      .select('id, notification_type, title, body, is_read, created_at')
      .eq('profile_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Compute stats
    const totalOrdenes = ordenes?.length || 0;
    const lifetimeSpending = (ordenes || [])
      .filter(o => o.status !== 'cancelled' && o.status !== 'refunded')
      .reduce((s, o) => s + (o.total || 0), 0);
    const lastPurchase = ordenes?.[0]?.created_at || null;

    return NextResponse.json({
      exito: true,
      datos: {
        perfil,
        ordenes: ordenes || [],
        recompensas: recompensas || null,
        transacciones: transacciones || [],
        direcciones: direcciones || [],
        notificaciones: notificaciones || [],
        stats: { total_orders: totalOrdenes, lifetime_spending: lifetimeSpending, last_purchase: lastPurchase },
      },
    });
  } catch (err) {
    return NextResponse.json({ exito: false, error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
