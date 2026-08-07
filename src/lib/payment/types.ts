/**
 * Street Candy — Módulo de Pagos
 * Tipos TypeScript para el módulo completo de pagos y checkout
 * Países: Colombia (CO) y Costa Rica (CR)
 * Proveedor activo: Stripe
 */

// ============================================================
// TIPOS BASE DE BASE DE DATOS
// ============================================================

export type EstadoPago = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type EstadoOrden =
  | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'driver_assigned' |'out_for_delivery' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type MetodoPago = 'card' | 'stripe' | 'pse' | 'nequi' | 'bancolombia' | 'sinpe_movil' | 'bank_transfer';

export interface DbOrden {
  id: string;
  order_number: string;
  profile_id: string | null;
  country_code: string;
  shipping_address_id: string | null;
  billing_address_id: string | null;
  status: EstadoOrden;
  payment_status: EstadoPago;
  payment_method: MetodoPago | null;
  payment_reference: string | null;
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  tax_amount: number;
  tax_rate_snapshot: number;
  total: number;
  currency_code: string;
  coupon_id: string | null;
  coupon_code_snapshot: string | null;
  notes: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  status_updated_at: string | null;
  estimated_delivery_time: string | null;
  status_history: StatusHistoryItem[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface StatusHistoryItem {
  status: string;
  timestamp: string;
  note?: string;
}

export interface DbItemOrden {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  sku_snapshot: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface DbDireccion {
  id: string;
  profile_id: string;
  label: string;
  full_name: string;
  phone: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state_province: string;
  postal_code: string | null;
  country_code: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// INTERFAZ PROVEEDOR DE PAGOS (ABSTRACCIÓN CENTRAL)
// ============================================================

/**
 * Interfaz genérica que todos los proveedores de pago deben implementar.
 * El checkout nunca depende directamente de Stripe ni de ningún proveedor concreto.
 * Para agregar un nuevo proveedor, basta con implementar esta interfaz.
 */
export interface ProveedorPago {
  /** Identificador único del proveedor */
  readonly nombre: string;

  /** Crea una intención de pago y retorna los datos necesarios para el cliente */
  crearIntencionPago(input: InputIntencionPago): Promise<ResultadoIntencionPago>;

  /** Confirma un pago ya procesado (usado en webhooks o polling) */
  confirmarPago(referencia: string): Promise<ResultadoConfirmacionPago>;

  /** Cancela una intención de pago pendiente */
  cancelarIntencion(referencia: string, motivo?: string): Promise<void>;

  /** Procesa un reembolso total o parcial */
  procesarReembolso(input: InputReembolso): Promise<ResultadoReembolso>;

  /** Verifica el estado actual de un pago */
  verificarEstado(referencia: string): Promise<EstadoPagoExterno>;

  /** Procesa un evento de webhook del proveedor */
  procesarWebhook(payload: string, firma: string): Promise<EventoWebhook>;

  /** Retorna los métodos de pago soportados por país */
  metodosSoportados(codigoPais: string): string[];
}

// ============================================================
// TIPOS DE INTENCIÓN DE PAGO
// ============================================================

export interface InputIntencionPago {
  orden_id: string;
  monto: number;
  moneda: string;
  codigo_pais: string;
  email_cliente: string;
  nombre_cliente: string;
  descripcion?: string;
  metadata?: Record<string, string>;
  metodo_pago?: string;
}

export interface ResultadoIntencionPago {
  referencia_proveedor: string;   // ID externo del proveedor (ej: pi_xxx en Stripe)
  client_secret?: string;         // Para Stripe Elements en el frontend
  url_redireccion?: string;       // Para proveedores con redirección (PSE, Nequi)
  estado: EstadoPagoExterno;
  datos_adicionales?: Record<string, unknown>;
}

export interface ResultadoConfirmacionPago {
  referencia_proveedor: string;
  estado: EstadoPagoExterno;
  monto_pagado: number;
  moneda: string;
  metodo_pago_detalle?: string;
  datos_adicionales?: Record<string, unknown>;
}

export interface InputReembolso {
  referencia_proveedor: string;
  monto?: number;           // Si no se especifica, reembolso total
  motivo?: MotivoReembolso;
  metadata?: Record<string, string>;
}

export interface ResultadoReembolso {
  referencia_reembolso: string;
  monto_reembolsado: number;
  moneda: string;
  estado: 'succeeded' | 'pending' | 'failed';
}

export type EstadoPagoExterno =
  | 'requires_payment_method' |'requires_confirmation' |'requires_action' |'processing' |'succeeded' |'canceled' |'failed';

export type MotivoReembolso =
  | 'duplicate' |'fraudulent' |'requested_by_customer' |'product_not_received' |'product_unacceptable';

export interface EventoWebhook {
  tipo: TipoEventoWebhook;
  referencia_proveedor: string;
  estado: EstadoPagoExterno;
  monto?: number;
  moneda?: string;
  metadata?: Record<string, unknown>;
  datos_crudos: Record<string, unknown>;
}

export type TipoEventoWebhook =
  | 'pago_exitoso' |'pago_fallido' |'pago_cancelado' |'reembolso_creado' |'reembolso_fallido' |'disputa_creada' |'desconocido';

// ============================================================
// CONFIGURACIÓN POR PAÍS
// ============================================================

export interface ConfiguracionPagoPais {
  codigo: string;
  nombre: string;
  moneda: string;
  simbolo_moneda: string;
  tasa_impuesto: number;
  costo_envio_base: number;
  costo_envio_por_kg: number;
  metodos_pago_activos: MetodoPago[];
}

export const CONFIGURACION_PAGO_PAISES: Record<string, ConfiguracionPagoPais> = {
  CO: {
    codigo: 'CO',
    nombre: 'Colombia',
    moneda: 'COP',
    simbolo_moneda: '$',
    tasa_impuesto: 0.19,
    costo_envio_base: 12000,
    costo_envio_por_kg: 3000,
    metodos_pago_activos: ['stripe', 'nequi', 'pse', 'bancolombia'],
  },
  CR: {
    codigo: 'CR',
    nombre: 'Costa Rica',
    moneda: 'CRC',
    simbolo_moneda: '₡',
    tasa_impuesto: 0.13,
    costo_envio_base: 3500,
    costo_envio_por_kg: 1500,
    metodos_pago_activos: ['stripe', 'sinpe_movil'],
  },
};

export const PAISES_PAGO_PERMITIDOS = ['CO', 'CR'] as const;
export type CodigoPaisPago = typeof PAISES_PAGO_PERMITIDOS[number];

// ============================================================
// TIPOS DE CHECKOUT
// ============================================================

export interface InputIniciarCheckout {
  carrito_id: string;
  codigo_pais: string;
  direccion_envio: InputDireccion;
  direccion_facturacion?: InputDireccion;
  notas?: string;
  metodo_pago?: string;
  metodo_entrega?: string;
  propina?: number;
  email_contacto?: string;
}

export interface InputDireccion {
  nombre_completo: string;
  telefono?: string;
  linea1: string;
  linea2?: string;
  ciudad: string;
  departamento_provincia: string;
  codigo_postal?: string;
  codigo_pais: string;
}

export interface ResultadoCheckout {
  orden_id: string;
  numero_orden: string;
  referencia_proveedor: string;
  monto_total: number;
  moneda: string;
  estado_pago: EstadoPagoExterno;
  datos_adicionales?: Record<string, unknown>;
}

export interface InputConfirmarPago {
  orden_id: string;
  referencia_proveedor: string;
}

// ============================================================
// TIPOS DE ORDEN
// ============================================================

export interface OrdenCompleta extends DbOrden {
  items: ItemOrdenCompleto[];
  direccion_envio?: DbDireccion | null;
  direccion_facturacion?: DbDireccion | null;
}

export interface ItemOrdenCompleto extends DbItemOrden {
  producto?: {
    id: string;
    nombre: string;
    slug: string;
    thumbnail_url: string | null;
  } | null;
}

export interface ResumenOrden {
  subtotal: number;
  descuento: number;
  envio: number;
  impuesto: number;
  total: number;
  moneda: string;
  simbolo_moneda: string;
}

// ============================================================
// TIPOS DE RESPUESTA API
// ============================================================

export interface RespuestaApiPago<T = unknown> {
  exito: boolean;
  datos?: T;
  error?: string;
  codigo?: string;
}

// ============================================================
// TIPOS DE LOGGING
// ============================================================

export interface LogPago {
  nivel: 'info' | 'warn' | 'error';
  mensaje: string;
  orden_id?: string;
  referencia_proveedor?: string;
  proveedor?: string;
  datos?: Record<string, unknown>;
  timestamp: string;
}
