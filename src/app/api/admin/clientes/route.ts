/**
 * GET /api/admin/clientes — List all customers with stats
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
    const pais = searchParams.get('pais') || '';
    const tier = searchParams.get('tier') || '';

    let query = supabase
      .from('profiles')
      .select('id, email, full_name, phone, role, country_code, is_active, age_verified, referral_code, created_at, updated_at', { count: 'exact' })
      .eq('role', 'customer')
      .order('created_at', { ascending: false })
      .range((pagina - 1) * porPagina, pagina * porPagina - 1);

    if (busqueda.trim()) {
      query = query.or(`full_name.ilike.%${busqueda}%,email.ilike.%${busqueda}%`);
    }
    if (pais) query = query.eq('country_code', pais);

    const { data: clientes, error, count } = await query;
    if (error) throw error;

    if (!clientes || clientes.length === 0) {
      return NextResponse.json({ exito: true, datos: [], total: 0 });
    }

    const ids = clientes.map(c => c.id);

    // Fetch order stats per customer
    const { data: orderStats } = await supabase
      .from('orders')
      .select('profile_id, total, status, created_at')
      .in('profile_id', ids);

    // Fetch rewards per customer
    const { data: rewardsData } = await supabase
      .from('rewards')
      .select('profile_id, points_balance, points_lifetime, tier')
      .in('profile_id', ids);

    // Merge stats
    const statsMap: Record<string, { total_orders: number; lifetime_spending: number; last_purchase: string | null; tier: string }> = {};
    ids.forEach(id => {
      statsMap[id] = { total_orders: 0, lifetime_spending: 0, last_purchase: null, tier: 'crew' };
    });

    (orderStats || []).forEach(o => {
      if (!o.profile_id) return;
      const s = statsMap[o.profile_id];
      if (!s) return;
      s.total_orders += 1;
      if (o.status !== 'cancelled' && o.status !== 'refunded') s.lifetime_spending += o.total || 0;
      if (!s.last_purchase || o.created_at > s.last_purchase) s.last_purchase = o.created_at;
    });

    (rewardsData || []).forEach(r => {
      if (statsMap[r.profile_id]) {
        statsMap[r.profile_id].tier = r.tier;
      }
    });

    const rewardsMap: Record<string, { points_balance: number; points_lifetime: number; tier: string }> = {};
    (rewardsData || []).forEach(r => {
      rewardsMap[r.profile_id] = { points_balance: r.points_balance, points_lifetime: r.points_lifetime, tier: r.tier };
    });

    // Filter by tier if requested
    let result = clientes.map(c => ({
      ...c,
      ...statsMap[c.id],
      rewards: rewardsMap[c.id] || { points_balance: 0, points_lifetime: 0, tier: 'crew' },
    }));

    if (tier) {
      result = result.filter(c => c.rewards.tier === tier);
    }

    return NextResponse.json({ exito: true, datos: result, total: count || 0 });
  } catch (err) {
    return NextResponse.json({ exito: false, error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
