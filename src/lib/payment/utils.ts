/**
 * Street Candy — Utilidades de Pagos
 * Funciones de validación, cálculo y retry para el módulo de pagos
 */

import type {
  ConfiguracionPagoPais,
  InputDireccion,
  InputIniciarCheckout,
  InputIntencionPago,
} from './types';
import { CONFIGURACION_PAGO_PAISES, PAISES_PAGO_PERMITIDOS } from './types';

// ============================================================
// CONFIGURACIÓN POR PAÍS
// ============================================================

export function obtenerConfigPais(codigoPais: string): ConfiguracionPagoPais {
  const config = CONFIGURACION_PAGO_PAISES[codigoPais.toUpperCase()];
  if (!config) {
    throw new Error(`País no soportado para pagos: ${codigoPais}`);
  }
  return config;
}

export function esPaisPermitido(codigoPais: string): boolean {
  return PAISES_PAGO_PERMITIDOS.includes(codigoPais.toUpperCase() as 'CO' | 'CR');
}

// ============================================================
// CÁLCULOS FINANCIEROS
// ============================================================

export function calcularImpuesto(subtotal: number, tasaImpuesto: number): number {
  return Math.round(subtotal * tasaImpuesto * 100) / 100;
}

export function calcularEnvio(
  pesoGramos: number,
  codigoPais: string,
  subtotal: number,
): number {
  const config = obtenerConfigPais(codigoPais);
  if (subtotal >= config.envio_gratis_desde) return 0;
  const pesoKg = pesoGramos / 1000;
  return config.costo_envio_base + pesoKg * config.costo_envio_por_kg;
}

export function calcularTotal(
  subtotal: number,
  descuento: number,
  envio: number,
  impuesto: number,
): number {
  return Math.max(0, subtotal - descuento + envio + impuesto);
}

// ============================================================
// GENERACIÓN DE NÚMERO DE ORDEN
// ============================================================

export function generarNumeroOrden(codigoPais: string): string {
  const prefijo = codigoPais === 'CO' ? 'SC-CO' : 'SC-CR';
  const timestamp = Date.now().toString(36).toUpperCase();
  const aleatorio = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefijo}-${timestamp}-${aleatorio}`;
}

// ============================================================
// VALIDACIÓN
// ============================================================

export function validarInputCheckout(input: InputIniciarCheckout): string[] {
  const errores: string[] = [];

  if (!input.carrito_id) errores.push('carrito_id es requerido');
  if (!input.codigo_pais) errores.push('codigo_pais es requerido');
  if (!esPaisPermitido(input.codigo_pais)) {
    errores.push(`País no soportado: ${input.codigo_pais}. Solo CO y CR.`);
  }

  const erroresDireccion = validarDireccion(input.direccion_envio, 'envío');
  errores.push(...erroresDireccion);

  if (input.direccion_facturacion) {
    const erroresFact = validarDireccion(input.direccion_facturacion, 'facturación');
    errores.push(...erroresFact);
  }

  return errores;
}

export function validarDireccion(dir: InputDireccion, tipo: string): string[] {
  const errores: string[] = [];
  if (!dir.nombre_completo?.trim()) errores.push(`Nombre completo de dirección de ${tipo} es requerido`);
  if (!dir.linea1?.trim()) errores.push(`Línea 1 de dirección de ${tipo} es requerida`);
  if (!dir.ciudad?.trim()) errores.push(`Ciudad de dirección de ${tipo} es requerida`);
  if (!dir.departamento_provincia?.trim()) errores.push(`Departamento/Provincia de ${tipo} es requerido`);
  if (!dir.codigo_pais?.trim()) errores.push(`Código de país de dirección de ${tipo} es requerido`);
  return errores;
}

export function validarInputIntencionPago(input: InputIntencionPago): string[] {
  const errores: string[] = [];
  if (!input.orden_id) errores.push('orden_id es requerido');
  if (!input.monto || input.monto <= 0) errores.push('monto debe ser mayor a 0');
  if (!input.moneda) errores.push('moneda es requerida');
  if (!input.codigo_pais) errores.push('codigo_pais es requerido');
  if (!input.email_cliente) errores.push('email_cliente es requerido');
  if (!input.nombre_cliente) errores.push('nombre_cliente es requerido');
  return errores;
}

// ============================================================
// RETRY CON BACKOFF EXPONENCIAL
// ============================================================

export interface OpcionesRetry {
  intentos_max: number;
  delay_inicial_ms: number;
  factor_backoff: number;
  errores_reintentables?: string[];
}

const OPCIONES_RETRY_DEFAULT: OpcionesRetry = {
  intentos_max: 3,
  delay_inicial_ms: 500,
  factor_backoff: 2,
  errores_reintentables: ['rate_limit_error', 'api_connection_error', 'api_error'],
};

export async function conRetry<T>(
  operacion: () => Promise<T>,
  opciones: Partial<OpcionesRetry> = {},
): Promise<T> {
  const config = { ...OPCIONES_RETRY_DEFAULT, ...opciones };
  let ultimoError: Error | null = null;

  for (let intento = 1; intento <= config.intentos_max; intento++) {
    try {
      return await operacion();
    } catch (error) {
      ultimoError = error as Error;
      const esReintentable = esErrorReintentable(error, config.errores_reintentables);

      if (!esReintentable || intento === config.intentos_max) {
        throw error;
      }

      const delay = config.delay_inicial_ms * Math.pow(config.factor_backoff, intento - 1);
      await esperar(delay);
    }
  }

  throw ultimoError;
}

function esErrorReintentable(error: unknown, tiposReintentables?: string[]): boolean {
  if (!tiposReintentables || tiposReintentables.length === 0) return true;
  if (error && typeof error === 'object' && 'type' in error) {
    return tiposReintentables.includes((error as { type: string }).type);
  }
  return false;
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// MAPEO DE ESTADOS
// ============================================================

/**
 * Convierte un estado externo del proveedor al estado interno de pago.
 * Funciona con cualquier proveedor que use EstadoPagoExterno.
 */
export function mapearEstadoExternoAInterno(
  estadoExterno: string,
): import('./types').EstadoPago {
  const mapa: Record<string, import('./types').EstadoPago> = {
    succeeded: 'paid',
    canceled: 'failed',
    requires_payment_method: 'pending',
    requires_confirmation: 'pending',
    requires_action: 'pending',
    processing: 'pending',
    failed: 'failed',
  };
  return mapa[estadoExterno] ?? 'pending';
}

/**
 * @deprecated Use mapearEstadoExternoAInterno instead.
 * Kept for backward compatibility.
 */
export function mapearEstadoStripeAInterno(
  estadoExterno: string,
): import('./types').EstadoPago {
  return mapearEstadoExternoAInterno(estadoExterno);
}

export function mapearEstadoStripeAExterno(
  estadoExterno: string,
): import('./types').EstadoPagoExterno {
  const validos = [
    'requires_payment_method',
    'requires_confirmation',
    'requires_action',
    'processing',
    'succeeded',
    'canceled',
    'failed',
  ];
  if (validos.includes(estadoExterno)) {
    return estadoExterno as import('./types').EstadoPagoExterno;
  }
  return 'failed';
}

function montoAStripe(...args: any[]): any {
  // eslint-disable-next-line no-console
  console.warn('Placeholder: montoAStripe is not implemented yet.', args);
  return null;
}

export { montoAStripe };
function montoDesdeStripe(...args: any[]): any {
  // eslint-disable-next-line no-console
  console.warn('Placeholder: montoDesdeStripe is not implemented yet.', args);
  return null;
}

export { montoDesdeStripe };