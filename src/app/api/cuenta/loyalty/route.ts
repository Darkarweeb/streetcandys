import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const txPage = parseInt(searchParams.get('tx_page') || '1', 10);
    const txLimit = 20;
    const txOffset = (txPage - 1) * txLimit;

    // Fetch all data in parallel
    const [rewardsRes, transactionsRes, loyaltyRewardsRes, redemptionsRes, ordersRes] =
      await Promise.all([
        supabase
          .from('rewards')
          .select('*')
          .eq('profile_id', user.id)
          .single(),

        supabase
          .from('reward_transactions')
          .select('*, orders(order_number)', { count: 'exact' })
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false })
          .range(txOffset, txOffset + txLimit - 1),

        supabase
          .from('loyalty_rewards')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),

        supabase
          .from('loyalty_reward_redemptions')
          .select('*, loyalty_rewards(name)')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),

        supabase
          .from('orders')
          .select('id, order_number, total, status, created_at')
          .eq('profile_id', user.id)
          .eq('status', 'delivered')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

    // Calculate earned/redeemed totals
    const allTxRes = await supabase
      .from('reward_transactions')
      .select('points, transaction_type')
      .eq('profile_id', user.id);

    const allTx = allTxRes.data || [];
    const totalEarned = allTx
      .filter((t) => t.points > 0)
      .reduce((sum, t) => sum + t.points, 0);
    const totalRedeemed = allTx
      .filter((t) => t.points < 0)
      .reduce((sum, t) => sum + Math.abs(t.points), 0);

    return NextResponse.json({
      rewards: rewardsRes.data,
      transactions: transactionsRes.data || [],
      transactionsTotal: transactionsRes.count || 0,
      loyaltyRewards: loyaltyRewardsRes.data || [],
      redemptions: redemptionsRes.data || [],
      recentOrders: ordersRes.data || [],
      stats: {
        totalEarned,
        totalRedeemed,
      },
    });
  } catch (err) {
    console.error('[loyalty GET]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { reward_id } = body;

    if (!reward_id) {
      return NextResponse.json({ error: 'reward_id requerido' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('redeem_loyalty_reward', {
      p_profile_id: user.id,
      p_reward_id: reward_id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const result = data as { success: boolean; message: string; new_balance?: number };

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[loyalty POST]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
