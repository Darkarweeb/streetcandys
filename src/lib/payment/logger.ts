/**
 * Street Candy — Logger de Pagos
 * Sistema de logging estructurado para el módulo de pagos
 */

import type { LogPago } from './types';

function formatearLog(log: LogPago): string {
  const partes = [
    `[${log.timestamp}]`,
    `[${log.nivel.toUpperCase()}]`,
    `[PAGOS]`,
    log.proveedor ? `[${log.proveedor.toUpperCase()}]` : '',
    log.orden_id ? `[orden:${log.orden_id}]` : '',
    log.referencia_proveedor ? `[ref:${log.referencia_proveedor}]` : '',
    log.mensaje,
  ].filter(Boolean);

  return partes.join(' ');
}

export const loggerPagos = {
  info(mensaje: string, datos?: Omit<LogPago, 'nivel' | 'mensaje' | 'timestamp'>) {
    const log: LogPago = {
      nivel: 'info',
      mensaje,
      timestamp: new Date().toISOString(),
      ...datos,
    };
    console.log(formatearLog(log), datos?.datos ? JSON.stringify(datos.datos) : '');
  },

  warn(mensaje: string, datos?: Omit<LogPago, 'nivel' | 'mensaje' | 'timestamp'>) {
    const log: LogPago = {
      nivel: 'warn',
      mensaje,
      timestamp: new Date().toISOString(),
      ...datos,
    };
    console.warn(formatearLog(log), datos?.datos ? JSON.stringify(datos.datos) : '');
  },

  error(mensaje: string, datos?: Omit<LogPago, 'nivel' | 'mensaje' | 'timestamp'>) {
    const log: LogPago = {
      nivel: 'error',
      mensaje,
      timestamp: new Date().toISOString(),
      ...datos,
    };
    console.error(formatearLog(log), datos?.datos ? JSON.stringify(datos.datos) : '');
  },
};
