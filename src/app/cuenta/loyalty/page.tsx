'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import CuentaLayout from '@/components/cuenta/CuentaLayout';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ── Types ─────────────────────────────────────────────────────────────────────
interface RewardsRow {
  points_balance: number;
  points_lifetime: number;
  tier: string;
  tier_updated_at: string;
  referral_code: string | null;
  referral_count: number;
}

interface Transaction {
  id: string;
  transaction_type: string;
  points: number;
  balance_after: number;
  description: string;
  created_at: string;
  order_id: string | null;
  orders?: { order_number: string } | null;
}

interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  points_required: number;
  reward_type: string;
  reward_value: number;
  eligible_tiers: string[];
  stock_limit: number | null;
  stock_used: number;
  is_active: boolean;
}

interface Redemption {
  id: string;
  points_spent: number;
  balance_after: number;
  status: string;
  created_at: string;
  loyalty_rewards: { name: string } | null;
}

interface LoyaltyData {
  rewards: RewardsRow | null;
  transactions: Transaction[];
  transactionsTotal: number;
  loyaltyRewards: LoyaltyReward[];
  redemptions: Redemption[];
  stats: { totalEarned: number; totalRedeemed: number };
}

// ── Tier config ───────────────────────────────────────────────────────────────
const TIERS: Record<string, {
  label: string; color: string; bg: string; border: string;
  minPoints: number; nextTier: string | null; nextPoints: number;
  benefits: string[];
}> = {
  crew: {
    label: 'Crew', color: 'text-sc-forest', bg: 'bg-sc-beige', border: 'border-sc-forest/20',
    minPoints: 0, nextTier: 'OG', nextPoints: 500,
    benefits: ['1 punto por cada $3.000 COP / ₡500 CRC', 'Acceso a recompensas básicas', 'Historial de puntos'],
  },
  og: {
    label: 'OG', color: 'text-sc-periwinkle', bg: 'bg-sc-periwinkle/10', border: 'border-sc-periwinkle/30',
    minPoints: 500, nextTier: 'Legend', nextPoints: 2000,
    benefits: ['Todo lo de Crew', 'Acceso a envío gratis', 'Descuentos exclusivos 10%', 'Prioridad en nuevos productos'],
  },
  legend: {
    label: 'Legend', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200',
    minPoints: 2000, nextTier: 'Icon', nextPoints: 5000,
    benefits: ['Todo lo de OG', 'Descuentos hasta 15%', 'Productos sorpresa', 'Acceso anticipado a lanzamientos'],
  },
  icon: {
    label: 'Icon', color: 'text-white', bg: 'bg-sc-forest', border: 'border-sc-forest',
    minPoints: 5000, nextTier: null, nextPoints: 0,
    benefits: ['Todo lo de Legend', 'Descuentos hasta 20%', 'Beneficios VIP exclusivos', 'Atención prioritaria'],
  },
};

const TX_LABELS: Record<string, { label: string; sign: string; color: string; icon: string }> = {
  earned_purchase:  { label: 'Compra',    sign: '+', color: 'text-emerald-600', icon: '🛍️' },
  earned_review:    { label: 'Reseña',    sign: '+', color: 'text-emerald-600', icon: '⭐' },
  earned_referral:  { label: 'Referido',  sign: '+', color: 'text-emerald-600', icon: '👥' },
  redeemed:         { label: 'Canje',     sign: '-', color: 'text-rose-500',    icon: '🎁' },
  expired:          { label: 'Expirado',  sign: '-', color: 'text-gray-400',    icon: '⏰' },
  adjusted:         { label: 'Ajuste',    sign: '',  color: 'text-sc-muted',    icon: '🔧' },
};

const REWARD_TYPE_LABELS: Record<string, string> = {
  discount_pct: 'Descuento %',
  free_shipping: 'Envío gratis',
  product: 'Producto',
  discount: 'Descuento',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function calcProgress(lifetime: number, tier: string): number {
  const t = TIERS[tier] || TIERS.crew;
  if (!t.nextTier) return 100;
  const range = t.nextPoints - t.minPoints;
  const progress = lifetime - t.minPoints;
  return Math.min(100, Math.max(0, (progress / range) * 100));
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-sc-beige rounded ${className}`} />;
}

function StatCard({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return (
    <div className="bg-white border border-sc-border rounded-card p-4 text-center">
      <p className="text-2xl font-black text-sc-forest">{typeof value === 'number' ? value.toLocaleString('es-CO') : value}</p>
      <p className="text-sc-muted text-xs mt-1 font-medium">{label}</p>
      {sub && <p className="text-sc-muted text-[11px] mt-0.5">{sub}</p>}
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const t = TIERS[tier] || TIERS.crew;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-badge text-xs font-bold ${t.bg} ${t.color} border ${t.border}`}>
      {t.label}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'history' | 'rewards' | 'tiers';

export default function LoyaltyPage() {
  const { user } = useAuth();
  const supabase = useRef(createClient()).current;
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [txPage, setTxPage] = useState(1);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [redeemMsg, setRedeemMsg] = useState<{ id: string; msg: string; ok: boolean } | null>(null);
  const [liveNotif, setLiveNotif] = useState<string | null>(null);

  const loadData = useCallback(async (page = 1) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cuenta/loyalty?tx_page=${page}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Error cargando datos');
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(txPage); }, [loadData, txPage]);

  // Realtime: listen for reward_transactions inserts (points earned/redeemed)
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const ch = supabase
      .channel(`loyalty-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reward_transactions',
        filter: `profile_id=eq.${user.id}`,
      }, (ev) => {
        if (!mounted) return;
        const tx = ev.new as Transaction;
        const sign = tx.points > 0 ? '+' : '';
        setLiveNotif(`${sign}${tx.points} puntos — ${tx.description}`);
        setTimeout(() => setLiveNotif(null), 5000);
        loadData(txPage);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rewards',
        filter: `profile_id=eq.${user.id}`,
      }, () => {
        if (!mounted) return;
        loadData(txPage);
      })
      .subscribe();
    channelRef.current = ch;
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [user, supabase, loadData, txPage]);

  const handleRedeem = async (rewardId: string) => {
    setRedeeming(rewardId);
    setRedeemMsg(null);
    try {
      const res = await fetch('/api/cuenta/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reward_id: rewardId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setRedeemMsg({ id: rewardId, msg: json.error || 'Error al canjear', ok: false });
      } else {
        setRedeemMsg({ id: rewardId, msg: '¡Recompensa canjeada exitosamente!', ok: true });
        loadData(txPage);
      }
    } catch {
      setRedeemMsg({ id: rewardId, msg: 'Error de conexión', ok: false });
    } finally {
      setRedeeming(null);
    }
  };

  const tier = data?.rewards ? TIERS[data.rewards.tier] || TIERS.crew : TIERS.crew;
  const progressPct = data?.rewards ? calcProgress(data.rewards.points_lifetime, data.rewards.tier) : 0;
  const balance = data?.rewards?.points_balance ?? 0;
  const lifetime = data?.rewards?.points_lifetime ?? 0;
  const pointsToNext = data?.rewards && tier.nextPoints > 0
    ? Math.max(0, tier.nextPoints - data.rewards.points_lifetime)
    : 0;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Resumen' },
    { id: 'history', label: 'Historial' },
    { id: 'rewards', label: 'Recompensas' },
    { id: 'tiers', label: 'Niveles' },
  ];

  return (
    <CuentaLayout>
      <div className="animate-fade-in space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-sc-forest tracking-tight">Loyalty Club</h1>
            <p className="text-sc-muted text-sm mt-0.5">Tu membresía y beneficios exclusivos</p>
          </div>
          {data?.rewards && <TierBadge tier={data.rewards.tier} />}
        </div>

        {/* Live notification toast */}
        {liveNotif && (
          <div className="bg-sc-forest text-sc-cream text-sm px-4 py-3 rounded-card flex items-center gap-2 animate-fade-in">
            <span>⭐</span>
            <span className="font-medium">{liveNotif}</span>
          </div>
        )}

        {loading && !data ? (
          <div className="space-y-4">
            <Skeleton className="h-36 w-full" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-card p-5 text-red-700 text-sm">
            {error}
            <button onClick={() => loadData(txPage)} className="ml-3 underline">Reintentar</button>
          </div>
        ) : !data?.rewards ? (
          <div className="bg-white border border-sc-border rounded-card py-16 text-center">
            <p className="text-5xl mb-4">⭐</p>
            <p className="text-sc-forest font-bold text-lg mb-2">Aún no tienes puntos</p>
            <p className="text-sc-muted text-sm mb-5">Realiza tu primera compra para unirte al Loyalty Club</p>
            <a href="/productos" className="inline-flex items-center gap-2 bg-sc-forest text-sc-cream px-5 py-2.5 rounded-sm2 text-sm font-semibold hover:bg-sc-forest/90 transition-colors">
              Ver productos
            </a>
          </div>
        ) : (
          <>
            {/* Hero balance card */}
            <div className={`rounded-card p-5 sm:p-6 ${tier.bg} border ${tier.border}`}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-sc-muted mb-1">Saldo de puntos</p>
                  <p className={`text-5xl sm:text-6xl font-black tracking-tight ${tier.color}`}>
                    {balance.toLocaleString('es-CO')}
                  </p>
                  <p className="text-sc-muted text-xs mt-1">{lifetime.toLocaleString('es-CO')} puntos acumulados en total</p>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-2">
                  <TierBadge tier={data.rewards.tier} />
                  <p className="text-xs text-sc-muted">Miembro desde {formatDate(data.rewards.tier_updated_at)}</p>
                </div>
              </div>

              {tier.nextTier && (
                <div className="mt-5">
                  <div className="flex justify-between text-xs text-sc-muted mb-1.5">
                    <span>Progreso hacia <strong>{tier.nextTier}</strong></span>
                    <span>{lifetime.toLocaleString('es-CO')} / {tier.nextPoints.toLocaleString('es-CO')} pts</span>
                  </div>
                  <div className="h-2.5 bg-white/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sc-forest rounded-full transition-all duration-700"
                      style={{ width: `${progressPct}%` }}
                      role="progressbar"
                      aria-valuenow={Math.round(progressPct)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Progreso hacia nivel ${tier.nextTier}`}
                    />
                  </div>
                  <p className="text-xs text-sc-muted mt-1.5">
                    Te faltan <strong>{pointsToNext.toLocaleString('es-CO')} puntos</strong> para llegar a {tier.nextTier}
                  </p>
                </div>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard value={balance} label="Disponibles" />
              <StatCard value={lifetime} label="De por vida" />
              <StatCard value={data.stats.totalEarned} label="Total ganados" />
              <StatCard value={data.stats.totalRedeemed} label="Total canjeados" />
            </div>

            {/* Personalized suggestions */}
            <SuggestionsPanel
              balance={balance}
              tier={data.rewards.tier}
              pointsToNext={pointsToNext}
              nextTier={tier.nextTier}
              loyaltyRewards={data.loyaltyRewards}
            />

            {/* Tabs */}
            <div className="bg-white border border-sc-border rounded-card overflow-hidden">
              {/* Tab bar */}
              <div className="flex border-b border-sc-border overflow-x-auto scrollbar-hide">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 px-5 py-3.5 text-sm font-semibold transition-colors border-b-2 ${
                      activeTab === tab.id
                        ? 'border-sc-forest text-sc-forest bg-sc-beige/40'
                        : 'border-transparent text-sc-muted hover:text-sc-forest hover:bg-sc-beige/20'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-5">
                {activeTab === 'overview' && (
                  <OverviewTab
                    rewards={data.rewards}
                    tier={tier}
                    redemptions={data.redemptions}
                    recentTransactions={data.transactions.slice(0, 5)}
                  />
                )}
                {activeTab === 'history' && (
                  <HistoryTab
                    transactions={data.transactions}
                    total={data.transactionsTotal}
                    page={txPage}
                    onPageChange={(p) => { setTxPage(p); loadData(p); }}
                    loading={loading}
                  />
                )}
                {activeTab === 'rewards' && (
                  <RewardsTab
                    rewards={data.loyaltyRewards}
                    balance={balance}
                    currentTier={data.rewards.tier}
                    onRedeem={handleRedeem}
                    redeeming={redeeming}
                    redeemMsg={redeemMsg}
                  />
                )}
                {activeTab === 'tiers' && (
                  <TiersTab currentTier={data.rewards.tier} lifetime={lifetime} />
                )}
              </div>
            </div>

            {/* How to earn points */}
            <HowToEarnSection />
          </>
        )}
      </div>
    </CuentaLayout>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({
  rewards,
  tier,
  redemptions,
  recentTransactions,
}: {
  rewards: RewardsRow;
  tier: typeof TIERS[string];
  redemptions: Redemption[];
  recentTransactions: Transaction[];
}) {
  return (
    <div className="space-y-5">
      {/* Current tier benefits */}
      <div>
        <h3 className="text-sc-forest font-semibold text-sm mb-3">Beneficios de tu nivel {tier.label}</h3>
        <ul className="space-y-2">
          {tier.benefits.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-sc-forest">
              <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Referral code */}
      {rewards.referral_code && (
        <div className="bg-sc-beige rounded-card p-4">
          <p className="text-sc-forest font-semibold text-sm mb-2">Tu código de referido</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-sc-border px-3 py-2 rounded-sm2 text-sc-forest font-mono text-sm font-bold tracking-widest">
              {rewards.referral_code}
            </code>
            <button
              onClick={() => navigator.clipboard?.writeText(rewards.referral_code || '')}
              className="px-3 py-2 border border-sc-border rounded-sm2 text-sc-forest text-xs font-medium hover:bg-white transition-colors"
            >
              Copiar
            </button>
          </div>
          <p className="text-sc-muted text-xs mt-1.5">{rewards.referral_count} referidos hasta ahora</p>
        </div>
      )}

      {/* Recent transactions */}
      {recentTransactions.length > 0 && (
        <div>
          <h3 className="text-sc-forest font-semibold text-sm mb-3">Últimos movimientos</h3>
          <div className="divide-y divide-sc-border border border-sc-border rounded-card overflow-hidden">
            {recentTransactions.map((tx) => {
              const info = TX_LABELS[tx.transaction_type] || { label: tx.transaction_type, sign: '', color: 'text-sc-muted', icon: '•' };
              return (
                <div key={tx.id} className="flex items-center justify-between px-4 py-3 bg-white">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{info.icon}</span>
                    <div>
                      <p className="text-sc-forest text-sm font-medium line-clamp-1">{tx.description}</p>
                      <p className="text-sc-muted text-xs">{formatDate(tx.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className={`text-sm font-bold ${info.color}`}>
                      {info.sign}{Math.abs(tx.points).toLocaleString('es-CO')} pts
                    </p>
                    <p className="text-sc-muted text-xs">Saldo: {tx.balance_after.toLocaleString('es-CO')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent redemptions */}
      {redemptions.length > 0 && (
        <div>
          <h3 className="text-sc-forest font-semibold text-sm mb-3">Canjes recientes</h3>
          <div className="divide-y divide-sc-border border border-sc-border rounded-card overflow-hidden">
            {redemptions.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3 bg-white">
                <div>
                  <p className="text-sc-forest text-sm font-medium">{r.loyalty_rewards?.name || 'Recompensa'}</p>
                  <p className="text-sc-muted text-xs">{formatDate(r.created_at)}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-rose-500 text-sm font-bold">-{r.points_spent.toLocaleString('es-CO')} pts</p>
                  <span className={`text-xs px-2 py-0.5 rounded-badge font-medium ${
                    r.status === 'fulfilled' ? 'bg-emerald-50 text-emerald-700' :
                    r.status === 'cancelled'? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {r.status === 'fulfilled' ? 'Entregado' : r.status === 'cancelled' ? 'Cancelado' : 'Pendiente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab({
  transactions,
  total,
  page,
  onPageChange,
  loading,
}: {
  transactions: Transaction[];
  total: number;
  page: number;
  onPageChange: (p: number) => void;
  loading: boolean;
}) {
  const totalPages = Math.ceil(total / 20);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-sc-forest font-semibold mb-1">Sin movimientos aún</p>
        <p className="text-sc-muted text-sm">Tus transacciones de puntos aparecerán aquí</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sc-muted text-xs">{total.toLocaleString('es-CO')} transacciones en total</p>

      {/* Table header — desktop */}
      <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 bg-sc-beige rounded-sm2 text-xs font-semibold text-sc-muted uppercase tracking-wide">
        <span>Descripción</span>
        <span className="text-right">Puntos</span>
        <span className="text-right">Saldo</span>
        <span className="text-right">Fecha</span>
      </div>

      <div className="divide-y divide-sc-border border border-sc-border rounded-card overflow-hidden">
        {transactions.map((tx) => {
          const info = TX_LABELS[tx.transaction_type] || { label: tx.transaction_type, sign: '', color: 'text-sc-muted', icon: '•' };
          return (
            <div key={tx.id} className="flex sm:grid sm:grid-cols-[1fr_auto_auto_auto] sm:gap-4 items-center px-4 py-3.5 bg-white hover:bg-sc-beige/30 transition-colors gap-3">
              {/* Description */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base flex-shrink-0">{info.icon}</span>
                <div className="min-w-0">
                  <p className="text-sc-forest text-sm font-medium truncate">{tx.description}</p>
                  {tx.orders?.order_number && (
                    <p className="text-sc-muted text-xs">Pedido #{tx.orders.order_number}</p>
                  )}
                  <p className="text-sc-muted text-xs sm:hidden">{formatDate(tx.created_at)}</p>
                </div>
              </div>
              {/* Points */}
              <p className={`text-sm font-bold flex-shrink-0 sm:text-right ${info.color}`}>
                {info.sign}{Math.abs(tx.points).toLocaleString('es-CO')}
              </p>
              {/* Balance */}
              <p className="text-sc-muted text-sm flex-shrink-0 hidden sm:block text-right">
                {tx.balance_after.toLocaleString('es-CO')}
              </p>
              {/* Date */}
              <p className="text-sc-muted text-xs flex-shrink-0 hidden sm:block text-right whitespace-nowrap">
                {formatDate(tx.created_at)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-4 py-2 border border-sc-border rounded-sm2 text-sm font-medium text-sc-forest hover:bg-sc-beige disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-sc-muted text-sm">Página {page} de {totalPages}</span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-4 py-2 border border-sc-border rounded-sm2 text-sm font-medium text-sc-forest hover:bg-sc-beige disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Rewards Tab ───────────────────────────────────────────────────────────────
function RewardsTab({
  rewards,
  balance,
  currentTier,
  onRedeem,
  redeeming,
  redeemMsg,
}: {
  rewards: LoyaltyReward[];
  balance: number;
  currentTier: string;
  onRedeem: (id: string) => void;
  redeeming: string | null;
  redeemMsg: { id: string; msg: string; ok: boolean } | null;
}) {
  if (rewards.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-4xl mb-3">🎁</p>
        <p className="text-sc-forest font-semibold">No hay recompensas disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sc-muted text-xs">Tu saldo: <strong className="text-sc-forest">{balance.toLocaleString('es-CO')} puntos</strong></p>

      <div className="grid gap-3 sm:grid-cols-2">
        {rewards.map((reward) => {
          const canAfford = balance >= reward.points_required;
          const tierEligible = !reward.eligible_tiers?.length || reward.eligible_tiers.includes(currentTier);
          const outOfStock = reward.stock_limit !== null && reward.stock_used >= reward.stock_limit;
          const canRedeem = canAfford && tierEligible && !outOfStock;
          const isRedeeming = redeeming === reward.id;
          const msg = redeemMsg?.id === reward.id ? redeemMsg : null;

          return (
            <div
              key={reward.id}
              className={`border rounded-card p-4 flex flex-col gap-3 transition-all ${
                canRedeem ? 'border-sc-border bg-white hover:border-sc-forest/30' : 'border-sc-border/50 bg-sc-beige/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`font-semibold text-sm ${canRedeem ? 'text-sc-forest' : 'text-sc-muted'}`}>
                    {reward.name}
                  </p>
                  {reward.description && (
                    <p className="text-sc-muted text-xs mt-0.5 line-clamp-2">{reward.description}</p>
                  )}
                </div>
                <span className="flex-shrink-0 text-xs px-2 py-1 bg-sc-beige text-sc-forest rounded-badge font-medium whitespace-nowrap">
                  {REWARD_TYPE_LABELS[reward.reward_type] || reward.reward_type}
                </span>
              </div>

              {/* Eligible tiers */}
              {reward.eligible_tiers?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {reward.eligible_tiers.map((t) => (
                    <span
                      key={t}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        t === currentTier ? 'bg-sc-forest text-sc-cream' : 'bg-sc-beige text-sc-muted'
                      }`}
                    >
                      {TIERS[t]?.label || t}
                    </span>
                  ))}
                </div>
              )}

              {/* Stock */}
              {reward.stock_limit !== null && (
                <p className="text-xs text-sc-muted">
                  {outOfStock ? '❌ Agotado' : `${reward.stock_limit - reward.stock_used} disponibles`}
                </p>
              )}

              {/* Feedback message */}
              {msg && (
                <p className={`text-xs font-medium ${msg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {msg.msg}
                </p>
              )}

              {/* CTA */}
              <div className="flex items-center justify-between gap-2 mt-auto pt-1 border-t border-sc-border/50">
                <span className={`text-sm font-black ${canAfford ? 'text-sc-forest' : 'text-sc-muted'}`}>
                  {reward.points_required.toLocaleString('es-CO')} pts
                </span>
                <button
                  onClick={() => canRedeem && onRedeem(reward.id)}
                  disabled={!canRedeem || isRedeeming}
                  className={`px-4 py-1.5 rounded-sm2 text-xs font-semibold transition-colors ${
                    canRedeem
                      ? 'bg-sc-forest text-sc-cream hover:bg-sc-forest/90'
                      : 'bg-sc-beige text-sc-muted cursor-not-allowed'
                  }`}
                >
                  {isRedeeming ? 'Canjeando...' :
                   outOfStock ? 'Agotado': !tierEligible ?'Nivel insuficiente' :
                   !canAfford ? `Faltan ${(reward.points_required - balance).toLocaleString('es-CO')} pts` :
                   'Canjear'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tiers Tab ─────────────────────────────────────────────────────────────────
function TiersTab({ currentTier, lifetime }: { currentTier: string; lifetime: number }) {
  const tierOrder = ['crew', 'og', 'legend', 'icon'];

  return (
    <div className="space-y-4">
      <p className="text-sc-muted text-sm">
        Acumula puntos de por vida para subir de nivel y desbloquear beneficios exclusivos.
      </p>

      <div className="space-y-3">
        {tierOrder.map((tierKey, idx) => {
          const t = TIERS[tierKey];
          const isCurrent = tierKey === currentTier;
          const isUnlocked = tierOrder.indexOf(currentTier) >= idx;

          return (
            <div
              key={tierKey}
              className={`border rounded-card p-4 transition-all ${
                isCurrent
                  ? `${t.bg} ${t.border} border-2`
                  : isUnlocked
                  ? 'border-sc-border bg-white' :'border-sc-border/50 bg-sc-beige/20 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isUnlocked ? `${t.bg} ${t.color}` : 'bg-sc-beige text-sc-muted'
                  }`}>
                    {isUnlocked ? '✓' : idx + 1}
                  </span>
                  <div>
                    <p className={`font-bold text-sm ${isCurrent ? t.color : 'text-sc-forest'}`}>{t.label}</p>
                    <p className="text-sc-muted text-xs">
                      {t.minPoints.toLocaleString('es-CO')} pts
                      {t.nextPoints > 0 ? ` — ${t.nextPoints.toLocaleString('es-CO')} pts` : '+'}
                    </p>
                  </div>
                </div>
                {isCurrent && (
                  <span className="text-xs px-2 py-1 bg-sc-forest text-sc-cream rounded-badge font-semibold">
                    Tu nivel actual
                  </span>
                )}
              </div>

              <ul className="space-y-1.5">
                {t.benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-sc-forest">
                    <span className={`flex-shrink-0 mt-0.5 ${isUnlocked ? 'text-emerald-500' : 'text-sc-muted'}`}>✓</span>
                    {b}
                  </li>
                ))}
              </ul>

              {/* Progress bar for current tier */}
              {isCurrent && t.nextTier && (
                <div className="mt-3 pt-3 border-t border-current/10">
                  <div className="flex justify-between text-xs text-sc-muted mb-1">
                    <span>Progreso hacia {t.nextTier}</span>
                    <span>{lifetime.toLocaleString('es-CO')} / {t.nextPoints.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sc-forest rounded-full"
                      style={{ width: `${calcProgress(lifetime, currentTier)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Suggestions Panel ─────────────────────────────────────────────────────────
function SuggestionsPanel({
  balance,
  tier,
  pointsToNext,
  nextTier,
  loyaltyRewards,
}: {
  balance: number;
  tier: string;
  pointsToNext: number;
  nextTier: string | null;
  loyaltyRewards: LoyaltyReward[];
}) {
  const suggestions: { icon: string; text: string; action?: string; href?: string }[] = [];

  if (nextTier && pointsToNext > 0) {
    suggestions.push({
      icon: '🚀',
      text: `Gana ${pointsToNext.toLocaleString('es-CO')} puntos más para alcanzar el nivel ${nextTier}.`,
      action: 'Comprar ahora',
      href: '/productos',
    });
  }

  const redeemable = loyaltyRewards.filter(
    (r) => balance >= r.points_required && (!r.eligible_tiers?.length || r.eligible_tiers.includes(tier))
  );
  if (redeemable.length > 0) {
    suggestions.push({
      icon: '🎁',
      text: `Tienes ${redeemable.length} recompensa${redeemable.length > 1 ? 's' : ''} disponible${redeemable.length > 1 ? 's' : ''} para canjear.`,
      action: 'Ver recompensas',
    });
  }

  if (balance > 0 && redeemable.length === 0) {
    const closest = loyaltyRewards
      .filter((r) => r.points_required > balance)
      .sort((a, b) => a.points_required - b.points_required)[0];
    if (closest) {
      suggestions.push({
        icon: '⭐',
        text: `Te faltan ${(closest.points_required - balance).toLocaleString('es-CO')} puntos para canjear "${closest.name}".`,
        action: 'Ver productos',
        href: '/productos',
      });
    }
  }

  suggestions.push({
    icon: '📦',
    text: 'Cada compra entregada suma puntos a tu saldo automáticamente.',
    action: 'Mis pedidos',
    href: '/cuenta/pedidos',
  });

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-white border border-sc-border rounded-card p-4">
      <h3 className="text-sc-forest font-semibold text-sm mb-3">💡 Sugerencias para ti</h3>
      <div className="space-y-2.5">
        {suggestions.slice(0, 3).map((s, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-sc-beige/50 rounded-sm2">
            <span className="text-lg flex-shrink-0">{s.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sc-forest text-sm">{s.text}</p>
            </div>
            {s.action && (
              <a
                href={s.href || '#'}
                onClick={!s.href ? (e) => e.preventDefault() : undefined}
                className="flex-shrink-0 text-xs font-semibold text-sc-periwinkle hover:underline whitespace-nowrap"
              >
                {s.action} →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── How to Earn Section ───────────────────────────────────────────────────────
function HowToEarnSection() {
  const steps = [
    { icon: '🛍️', title: 'Compra productos', desc: '1 punto por cada $3.000 COP o ₡500 CRC gastados en tu pedido.' },
    { icon: '⭐', title: 'Escribe reseñas', desc: 'Gana puntos extra al dejar reseñas verificadas de tus productos.' },
    { icon: '👥', title: 'Refiere amigos', desc: 'Comparte tu código de referido y gana puntos cuando tus amigos compren.' },
  ];

  return (
    <div className="bg-white border border-sc-border rounded-card p-5">
      <h3 className="text-sc-forest font-semibold text-sm mb-4">¿Cómo ganar puntos?</h3>
      <div className="grid sm:grid-cols-3 gap-4">
        {steps.map((s, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-2xl flex-shrink-0">{s.icon}</span>
            <div>
              <p className="text-sc-forest font-semibold text-sm">{s.title}</p>
              <p className="text-sc-muted text-xs mt-0.5 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
