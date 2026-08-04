/**
 * Street Candy — Proveedor Stripe
 * Implementación concreta de ProveedorPago usando Stripe.
 * El checkout NUNCA importa este archivo directamente — siempre usa ProveedorPago.
 */

import Stripe from 'stripe';
import type {
  ProveedorPago,
  InputIntencionPago,
  ResultadoIntencionPago,
  ResultadoConfirmacionPago,
  InputReembolso,
  ResultadoReembolso,
  EstadoPagoExterno,
  EventoWebhook,
  TipoEventoWebhook,
} from '../types';
import { loggerPagos } from '../logger';
import {
  montoAStripe,
  montoDesdeStripe,
  mapearEstadoStripeAExterno,
  conRetry,
} from '../utils';

// ============================================================
// CLIENTE STRIPE (LAZY)
// ============================================================

let _stripe: Stripe | null = null;

function obtenerStripe(): Stripe {
  if (!_stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY no está configurada');
    }
    _stripe = new Stripe(apiKey, {
      apiVersion: '2025-06-30.basil',
      typescript: true,
    });
  }
  return _stripe;
}

// ============================================================
// MÉTODOS SOPORTADOS POR PAÍS
// ============================================================

const METODOS_POR_PAIS: Record<string, string[]> = {
  CO: ['card'],
  CR: ['card'],
};

// ============================================================
// IMPLEMENTACIÓN DEL PROVEEDOR STRIPE
// ============================================================

export class ProveedorStripe implements ProveedorPago {
  readonly nombre = 'stripe';

  metodosSoportados(codigoPais: string): string[] {
    return METODOS_POR_PAIS[codigoPais.toUpperCase()] ?? ['card'];
  }

  async crearIntencionPago(input: InputIntencionPago): Promise<ResultadoIntencionPago> {
    loggerPagos.info('Creando intención de pago Stripe', {
      proveedor: this.nombre,
      orden_id: input.orden_id,
      datos: { monto: input.monto, moneda: input.moneda, pais: input.codigo_pais },
    });

    return conRetry(async () => {
      const stripe = obtenerStripe();
      const montoStripe = montoAStripe(input.monto, input.moneda);

      const intencion = await stripe.paymentIntents.create({
        amount: montoStripe,
        currency: input.moneda.toLowerCase(),
        payment_method_types: this.metodosSoportados(input.codigo_pais),
        description: input.descripcion ?? `Orden Street Candy ${input.orden_id}`,
        receipt_email: input.email_cliente,
        metadata: {
          orden_id: input.orden_id,
          codigo_pais: input.codigo_pais,
          nombre_cliente: input.nombre_cliente,
          ...input.metadata,
        },
        statement_descriptor_suffix: 'STREET CANDY',
      });

      loggerPagos.info('Intención de pago Stripe creada', {
        proveedor: this.nombre,
        orden_id: input.orden_id,
        referencia_proveedor: intencion.id,
        datos: { estado: intencion.status },
      });

      return {
        referencia_proveedor: intencion.id,
        client_secret: intencion.client_secret ?? undefined,
        estado: mapearEstadoStripeAExterno(intencion.status),
        datos_adicionales: { payment_intent_id: intencion.id },
      };
    });
  }

  async confirmarPago(referencia: string): Promise<ResultadoConfirmacionPago> {
    loggerPagos.info('Confirmando pago Stripe', {
      proveedor: this.nombre,
      referencia_proveedor: referencia,
    });

    const stripe = obtenerStripe();
    const intencion = await stripe.paymentIntents.retrieve(referencia);

    return {
      referencia_proveedor: intencion.id,
      estado: mapearEstadoStripeAExterno(intencion.status),
      monto_pagado: montoDesdeStripe(intencion.amount_received, intencion.currency),
      moneda: intencion.currency.toUpperCase(),
      metodo_pago_detalle: intencion.payment_method_types.join(', '),
    };
  }

  async cancelarIntencion(referencia: string, motivo?: string): Promise<void> {
    loggerPagos.info('Cancelando intención de pago Stripe', {
      proveedor: this.nombre,
      referencia_proveedor: referencia,
      datos: { motivo },
    });

    const stripe = obtenerStripe();
    await stripe.paymentIntents.cancel(referencia, {
      cancellation_reason: 'requested_by_customer',
    });
  }

  async procesarReembolso(input: InputReembolso): Promise<ResultadoReembolso> {
    loggerPagos.info('Procesando reembolso Stripe', {
      proveedor: this.nombre,
      referencia_proveedor: input.referencia_proveedor,
      datos: { monto: input.monto, motivo: input.motivo },
    });

    return conRetry(async () => {
      const stripe = obtenerStripe();

      // Obtener el PaymentIntent para encontrar el charge
      const intencion = await stripe.paymentIntents.retrieve(input.referencia_proveedor);
      const chargeId = intencion.latest_charge as string | null;

      if (!chargeId) {
        throw new Error('No se encontró cargo asociado al PaymentIntent');
      }

      const parametrosReembolso: Stripe.RefundCreateParams = {
        charge: chargeId,
        ...(input.monto !== undefined && {
          amount: montoAStripe(input.monto, intencion.currency),
        }),
        ...(input.motivo && { reason: input.motivo as Stripe.RefundCreateParams.Reason }),
        metadata: input.metadata ?? {},
      };

      const reembolso = await stripe.refunds.create(parametrosReembolso);

      loggerPagos.info('Reembolso Stripe procesado', {
        proveedor: this.nombre,
        referencia_proveedor: input.referencia_proveedor,
        datos: { reembolso_id: reembolso.id, estado: reembolso.status },
      });

      return {
        referencia_reembolso: reembolso.id,
        monto_reembolsado: montoDesdeStripe(reembolso.amount, reembolso.currency),
        moneda: reembolso.currency.toUpperCase(),
        estado: (reembolso.status as 'succeeded' | 'pending' | 'failed') ?? 'pending',
      };
    });
  }

  async verificarEstado(referencia: string): Promise<EstadoPagoExterno> {
    const stripe = obtenerStripe();
    const intencion = await stripe.paymentIntents.retrieve(referencia);
    return mapearEstadoStripeAExterno(intencion.status);
  }

  async procesarWebhook(payload: string, firma: string): Promise<EventoWebhook> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET no está configurada');
    }

    const stripe = obtenerStripe();
    let evento: Stripe.Event;

    try {
      evento = stripe.webhooks.constructEvent(payload, firma, webhookSecret);
    } catch (err) {
      loggerPagos.error('Firma de webhook Stripe inválida', {
        proveedor: this.nombre,
        datos: { error: String(err) },
      });
      throw new Error('Firma de webhook inválida');
    }

    loggerPagos.info('Webhook Stripe recibido', {
      proveedor: this.nombre,
      datos: { tipo: evento.type, id: evento.id },
    });

    return this._mapearEventoStripe(evento);
  }

  private _mapearEventoStripe(evento: Stripe.Event): EventoWebhook {
    const mapaEventos: Record<string, TipoEventoWebhook> = {
      'payment_intent.succeeded': 'pago_exitoso',
      'payment_intent.payment_failed': 'pago_fallido',
      'payment_intent.canceled': 'pago_cancelado',
      'charge.refunded': 'reembolso_creado',
      'charge.refund.updated': 'reembolso_fallido',
      'charge.dispute.created': 'disputa_creada',
    };

    const tipo: TipoEventoWebhook = mapaEventos[evento.type] ?? 'desconocido';
    const datos = evento.data.object as Record<string, unknown>;

    let referencia = '';
    let estado: EstadoPagoExterno = 'failed';
    let monto: number | undefined;
    let moneda: string | undefined;

    if (evento.type.startsWith('payment_intent')) {
      const pi = evento.data.object as Stripe.PaymentIntent;
      referencia = pi.id;
      estado = mapearEstadoStripeAExterno(pi.status);
      monto = montoDesdeStripe(pi.amount, pi.currency);
      moneda = pi.currency.toUpperCase();
    } else if (evento.type.startsWith('charge')) {
      const charge = evento.data.object as Stripe.Charge;
      referencia = charge.payment_intent as string ?? charge.id;
      estado = charge.paid ? 'succeeded' : 'failed';
      monto = montoDesdeStripe(charge.amount, charge.currency);
      moneda = charge.currency.toUpperCase();
    }

    return {
      tipo,
      referencia_proveedor: referencia,
      estado,
      monto,
      moneda,
      metadata: datos.metadata as Record<string, unknown> | undefined,
      datos_crudos: datos,
    };
  }
}

// Instancia singleton del proveedor Stripe
export const proveedorStripe = new ProveedorStripe();
