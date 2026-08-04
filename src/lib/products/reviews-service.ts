/**
 * Street Candy — Servicio de Reseñas
 * Lógica de negocio para reseñas de productos
 */

import { resenasRepositorio } from './reviews-repository';
import { productoRepositorio } from './product-repository';
import { calcularResumenResenas, construirPaginacion, normalizarPaginacion } from './utils';
import type {
  DbReview,
  ReviewsSummary,
  CreateReviewInput,
  PaginationParams,
  PaginatedResult,
  ApiResponse,
} from './types';

// ============================================================
// SERVICIO DE RESEÑAS
// ============================================================

export const resenasServicio = {
  /**
   * Obtiene reseñas paginadas de un producto con resumen
   */
  async obtenerPorProducto(
    productoId: string,
    paginacion?: PaginationParams,
  ): Promise<ApiResponse<{ resenas: PaginatedResult<DbReview>; resumen: ReviewsSummary }>> {
    try {
      const { pagina, porPagina } = normalizarPaginacion(paginacion ?? {});
      const [paginadasResult, todasResenas] = await Promise.all([
        resenasRepositorio.obtenerPaginadas(productoId, pagina, porPagina),
        resenasRepositorio.obtenerPorProducto(productoId),
      ]);
      const { resenas, total } = paginadasResult;

      const paginado = construirPaginacion(resenas, total, pagina, porPagina);
      const resumen = calcularResumenResenas(todasResenas);

      return { exito: true, datos: { resenas: paginado, resumen } };
    } catch (error) {
      return { exito: false, error: mensajeError(error) };
    }
  },

  /**
   * Crea una nueva reseña (requiere usuario autenticado)
   */
  async crear(
    perfilId: string,
    input: CreateReviewInput,
  ): Promise<ApiResponse<DbReview>> {
    try {
      // Validaciones
      if (input.rating < 1 || input.rating > 5) {
        return { exito: false, error: 'La calificación debe estar entre 1 y 5 estrellas' };
      }

      // Verifica que el producto existe
      const producto = await productoRepositorio.obtenerPorId(input.product_id);
      if (!producto) {
        return { exito: false, error: 'Producto no encontrado' };
      }

      // Verifica que no haya reseñado antes
      const yaReseno = await resenasRepositorio.existeResena(input.product_id, perfilId);
      if (yaReseno) {
        return { exito: false, error: 'Ya has enviado una reseña para este producto' };
      }

      const resena = await resenasRepositorio.crear(perfilId, input);
      return {
        exito: true,
        datos: resena,
        mensaje: 'Reseña enviada exitosamente. Será publicada después de revisión.',
      };
    } catch (error) {
      return { exito: false, error: mensajeError(error) };
    }
  },

  /**
   * Marca una reseña como útil
   */
  async marcarUtil(resenaId: string): Promise<ApiResponse<null>> {
    try {
      await resenasRepositorio.marcarUtil(resenaId);
      return { exito: true, datos: null, mensaje: 'Reseña marcada como útil' };
    } catch (error) {
      return { exito: false, error: mensajeError(error) };
    }
  },
};

function mensajeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Error interno del servidor';
}
