/**
 * Street Candy — Barrel Export del Módulo de Carrito
 */

// Tipos
export * from './types';

// Utilidades
export {
  obtenerConfigPais,
  validarPais,
  calcularImpuesto,
  estimarEnvio,
  calcularDescuentoCupon,
  calcularDescuentoRecompensas,
  calcularPuntosGanados,
  construirResumenCarrito,
  validarCupon,
  leerCarritoLocalStorage,
  guardarCarritoLocalStorage,
  limpiarCarritoLocalStorage,
  leerPaisLocalStorage,
  guardarPaisLocalStorage,
  generarSessionId,
  normalizarCantidad,
  mensajeErrorCarrito,
} from './utils';

// Repositorios
export {
  carritoRepositorio,
  itemsCarritoRepositorio,
  cuponRepositorio,
  recompensasCarritoRepositorio,
  inventarioCarritoRepositorio,
} from './cart-repository';

// Servicio
export { carritoServicio } from './cart-service';
