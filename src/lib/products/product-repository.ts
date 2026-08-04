/**
 * Street Candy — Repositorio de Productos
 * Acceso directo a las tablas `products`, `product_variants`, `inventory`
 */

import { createClient } from '@/lib/supabase/server';
import type {
  DbProduct,
  DbProductVariant,
  DbInventory,
  CreateProductInput,
  UpdateProductInput,
  ProductFilters,
  ProductSortField,
  PaginationParams,
} from './types';
import {
  normalizarPaginacion,
  resolverOrdenamiento,
  patronBusqueda,
  normalizarFiltros,
  DIAS_PRODUCTO_NUEVO,
} from './utils';

// ============================================================
// REPOSITORIO DE PRODUCTOS
// ============================================================

export const productoRepositorio = {
  /**
   * Obtiene un producto por slug (activo)
   */
  async obtenerPorSlug(slug: string): Promise<DbProduct | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error al obtener producto: ${error.message}`);
    }
    return data ?? null;
  },

  /**
   * Obtiene un producto por ID
   */
  async obtenerPorId(id: string): Promise<DbProduct | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error al obtener producto: ${error.message}`);
    }
    return data ?? null;
  },

  /**
   * Obtiene múltiples productos por IDs
   */
  async obtenerPorIds(ids: string[]): Promise<DbProduct[]> {
    if (ids.length === 0) return [];
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('id', ids)
      .eq('is_active', true);

    if (error) throw new Error(`Error al obtener productos: ${error.message}`);
    return data ?? [];
  },

  /**
   * Lista productos con filtros, ordenamiento y paginación
   */
  async listar(
    filtros: ProductFilters = {},
    ordenar?: ProductSortField,
    paginacion?: PaginationParams,
  ): Promise<{ productos: DbProduct[]; total: number }> {
    const supabase = await createClient();
    const filtrosNorm = normalizarFiltros(filtros);
    const { pagina, porPagina, offset } = normalizarPaginacion(paginacion ?? {});
    const { columna, ascendente } = resolverOrdenamiento(ordenar);

    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    // Filtro por categoría (slug o id)
    if (filtrosNorm.categoria_id) {
      query = query.eq('category_id', filtrosNorm.categoria_id);
    }

    // Filtro por precio
    if (filtrosNorm.precio_min !== undefined) {
      query = query.gte('base_price', filtrosNorm.precio_min);
    }
    if (filtrosNorm.precio_max !== undefined) {
      query = query.lte('base_price', filtrosNorm.precio_max);
    }

    // Filtro por efectos (array overlap)
    if (filtrosNorm.efectos && filtrosNorm.efectos.length > 0) {
      query = query.overlaps('effects', filtrosNorm.efectos);
    }

    // Filtro por etiquetas (array overlap)
    if (filtrosNorm.etiquetas && filtrosNorm.etiquetas.length > 0) {
      query = query.overlaps('tags', filtrosNorm.etiquetas);
    }

    // Filtro por intensidad
    if (filtrosNorm.intensidad_min !== undefined) {
      query = query.gte('intensity_level', filtrosNorm.intensidad_min);
    }
    if (filtrosNorm.intensidad_max !== undefined) {
      query = query.lte('intensity_level', filtrosNorm.intensidad_max);
    }

    // Filtro destacado
    if (filtrosNorm.destacado === true) {
      query = query.eq('is_featured', true);
    }

    // Filtro nuevos (últimos N días)
    if (filtrosNorm.nuevo === true) {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - DIAS_PRODUCTO_NUEVO);
      query = query.gte('created_at', fechaLimite.toISOString());
    }

    // Filtro Costa Rica: solo productos con price_crc definido
    if (filtrosNorm.solo_con_precio_crc === true) {
      query = query.not('price_crc', 'is', null);
    }

    // Búsqueda de texto
    if (filtrosNorm.busqueda) {
      const patron = patronBusqueda(filtrosNorm.busqueda);
      query = query.or(
        `name.ilike.${patron},short_description.ilike.${patron},description.ilike.${patron}`,
      );
    }

    // Ordenamiento
    query = query.order(columna, { ascending: ascendente });

    // Paginación
    query = query.range(offset, offset + porPagina - 1);

    const { data, error, count } = await query;

    if (error) throw new Error(`Error al listar productos: ${error.message}`);
    return { productos: data ?? [], total: count ?? 0 };
  },

  /**
   * Obtiene productos destacados
   */
  async obtenerDestacados(limite = 8): Promise<DbProduct[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('sort_order', { ascending: true })
      .limit(limite);

    if (error) throw new Error(`Error al obtener destacados: ${error.message}`);
    return data ?? [];
  },

  /**
   * Obtiene productos nuevos (últimos N días)
   */
  async obtenerNuevos(limite = 8, diasAtras = DIAS_PRODUCTO_NUEVO): Promise<DbProduct[]> {
    const supabase = await createClient();
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasAtras);

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .gte('created_at', fechaLimite.toISOString())
      .order('created_at', { ascending: false })
      .limit(limite);

    if (error) throw new Error(`Error al obtener nuevos: ${error.message}`);
    return data ?? [];
  },

  /**
   * Obtiene los más vendidos (basado en order_items)
   */
  async obtenerMasVendidos(limite = 8): Promise<DbProduct[]> {
    const supabase = await createClient();

    // Obtiene IDs de productos más vendidos desde order_items
    const { data: ventasData, error: ventasError } = await supabase
      .from('order_items')
      .select('product_id')
      .not('product_id', 'is', null);

    if (ventasError) throw new Error(`Error al obtener ventas: ${ventasError.message}`);

    // Cuenta ventas por producto
    const conteoVentas: Record<string, number> = {};
    for (const item of ventasData ?? []) {
      if (item.product_id) {
        conteoVentas[item.product_id] = (conteoVentas[item.product_id] ?? 0) + 1;
      }
    }

    // Ordena por ventas y toma los top IDs
    const topIds = Object.entries(conteoVentas)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limite)
      .map(([id]) => id);

    if (topIds.length === 0) {
      // Fallback: productos activos ordenados por sort_order
      return this.obtenerDestacados(limite);
    }

    return this.obtenerPorIds(topIds);
  },

  /**
   * Obtiene productos relacionados (misma categoría, excluyendo el actual)
   */
  async obtenerRelacionados(
    productoId: string,
    categoriaId: string | null,
    limite = 4,
  ): Promise<DbProduct[]> {
    const supabase = await createClient();

    let query = supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .neq('id', productoId)
      .limit(limite);

    if (categoriaId) {
      query = query.eq('category_id', categoriaId);
    }

    query = query.order('is_featured', { ascending: false }).order('sort_order', { ascending: true });

    const { data, error } = await query;
    if (error) throw new Error(`Error al obtener relacionados: ${error.message}`);

    // Si no hay suficientes en la misma categoría, complementa con otros
    if ((data ?? []).length < limite) {
      const idsExistentes = [productoId, ...(data ?? []).map((p) => p.id)];
      const { data: extra } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .not('id', 'in', `(${idsExistentes.join(',')})`)
        .order('is_featured', { ascending: false })
        .limit(limite - (data ?? []).length);

      return [...(data ?? []), ...(extra ?? [])];
    }

    return data ?? [];
  },

  /**
   * Busca productos por texto en nombre, descripción y tags
   */
  async buscar(
    texto: string,
    paginacion?: PaginationParams,
  ): Promise<{ productos: DbProduct[]; total: number }> {
    return this.listar({ busqueda: texto }, 'nombre', paginacion);
  },

  /**
   * Crea un nuevo producto
   */
  async crear(input: CreateProductInput): Promise<DbProduct> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .insert({
        category_id: input.category_id ?? null,
        name: input.name,
        slug: input.slug,
        short_description: input.short_description ?? null,
        description: input.description ?? null,
        ingredients: input.ingredients ?? null,
        usage_instructions: input.usage_instructions ?? null,
        origin_country: input.origin_country ?? 'United States',
        brand: input.brand ?? null,
        sku: input.sku ?? null,
        base_price: input.base_price,
        compare_at_price: input.compare_at_price ?? null,
        images: input.images ?? [],
        thumbnail_url: input.thumbnail_url ?? null,
        tags: input.tags ?? [],
        effects: input.effects ?? [],
        intensity_level: input.intensity_level ?? null,
        cannabinoid_profile: input.cannabinoid_profile ?? {},
        terpene_profile: input.terpene_profile ?? {},
        coa_url: input.coa_url ?? null,
        lab_report_url: input.lab_report_url ?? null,
        educational_content: input.educational_content ?? null,
        is_active: input.is_active ?? true,
        is_featured: input.is_featured ?? false,
        requires_age_verification: input.requires_age_verification ?? true,
        meta_title: input.meta_title ?? null,
        meta_description: input.meta_description ?? null,
        weight_grams: input.weight_grams ?? null,
        sort_order: input.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) throw new Error(`Error al crear producto: ${error.message}`);
    return data;
  },

  /**
   * Actualiza un producto existente
   */
  async actualizar(id: string, input: UpdateProductInput): Promise<DbProduct> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar producto: ${error.message}`);
    return data;
  },

  /**
   * Desactiva un producto (soft delete)
   */
  async desactivar(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(`Error al desactivar producto: ${error.message}`);
  },
};

// ============================================================
// REPOSITORIO DE VARIANTES
// ============================================================

export const varianteRepositorio = {
  /**
   * Obtiene variantes activas de un producto
   */
  async obtenerPorProducto(productoId: string): Promise<DbProductVariant[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productoId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw new Error(`Error al obtener variantes: ${error.message}`);
    return data ?? [];
  },

  /**
   * Obtiene una variante por ID
   */
  async obtenerPorId(id: string): Promise<DbProductVariant | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error al obtener variante: ${error.message}`);
    }
    return data ?? null;
  },
};

// ============================================================
// REPOSITORIO DE INVENTARIO
// ============================================================

export const inventarioRepositorio = {
  /**
   * Obtiene inventario de un producto (sin variante)
   */
  async obtenerPorProducto(productoId: string): Promise<DbInventory | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('product_id', productoId)
      .is('variant_id', null)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error al obtener inventario: ${error.message}`);
    }
    return data ?? null;
  },

  /**
   * Obtiene inventario de una variante específica
   */
  async obtenerPorVariante(productoId: string, varianteId: string): Promise<DbInventory | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('product_id', productoId)
      .eq('variant_id', varianteId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error al obtener inventario de variante: ${error.message}`);
    }
    return data ?? null;
  },

  /**
   * Obtiene todo el inventario de un producto (todas las variantes)
   */
  async obtenerTodoPorProducto(productoId: string): Promise<DbInventory[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('product_id', productoId);

    if (error) throw new Error(`Error al obtener inventario: ${error.message}`);
    return data ?? [];
  },

  /**
   * Verifica si un producto tiene stock disponible
   */
  async tieneStock(productoId: string, varianteId?: string): Promise<boolean> {
    const inv = varianteId
      ? await this.obtenerPorVariante(productoId, varianteId)
      : await this.obtenerPorProducto(productoId);

    if (!inv) return false;
    const disponible = inv.quantity - inv.reserved_quantity;
    return disponible > 0 || inv.allow_backorder;
  },
};
