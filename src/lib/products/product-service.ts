/**
 * Street Candy — Servicio de Productos
 * Lógica de negocio para el módulo completo de productos
 */

import { productoRepositorio, varianteRepositorio, inventarioRepositorio } from './product-repository';
import { categoriaRepositorio } from './category-repository';
import { resenasRepositorio } from './reviews-repository';
import {
  calcularEstadoInventario,
  construirPaginacion,
  normalizarPaginacion,
} from './utils';
import type { ProductWithDetails, ProductSummary, ProductFilters, ProductSortField, PaginationParams, CreateProductInput, UpdateProductInput, ApiResponse, ApiListResponse, DbProduct,  } from './types';

// ============================================================
// SERVICIO DE PRODUCTOS
// ============================================================

export const productoServicio = {
  /**
   * Lista productos con filtros, ordenamiento y paginación
   */
  async listar(
    filtros: ProductFilters = {},
    ordenar?: ProductSortField,
    paginacion?: PaginationParams,
  ): Promise<ApiListResponse<ProductSummary>> {
    try {
      // Si hay filtro por slug de categoría, resuelve el ID
      const filtrosResueltos = await resolverFiltroCategoria(filtros);

      const { pagina, porPagina } = normalizarPaginacion(paginacion ?? {});
      const { productos, total } = await productoRepositorio.listar(
        filtrosResueltos,
        ordenar,
        paginacion,
      );

      const resumen = await enriquecerConResumen(productos);
      const resultado = construirPaginacion(resumen, total, pagina, porPagina);

      return { exito: true, datos: resultado };
    } catch (error) {
      return { exito: false, error: mensajeError(error) };
    }
  },

  /**
   * Obtiene un producto completo por slug
   */
  async obtenerPorSlug(slug: string): Promise<ApiResponse<ProductWithDetails>> {
    try {
      const producto = await productoRepositorio.obtenerPorSlug(slug);
      if (!producto) {
        return { exito: false, error: 'Producto no encontrado' };
      }

      const detalle = await construirDetalleProducto(producto);
      return { exito: true, datos: detalle };
    } catch (error) {
      return { exito: false, error: mensajeError(error) };
    }
  },

  /**
   * Obtiene un producto completo por ID
   */
  async obtenerPorId(id: string): Promise<ApiResponse<ProductWithDetails>> {
    try {
      const producto = await productoRepositorio.obtenerPorId(id);
      if (!producto) {
        return { exito: false, error: 'Producto no encontrado' };
      }

      const detalle = await construirDetalleProducto(producto);
      return { exito: true, datos: detalle };
    } catch (error) {
      return { exito: false, error: mensajeError(error) };
    }
  },

  /**
   * Busca productos por texto
   */
  async buscar(
    texto: string,
    paginacion?: PaginationParams,
  ): Promise<ApiListResponse<ProductSummary>> {
    try {
      if (!texto?.trim()) {
        return { exito: false, error: 'El texto de búsqueda es requerido' };
      }

      const { pagina, porPagina } = normalizarPaginacion(paginacion ?? {});
      const { productos, total } = await productoRepositorio.buscar(texto.trim(), paginacion);

      const resumen = await enriquecerConResumen(productos);
      const resultado = construirPaginacion(resumen, total, pagina, porPagina);

      return { exito: true, datos: resultado };
    } catch (error) {
      return { exito: false, error: mensajeError(error) };
    }
  },

  /**
   * Obtiene productos destacados
   */
  async obtenerDestacados(limite = 8): Promise<ApiResponse<ProductSummary[]>> {
    try {
      const productos = await productoRepositorio.obtenerDestacados(limite);
      const resumen = await enriquecerConResumen(productos);
      return { exito: true, datos: resumen };
    } catch (error) {
      return { exito: false, error: mensajeError(error) };
    }
  },

  /**
   * Obtiene productos nuevos
   */
  async obtenerNuevos(limite = 8): Promise<ApiResponse<ProductSummary[]>> {
    try {
      const productos = await productoRepositorio.obtenerNuevos(limite);
      const resumen = await enriquecerConResumen(productos);
      return { exito: true, datos: resumen };
    } catch (error) {
      return { exito: false, error: mensajeError(error) };
    }
  },

  /**
   * Obtiene los más vendidos
   */
  async obtenerMasVendidos(limite = 8): Promise<ApiResponse<ProductSummary[]>> {
    try {
      const productos = await productoRepositorio.obtenerMasVendidos(limite);
      const resumen = await enriquecerConResumen(productos);
      return { exito: true, datos: resumen };
    } catch (error) {
      return { exito: false, error: mensajeError(error) };
    }
  },

  /**
   * Obtiene productos relacionados
   */
  async obtenerRelacionados(
    productoId: string,
    limite = 4,
  ): Promise<ApiResponse<ProductSummary[]>> {
    try {
      const producto = await productoRepositorio.obtenerPorId(productoId);
      if (!producto) {
        return { exito: false, error: 'Producto no encontrado' };
      }

      const relacionados = await productoRepositorio.obtenerRelacionados(
        productoId,
        producto.category_id,
        limite,
      );
      const resumen = await enriquecerConResumen(relacionados);
      return { exito: true, datos: resumen };
    } catch (error) {
      return { exito: false, error: mensajeError(error) };
    }
  },

  /**
   * Crea un nuevo producto
   */
  async crear(input: CreateProductInput): Promise<ApiResponse<ProductWithDetails>> {
    try {
      const validacion = validarInputProducto(input);
      if (!validacion.valido) {
        return { exito: false, error: validacion.error };
      }

      const producto = await productoRepositorio.crear(input);
      const detalle = await construirDetalleProducto(producto);
      return { exito: true, datos: detalle, mensaje: 'Producto creado exitosamente' };
    } catch (error) {
      const msg = mensajeError(error);
      if (msg.includes('unique') || msg.includes('duplicate')) {
        return { exito: false, error: 'Ya existe un producto con ese slug o SKU' };
      }
      return { exito: false, error: msg };
    }
  },

  /**
   * Actualiza un producto existente
   */
  async actualizar(
    id: string,
    input: UpdateProductInput,
  ): Promise<ApiResponse<ProductWithDetails>> {
    try {
      const producto = await productoRepositorio.actualizar(id, input);
      const detalle = await construirDetalleProducto(producto);
      return { exito: true, datos: detalle, mensaje: 'Producto actualizado exitosamente' };
    } catch (error) {
      return { exito: false, error: mensajeError(error) };
    }
  },

  /**
   * Desactiva un producto
   */
  async desactivar(id: string): Promise<ApiResponse<null>> {
    try {
      await productoRepositorio.desactivar(id);
      return { exito: true, datos: null, mensaje: 'Producto desactivado exitosamente' };
    } catch (error) {
      return { exito: false, error: mensajeError(error) };
    }
  },
};

// ============================================================
// HELPERS INTERNOS
// ============================================================

function mensajeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Error interno del servidor';
}

async function resolverFiltroCategoria(filtros: ProductFilters): Promise<ProductFilters> {
  if (filtros.categoria && !filtros.categoria_id) {
    const cat = await categoriaRepositorio.obtenerPorSlug(filtros.categoria);
    if (cat) {
      return { ...filtros, categoria_id: cat.id };
    }
  }
  return filtros;
}

async function construirDetalleProducto(producto: DbProduct): Promise<ProductWithDetails> {
  const [categoria, variantes, inventario, resumenResenas] = await Promise.all([
    producto.category_id ? categoriaRepositorio.obtenerPorId(producto.category_id) : null,
    varianteRepositorio.obtenerPorProducto(producto.id),
    inventarioRepositorio.obtenerPorProducto(producto.id),
    resenasRepositorio.obtenerResumen(producto.id),
  ]);

  // Enriquece variantes con inventario
  const variantesConInventario = await Promise.all(
    variantes.map(async (v) => {
      const invVariante = await inventarioRepositorio.obtenerPorVariante(producto.id, v.id);
      const estado = calcularEstadoInventario(invVariante);
      return {
        ...v,
        inventory: invVariante,
        available_quantity: estado.available_quantity,
        is_in_stock: estado.is_in_stock,
      };
    }),
  );

  // Productos relacionados
  const relacionados = await productoRepositorio.obtenerRelacionados(
    producto.id,
    producto.category_id,
    4,
  );
  const resumenRelacionados = relacionados.map(mapearAResumen);

  return {
    ...producto,
    category: categoria,
    variants: variantesConInventario,
    inventory: inventario,
    reviews_summary: resumenResenas,
    related_products: resumenRelacionados,
  };
}

async function enriquecerConResumen(productos: DbProduct[]): Promise<ProductSummary[]> {
  if (productos.length === 0) return [];

  // Obtiene inventario y reseñas en paralelo para todos los productos
  const [inventarios, resenasMap, categoriasMap] = await Promise.all([
    Promise.all(productos.map((p) => inventarioRepositorio.obtenerPorProducto(p.id))),
    Promise.all(productos.map((p) => resenasRepositorio.obtenerResumen(p.id))),
    obtenerCategoriasParaProductos(productos),
  ]);

  return productos.map((producto, i) => {
    const inv = inventarios[i];
    const resumenResenas = resenasMap[i];
    const categoria = categoriasMap[producto.category_id ?? ''] ?? null;

    return {
      ...mapearAResumen(producto),
      category: categoria
        ? { id: categoria.id, name: categoria.name, slug: categoria.slug }
        : null,
      inventory_status: calcularEstadoInventario(inv),
      reviews_summary: resumenResenas,
    };
  });
}

async function obtenerCategoriasParaProductos(
  productos: DbProduct[],
): Promise<Record<string, { id: string; name: string; slug: string }>> {
  const ids = [...new Set(productos.map((p) => p.category_id).filter(Boolean))] as string[];
  if (ids.length === 0) return {};

  const categorias = await Promise.all(ids.map((id) => categoriaRepositorio.obtenerPorId(id)));
  const mapa: Record<string, { id: string; name: string; slug: string }> = {};
  for (const cat of categorias) {
    if (cat) mapa[cat.id] = { id: cat.id, name: cat.name, slug: cat.slug };
  }
  return mapa;
}

function mapearAResumen(producto: DbProduct): ProductSummary {
  return {
    id: producto.id,
    name: producto.name,
    slug: producto.slug,
    short_description: producto.short_description,
    base_price: producto.base_price,
    compare_at_price: producto.compare_at_price,
    price_crc: producto.price_crc ?? null,
    price_cop: producto.price_cop ?? null,
    thumbnail_url: producto.thumbnail_url,
    images: producto.images as import('./types').ProductImage[],
    tags: producto.tags,
    effects: producto.effects,
    intensity_level: producto.intensity_level,
    is_featured: producto.is_featured,
    is_active: producto.is_active,
    category_id: producto.category_id,
    created_at: producto.created_at,
  };
}

function validarInputProducto(input: CreateProductInput): { valido: boolean; error: string } {
  if (!input.name?.trim()) return { valido: false, error: 'El nombre del producto es requerido' };
  if (!input.slug?.trim()) return { valido: false, error: 'El slug del producto es requerido' };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    return { valido: false, error: 'El slug solo puede contener letras minúsculas, números y guiones' };
  }
  if (input.base_price != null && input.base_price < 0) {
    return { valido: false, error: 'El precio base no puede ser negativo' };
  }
  if (input.intensity_level !== undefined) {
    if (!Number.isInteger(input.intensity_level) || input.intensity_level < 1 || input.intensity_level > 5) {
      return { valido: false, error: 'El nivel de intensidad debe ser un número entero entre 1 y 5' };
    }
  }
  return { valido: true, error: '' };
}
