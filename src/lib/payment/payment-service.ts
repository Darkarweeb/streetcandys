/**
 * Street Candy — Servicio de Pagos
 * Orquesta el ciclo de vida de un pago usando la abstracción ProveedorPago.
 * NUNCA importa Stripe directamente — siempre usa el proveedor registrado.
 */

import { obtenerProveedorPorPais } from './providers';
import { repositorioPagos } from './payment-repository';
import { repositorioOrdenes } from './order-repository';
import { loggerPagos } from './logger';
import { mapearEstadoStripeAInterno } from './utils';
import type {
  InputIntencionPago,
  ResultadoIntencionPago,
  ResultadoConfirmacionPago,
  InputReembolso,
  ResultadoReembolso,
  EstadoPago,
  EventoWebhook,
} from './types';

// ============================================================
// SERVICIO DE PAGOS
// ============================================================

export const servicioPagos = {
  /**
   * Crea una intención de pago para una orden.
   * Usa el proveedor configurado para el país de la orden.
   */
  async crearIntencionPago(
    ordenId: string,
    input: Omit<InputIntencionPago, 'orden_id'>,
  ): Promise<ResultadoIntencionPago> {
    loggerPagos.info('Iniciando creación de intención de pago', {
      orden_id: ordenId,
      datos: { pais: input.codigo_pais, monto: input.monto, moneda: input.moneda },
    });

    const proveedor = obtenerProveedorPorPais(input.codigo_pais);

    const resultado = await proveedor.crearIntencionPago({
      ...input,
      orden_id: ordenId,
    });

    // Persistir referencia del proveedor en la orden
    await repositorioPagos.actualizarReferenciaPago(
      ordenId,
      resultado.referencia_proveedor,
      proveedor.nombre as import('./types').MetodoPago,
      'pending',
    );

    // Guardar metadata adicional
    await repositorioPagos.registrarMetadataPago(ordenId, {
      proveedor: proveedor.nombre,
      referencia: resultado.referencia_proveedor,
      estado_inicial: resultado.estado,
      creado_en: new Date().toISOString(),
    });

    loggerPagos.info('Intención de pago creada exitosamente', {
      orden_id: ordenId,
      referencia_proveedor: resultado.referencia_proveedor,
      proveedor: proveedor.nombre,
    });

    return resultado;
  },

  /**
   * Confirma un pago y actualiza el estado de la orden.
   */
  async confirmarPago(
    ordenId: string,
    referencia: string,
    codigoPais: string,
  ): Promise<ResultadoConfirmacionPago> {
    loggerPagos.info('Confirmando pago', {
      orden_id: ordenId,
      referencia_proveedor: referencia,
    });

    const proveedor = obtenerProveedorPorPais(codigoPais);
    const resultado = await proveedor.confirmarPago(referencia);

    const estadoInterno = mapearEstadoStripeAInterno(resultado.estado);
    await repositorioPagos.actualizarEstadoPago(ordenId, estadoInterno);

    if (estadoInterno === 'paid') {
      await repositorioOrdenes.actualizarEstado(ordenId, 'confirmed');
      loggerPagos.info('Pago confirmado — orden actualizada a confirmed', {
        orden_id: ordenId,
        referencia_proveedor: referencia,
      });
    }

    return resultado;
  },

  /**
   * Procesa un reembolso total o parcial.
   */
  async procesarReembolso(
    ordenId: string,
    input: Omit<InputReembolso, 'referencia_proveedor'>,
    codigoPais: string,
  ): Promise<ResultadoReembolso> {
    loggerPagos.info('Iniciando reembolso', {
      orden_id: ordenId,
      datos: { monto: input.monto, motivo: input.motivo },
    });

    const orden = await repositorioOrdenes.obtenerPorId(ordenId);
    if (!orden) throw new Error(`Orden no encontrada: ${ordenId}`);
    if (!orden.payment_reference) throw new Error('La orden no tiene referencia de pago');

    const proveedor = obtenerProveedorPorPais(codigoPais);
    const resultado = await proveedor.procesarReembolso({
      referencia_proveedor: orden.payment_reference,
      ...input,
    });

    // Actualizar estado de pago
    const nuevoEstado: EstadoPago = input.monto && input.monto < orden.total
      ? 'partially_refunded' :'refunded';

    await repositorioPagos.actualizarEstadoPago(ordenId, nuevoEstado);
    await repositorioOrdenes.actualizarEstado(ordenId, 'refunded');

    loggerPagos.info('Reembolso procesado exitosamente', {
      orden_id: ordenId,
      referencia_proveedor: resultado.referencia_reembolso,
      datos: { monto: resultado.monto_reembolsado, estado: resultado.estado },
    });

    return resultado;
  },

  /**
   * Sincroniza el estado de pago consultando al proveedor.
   */
  async sincronizarEstadoPago(ordenId: string, codigoPais: string): Promise<EstadoPago> {
    const orden = await repositorioOrdenes.obtenerPorId(ordenId);
    if (!orden) throw new Error(`Orden no encontrada: ${ordenId}`);
    if (!orden.payment_reference) return 'pending';

    const proveedor = obtenerProveedorPorPais(codigoPais);
    const estadoExterno = await proveedor.verificarEstado(orden.payment_reference);
    const estadoInterno = mapearEstadoStripeAInterno(estadoExterno);

    if (estadoInterno !== orden.payment_status) {
      await repositorioPagos.actualizarEstadoPago(ordenId, estadoInterno);
      loggerPagos.info('Estado de pago sincronizado', {
        orden_id: ordenId,
        datos: { anterior: orden.payment_status, nuevo: estadoInterno },
      });
    }

    return estadoInterno;
  },

  /**
   * Procesa un evento de webhook del proveedor.
   * Actualiza la orden correspondiente según el tipo de evento.
   */
  async procesarWebhook(
    payload: string,
    firma: string,
    codigoPais: string,
  ): Promise<{ procesado: boolean; orden_id?: string }> {
    const proveedor = obtenerProveedorPorPais(codigoPais);
    let evento: EventoWebhook;

    try {
      evento = await proveedor.procesarWebhook(payload, firma);
    } catch (err) {
      loggerPagos.error('Error procesando webhook', {
        proveedor: proveedor.nombre,
        datos: { error: String(err) },
      });
      throw err;
    }

    loggerPagos.info('Evento webhook recibido', {
      proveedor: proveedor.nombre,
      datos: { tipo: evento.tipo, referencia: evento.referencia_proveedor },
    });

    // Buscar la orden asociada a esta referencia
    const orden = await repositorioPagos.buscarPorReferencia(evento.referencia_proveedor);
    if (!orden) {
      loggerPagos.warn('Orden no encontrada para referencia de webhook', {
        referencia_proveedor: evento.referencia_proveedor,
      });
      return { procesado: false };
    }

    // Actualizar estado según tipo de evento
    switch (evento.tipo) {
      case 'pago_exitoso':
        await repositorioPagos.actualizarEstadoPago(orden.id, 'paid');
        await repositorioOrdenes.actualizarEstado(orden.id, 'confirmed');
        break;

      case 'pago_fallido':
      case 'pago_cancelado':
        await repositorioPagos.actualizarEstadoPago(orden.id, 'failed');
        break;

      case 'reembolso_creado':
        await repositorioPagos.actualizarEstadoPago(orden.id, 'refunded');
        await repositorioOrdenes.actualizarEstado(orden.id, 'refunded');
        break;

      default:
        loggerPagos.info('Evento webhook sin acción definida', {
          orden_id: orden.id,
          datos: { tipo: evento.tipo },
        });
    }

    return { procesado: true, orden_id: orden.id };
  },
};
