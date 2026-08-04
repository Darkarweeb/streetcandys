import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const [
      ordersRes,
      rewardsRes,
      transactionsRes,
      reviewsRes,
      notificationsRes,
      addressesRes,
      loyaltyRewardsRes,
    ] = await Promise.all([
      // Recent orders (last 5)
      supabase
        .from('orders')
        .select('id, order_number, status, total, currency_code, created_at')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),

      // Rewards / loyalty
      supabase
        .from('rewards')
        .select('points_balance, points_lifetime, tier, tier_updated_at, referral_code')
        .eq('profile_id', user.id)
        .single(),

      // Recent point transactions (last 5)
      supabase
        .from('reward_transactions')
        .select('id, transaction_type, points, balance_after, description, created_at')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),

      // Reviews
      supabase
        .from('reviews')
        .select('id, status, created_at')
        .eq('profile_id', user.id),

      // Recent notifications (last 5 undeleted)
      supabase
        .from('notifications')
        .select('id, notification_type, title, body, is_read, action_url, created_at')
        .eq('profile_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5),

      // Default address
      supabase
        .from('addresses')
        .select('id, label, full_name, address_line1, city, state_province, country_code, is_default')
        .eq('profile_id', user.id)
        .eq('is_default', true)
        .single(),

      // Available loyalty rewards
      supabase
        .from('loyalty_rewards')
        .select('id, name, points_required, reward_type, reward_value, eligible_tiers, is_active')
        .eq('is_active', true)
        .order('points_required', { ascending: true })
        .limit(3),
    ]);

    // Orders summary
    const orders = ordersRes.data ?? [];
    const totalOrders = orders.length;
    const latestOrder = orders[0] ?? null;
    const activeStatuses = ['pending', 'confirmed', 'processing', 'shipped'];
    const activeOrders = orders.filter(o => activeStatuses.includes(o.status)).length;

    // Total orders count
    const { count: totalOrdersCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id);

    // Reviews summary
    const allReviews = reviewsRes.data ?? [];
    const reviewsSubmitted = allReviews.length;
    const pendingReviews = allReviews.filter(r => r.status === 'pending').length;

    // Products eligible for review (delivered orders without a review)
    const { data: deliveredOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('profile_id', user.id)
      .eq('status', 'delivered');

    const deliveredOrderIds = (deliveredOrders ?? []).map(o => o.id);
    let eligibleForReview = 0;
    if (deliveredOrderIds.length > 0) {
      const { data: reviewedOrders } = await supabase
        .from('reviews')
        .select('order_id')
        .eq('profile_id', user.id)
        .in('order_id', deliveredOrderIds);
      const reviewedOrderIds = new Set((reviewedOrders ?? []).map(r => r.order_id));
      eligibleForReview = deliveredOrderIds.filter(id => !reviewedOrderIds.has(id)).length;
    }

    // Notifications summary
    const notifications = notificationsRes.data ?? [];
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .eq('is_read', false)
      .is('deleted_at', null);

    // Rewards
    const rewards = rewardsRes.data ?? null;
    const transactions = transactionsRes.data ?? [];

    // Tier progress
    const TIER_THRESHOLDS: Record<string, number> = {
      crew: 0, og: 500, legend: 2000, icon: 5000,
    };
    const TIER_ORDER = ['crew', 'og', 'legend', 'icon'];
    const currentTier = rewards?.tier ?? 'crew';
    const currentTierIdx = TIER_ORDER.indexOf(currentTier);
    const nextTier = currentTierIdx < TIER_ORDER.length - 1 ? TIER_ORDER[currentTierIdx + 1] : null;
    const currentTierMin = TIER_THRESHOLDS[currentTier] ?? 0;
    const nextTierMin = nextTier ? TIER_THRESHOLDS[nextTier] : null;
    const lifetimePoints = rewards?.points_lifetime ?? 0;
    const tierProgress = nextTierMin
      ? Math.min(100, Math.round(((lifetimePoints - currentTierMin) / (nextTierMin - currentTierMin)) * 100))
      : 100;
    const pointsToNextTier = nextTierMin ? Math.max(0, nextTierMin - lifetimePoints) : 0;

    return NextResponse.json({
      exito: true,
      datos: {
        orders: {
          total: totalOrdersCount ?? totalOrders,
          active: activeOrders,
          latest: latestOrder,
          recent: orders,
        },
        reviews: {
          submitted: reviewsSubmitted,
          pending: pendingReviews,
          eligibleForReview,
        },
        notifications: {
          recent: notifications,
          unreadCount: unreadCount ?? 0,
        },
        address: addressesRes.data ?? null,
        rewards: {
          balance: rewards?.points_balance ?? 0,
          lifetime: rewards?.points_lifetime ?? 0,
          tier: currentTier,
          tierUpdatedAt: rewards?.tier_updated_at ?? null,
          nextTier,
          tierProgress,
          pointsToNextTier,
          recentTransactions: transactions,
          availableRewards: loyaltyRewardsRes.data ?? [],
        },
      },
    });
  } catch (err) {
    console.error('[dashboard/route] error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
