/**
 * Street Candy — Repositorio de Pagos
 * Acceso a datos para pagos, referencias de proveedor y reembolsos.
 * Usa la tabla orders (payment_reference, payment_status, payment_method).
 */

import { createAdminClient } from '../supabase/admin';
import type { DbOrden, EstadoPago, MetodoPago } from '../payment/types';
import { loggerPagos } from '../payment/logger';

// ============================================================
// REPOSITORIO DE PAGOS
// ============================================================

export const repositorioPagos = {
  /**
   * Actualiza la referencia del proveedor y estado de pago en una orden.
   * payment_method is only written when it is a valid enum value (not null, not "manual").
   * When require_payment_method is OFF the order already holds payment_method = null;
   * this function must not overwrite it with the provider name "manual".
   */
  async actualizarReferenciaPago(
    ordenId: string,
    referencia: string,
    metodo: MetodoPago | null,
    estado: EstadoPago,
  ): Promise<void> {
    const supabase = createAdminClient();

    // Only include payment_method in the update when it is a real enum value.
    // "manual" is the internal provider name — it is NOT a valid PostgreSQL enum value
    // and must never be written to the orders table.
    const updatePayload: Record<string, unknown> = {
      payment_reference: referencia,
      payment_status: estado,
      updated_at: new Date().toISOString(),
    };

    if (metodo !== null && (metodo as string) !== 'manual') {
      updatePayload.payment_method = metodo;
    }

    const { error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', ordenId);

    if (error) {
      loggerPagos.error('Error actualizando referencia de pago', {
        orden_id: ordenId,
        datos: { error: error.message },
      });
      throw new Error(`Error actualizando referencia de pago: ${error.message}`);
    }
  },

  /**
   * Actualiza solo el estado de pago de una orden
   */
  async actualizarEstadoPago(ordenId: string, estado: EstadoPago): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: estado,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ordenId);

    if (error) {
      loggerPagos.error('Error actualizando estado de pago', {
        orden_id: ordenId,
        datos: { error: error.message, estado },
      });
      throw new Error(`Error actualizando estado de pago: ${error.message}`);
    }
  },

  /**
   * Busca una orden por referencia del proveedor de pago
   */
  async buscarPorReferencia(referencia: string): Promise<DbOrden | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_reference', referencia)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Error buscando orden por referencia: ${error.message}`);
    }

    return data as DbOrden;
  },

  /**
   * Registra metadata de pago adicional en la orden
   */
  async registrarMetadataPago(
    ordenId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const supabase = createAdminClient();

    // Obtener metadata actual
    const { data: orden } = await supabase
      .from('orders')
      .select('metadata')
      .eq('id', ordenId)
      .single();

    const metadataActual = (orden?.metadata as Record<string, unknown>) ?? {};

    const { error } = await supabase
      .from('orders')
      .update({
        metadata: { ...metadataActual, pago: metadata },
        updated_at: new Date().toISOString(),
      })
      .eq('id', ordenId);

    if (error) {
      loggerPagos.error('Error registrando metadata de pago', {
        orden_id: ordenId,
        datos: { error: error.message },
      });
    }
  },
};
