/**
 * Street Candy — Proveedor de Pago Manual
 * Proveedor genérico que registra la intención de pago localmente.
 * No depende de ningún servicio externo.
 * Úsalo como base para integrar cualquier pasarela de pago por país.
 */

import type {
  ProveedorPago,
  InputIntencionPago,
  ResultadoIntencionPago,
  ResultadoConfirmacionPago,
  InputReembolso,
  ResultadoReembolso,
  EstadoPagoExterno,
  EventoWebhook,
} from '../types';
import { loggerPagos } from '../logger';

// ============================================================
// MÉTODOS SOPORTADOS POR PAÍS
// ============================================================

const METODOS_POR_PAIS: Record<string, string[]> = {
  CO: ['card', 'nequi', 'pse', 'bancolombia'],
  CR: ['card', 'sinpe_movil'],
};

// ============================================================
// IMPLEMENTACIÓN DEL PROVEEDOR MANUAL
// ============================================================

export class ProveedorManual implements ProveedorPago {
  readonly nombre = 'manual';

  metodosSoportados(codigoPais: string): string[] {
    return METODOS_POR_PAIS[codigoPais.toUpperCase()] ?? ['card'];
  }

  async crearIntencionPago(input: InputIntencionPago): Promise<ResultadoIntencionPago> {
    loggerPagos.info('Creando intención de pago manual', {
      proveedor: this.nombre,
      orden_id: input.orden_id,
      datos: { monto: input.monto, moneda: input.moneda, pais: input.codigo_pais },
    });

    // Genera una referencia local única para rastrear el pago
    const referencia = `MANUAL-${input.orden_id}-${Date.now()}`;

    loggerPagos.info('Intención de pago manual creada', {
      proveedor: this.nombre,
      orden_id: input.orden_id,
      referencia_proveedor: referencia,
    });

    return {
      referencia_proveedor: referencia,
      estado: 'requires_payment_method',
      datos_adicionales: {
        metodo_pago: input.metodo_pago ?? 'card',
        instrucciones: 'Pago pendiente de confirmación manual.',
      },
    };
  }

  async confirmarPago(referencia: string): Promise<ResultadoConfirmacionPago> {
    loggerPagos.info('Confirmando pago manual', {
      proveedor: this.nombre,
      referencia_proveedor: referencia,
    });

    // En un proveedor real, aquí se consultaría la API externa.
    // El proveedor manual marca el pago como exitoso al confirmar.
    return {
      referencia_proveedor: referencia,
      estado: 'succeeded',
      monto_pagado: 0, // El monto real se obtiene de la orden en BD
      moneda: '',
      metodo_pago_detalle: 'manual',
    };
  }

  async cancelarIntencion(referencia: string, motivo?: string): Promise<void> {
    loggerPagos.info('Cancelando intención de pago manual', {
      proveedor: this.nombre,
      referencia_proveedor: referencia,
      datos: { motivo },
    });
    // No hay llamada externa — solo se registra en BD vía payment-service
  }

  async procesarReembolso(input: InputReembolso): Promise<ResultadoReembolso> {
    loggerPagos.info('Procesando reembolso manual', {
      proveedor: this.nombre,
      referencia_proveedor: input.referencia_proveedor,
      datos: { monto: input.monto, motivo: input.motivo },
    });

    const referenciaReembolso = `REFUND-${input.referencia_proveedor}-${Date.now()}`;

    return {
      referencia_reembolso: referenciaReembolso,
      monto_reembolsado: input.monto ?? 0,
      moneda: '',
      estado: 'succeeded',
    };
  }

  async verificarEstado(referencia: string): Promise<EstadoPagoExterno> {
    loggerPagos.info('Verificando estado de pago manual', {
      proveedor: this.nombre,
      referencia_proveedor: referencia,
    });
    // El estado real se obtiene de la BD — aquí se retorna processing como fallback
    return 'processing';
  }

  async procesarWebhook(payload: string, firma: string): Promise<EventoWebhook> {
    loggerPagos.info('Procesando webhook manual', {
      proveedor: this.nombre,
      datos: { firma_presente: !!firma },
    });

    let datos: Record<string, unknown> = {};
    try {
      datos = JSON.parse(payload);
    } catch {
      throw new Error('Payload de webhook inválido — se esperaba JSON');
    }

    const tipo = (datos.tipo as string) ?? 'desconocido';
    const referencia = (datos.referencia_proveedor as string) ?? '';

    const mapaEventos: Record<string, import('../types').TipoEventoWebhook> = {
      pago_exitoso: 'pago_exitoso',
      pago_fallido: 'pago_fallido',
      pago_cancelado: 'pago_cancelado',
      reembolso_creado: 'reembolso_creado',
    };

    return {
      tipo: mapaEventos[tipo] ?? 'desconocido',
      referencia_proveedor: referencia,
      estado: (datos.estado as import('../types').EstadoPagoExterno) ?? 'processing',
      monto: datos.monto as number | undefined,
      moneda: datos.moneda as string | undefined,
      metadata: datos.metadata as Record<string, unknown> | undefined,
      datos_crudos: datos,
    };
  }
}

export const proveedorManual = new ProveedorManual();
