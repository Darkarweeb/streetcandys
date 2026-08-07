/**
 * Street Candy — Utilidades del Módulo de Carrito
 * Helpers para impuestos, envío, cupones, recompensas y localStorage
 */

import type {
  ConfiguracionPais,
  ResumenCarrito,
  ItemCarrito,
  CuponAplicado,
  InfoRecompensas,
  EstimacionEnvio,
  EstimacionImpuesto,
  ItemLocalStorage,
} from './types';
import {
  CONFIGURACION_PAISES,
  CARRITO_CONSTANTES,
  PAISES_PERMITIDOS_CARRITO,
} from './types';

// ============================================================
// CONFIGURACIÓN DE PAÍS
// ============================================================

/**
 * Obtiene la configuración de un país permitido
 */
export function obtenerConfigPais(codigoPais: string): ConfiguracionPais {
  const config = CONFIGURACION_PAISES[codigoPais];
  if (!config) {
    throw new Error(`País no soportado: ${codigoPais}. Solo Colombia (CO) y Costa Rica (CR).`);
  }
  return config;
}

/**
 * Valida que el código de país sea permitido
 */
export function validarPais(codigoPais: string): boolean {
  return PAISES_PERMITIDOS_CARRITO.includes(codigoPais as 'CO' | 'CR');
}

// ============================================================
// CÁLCULO DE IMPUESTO
// ============================================================

/**
 * Calcula el impuesto sobre un subtotal dado el país
 */
export function calcularImpuesto(
  subtotal: number,
  codigoPais: string,
): EstimacionImpuesto {
  const config = obtenerConfigPais(codigoPais);
  const montoImpuesto = Math.round(subtotal * config.tasa_impuesto * 100) / 100;

  return {
    subtotal,
    tasa_impuesto: config.tasa_impuesto,
    monto_impuesto: montoImpuesto,
    total_con_impuesto: Math.round((subtotal + montoImpuesto) * 100) / 100,
    moneda: config.moneda,
    pais: config.nombre,
  };
}

// ============================================================
// CÁLCULO DE ENVÍO
// ============================================================

/**
 * Estima el costo de envío según país y peso
 */
export function estimarEnvio(
  codigoPais: string,
  subtotal: number,
  pesoTotalGramos: number = 0,
): EstimacionEnvio {
  const config = obtenerConfigPais(codigoPais);
  const envioGratis = subtotal >= config.envio_gratis_desde;

  let costoEnvio = 0;
  if (!envioGratis) {
    const pesoKg = pesoTotalGramos / 1000;
    costoEnvio = config.costo_envio_base + pesoKg * config.costo_envio_por_kg;
    costoEnvio = Math.round(costoEnvio);
  }

  const tiempoEstimado = codigoPais === 'CO' ?'3-5 días hábiles' :'5-7 días hábiles';

  return {
    codigo_pais: codigoPais,
    costo_envio: costoEnvio,
    envio_gratis: envioGratis,
    monto_para_envio_gratis: Math.max(0, config.envio_gratis_desde - subtotal),
    moneda: config.moneda,
    simbolo_moneda: config.simbolo_moneda,
    tiempo_estimado: tiempoEstimado,
  };
}

// ============================================================
// CÁLCULO DE DESCUENTO POR CUPÓN
// ============================================================

/**
 * Calcula el descuento aplicado por un cupón
 */
export function calcularDescuentoCupon(
  subtotal: number,
  cupon: {
    discount_type: 'percentage' | 'fixed' | 'shipping';
    discount_value: number;
    minimum_order_amount: number;
    maximum_discount: number | null;
  },
): number {
  if (subtotal < Number(cupon.minimum_order_amount)) return 0;

  // 'shipping' type waives shipping cost — no subtotal discount
  if (cupon.discount_type === 'shipping') return 0;

  let descuento = 0;
  if (cupon.discount_type === 'percentage') {
    descuento = Math.round(subtotal * (cupon.discount_value / 100) * 100) / 100;
  } else {
    descuento = cupon.discount_value;
  }

  // Aplicar límite máximo de descuento
  if (cupon.maximum_discount !== null) {
    descuento = Math.min(descuento, cupon.maximum_discount);
  }

  // El descuento no puede superar el subtotal
  return Math.min(descuento, subtotal);
}

// ============================================================
// CÁLCULO DE RECOMPENSAS
// ============================================================

/**
 * Calcula el descuento por puntos de recompensa
 */
export function calcularDescuentoRecompensas(
  subtotal: number,
  puntosAUsar: number,
  puntosDisponibles: number,
  codigoPais: string,
): { descuento: number; puntosUsados: number } {
  if (puntosAUsar <= 0 || puntosDisponibles <= 0) {
    return { descuento: 0, puntosUsados: 0 };
  }

  const puntosEfectivos = Math.min(puntosAUsar, puntosDisponibles);
  const valorPunto = codigoPais === 'CO'
    ? CARRITO_CONSTANTES.VALOR_PUNTO_COP
    : CARRITO_CONSTANTES.VALOR_PUNTO_CRC;

  const descuentoBruto = puntosEfectivos * valorPunto;
  const maxDescuento = Math.round(subtotal * CARRITO_CONSTANTES.MAX_PUNTOS_PORCENTAJE * 100) / 100;
  let descuento = Math.min(descuentoBruto, maxDescuento);
  const puntosUsados = Math.ceil(descuento / valorPunto);

  return {
    descuento: Math.round(descuento * 100) / 100,
    puntosUsados,
  };
}

/**
 * Calcula los puntos que se ganarán con una compra
 */
export function calcularPuntosGanados(total: number, codigoPais: string): number {
  const divisor = codigoPais === 'CO'
    ? CARRITO_CONSTANTES.PUNTOS_POR_PESO_COP
    : CARRITO_CONSTANTES.PUNTOS_POR_PESO_CRC;
  return Math.floor(total / divisor);
}

// ============================================================
// CONSTRUCCIÓN DEL RESUMEN DEL CARRITO
// ============================================================

/**
 * Construye el resumen completo del carrito
 */
export function construirResumenCarrito(
  items: ItemCarrito[],
  codigoPais: string,
  cuponAplicado: CuponAplicado | null,
  infoRecompensas: InfoRecompensas | null,
): ResumenCarrito {
  const config = obtenerConfigPais(codigoPais);

  // Subtotal
  const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0);
  const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);
  const pesoTotal = items.reduce((acc, item) => {
    const peso = item.producto?.peso_gramos ?? 0;
    return acc + peso * item.cantidad;
  }, 0);

  // Descuentos
  const descuentoCupon = cuponAplicado?.descuento_calculado ?? 0;
  const descuentoRecompensas = infoRecompensas?.descuento_recompensas ?? 0;
  const subtotalConDescuentos = Math.max(0, subtotal - descuentoCupon - descuentoRecompensas);

  // Envío — forzar gratis si el cupón es de tipo 'shipping'
  const cuponEsEnvioGratis = cuponAplicado?.tipo_descuento === 'shipping';
  const envioInfo = cuponEsEnvioGratis
    ? { ...estimarEnvio(codigoPais, subtotalConDescuentos, pesoTotal), costo_envio: 0, envio_gratis: true }
    : estimarEnvio(codigoPais, subtotalConDescuentos, pesoTotal);

  // Impuesto (sobre subtotal con descuentos + envío)
  const baseImpuesto = subtotalConDescuentos + envioInfo.costo_envio;
  const impuesto = Math.round(baseImpuesto * config.tasa_impuesto * 100) / 100;

  // Total
  const total = Math.round((baseImpuesto + impuesto) * 100) / 100;

  return {
    total_items: totalItems,
    subtotal,
    descuento_cupon: descuentoCupon,
    descuento_recompensas: descuentoRecompensas,
    costo_envio: envioInfo.costo_envio,
    impuesto,
    tasa_impuesto: config.tasa_impuesto,
    total,
    moneda: config.moneda,
    simbolo_moneda: config.simbolo_moneda,
    envio_gratis: envioInfo.envio_gratis,
    peso_total_gramos: pesoTotal,
  };
}

// ============================================================
// VALIDACIÓN DE CUPÓN
// ============================================================

/**
 * Valida si un cupón es aplicable al carrito
 */
export function validarCupon(
  cupon: {
    is_active: boolean;
    starts_at: string;
    expires_at: string | null;
    country_code: string | null;
    minimum_order_amount: number;
    usage_limit: number | null;
    usage_count: number;
  },
  subtotal: number,
  codigoPais: string,
): { valido: boolean; motivo?: string } {
  if (!cupon.is_active) {
    return { valido: false, motivo: 'El cupón no está activo.' };
  }

  const ahora = new Date();
  if (new Date(cupon.starts_at) > ahora) {
    return { valido: false, motivo: 'El cupón aún no está vigente.' };
  }

  if (cupon.expires_at && new Date(cupon.expires_at) < ahora) {
    return { valido: false, motivo: 'El cupón ha expirado.' };
  }

  if (cupon.country_code && cupon.country_code !== codigoPais) {
    return { valido: false, motivo: 'El cupón no está disponible en tu país.' };
  }

  // Coerce to number — Supabase NUMERIC(10,2) can arrive as a string in some environments
  const montoMinimo = Number(cupon.minimum_order_amount) || 0;
  if (subtotal < montoMinimo) {
    const simbolo = codigoPais === 'CR' ? '₡' : '$';
    const montoFormateado = `${simbolo}${Math.round(montoMinimo).toLocaleString('es-CO')}`;
    return {
      valido: false,
      motivo: `El pedido mínimo para este cupón es ${montoFormateado}.`,
    };
  }

  if (cupon.usage_limit !== null && cupon.usage_count >= cupon.usage_limit) {
    return { valido: false, motivo: 'El cupón ha alcanzado su límite de uso.' };
  }

  return { valido: true };
}

// ============================================================
// LOCAL STORAGE (solo cliente)
// ============================================================

/**
 * Lee el carrito del localStorage (solo en cliente)
 */
export function leerCarritoLocalStorage(): ItemLocalStorage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CARRITO_CONSTANTES.LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ItemLocalStorage =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.producto_id === 'string' &&
        typeof item.cantidad === 'number' &&
        item.cantidad > 0,
    );
  } catch {
    return [];
  }
}

/**
 * Guarda el carrito en localStorage (solo en cliente)
 */
export function guardarCarritoLocalStorage(items: ItemLocalStorage[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      CARRITO_CONSTANTES.LOCAL_STORAGE_KEY,
      JSON.stringify(items),
    );
  } catch {
    // localStorage puede estar lleno o bloqueado
  }
}

/**
 * Limpia el carrito del localStorage
 */
export function limpiarCarritoLocalStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CARRITO_CONSTANTES.LOCAL_STORAGE_KEY);
  } catch {
    // silencioso
  }
}

/**
 * Lee el país guardado en localStorage
 */
export function leerPaisLocalStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(CARRITO_CONSTANTES.LOCAL_STORAGE_PAIS_KEY);
  } catch {
    return null;
  }
}

/**
 * Guarda el país en localStorage
 */
export function guardarPaisLocalStorage(codigoPais: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CARRITO_CONSTANTES.LOCAL_STORAGE_PAIS_KEY, codigoPais);
  } catch {
    // silencioso
  }
}

// ============================================================
// GENERACIÓN DE SESSION ID PARA INVITADOS
// ============================================================

/**
 * Genera un ID de sesión único para carritos de invitados
 */
export function generarSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${CARRITO_CONSTANTES.SESSION_ID_PREFIX}${timestamp}_${random}`;
}

/**
 * Normaliza la cantidad de un ítem dentro de los límites permitidos
 */
export function normalizarCantidad(cantidad: number): number {
  return Math.max(1, Math.min(CARRITO_CONSTANTES.MAX_CANTIDAD_POR_ITEM, Math.floor(cantidad)));
}

/**
 * Mensaje de error legible
 */
export function mensajeErrorCarrito(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Error inesperado en el carrito.';
}
