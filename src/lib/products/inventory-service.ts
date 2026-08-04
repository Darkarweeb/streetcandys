/**
 * Street Candy — Servicio de Inventario
 * Lógica de negocio para gestión de inventario
 */

import { inventarioRepositorio } from './product-repository';
import { calcularEstadoInventario } from './utils';
import type { InventoryStatus, ApiResponse } from './types';

// ============================================================
// SERVICIO DE INVENTARIO
// ============================================================

export const inventarioServicio = {
  /**
   * Obtiene el estado de inventario de un producto
   */
  async obtenerEstado(
    productoId: string,
    varianteId?: string,
  ): Promise<ApiResponse<InventoryStatus>> {
    try {
      const inventario = varianteId
        ? await inventarioRepositorio.obtenerPorVariante(productoId, varianteId)
        : await inventarioRepositorio.obtenerPorProducto(productoId);

      const estado = calcularEstadoInventario(inventario);
      return { exito: true, datos: estado };
    } catch (error) {
      return { exito: false, error: mensajeError(error) };
    }
  },

  /**
   * Obtiene todo el inventario de un producto (todas las variantes)
   */
  async obtenerTodo(productoId: string): Promise<ApiResponse<{
    producto: InventoryStatus;
    variantes: Array<{ variant_id: string | null; estado: InventoryStatus }>;
  }>> {
    try {
      const todos = await inventarioRepositorio.obtenerTodoPorProducto(productoId);

      const invProducto = todos.find((i) => !i.variant_id) ?? null;
      const invVariantes = todos.filter((i) => !!i.variant_id);

      return {
        exito: true,
        datos: {
          producto: calcularEstadoInventario(invProducto),
          variantes: invVariantes.map((i) => ({
            variant_id: i.variant_id,
            estado: calcularEstadoInventario(i),
          })),
        },
      };
    } catch (error) {
      return { exito: false, error: mensajeError(error) };
    }
  },

  /**
   * Verifica disponibilidad de un producto/variante
   */
  async verificarDisponibilidad(
    productoId: string,
    varianteId?: string,
    cantidad = 1,
  ): Promise<ApiResponse<{ disponible: boolean; cantidad_disponible: number }>> {
    try {
      const inventario = varianteId
        ? await inventarioRepositorio.obtenerPorVariante(productoId, varianteId)
        : await inventarioRepositorio.obtenerPorProducto(productoId);

      const estado = calcularEstadoInventario(inventario);
      const disponible =
        estado.allow_backorder || estado.available_quantity >= cantidad;

      return {
        exito: true,
        datos: {
          disponible,
          cantidad_disponible: estado.available_quantity,
        },
      };
    } catch (error) {
      return { exito: false, error: mensajeError(error) };
    }
  },
};

function mensajeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Error interno del servidor';
}
