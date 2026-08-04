/**
 * Street Candy — Repositorio de Pagos
 * Acceso a datos para pagos, referencias de proveedor y reembolsos.
 * Usa la tabla orders (payment_reference, payment_status, payment_method).
 */

import { createClient } from '../supabase/server';
import type { DbOrden, EstadoPago, MetodoPago } from '../payment/types';
import { loggerPagos } from '../payment/logger';

// ============================================================
// REPOSITORIO DE PAGOS
// ============================================================

export const repositorioPagos = {
  /**
   * Actualiza la referencia del proveedor y estado de pago en una orden
   */
  async actualizarReferenciaPago(
    ordenId: string,
    referencia: string,
    metodo: MetodoPago,
    estado: EstadoPago,
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('orders')
      .update({
        payment_reference: referencia,
        payment_method: metodo,
        payment_status: estado,
        updated_at: new Date().toISOString(),
      })
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
    const supabase = await createClient();
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
    const supabase = await createClient();
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
    const supabase = await createClient();

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
