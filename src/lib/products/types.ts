/**
 * Street Candy — Módulo de Productos
 * Tipos TypeScript para el módulo completo de productos
 */

// ============================================================
// TIPOS BASE DE BASE DE DATOS
// ============================================================

export type VariantType = 'size' | 'flavor' | 'strength' | 'format';

export interface DbCategory {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  icon_name: string | null;
  meta_title: string | null;
  meta_description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbProduct {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  ingredients: string | null;
  usage_instructions: string | null;
  origin_country: string;
  brand: string | null;
  sku: string | null;
  base_price: number;
  compare_at_price: number | null;
  price_crc: number | null;
  price_cop: number | null;
  images: ProductImage[];
  thumbnail_url: string | null;
  tags: string[];
  effects: string[];
  intensity_level: number | null;
  cannabinoid_profile: Record<string, unknown>;
  terpene_profile: Record<string, unknown>;
  coa_url: string | null;
  lab_report_url: string | null;
  educational_content: string | null;
  is_active: boolean;
  is_featured: boolean;
  requires_age_verification: boolean;
  meta_title: string | null;
  meta_description: string | null;
  weight_grams: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbProductVariant {
  id: string;
  product_id: string;
  variant_type: VariantType;
  name: string;
  value: string;
  sku: string | null;
  price_modifier: number;
  images: ProductImage[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbInventory {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  allow_backorder: boolean;
  updated_at: string;
}

export interface DbReview {
  id: string;
  product_id: string;
  profile_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified: boolean;
  is_approved: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  is_featured: boolean;
  admin_reply: string | null;
  admin_reply_at: string | null;
  photos: ReviewPhoto[];
  moderated_at: string | null;
  moderated_by: string | null;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewPhoto {
  url: string;
  alt: string;
}

// ============================================================
// TIPOS DE DOMINIO
// ============================================================

export interface ProductImage {
  url: string;
  alt: string;
  position: number;
}

export interface CannabinoidProfile {
  thc?: number;
  cbd?: number;
  cbg?: number;
  cbn?: number;
  [key: string]: number | undefined;
}

export interface TerpeneProfile {
  [terpene: string]: number;
}

// ============================================================
// TIPOS DE RESPUESTA ENRIQUECIDOS
// ============================================================

export interface CategoryWithChildren extends DbCategory {
  children?: CategoryWithChildren[];
  product_count?: number;
}

export interface ProductVariantWithInventory extends DbProductVariant {
  inventory?: DbInventory | null;
  available_quantity?: number;
  is_in_stock?: boolean;
}

export interface ProductWithDetails extends DbProduct {
  category?: DbCategory | null;
  variants?: ProductVariantWithInventory[];
  inventory?: DbInventory | null;
  reviews_summary?: ReviewsSummary;
  related_products?: ProductSummary[];
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  base_price: number;
  compare_at_price: number | null;
  price_crc: number | null;
  price_cop: number | null;
  thumbnail_url: string | null;
  images: ProductImage[];
  tags: string[];
  effects: string[];
  intensity_level: number | null;
  is_featured: boolean;
  is_active: boolean;
  category_id: string | null;
  category?: Pick<DbCategory, 'id' | 'name' | 'slug'> | null;
  inventory_status?: InventoryStatus;
  reviews_summary?: ReviewsSummary;
  created_at: string;
}

export interface ReviewsSummary {
  total_reviews: number;
  average_rating: number;
  rating_distribution: Record<string, number>;
}

export interface InventoryStatus {
  is_in_stock: boolean;
  available_quantity: number;
  is_low_stock: boolean;
  allow_backorder: boolean;
}

// ============================================================
// TIPOS DE PARÁMETROS DE CONSULTA
// ============================================================

export type ProductSortField =
  | 'nombre' |'precio_asc' |'precio_desc' |'mas_nuevo' |'mas_vendido' |'mejor_valorado' |'destacado';

export interface ProductFilters {
  categoria?: string;           // slug de categoría
  categoria_id?: string;
  precio_min?: number;
  precio_max?: number;
  efectos?: string[];
  etiquetas?: string[];
  intensidad_min?: number;
  intensidad_max?: number;
  en_stock?: boolean;
  destacado?: boolean;
  nuevo?: boolean;              // últimos N días
  busqueda?: string;
  solo_con_precio_crc?: boolean; // CR: only show products with price_crc set
}

export interface PaginationParams {
  pagina?: number;
  por_pagina?: number;
}

export interface ProductQueryParams extends ProductFilters, PaginationParams {
  ordenar?: ProductSortField;
}

export interface PaginatedResult<T> {
  datos: T[];
  paginacion: {
    pagina_actual: number;
    por_pagina: number;
    total: number;
    total_paginas: number;
    tiene_siguiente: boolean;
    tiene_anterior: boolean;
  };
}

// ============================================================
// TIPOS DE CREACIÓN / ACTUALIZACIÓN
// ============================================================

export interface CreateProductInput {
  category_id?: string;
  name: string;
  slug: string;
  short_description?: string;
  description?: string;
  ingredients?: string;
  usage_instructions?: string;
  origin_country?: string;
  brand?: string;
  sku?: string;
  base_price: number;
  compare_at_price?: number;
  price_crc?: number | null;
  price_cop?: number | null;
  images?: ProductImage[];
  thumbnail_url?: string;
  tags?: string[];
  effects?: string[];
  intensity_level?: number;
  cannabinoid_profile?: CannabinoidProfile;
  terpene_profile?: TerpeneProfile;
  coa_url?: string;
  lab_report_url?: string;
  educational_content?: string;
  is_active?: boolean;
  is_featured?: boolean;
  requires_age_verification?: boolean;
  meta_title?: string;
  meta_description?: string;
  weight_grams?: number;
  sort_order?: number;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {}

export interface CreateCategoryInput {
  parent_id?: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  icon_name?: string;
  meta_title?: string;
  meta_description?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {}

export interface CreateReviewInput {
  product_id: string;
  order_id?: string;
  rating: number;
  title?: string;
  body?: string;
}

// ============================================================
// TIPOS DE RESPUESTA DE API
// ============================================================

export interface ApiResponse<T> {
  exito: boolean;
  datos?: T;
  error?: string;
  mensaje?: string;
}

export interface ApiListResponse<T> extends ApiResponse<PaginatedResult<T>> {}
