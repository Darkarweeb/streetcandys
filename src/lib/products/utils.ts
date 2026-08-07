/**
 * Street Candy — Utilidades del Módulo de Productos
 * Helpers para paginación, filtros, ordenamiento y búsqueda
 */

import type {
  PaginationParams,
  ProductFilters,
  ProductSortField,
  PaginatedResult,
  InventoryStatus,
  ReviewsSummary,
  DbInventory,
} from './types';

// ============================================================
// CONSTANTES
// ============================================================

export const PRODUCTOS_POR_PAGINA_DEFAULT = 12;
export const PRODUCTOS_POR_PAGINA_MAX = 48;
export const DIAS_PRODUCTO_NUEVO = 30;
export const PAISES_PERMITIDOS = ['CO', 'CR'] as const;

// ============================================================
// PAGINACIÓN
// ============================================================

/**
 * Normaliza los parámetros de paginación con valores seguros
 */
export function normalizarPaginacion(params: PaginationParams): {
  pagina: number;
  porPagina: number;
  offset: number;
} {
  const pagina = Math.max(1, Math.floor(params.pagina ?? 1));
  const porPagina = Math.min(
    PRODUCTOS_POR_PAGINA_MAX,
    Math.max(1, Math.floor(params.por_pagina ?? PRODUCTOS_POR_PAGINA_DEFAULT)),
  );
  const offset = (pagina - 1) * porPagina;
  return { pagina, porPagina, offset };
}

/**
 * Construye el objeto de paginación para la respuesta
 */
export function construirPaginacion<T>(
  datos: T[],
  total: number,
  pagina: number,
  porPagina: number,
): PaginatedResult<T> {
  const totalPaginas = Math.ceil(total / porPagina);
  return {
    datos,
    paginacion: {
      pagina_actual: pagina,
      por_pagina: porPagina,
      total,
      total_paginas: totalPaginas,
      tiene_siguiente: pagina < totalPaginas,
      tiene_anterior: pagina > 1,
    },
  };
}

// ============================================================
// ORDENAMIENTO
// ============================================================

/**
 * Traduce el campo de ordenamiento a columna y dirección de Supabase
 */
export function resolverOrdenamiento(ordenar?: ProductSortField): {
  columna: string;
  ascendente: boolean;
} {
  switch (ordenar) {
    case 'precio_asc':
      return { columna: 'base_price', ascendente: true };
    case 'precio_desc':
      return { columna: 'base_price', ascendente: false };
    case 'mas_nuevo':
      return { columna: 'created_at', ascendente: false };
    case 'mejor_valorado':
      return { columna: 'sort_order', ascendente: true }; // se enriquece con avg rating en servicio
    case 'mas_vendido':
      return { columna: 'sort_order', ascendente: true }; // se enriquece con ventas en servicio
    case 'destacado':
      return { columna: 'is_featured', ascendente: false };
    case 'nombre':
    default:
      return { columna: 'name', ascendente: true };
  }
}

// ============================================================
// BÚSQUEDA
// ============================================================

/**
 * Sanitiza el texto de búsqueda para uso seguro en queries
 */
export function sanitizarBusqueda(texto: string): string {
  return texto
    .trim()
    .replace(/[%_\\]/g, '\\$&') // escapa caracteres especiales de LIKE
    .slice(0, 200); // límite de longitud
}

/**
 * Construye el patrón de búsqueda para ilike
 */
export function patronBusqueda(texto: string): string {
  return `%${sanitizarBusqueda(texto)}%`;
}

// ============================================================
// INVENTARIO
// ============================================================

/**
 * Calcula el estado de inventario de un producto
 */
export function calcularEstadoInventario(
  inventario: DbInventory | null | undefined,
): InventoryStatus {
  if (!inventario) {
    return {
      is_in_stock: false,
      available_quantity: 0,
      is_low_stock: false,
      allow_backorder: false,
    };
  }

  const disponible = Math.max(0, inventario.quantity - inventario.reserved_quantity);
  const enStock = disponible > 0 || inventario.allow_backorder;

  return {
    is_in_stock: enStock,
    available_quantity: disponible,
    is_low_stock: disponible > 0 && disponible <= inventario.low_stock_threshold,
    allow_backorder: inventario.allow_backorder,
  };
}

// ============================================================
// RESEÑAS
// ============================================================

/**
 * Calcula el resumen de reseñas desde un array de ratings
 */
export function calcularResumenResenas(
  resenas: Array<{ rating: number }>,
): ReviewsSummary {
  if (resenas.length === 0) {
    return {
      total_reviews: 0,
      average_rating: 0,
      rating_distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    };
  }

  const distribucion: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  let suma = 0;

  for (const r of resenas) {
    suma += r.rating;
    const key = String(r.rating);
    if (key in distribucion) {
      distribucion[key]++;
    }
  }

  return {
    total_reviews: resenas.length,
    average_rating: Math.round((suma / resenas.length) * 10) / 10,
    rating_distribution: distribucion,
  };
}

// ============================================================
// PRECIO CON IMPUESTO
// ============================================================

const TASAS_IMPUESTO: Record<string, number> = {
  CO: 0.19, // IVA Colombia 19%
  CR: 0.13, // IVA Costa Rica 13%
};

/**
 * Calcula el precio con impuesto según el país
 */
export function calcularPrecioConImpuesto(
  precio: number,
  codigoPais: string,
): { precio_sin_impuesto: number; impuesto: number; precio_total: number; tasa: number } {
  const tasa = TASAS_IMPUESTO[codigoPais] ?? 0;
  const impuesto = Math.round(precio * tasa * 100) / 100;
  return {
    precio_sin_impuesto: precio,
    impuesto,
    precio_total: Math.round((precio + impuesto) * 100) / 100,
    tasa,
  };
}

// ============================================================
// VALIDACIÓN DE FILTROS
// ============================================================

/**
 * Valida y normaliza los filtros de productos
 */
export function normalizarFiltros(filtros: ProductFilters): ProductFilters {
  const resultado: ProductFilters = {};

  if (filtros.categoria) resultado.categoria = filtros.categoria.trim().toLowerCase();
  if (filtros.categoria_id) resultado.categoria_id = filtros.categoria_id;
  if (filtros.busqueda) resultado.busqueda = filtros.busqueda.trim();

  if (filtros.precio_min !== undefined && filtros.precio_min >= 0) {
    resultado.precio_min = filtros.precio_min;
  }
  if (filtros.precio_max !== undefined && filtros.precio_max > 0) {
    resultado.precio_max = filtros.precio_max;
  }
  if (resultado.precio_min !== undefined && resultado.precio_max !== undefined) {
    if (resultado.precio_min > resultado.precio_max) {
      [resultado.precio_min, resultado.precio_max] = [resultado.precio_max, resultado.precio_min];
    }
  }

  // Normalize effects and tags to lowercase for consistent case-insensitive matching
  // DB stores effects/tags in lowercase (enforced by migration 20260809100000)
  if (Array.isArray(filtros.efectos) && filtros.efectos.length > 0) {
    resultado.efectos = filtros.efectos.map((e) => e.trim().toLowerCase()).filter(Boolean);
  }
  if (Array.isArray(filtros.etiquetas) && filtros.etiquetas.length > 0) {
    resultado.etiquetas = filtros.etiquetas.map((t) => t.trim().toLowerCase()).filter(Boolean);
  }

  if (filtros.intensidad_min !== undefined) {
    resultado.intensidad_min = Math.max(1, Math.min(5, filtros.intensidad_min));
  }
  if (filtros.intensidad_max !== undefined) {
    resultado.intensidad_max = Math.max(1, Math.min(5, filtros.intensidad_max));
  }

  if (filtros.en_stock !== undefined) resultado.en_stock = filtros.en_stock;
  if (filtros.destacado !== undefined) resultado.destacado = filtros.destacado;
  if (filtros.nuevo !== undefined) resultado.nuevo = filtros.nuevo;
  if (filtros.solo_con_precio_crc !== undefined) resultado.solo_con_precio_crc = filtros.solo_con_precio_crc;

  return resultado;
}
