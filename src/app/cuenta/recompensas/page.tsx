'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import CuentaLayout from '@/components/cuenta/CuentaLayout';
import { createClient } from '@/lib/supabase/client';

interface RewardsData {
  id: string;
  points_balance: number;
  points_lifetime: number;
  tier: string;
  tier_updated_at: string;
  referral_code: string | null;
  referral_count: number;
}

interface RewardTransaction {
  id: string;
  transaction_type: string;
  points: number;
  balance_after: number;
  description: string;
  created_at: string;
}

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; next: string | null; nextPoints: number; minPoints: number }> = {
  crew: { label: 'Crew', color: 'text-sc-forest', bg: 'bg-sc-beige', next: 'OG', nextPoints: 500, minPoints: 0 },
  og: { label: 'OG', color: 'text-sc-periwinkle', bg: 'bg-sc-periwinkle/10', next: 'Legend', nextPoints: 2000, minPoints: 500 },
  legend: { label: 'Legend', color: 'text-amber-700', bg: 'bg-amber-50', next: 'Icon', nextPoints: 5000, minPoints: 2000 },
  icon: { label: 'Icon', color: 'text-sc-cream', bg: 'bg-sc-forest', next: null, nextPoints: 0, minPoints: 5000 },
};

const TX_TYPE_LABELS: Record<string, { label: string; sign: string; color: string }> = {
  earned: { label: 'Puntos ganados', sign: '+', color: 'text-green-600' },
  redeemed: { label: 'Puntos canjeados', sign: '-', color: 'text-red-500' },
  expired: { label: 'Puntos expirados', sign: '-', color: 'text-gray-400' },
  bonus: { label: 'Bono', sign: '+', color: 'text-sc-periwinkle' },
  referral: { label: 'Referido', sign: '+', color: 'text-green-600' },
  adjustment: { label: 'Ajuste', sign: '', color: 'text-sc-muted' },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function RewardsSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="bg-white border border-sc-border rounded-card p-6">
        <div className="h-6 bg-sc-beige rounded w-1/3 mb-4" />
        <div className="h-12 bg-sc-beige rounded w-1/2" />
      </div>
    </div>
  );
}

export default function RecompensasPage() {
  const { user } = useAuth();
  const supabase = useRef(createClient()).current;
  const [rewards, setRewards] = useState<RewardsData | null>(null);
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState('');

  const loadRewards = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [rewardsRes, txRes] = await Promise.all([
        supabase.from('rewards').select('*').eq('profile_id', user.id).single(),
        supabase
          .from('reward_transactions')
          .select('*')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (rewardsRes.error && rewardsRes.error.code !== 'PGRST116') {
        throw new Error(rewardsRes.error.message);
      }

      setRewards(rewardsRes.data as RewardsData | null);
      setTransactions((txRes.data as RewardTransaction[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando recompensas');
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => { loadRewards(); }, [loadRewards]);

  const tier = TIER_CONFIG[rewards?.tier || 'crew'] || TIER_CONFIG.crew;
  const progressPct = rewards && tier.nextPoints > 0
    ? Math.min(100, Math.max(0, ((rewards.points_lifetime - tier.minPoints) / (tier.nextPoints - tier.minPoints)) * 100))
    : 100;

  return (
    <CuentaLayout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-sc-forest tracking-tight">Mis Recompensas</h1>
          <p className="text-sc-muted text-sm mt-1">Tu saldo de puntos y beneficios</p>
        </div>

        {loading ? (
          <RewardsSkeleton />
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-card p-5 text-red-700 text-sm">{error}</div>
        ) : !rewards ? (
          <div className="bg-white border border-sc-border rounded-card py-16 text-center">
            <p className="text-5xl mb-4">⭐</p>
            <p className="text-sc-forest font-semibold text-lg mb-2">Aún no tienes recompensas</p>
            <p className="text-sc-muted text-sm">Realiza tu primera compra para comenzar a ganar puntos</p>
          </div>
        ) : (
          <>
            {/* Balance card */}
            <div className={`rounded-card p-6 ${tier.bg} border border-sc-border`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sc-muted text-xs font-medium uppercase tracking-wide mb-1">Saldo de puntos</p>
                  <p className={`text-5xl font-black tracking-tightest ${tier.color}`}>
                    {rewards.points_balance.toLocaleString()}
                  </p>
                  <p className="text-sc-muted text-xs mt-1">
                    {rewards.points_lifetime.toLocaleString()} puntos acumulados en total
                  </p>
                </div>
                <span className={`px-3 py-1.5 rounded-badge text-sm font-bold ${tier.bg} ${tier.color} border border-current/20`}>
                  {tier.label}
                </span>
              </div>

              {tier.next && (
                <div>
                  <div className="flex justify-between text-xs text-sc-muted mb-1.5">
                    <span>Progreso hacia {tier.next}</span>
                    <span>{rewards.points_lifetime.toLocaleString()} / {tier.nextPoints.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sc-forest rounded-full transition-all duration-700"
                      style={{ width: `${progressPct}%` }}
                      role="progressbar"
                      aria-valuenow={progressPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-sc-border rounded-card p-4 text-center">
                <p className="text-2xl font-bold text-sc-forest">{rewards.points_balance.toLocaleString()}</p>
                <p className="text-sc-muted text-xs mt-1">Puntos disponibles</p>
              </div>
              <div className="bg-white border border-sc-border rounded-card p-4 text-center">
                <p className="text-2xl font-bold text-sc-forest">{rewards.points_lifetime.toLocaleString()}</p>
                <p className="text-sc-muted text-xs mt-1">Puntos de por vida</p>
              </div>
              <div className="bg-white border border-sc-border rounded-card p-4 text-center col-span-2 sm:col-span-1">
                <p className="text-2xl font-bold text-sc-forest">{rewards.referral_count}</p>
                <p className="text-sc-muted text-xs mt-1">Referidos</p>
              </div>
            </div>

            {/* Referral code */}
            {rewards.referral_code && (
              <div className="bg-white border border-sc-border rounded-card p-5">
                <h2 className="text-sc-forest font-semibold text-sm mb-3">Tu código de referido</h2>
                <div className="flex items-center gap-3">
                  <code className="flex-1 bg-sc-beige px-4 py-2.5 rounded-sm2 text-sc-forest font-mono text-sm font-bold tracking-widest">
                    {rewards.referral_code}
                  </code>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(rewards.referral_code || '');
                        setCopyMsg('¡Copiado!');
                        setTimeout(() => setCopyMsg(''), 2000);
                      } catch {
                        setCopyMsg('Error al copiar');
                        setTimeout(() => setCopyMsg(''), 2000);
                      }
                    }}
                    className="px-4 py-2.5 border border-sc-border rounded-sm2 text-sc-forest text-sm font-medium hover:bg-sc-beige transition-colors"
                  >
                    {copyMsg || 'Copiar'}
                  </button>
                </div>
                <p className="text-sc-muted text-xs mt-2">Comparte tu código y gana puntos por cada amigo que compre</p>
              </div>
            )}

            {/* Transaction history */}
            <div className="bg-white border border-sc-border rounded-card overflow-hidden">
              <div className="px-5 py-4 border-b border-sc-border">
                <h2 className="text-sc-forest font-semibold text-sm">Historial de puntos</h2>
              </div>
              {transactions.length === 0 ? (
                <div className="px-5 py-10 text-center text-sc-muted text-sm">
                  Aún no hay movimientos de puntos
                </div>
              ) : (
                <div className="divide-y divide-sc-border">
                  {transactions.map((tx) => {
                    const txInfo = TX_TYPE_LABELS[tx.transaction_type] || { label: tx.transaction_type, sign: '', color: 'text-sc-muted' };
                    return (
                      <div key={tx.id} className="flex items-center justify-between px-5 py-3.5">
                        <div>
                          <p className="text-sc-forest text-sm font-medium">{tx.description}</p>
                          <p className="text-sc-muted text-xs mt-0.5">{formatDate(tx.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${txInfo.color}`}>
                            {txInfo.sign}{Math.abs(tx.points).toLocaleString()} pts
                          </p>
                          <p className="text-sc-muted text-xs">Saldo: {tx.balance_after.toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </CuentaLayout>
  );
}
