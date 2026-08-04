'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { createClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────
interface Recompensa {
  id: string;
  profile_id: string;
  points_balance: number;
  points_lifetime: number;
  tier: string;
  referral_count: number;
  created_at: string;
  profiles?: { full_name: string; email: string };
}

interface Transaccion {
  id: string;
  profile_id: string;
  transaction_type: string;
  points: number;
  balance_after: number;
  description: string;
  created_at: string;
  profiles?: { full_name: string; email: string };
}

const TIER_LABELS: Record<string, string> = { crew: 'Crew', og: 'OG', legend: 'Legend', icon: 'Icon' };
const TIER_COLORS: Record<string, string> = {
  crew: 'bg-gray-100 text-gray-700',
  og: 'bg-blue-100 text-blue-700',
  legend: 'bg-purple-100 text-purple-700',
  icon: 'bg-amber-100 text-amber-700',
};
const TX_LABELS: Record<string, string> = {
  earned_purchase: 'Compra',
  earned_review: 'Reseña',
  earned_referral: 'Referido',
  redeemed: 'Canje',
  expired: 'Expirado',
  adjusted: 'Ajuste',
};
const TX_COLORS: Record<string, string> = {
  earned_purchase: 'text-green-600',
  earned_review: 'text-green-600',
  earned_referral: 'text-green-600',
  redeemed: 'text-red-600',
  expired: 'text-gray-500',
  adjusted: 'text-blue-600',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function RowSkeleton({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-full" /></td>
      ))}
    </tr>
  );
}

// ─── Modal Ajuste ─────────────────────────────────────────────
interface ModalAjusteProps {
  recompensa: Recompensa | null;
  onClose: () => void;
  onSave: (profileId: string, puntos: number, descripcion: string) => Promise<void>;
  saving: boolean;
}

function ModalAjuste({ recompensa, onClose, onSave, saving }: ModalAjusteProps) {
  const [puntos, setPuntos] = useState('');
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    if (recompensa) { setPuntos(''); setDescripcion(''); }
  }, [recompensa]);

  if (!recompensa) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-sc-forest font-bold text-lg">Ajustar Puntos</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="font-semibold text-sc-forest">{recompensa.profiles?.full_name || '—'}</p>
            <p className="text-sm text-gray-500">{recompensa.profiles?.email}</p>
            <p className="text-sm mt-1">Saldo actual: <strong>{recompensa.points_balance.toLocaleString('es-CO')} pts</strong></p>
          </div>
          <div>
            <label className="block text-sm font-medium text-sc-forest mb-1">Puntos (positivo para agregar, negativo para restar)</label>
            <input
              type="number"
              value={puntos}
              onChange={e => setPuntos(e.target.value)}
              placeholder="Ej: 100 o -50"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-sc-forest mb-1">Descripción *</label>
            <input
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Motivo del ajuste..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border border-gray-300 text-sc-forest rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button
              onClick={() => onSave(recompensa.profile_id, Number(puntos), descripcion)}
              disabled={saving || !puntos || !descripcion}
              className="flex-1 bg-sc-forest text-white rounded-lg py-2.5 text-sm font-medium hover:bg-sc-darkforest transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/></svg>}
              {saving ? 'Guardando...' : 'Aplicar ajuste'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function AdminRecompensasPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<'recompensas' | 'transacciones'>('recompensas');
  const [recompensas, setRecompensas] = useState<Recompensa[]>([]);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTier, setFiltroTier] = useState('');
  const [filtroTx, setFiltroTx] = useState('');
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalAjuste, setModalAjuste] = useState<Recompensa | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const POR_PAGINA = 15;

  useEffect(() => {
    if (!authLoading && profile && !['admin', 'staff'].includes(profile.role)) router.replace('/');
  }, [authLoading, profile, router]);

  const fetchRecompensas = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let query = supabase
        .from('rewards')
        .select('*, profiles(full_name, email)', { count: 'exact' })
        .order('points_lifetime', { ascending: false })
        .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
      if (filtroTier) query = query.eq('tier', filtroTier);
      const { data, error: err, count } = await query;
      if (err) throw err;
      setRecompensas(data || []);
      setTotal(count || 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando recompensas');
    } finally { setLoading(false); }
  }, [supabase, pagina, filtroTier]);

  const fetchTransacciones = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let query = supabase
        .from('reward_transactions')
        .select('*, profiles(full_name, email)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
      if (filtroTx) query = query.eq('transaction_type', filtroTx);
      const { data, error: err, count } = await query;
      if (err) throw err;
      setTransacciones(data || []);
      setTotal(count || 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando transacciones');
    } finally { setLoading(false); }
  }, [supabase, pagina, filtroTx]);

  useEffect(() => {
    if (profile && ['admin', 'staff'].includes(profile.role)) {
      if (tab === 'recompensas') fetchRecompensas();
      else fetchTransacciones();
    }
  }, [profile, tab, fetchRecompensas, fetchTransacciones]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleAjuste = async (profileId: string, puntos: number, descripcion: string) => {
    setSaving(true);
    try {
      const { data: rw } = await supabase.from('rewards').select('points_balance').eq('profile_id', profileId).single();
      if (!rw) throw new Error('Recompensa no encontrada');
      const newBalance = Math.max(0, rw.points_balance + puntos);
      await supabase.from('rewards').update({ points_balance: newBalance, points_lifetime: puntos > 0 ? rw.points_balance + puntos : rw.points_balance }).eq('profile_id', profileId);
      await supabase.from('reward_transactions').insert({
        profile_id: profileId,
        transaction_type: 'adjusted',
        points: puntos,
        balance_after: newBalance,
        description: descripcion,
      });
      showToast('Ajuste aplicado correctamente');
      setModalAjuste(null);
      fetchRecompensas();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error al ajustar');
    } finally { setSaving(false); }
  };

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const recompensasFiltradas = busqueda
    ? recompensas.filter(r => r.profiles?.full_name?.toLowerCase().includes(busqueda.toLowerCase()) || r.profiles?.email?.toLowerCase().includes(busqueda.toLowerCase()))
    : recompensas;

  if (authLoading) return <AdminLayout title="Recompensas"><div className="animate-pulse h-64 bg-gray-100 rounded-xl" /></AdminLayout>;
  if (!profile || !['admin', 'staff'].includes(profile.role)) return null;

  return (
    <AdminLayout title="Recompensas" subtitle="Gestión de puntos, niveles y transacciones">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-sc-forest text-white px-4 py-3 rounded-xl shadow-lg text-sm animate-slide-up">{toast}</div>
      )}
      <ModalAjuste recompensa={modalAjuste} onClose={() => setModalAjuste(null)} onSave={handleAjuste} saving={saving} />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {(['recompensas', 'transacciones'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setPagina(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white text-sc-forest shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'recompensas' ? 'Recompensas' : 'Transacciones'}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-center">
        {tab === 'recompensas' && (
          <>
            <div className="flex-1 min-w-48 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar usuario..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30" />
            </div>
            <select value={filtroTier} onChange={e => { setFiltroTier(e.target.value); setPagina(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30">
              <option value="">Todos los niveles</option>
              <option value="crew">Crew</option>
              <option value="og">OG</option>
              <option value="legend">Legend</option>
              <option value="icon">Icon</option>
            </select>
          </>
        )}
        {tab === 'transacciones' && (
          <select value={filtroTx} onChange={e => { setFiltroTx(e.target.value); setPagina(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30">
            <option value="">Todos los tipos</option>
            {Object.entries(TX_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
        <span className="text-sm text-gray-500 ml-auto">{total} registro(s)</span>
      </div>

      {/* Tabla Recompensas */}
      {tab === 'recompensas' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Tabla de recompensas">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-sc-forest">Usuario</th>
                  <th className="px-4 py-3 text-left font-semibold text-sc-forest">Nivel</th>
                  <th className="px-4 py-3 text-right font-semibold text-sc-forest">Saldo</th>
                  <th className="px-4 py-3 text-right font-semibold text-sc-forest">Puntos totales</th>
                  <th className="px-4 py-3 text-right font-semibold text-sc-forest">Referidos</th>
                  <th className="px-4 py-3 text-left font-semibold text-sc-forest">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} cols={6} />) :
                  error ? <tr><td colSpan={6} className="px-4 py-12 text-center text-red-500">{error}</td></tr> :
                  recompensasFiltradas.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-gray-300">
                          <path d="M24 6l4.5 9 9.9 1.4-7.2 7 1.7 9.9L24 29l-8.9 4.3 1.7-9.9-7.2-7 9.9-1.4L24 6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                        </svg>
                        <p className="text-gray-500 font-medium">No hay recompensas registradas</p>
                      </div>
                    </td></tr>
                  ) : recompensasFiltradas.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-sc-forest">{r.profiles?.full_name || '—'}</p>
                        <p className="text-gray-500 text-xs">{r.profiles?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[r.tier]}`}>
                          {TIER_LABELS[r.tier] || r.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-sc-forest">{r.points_balance.toLocaleString('es-CO')}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{r.points_lifetime.toLocaleString('es-CO')}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{r.referral_count}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setModalAjuste(r)}
                          className="text-sc-forest hover:bg-sc-forest/10 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                          Ajustar
                        </button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
          {totalPaginas > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">Página {pagina} de {totalPaginas}</p>
              <div className="flex gap-1">
                <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">← Anterior</button>
                <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">Siguiente →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabla Transacciones */}
      {tab === 'transacciones' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Tabla de transacciones">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-sc-forest">Usuario</th>
                  <th className="px-4 py-3 text-left font-semibold text-sc-forest">Tipo</th>
                  <th className="px-4 py-3 text-right font-semibold text-sc-forest">Puntos</th>
                  <th className="px-4 py-3 text-right font-semibold text-sc-forest">Saldo tras</th>
                  <th className="px-4 py-3 text-left font-semibold text-sc-forest">Descripción</th>
                  <th className="px-4 py-3 text-left font-semibold text-sc-forest">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} cols={6} />) :
                  error ? <tr><td colSpan={6} className="px-4 py-12 text-center text-red-500">{error}</td></tr> :
                  transacciones.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-16 text-center">
                      <p className="text-gray-500 font-medium">No hay transacciones registradas</p>
                    </td></tr>
                  ) : transacciones.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-sc-forest">{t.profiles?.full_name || '—'}</p>
                        <p className="text-gray-500 text-xs">{t.profiles?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {TX_LABELS[t.transaction_type] || t.transaction_type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${TX_COLORS[t.transaction_type] || 'text-gray-600'}`}>
                        {t.points > 0 ? '+' : ''}{t.points.toLocaleString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{t.balance_after.toLocaleString('es-CO')}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{t.description}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(t.created_at)}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
          {totalPaginas > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">Página {pagina} de {totalPaginas}</p>
              <div className="flex gap-1">
                <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">← Anterior</button>
                <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">Siguiente →</button>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
