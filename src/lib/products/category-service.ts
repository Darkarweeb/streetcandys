/**
 * Street Candy — Servicio de Categorías
 * Lógica de negocio para el módulo de categorías
 */

import { categoriaRepositorio } from './category-repository';
import type {
  DbCategory,
  CategoryWithChildren,
  CreateCategoryInput,
  UpdateCategoryInput,
  ApiResponse,
} from './types';

// ============================================================
// SERVICIO DE CATEGORÍAS
// ============================================================

export const categoriaServicio = {
  /**
   * Lista todas las categorías activas
   */
  async listar(): Promise<ApiResponse<DbCategory[]>> {
    try {
      const categorias = await categoriaRepositorio.obtenerTodas();
      return { exito: true, datos: categorias };
    } catch (error) {
      return { exito: false, error: mensajeError(error) };
    }
  },

  /**
   * Obtiene el árbol completo de categorías con conteo de productos
   */
  async obtenerArbol(): Promise<ApiResponse<CategoryWithChildren[]>> {
    try {
      const [arbol, conteos] = await Promise.all([
        categoriaRepositorio.obtenerArbol(),
        categoriaRepositorio.obtenerConteoPorCategoria(),
      ]);

      const arbolConConteo = enriquecerArbolConConteo(arbol, conteos);
      return { exito: true, datos: arbolConConteo };
    } catch (error) {
      return { exito: false, error: mensajeError(error) };
    }
  },

  /**
   * Obtiene una categoría por slug con sus hijas
   */
  async obtenerPorSlug(slug: string): Promise<ApiResponse<CategoryWithChildren>> {
    try {
      const categoria = await categoriaRepositorio.obtenerPorSlug(slug);
      if (!categoria) {
        return { exito: false, error: 'Categoría no encontrada' };
      }

      const hijas = await categoriaRepositorio.obtenerHijas(categoria.id);
      const resultado: CategoryWithChildren = { ...categoria, children: hijas };
      return { exito: true, datos: resultado };
    } catch (error) {
      return { exito: false, error: mensajeError(error) };
    }
  },

  /**
   * Obtiene una categoría por ID
   */
  async obtenerPorId(id: string): Promise<ApiResponse<DbCategory>> {
    try {
      const categoria = await categoriaRepositorio.obtenerPorId(id);
      if (!categoria) {
        return { exito: false, error: 'Categoría no encontrada' };
      }
      return { exito: true, datos: categoria };
    } catch (error) {
      return { exito: false, error: mensajeError(error) };
    }
  },

  /**
   * Crea una nueva categoría
   */
  async crear(input: CreateCategoryInput): Promise<ApiResponse<DbCategory>> {
    try {
      // Validaciones
      if (!input.name?.trim()) {
        return { exito: false, error: 'El nombre de la categoría es requerido' };
      }
      if (!input.slug?.trim()) {
        return { exito: false, error: 'El slug de la categoría es requerido' };
      }
      if (!validarSlug(input.slug)) {
        return { exito: false, error: 'El slug solo puede contener letras, números y guiones' };
      }

      const categoria = await categoriaRepositorio.crear(input);
      return { exito: true, datos: categoria, mensaje: 'Categoría creada exitosamente' };
    } catch (error) {
      const msg = mensajeError(error);
      if (msg.includes('unique') || msg.includes('duplicate')) {
        return { exito: false, error: 'Ya existe una categoría con ese slug' };
      }
      return { exito: false, error: msg };
    }
  },

  /**
   * Actualiza una categoría existente
   */
  async actualizar(id: string, input: UpdateCategoryInput): Promise<ApiResponse<DbCategory>> {
    try {
      if (input.slug && !validarSlug(input.slug)) {
        return { exito: false, error: 'El slug solo puede contener letras, números y guiones' };
      }

      const categoria = await categoriaRepositorio.actualizar(id, input);
      return { exito: true, datos: categoria, mensaje: 'Categoría actualizada exitosamente' };
    } catch (error) {
      return { exito: false, error: mensajeError(error) };
    }
  },

  /**
   * Desactiva una categoría
   */
  async desactivar(id: string): Promise<ApiResponse<null>> {
    try {
      await categoriaRepositorio.desactivar(id);
      return { exito: true, datos: null, mensaje: 'Categoría desactivada exitosamente' };
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

function validarSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function enriquecerArbolConConteo(
  arbol: CategoryWithChildren[],
  conteos: Record<string, number>,
): CategoryWithChildren[] {
  return arbol.map((cat) => ({
    ...cat,
    product_count: conteos[cat.id] ?? 0,
    children: cat.children ? enriquecerArbolConConteo(cat.children, conteos) : [],
  }));
}
