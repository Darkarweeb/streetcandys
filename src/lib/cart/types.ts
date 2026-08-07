/**
 * Street Candy — Módulo de Carrito
 * Tipos TypeScript para el módulo completo de carrito
 * Países: Colombia (CO) y Costa Rica (CR)
 */

// ============================================================
// TIPOS BASE DE BASE DE DATOS
// ============================================================

export interface DbCart {
  id: string;
  profile_id: string | null;
  session_id: string | null;
  country_code: string | null;
  coupon_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbCartItem {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
}

export interface DbCoupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed' | 'shipping';
  discount_value: number;
  minimum_order_amount: number;
  maximum_discount: number | null;
  usage_limit: number | null;
  usage_count: number;
  per_user_limit: number;
  country_code: string | null;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbRewards {
  id: string;
  profile_id: string;
  points_balance: number;
  points_lifetime: number;
  tier: 'crew' | 'og' | 'legend' | 'icon';
  tier_updated_at: string;
  referral_code: string | null;
  referral_count: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// TIPOS DE DOMINIO DEL CARRITO
// ============================================================

export interface ItemCarrito {
  id: string;
  carrito_id: string;
  producto_id: string;
  variante_id: string | null;
  cantidad: number;
  precio_unitario: number;
  // Datos enriquecidos del producto
  producto?: ProductoResumenCarrito;
  variante?: VarianteResumenCarrito;
  subtotal: number;
  disponible: boolean;
  stock_disponible: number;
  created_at: string;
  updated_at: string;
}

export interface ProductoResumenCarrito {
  id: string;
  nombre: string;
  slug: string;
  thumbnail_url: string | null;
  is_active: boolean;
  requires_age_verification: boolean;
  peso_gramos: number | null;
}

export interface VarianteResumenCarrito {
  id: string;
  nombre: string;
  valor: string;
  tipo: string;
}

export interface CarritoCompleto {
  id: string;
  profile_id: string | null;
  session_id: string | null;
  codigo_pais: string | null;
  items: ItemCarrito[];
  cupon: CuponAplicado | null;
  resumen: ResumenCarrito;
  recompensas: InfoRecompensas | null;
  created_at: string;
  updated_at: string;
}

export interface ResumenCarrito {
  total_items: number;
  subtotal: number;
  descuento_cupon: number;
  descuento_recompensas: number;
  costo_envio: number;
  impuesto: number;
  tasa_impuesto: number;
  total: number;
  moneda: string;
  simbolo_moneda: string;
  envio_gratis: boolean;
  peso_total_gramos: number;
}

export interface CuponAplicado {
  id: string;
  codigo: string;
  descripcion: string | null;
    tipo_descuento: 'percentage' | 'fixed' | 'shipping';
  valor_descuento: number;
  descuento_calculado: number;
}

export interface InfoRecompensas {
  puntos_disponibles: number;
  puntos_a_usar: number;
  descuento_recompensas: number;
  tier: string;
}

// ============================================================
// CONFIGURACIÓN POR PAÍS
// ============================================================

export interface ConfiguracionPais {
  codigo: string;
  nombre: string;
  moneda: string;
  simbolo_moneda: string;
  tasa_impuesto: number;
  envio_gratis_desde: number;
  costo_envio_base: number;
  costo_envio_por_kg: number;
  metodos_pago: string[];
}

export const CONFIGURACION_PAISES: Record<string, ConfiguracionPais> = {
  CO: {
    codigo: 'CO',
    nombre: 'Colombia',
    moneda: 'COP',
    simbolo_moneda: '$',
    tasa_impuesto: 0.19,
    envio_gratis_desde: 350000,
    costo_envio_base: 12000,
    costo_envio_por_kg: 3000,
    metodos_pago: ['pse', 'nequi', 'bancolombia', 'stripe'],
  },
  CR: {
    codigo: 'CR',
    nombre: 'Costa Rica',
    moneda: 'CRC',
    simbolo_moneda: '₡',
    tasa_impuesto: 0.13,
    envio_gratis_desde: 75000,
    costo_envio_base: 3500,
    costo_envio_por_kg: 1500,
    metodos_pago: ['sinpe_movil', 'stripe'],
  },
};

export const PAISES_PERMITIDOS_CARRITO = ['CO', 'CR'] as const;
export type CodigoPaisCarrito = typeof PAISES_PERMITIDOS_CARRITO[number];

// ============================================================
// PARÁMETROS DE ENTRADA
// ============================================================

export interface AgregarItemInput {
  producto_id: string;
  variante_id?: string;
  cantidad: number;
}

export interface ActualizarItemInput {
  item_id: string;
  cantidad: number;
}

export interface AplicarCuponInput {
  codigo: string;
}

export interface AplicarRecompensasInput {
  puntos_a_usar: number;
}

export interface EstimacionEnvioInput {
  codigo_pais: string;
  peso_total_gramos?: number;
}

export interface SincronizarCarritoInput {
  items_locales: ItemLocalStorage[];
  codigo_pais?: string;
}

export interface ItemLocalStorage {
  producto_id: string;
  variante_id?: string | null;
  cantidad: number;
  precio_unitario?: number;
}

// ============================================================
// RESPUESTAS DE API
// ============================================================

export interface RespuestaApi<T = unknown> {
  exito: boolean;
  datos?: T;
  error?: string;
  codigo?: string;
}

export interface EstimacionEnvio {
  codigo_pais: string;
  costo_envio: number;
  envio_gratis: boolean;
  monto_para_envio_gratis: number;
  moneda: string;
  simbolo_moneda: string;
  tiempo_estimado: string;
}

export interface EstimacionImpuesto {
  subtotal: number;
  tasa_impuesto: number;
  monto_impuesto: number;
  total_con_impuesto: number;
  moneda: string;
  pais: string;
}

export interface ValidacionInventario {
  valido: boolean;
  items_invalidos: ItemInvalido[];
}

export interface ItemInvalido {
  item_id: string;
  producto_id: string;
  variante_id: string | null;
  cantidad_solicitada: number;
  cantidad_disponible: number;
  motivo: string;
}

// ============================================================
// CONSTANTES DEL CARRITO
// ============================================================

export const CARRITO_CONSTANTES = {
  MAX_ITEMS: 50,
  MAX_CANTIDAD_POR_ITEM: 20,
  PUNTOS_POR_PESO_COP: 100,    // 1 punto por cada 100 COP
  PUNTOS_POR_PESO_CRC: 50,     // 1 punto por cada 50 CRC
  VALOR_PUNTO_COP: 10,         // 1 punto = 10 COP de descuento
  VALOR_PUNTO_CRC: 5,          // 1 punto = 5 CRC de descuento
  MAX_PUNTOS_PORCENTAJE: 0.20, // máx 20% del total con puntos
  SESSION_ID_PREFIX: 'sc_guest_',
  LOCAL_STORAGE_KEY: 'street_candy_carrito',
  LOCAL_STORAGE_PAIS_KEY: 'street_candy_pais',
} as const;
