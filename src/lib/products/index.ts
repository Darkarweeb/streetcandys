/**
 * Street Candy — Módulo de Productos
 * Barrel export para importaciones limpias
 *
 * Uso:
 *   import { productoServicio, categoriaServicio } from '@/lib/products';
 *   import type { ProductWithDetails, ProductFilters } from '@/lib/products';
 */

// Repositorios
export { productoRepositorio, varianteRepositorio, inventarioRepositorio } from './product-repository';
export { categoriaRepositorio } from './category-repository';
export { resenasRepositorio } from './reviews-repository';

// Servicios
export { productoServicio } from './product-service';
export { categoriaServicio } from './category-service';
export { resenasServicio } from './reviews-service';
export { inventarioServicio } from './inventory-service';

// Utilidades
export {
  normalizarPaginacion,
  construirPaginacion,
  resolverOrdenamiento,
  sanitizarBusqueda,
  patronBusqueda,
  calcularEstadoInventario,
  calcularResumenResenas,
  calcularPrecioConImpuesto,
  normalizarFiltros,
  PRODUCTOS_POR_PAGINA_DEFAULT,
  PRODUCTOS_POR_PAGINA_MAX,
  DIAS_PRODUCTO_NUEVO,
  PAISES_PERMITIDOS,
} from './utils';

// Tipos
export type {
  // Tipos de base de datos
  VariantType,
  DbCategory,
  DbProduct,
  DbProductVariant,
  DbInventory,
  DbReview,
  // Tipos de dominio
  ProductImage,
  CannabinoidProfile,
  TerpeneProfile,
  // Tipos de respuesta
  CategoryWithChildren,
  ProductVariantWithInventory,
  ProductWithDetails,
  ProductSummary,
  ReviewsSummary,
  InventoryStatus,
  // Tipos de parámetros
  ProductSortField,
  ProductFilters,
  PaginationParams,
  ProductQueryParams,
  PaginatedResult,
  // Tipos de entrada
  CreateProductInput,
  UpdateProductInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateReviewInput,
  // Tipos de API
  ApiResponse,
  ApiListResponse,
} from './types';
