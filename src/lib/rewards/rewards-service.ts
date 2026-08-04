/**
 * Street Candy — Rewards Service
 * Awards points when an order status becomes "delivered".
 *
 * Rules:
 *  - Colombia (CO):  1 point per 3 000 COP spent (floor division)
 *  - Costa Rica (CR): 1 point per 500 CRC spent (floor division)
 *  - Only triggered on status → "delivered"
 *  - Never awards for cancelled / refunded orders
 *  - Prevents duplicate awards via DB unique index on (order_id) for earned_purchase
 *  - Uses the final order total (post-discount) stored in orders.total
 *  - Records every transaction with date, order_id, reason, and amount
 */

import { createAdminClient } from '../supabase/admin';
import { loggerPagos } from '../payment/logger';

// ── Point-rate configuration per country ──────────────────────────────────────
const POINTS_CONFIG: Record<string, { ratePerPoint: number; currency: string }> = {
  CO: { ratePerPoint: 3000, currency: 'COP' },
  CR: { ratePerPoint: 500,  currency: 'CRC' },
};

/**
 * Calculates how many points to award for a given total and country.
 * Returns 0 if the country is not configured.
 */
export function calcularPuntos(total: number, countryCode: string): number {
  const config = POINTS_CONFIG[countryCode.toUpperCase()];
  if (!config || total <= 0) return 0;
  return Math.floor(total / config.ratePerPoint);
}

/**
 * Awards purchase points to a customer when their order is delivered.
 *
 * Safe to call multiple times — the unique DB index on (order_id) for
 * earned_purchase transactions prevents duplicate awards.
 *
 * @param ordenId      UUID of the delivered order
 * @param profileId    UUID of the customer profile
 * @param total        Final order total (post-discount)
 * @param countryCode  'CO' or 'CR'
 * @param orderNumber  Human-readable order number for the description
 */
export async function otorgarPuntosPorCompra(
  ordenId: string,
  profileId: string,
  total: number,
  countryCode: string,
  orderNumber: string,
): Promise<{ otorgado: boolean; puntos: number; mensaje: string }> {
  const puntos = calcularPuntos(total, countryCode);

  if (puntos <= 0) {
    return {
      otorgado: false,
      puntos: 0,
      mensaje: `Sin puntos: total insuficiente o país no configurado (${countryCode})`,
    };
  }

  // Use admin client (service role) to bypass RLS — rewards are awarded server-side only
  const supabase = createAdminClient();

  try {
    // ── Upsert the rewards row (create if first order) ──────────────────────
    const { data: rewardRow, error: rewardErr } = await supabase
      .from('rewards')
      .upsert(
        { profile_id: profileId, points_balance: 0, points_lifetime: 0 },
        { onConflict: 'profile_id', ignoreDuplicates: true },
      )
      .select('points_balance, points_lifetime')
      .eq('profile_id', profileId)
      .single();

    // If upsert returned nothing (row already existed), fetch it
    let currentBalance = 0;
    let currentLifetime = 0;

    if (rewardErr || !rewardRow) {
      const { data: existing, error: fetchErr } = await supabase
        .from('rewards')
        .select('points_balance, points_lifetime')
        .eq('profile_id', profileId)
        .single();

      if (fetchErr || !existing) {
        loggerPagos.error('Error obteniendo fila de recompensas', {
          orden_id: ordenId,
          datos: { error: fetchErr?.message },
        });
        return { otorgado: false, puntos: 0, mensaje: 'Error al obtener recompensas del cliente' };
      }

      currentBalance = existing.points_balance;
      currentLifetime = existing.points_lifetime;
    } else {
      currentBalance = rewardRow.points_balance;
      currentLifetime = rewardRow.points_lifetime;
    }

    const newBalance  = currentBalance  + puntos;
    const newLifetime = currentLifetime + puntos;

    // ── Determine new tier ───────────────────────────────────────────────────
    const newTier = calcularTier(newLifetime);

    // ── Insert the transaction (will fail silently if duplicate) ─────────────
    const description = `Compra entregada #${orderNumber} — ${puntos} pts`;

    const { error: txError } = await supabase
      .from('reward_transactions')
      .insert({
        profile_id:       profileId,
        order_id:         ordenId,
        transaction_type: 'earned_purchase',
        points:           puntos,
        balance_after:    newBalance,
        description,
      });

    if (txError) {
      // Unique constraint violation = already awarded → idempotent, not an error
      if (txError.code === '23505') {
        loggerPagos.info('Puntos ya otorgados para esta orden (idempotente)', {
          orden_id: ordenId,
          datos: { profile_id: profileId },
        });
        return { otorgado: false, puntos: 0, mensaje: 'Puntos ya otorgados para esta orden' };
      }

      loggerPagos.error('Error insertando transacción de recompensa', {
        orden_id: ordenId,
        datos: { error: txError.message },
      });
      return { otorgado: false, puntos: 0, mensaje: 'Error registrando transacción de puntos' };
    }

    // ── Update the rewards balance ───────────────────────────────────────────
    const { error: updateErr } = await supabase
      .from('rewards')
      .update({
        points_balance:  newBalance,
        points_lifetime: newLifetime,
        tier:            newTier,
        tier_updated_at: new Date().toISOString(),
        updated_at:      new Date().toISOString(),
      })
      .eq('profile_id', profileId);

    if (updateErr) {
      loggerPagos.error('Error actualizando saldo de recompensas', {
        orden_id: ordenId,
        datos: { error: updateErr.message },
      });
      return { otorgado: false, puntos: 0, mensaje: 'Error actualizando saldo de puntos' };
    }

    loggerPagos.info('Puntos de compra otorgados', {
      orden_id: ordenId,
      datos: {
        profile_id:  profileId,
        puntos,
        new_balance: newBalance,
        tier:        newTier,
        country:     countryCode,
      },
    });

    return { otorgado: true, puntos, mensaje: `${puntos} puntos otorgados por la compra` };
  } catch (err) {
    loggerPagos.error('Error inesperado en otorgarPuntosPorCompra', {
      orden_id: ordenId,
      datos: { error: String(err) },
    });
    return { otorgado: false, puntos: 0, mensaje: 'Error inesperado al otorgar puntos' };
  }
}

/**
 * Determines the reward tier based on lifetime points.
 */
function calcularTier(lifetimePoints: number): string {
  if (lifetimePoints >= 5000) return 'icon';
  if (lifetimePoints >= 2000) return 'legend';
  if (lifetimePoints >= 500)  return 'og';
  return 'crew';
}
