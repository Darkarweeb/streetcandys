/**
 * Street Candy — Registro de Proveedores de Pago
 * Punto central de acceso a los proveedores de pago.
 * El checkout solo interactúa con ProveedorPago — nunca con un proveedor concreto.
 *
 * ARQUITECTURA MODULAR POR PAÍS:
 * Para agregar un nuevo proveedor:
 *   1. Implementar la interfaz ProveedorPago en providers/<nombre>-provider.ts
 *   2. Registrarlo en _proveedores con _proveedores.set('<nombre>', instancia)
 *   3. Asignar el proveedor al país en mapaProveedores dentro de obtenerProveedorPorPais
 */

import type { ProveedorPago } from '../types';
import { proveedorManual } from './manual-provider';

// ============================================================
// REGISTRO DE PROVEEDORES
// ============================================================

const _proveedores: Map<string, ProveedorPago> = new Map();

// Proveedor activo: manual (sin dependencias externas)
// Para activar Stripe: importar proveedorStripe y registrarlo aquí
_proveedores.set('manual', proveedorManual);

/**
 * Obtiene el proveedor de pago para un país dado.
 * Mapeo país → proveedor activo.
 * Para cambiar el proveedor de un país, edita mapaProveedores.
 */
export function obtenerProveedorPorPais(codigoPais: string): ProveedorPago {
  const mapaProveedores: Record<string, string> = {
    CO: 'manual',
    CR: 'manual',
  };

  const nombreProveedor = mapaProveedores[codigoPais.toUpperCase()];
  if (!nombreProveedor) {
    throw new Error(`No hay proveedor de pago configurado para el país: ${codigoPais}`);
  }

  const proveedor = _proveedores.get(nombreProveedor);
  if (!proveedor) {
    throw new Error(`Proveedor de pago no encontrado: ${nombreProveedor}`);
  }

  return proveedor;
}

/**
 * Obtiene un proveedor por nombre explícito.
 */
export function obtenerProveedorPorNombre(nombre: string): ProveedorPago {
  const proveedor = _proveedores.get(nombre.toLowerCase());
  if (!proveedor) {
    throw new Error(`Proveedor de pago no encontrado: ${nombre}`);
  }
  return proveedor;
}

/**
 * Lista todos los proveedores registrados.
 */
export function listarProveedores(): string[] {
  return Array.from(_proveedores.keys());
}
