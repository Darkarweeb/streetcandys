/**
 * Street Candy — Servicio de Órdenes
 * Lógica de negocio para gestión de órdenes: estados, cancelación, historial.
 */

import { repositorioOrdenes } from './order-repository';
import { repositorioCheckout } from './checkout-repository';
import { servicioPagos } from './payment-service';
import { loggerPagos } from './logger';
import type { OrdenCompleta, DbOrden, EstadoOrden } from './types';

// ============================================================
// SERVICIO DE ÓRDENES
// ============================================================

export const servicioOrdenes = {
  /**
   * Obtiene una orden completa por ID
   */
  async obtenerOrden(ordenId: string): Promise<OrdenCompleta | null> {
    return repositorioOrdenes.obtenerPorId(ordenId);
  },

  /**
   * Obtiene una orden por número de orden
   */
  async obtenerPorNumero(numeroOrden: string): Promise<DbOrden | null> {
    return repositorioOrdenes.obtenerPorNumero(numeroOrden);
  },

  /**
   * Lista órdenes de un usuario
   */
  async listarOrdenesUsuario(
    profileId: string,
    pagina = 1,
    porPagina = 10,
  ): Promise<{ ordenes: DbOrden[]; total: number; paginas: number }> {
    const { ordenes, total } = await repositorioOrdenes.listarPorUsuario(
      profileId,
      pagina,
      porPagina,
    );

    return {
      ordenes,
      total,
      paginas: Math.ceil(total / porPagina),
    };
  },

  /**
   * Cancela una orden si está en estado cancelable
   */
  async cancelarOrden(
    ordenId: string,
    profileId: string,
    motivo?: string,
  ): Promise<{ exito: boolean; mensaje: string }> {
    const orden = await repositorioOrdenes.obtenerPorId(ordenId);

    if (!orden) {
      return { exito: false, mensaje: 'Orden no encontrada' };
    }

    // Verificar que la orden pertenece al usuario
    if (orden.profile_id !== profileId) {
      return { exito: false, mensaje: 'No tienes permiso para cancelar esta orden' };
    }

    // Solo se pueden cancelar órdenes en estado pending o confirmed
    const estadosCancelables: EstadoOrden[] = ['pending', 'confirmed'];
    if (!estadosCancelables.includes(orden.status)) {
      return {
        exito: false,
        mensaje: `No se puede cancelar una orden en estado: ${orden.status}`,
      };
    }

    // Si ya tiene pago, intentar cancelar la intención de pago
    if (orden.payment_reference && orden.payment_status === 'pending') {
      try {
        const proveedor = (await import('./providers')).obtenerProveedorPorPais(
          orden.country_code,
        );
        await proveedor.cancelarIntencion(orden.payment_reference, motivo);
      } catch (err) {
        loggerPagos.warn('No se pudo cancelar la intención de pago', {
          orden_id: ordenId,
          datos: { error: String(err) },
        });
      }
    }

    await repositorioOrdenes.actualizarEstado(ordenId, 'cancelled');

    loggerPagos.info('Orden cancelada', {
      orden_id: ordenId,
      datos: { motivo, profile_id: profileId },
    });

    // Notificar al usuario
    if (orden.profile_id) {
      await repositorioCheckout.crearNotificacion(
        orden.profile_id,
        'order_cancelled',
        'Orden cancelada',
        `Tu orden #${orden.order_number} ha sido cancelada.`,
        { orden_id: ordenId, numero_orden: orden.order_number },
      );
    }

    return { exito: true, mensaje: 'Orden cancelada exitosamente' };
  },

  /**
   * Actualiza el estado de una orden (solo admin/staff)
   */
  async actualizarEstadoOrden(
    ordenId: string,
    nuevoEstado: EstadoOrden,
    trackingNumber?: string,
    nota?: string,
    estimatedDelivery?: string,
  ): Promise<void> {
    await repositorioOrdenes.actualizarEstado(ordenId, nuevoEstado, nota, estimatedDelivery);

    if (trackingNumber && (nuevoEstado === 'shipped' || nuevoEstado === 'out_for_delivery')) {
      const supabase = (await import('../supabase/server')).createClient;
      const client = await supabase();
      await client
        .from('orders')
        .update({ tracking_number: trackingNumber, updated_at: new Date().toISOString() })
        .eq('id', ordenId);
    }

    loggerPagos.info('Estado de orden actualizado', {
      orden_id: ordenId,
      datos: { nuevo_estado: nuevoEstado },
    });
  },

  /**
   * Sincroniza el estado de pago de una orden con el proveedor
   */
  async sincronizarPago(ordenId: string): Promise<void> {
    const orden = await repositorioOrdenes.obtenerPorId(ordenId);
    if (!orden) return;

    await servicioPagos.sincronizarEstadoPago(ordenId, orden.country_code);
  },

  /**
   * Lista todas las órdenes (admin) con filtros
   */
  async listarOrdenesAdmin(
    pagina = 1,
    porPagina = 15,
    filtros?: { estado?: string; pago?: string; busqueda?: string },
  ): Promise<{ ordenes: DbOrden[]; total: number; paginas: number }> {
    const { ordenes, total } = await repositorioOrdenes.listarTodas(pagina, porPagina, filtros);
    return { ordenes, total, paginas: Math.ceil(total / porPagina) };
  },
};
