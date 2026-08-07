/**
 * Street Candy — Servicio de Checkout
 * Orquesta el flujo completo: carrito → orden → pago.
 * Nunca depende directamente de Stripe — usa ProveedorPago.
 */

import { repositorioOrdenes } from './order-repository';
import { repositorioCheckout } from './checkout-repository';
import { servicioPagos } from './payment-service';
import { loggerPagos } from './logger';
import {
  obtenerConfigPais,
  calcularImpuesto,
  calcularEnvio,
  calcularTotal,
  generarNumeroOrden,
  validarInputCheckout,
} from './utils';
import type {
  InputIniciarCheckout,
  ResultadoCheckout,
  InputConfirmarPago,
  ResultadoConfirmacionPago,
} from './types';

// ============================================================
// CONSTANTES DE RECOMPENSAS
// ============================================================

const PUNTOS_POR_PESO_MONEDA = 0.01; // 1 punto por cada 100 unidades de moneda
const VALOR_PUNTO_EN_MONEDA = 1;     // 1 punto = 1 unidad de moneda

// ============================================================
// SERVICIO DE CHECKOUT
// ============================================================

export const servicioCheckout = {
  /**
   * Inicia el proceso de checkout:
   * 1. Valida el carrito e inventario
   * 2. Calcula totales (impuesto, envío, descuentos)
   * 3. Crea la orden en BD
   * 4. Crea la intención de pago con el proveedor
   * 5. Retorna client_secret para el frontend
   */
  async iniciarCheckout(
    profileId: string,
    email: string,
    nombreCompleto: string,
    input: InputIniciarCheckout,
  ): Promise<ResultadoCheckout> {
    loggerPagos.info('Iniciando checkout', {
      datos: { profile_id: profileId, carrito_id: input.carrito_id, pais: input.codigo_pais },
    });

    // ── 1. Validar input ──────────────────────────────────────
    const errores = validarInputCheckout(input);
    if (errores.length > 0) {
      throw new Error(`Errores de validación: ${errores.join(', ')}`);
    }

    const configPais = obtenerConfigPais(input.codigo_pais);

    // ── 2. Obtener carrito ────────────────────────────────────
    const datosCarrito = await repositorioCheckout.obtenerCarritoCompleto(input.carrito_id);
    if (!datosCarrito) {
      throw new Error('Carrito no encontrado');
    }

    const { carrito, items } = datosCarrito;

    if (!items || items.length === 0) {
      throw new Error('El carrito está vacío');
    }

    // ── 3. Validar inventario ─────────────────────────────────
    for (const item of items) {
      if (!item.producto?.is_active) {
        throw new Error(`Producto no disponible: ${item.producto?.name ?? item.product_id}`);
      }

      const stockDisponible =
        (item.inventario?.quantity ?? 0) - (item.inventario?.reserved_quantity ?? 0);

      if (!item.inventario?.allow_backorder && stockDisponible < item.quantity) {
        throw new Error(
          `Stock insuficiente para: ${item.producto.name}. Disponible: ${stockDisponible}`,
        );
      }
    }

    // ── 4. Calcular subtotal ──────────────────────────────────
    const subtotal = items.reduce((acc, item) => {
      const precioVariante = item.variante?.price_modifier ?? 0;
      return acc + (item.unit_price + precioVariante) * item.quantity;
    }, 0);

    // ── 5. Calcular descuento por cupón ───────────────────────
    let descuentoCupon = 0;
    let cuponId: string | null = null;
    let cuponCodigoSnapshot: string | null = null;

    const cupon = await repositorioCheckout.obtenerCuponCarrito(input.carrito_id);
    if (cupon) {
      // Guard: re-validate coupon is still active and not expired
      const cuponActivo = await repositorioCheckout.validarCuponActivo(cupon.id);
      if (!cuponActivo) {
        throw new Error(`El cupón "${cupon.code}" ya no es válido o ha expirado. Quítalo e intenta de nuevo.`);
      }

      cuponId = cupon.id;
      cuponCodigoSnapshot = cupon.code;

      if (cupon.discount_type === 'percentage') {
        descuentoCupon = subtotal * (cupon.discount_value / 100);
        if (cupon.maximum_discount) {
          descuentoCupon = Math.min(descuentoCupon, cupon.maximum_discount);
        }
      } else {
        descuentoCupon = cupon.discount_value;
      }
    }

    // ── 6. Calcular descuento por recompensas ─────────────────
    let descuentoRecompensas = 0;
    const puntosAUsar = await repositorioCheckout.obtenerPuntosRecompensaCarrito(
      input.carrito_id,
    );
    if (puntosAUsar > 0) {
      descuentoRecompensas = puntosAUsar * VALOR_PUNTO_EN_MONEDA;
      // Máx 20% del subtotal
      descuentoRecompensas = Math.min(descuentoRecompensas, subtotal * 0.2);
    }

    const descuentoTotal = descuentoCupon + descuentoRecompensas;

    // ── 7. Calcular envío ─────────────────────────────────────
    const pesoTotal = items.reduce((acc, item) => {
      return acc + (item.producto?.weight_grams ?? 200) * item.quantity;
    }, 0);

    const costoEnvio = calcularEnvio(pesoTotal, input.codigo_pais, subtotal - descuentoTotal);

    // ── 8. Calcular impuesto ──────────────────────────────────
    const baseImponible = subtotal - descuentoTotal + costoEnvio;
    const montoImpuesto = calcularImpuesto(baseImponible, configPais.tasa_impuesto);

    // ── 9. Total final ────────────────────────────────────────
    const total = calcularTotal(subtotal, descuentoTotal, costoEnvio, montoImpuesto);

    if (total <= 0) {
      throw new Error('El total de la orden debe ser mayor a 0');
    }

    // Guard: total sanity check — must not exceed subtotal by more than 3x (catches calculation bugs)
    if (total > subtotal * 3 + 100000) {
      throw new Error('El total calculado parece incorrecto. Contacta soporte.');
    }

    // ── 10. Crear dirección de envío ──────────────────────────
    const direccionEnvioId = await repositorioOrdenes.crearDireccion(
      profileId,
      input.direccion_envio,
    );

    let direccionFacturacionId: string | null = direccionEnvioId;
    if (input.direccion_facturacion) {
      direccionFacturacionId = await repositorioOrdenes.crearDireccion(
        profileId,
        input.direccion_facturacion,
      );
    }

    // ── 11. Crear orden ───────────────────────────────────────
    const numeroOrden = generarNumeroOrden(input.codigo_pais);

    // Guest users do not have a real profile UUID.
    // The orders.profile_id column is UUID (nullable) — pass null for guests.
    const ordenProfileId = profileId.startsWith('guest-') ? null : profileId;

    const orden = await repositorioOrdenes.crear({
      order_number: numeroOrden,
      profile_id: ordenProfileId,
      country_code: input.codigo_pais,
      shipping_address_id: direccionEnvioId,
      billing_address_id: direccionFacturacionId,
      status: 'pending',
      payment_status: 'pending',
      payment_method: (input.metodo_pago as import('./types').MetodoPago) ?? null,
      payment_reference: null,
      subtotal,
      discount_amount: descuentoTotal,
      shipping_cost: costoEnvio,
      tax_amount: montoImpuesto,
      tax_rate_snapshot: configPais.tasa_impuesto,
      total,
      currency_code: configPais.moneda,
      coupon_id: cuponId,
      coupon_code_snapshot: cuponCodigoSnapshot,
      notes: input.notas ?? null,
      tracking_number: null,
      shipped_at: null,
      delivered_at: null,
      cancelled_at: null,
      metadata: {
        carrito_id: input.carrito_id,
        puntos_recompensa_usados: puntosAUsar,
        descuento_cupon: descuentoCupon,
        descuento_recompensas: descuentoRecompensas,
        // Customer & delivery fields — stored so the confirmation page can
        // build the WhatsApp message even when shipping_address_id is null
        // (guest orders) or when the address join returns no rows.
        nombre_cliente: input.direccion_envio.nombre_completo,
        email_contacto: email,
        telefono: input.direccion_envio.telefono ?? null,
        metodo_entrega: input.metodo_entrega ?? null,
        direccion_linea1: input.direccion_envio.linea1,
        direccion_linea2: input.direccion_envio.linea2 ?? null,
        ciudad: input.direccion_envio.ciudad,
        departamento_provincia: input.direccion_envio.departamento_provincia,
        codigo_postal: input.direccion_envio.codigo_postal ?? null,
      },
    });

    // ── 12. Crear ítems de la orden ───────────────────────────
    await repositorioOrdenes.crearItems(
      items.map((item) => ({
        order_id: orden.id,
        product_id: item.product_id,
        variant_id: item.variant_id ?? null,
        product_name: item.producto?.name ?? 'Producto',
        variant_name: item.variante
          ? `${item.variante.name}: ${item.variante.value}`
          : null,
        sku_snapshot: item.variante?.sku ?? item.producto?.sku ?? null,
        quantity: item.quantity,
        unit_price: item.unit_price + (item.variante?.price_modifier ?? 0),
        total_price:
          (item.unit_price + (item.variante?.price_modifier ?? 0)) * item.quantity,
      })),
    );

    // ── 13. Crear intención de pago ───────────────────────────
    const intencion = await servicioPagos.crearIntencionPago(orden.id, {
      monto: total,
      moneda: configPais.moneda,
      codigo_pais: input.codigo_pais,
      email_cliente: email,
      nombre_cliente: nombreCompleto,
      descripcion: `Orden Street Candy #${numeroOrden}`,
      metadata: {
        numero_orden: numeroOrden,
        profile_id: profileId,
      },
    });

    loggerPagos.info('Checkout iniciado exitosamente', {
      orden_id: orden.id,
      referencia_proveedor: intencion.referencia_proveedor,
      datos: { total, moneda: configPais.moneda, numero_orden: numeroOrden },
    });

    return {
      orden_id: orden.id,
      numero_orden: numeroOrden,
      referencia_proveedor: intencion.referencia_proveedor,
      monto_total: total,
      moneda: configPais.moneda,
      estado_pago: intencion.estado,
      datos_adicionales: intencion.datos_adicionales,
    };
  },

  /**
   * Confirma el pago de una orden y completa el checkout:
   * 1. Confirma el pago con el proveedor
   * 2. Deduce inventario
   * 3. Registra uso de cupón
   * 4. Otorga puntos de recompensa
   * 5. Vacía el carrito
   * 6. Envía notificación
   */
  async confirmarPago(
    profileId: string,
    input: InputConfirmarPago,
  ): Promise<ResultadoConfirmacionPago> {
    loggerPagos.info('Confirmando pago de checkout', {
      orden_id: input.orden_id,
      referencia_proveedor: input.referencia_proveedor,
    });

    const orden = await repositorioOrdenes.obtenerPorId(input.orden_id);
    if (!orden) throw new Error('Orden no encontrada');

    // Verificar que la orden pertenece al usuario
    if (orden.profile_id !== profileId) {
      throw new Error('No tienes permiso para confirmar este pago');
    }

    // Confirmar con el proveedor
    const resultado = await servicioPagos.confirmarPago(
      input.orden_id,
      input.referencia_proveedor,
      orden.country_code,
    );

    if (resultado.estado !== 'succeeded') {
      loggerPagos.warn('Pago no completado', {
        orden_id: input.orden_id,
        datos: { estado: resultado.estado },
      });
      return resultado;
    }

    // ── Post-pago exitoso ─────────────────────────────────────

    // Obtener carrito para post-procesamiento
    const carritoId = (orden.metadata as Record<string, unknown>)?.carrito_id as string;

    if (carritoId) {
      const datosCarrito = await repositorioCheckout.obtenerCarritoCompleto(carritoId);

      if (datosCarrito) {
        // Deducir inventario
        await repositorioCheckout.deducirInventario(
          datosCarrito.items.map((item) => ({
            producto_id: item.product_id,
            variante_id: item.variant_id ?? null,
            cantidad: item.quantity,
          })),
        );

        // Registrar uso de cupón
        if (orden.coupon_id) {
          let descuentoCupon =
            (orden.metadata as Record<string, unknown>)?.descuento_cupon as number ?? 0;
          await repositorioCheckout.registrarUsoCupon(
            orden.coupon_id,
            profileId,
            orden.id,
            descuentoCupon,
          );
        }

        // Vaciar carrito
        await repositorioCheckout.vaciarCarrito(carritoId);
      }
    }

    // Registrar recompensas ganadas (1 punto por cada 100 unidades de moneda)
    const puntosGanados = Math.floor(orden.total * PUNTOS_POR_PESO_MONEDA);
    if (puntosGanados > 0) {
      await repositorioCheckout.registrarTransaccionRecompensas(
        profileId,
        orden.id,
        puntosGanados,
        'earned_purchase',
        `Puntos ganados por orden #${orden.order_number}`,
      );
    }

    // Descontar puntos usados
    const puntosUsados =
      (orden.metadata as Record<string, unknown>)?.puntos_recompensa_usados as number ?? 0;
    if (puntosUsados > 0) {
      await repositorioCheckout.registrarTransaccionRecompensas(
        profileId,
        orden.id,
        puntosUsados,
        'redeemed',
        `Puntos canjeados en orden #${orden.order_number}`,
      );
    }

    // Notificar al usuario
    await repositorioCheckout.crearNotificacion(
      profileId,
      'order_confirmed',
      '¡Orden confirmada!',
      `Tu orden #${orden.order_number} ha sido confirmada. ¡Gracias por tu compra!`,
      { orden_id: orden.id, numero_orden: orden.order_number },
    );

    loggerPagos.info('Checkout completado exitosamente', {
      orden_id: orden.id,
      datos: {
        numero_orden: orden.order_number,
        total: orden.total,
        puntos_ganados: puntosGanados,
      },
    });

    return resultado;
  },

  /**
   * Calcula el resumen de un checkout sin crear la orden (preview)
   */
  async calcularResumen(
    carritoId: string,
    codigoPais: string,
  ): Promise<{
    subtotal: number;
    descuento_cupon: number;
    descuento_recompensas: number;
    costo_envio: number;
    impuesto: number;
    tasa_impuesto: number;
    total: number;
    moneda: string;
    simbolo_moneda: string;
  }> {
    const configPais = obtenerConfigPais(codigoPais);
    const datosCarrito = await repositorioCheckout.obtenerCarritoCompleto(carritoId);

    if (!datosCarrito || datosCarrito.items.length === 0) {
      throw new Error('Carrito vacío o no encontrado');
    }

    const { items } = datosCarrito;

    const subtotal = items.reduce((acc, item) => {
      const precioVariante = item.variante?.price_modifier ?? 0;
      return acc + (item.unit_price + precioVariante) * item.quantity;
    }, 0);

    let descuentoCupon = 0;
    const cupon = await repositorioCheckout.obtenerCuponCarrito(carritoId);
    if (cupon) {
      if (cupon.discount_type === 'percentage') {
        descuentoCupon = subtotal * (cupon.discount_value / 100);
        if (cupon.maximum_discount) {
          descuentoCupon = Math.min(descuentoCupon, cupon.maximum_discount);
        }
      } else {
        descuentoCupon = cupon.discount_value;
      }
    }

    const puntosAUsar = await repositorioCheckout.obtenerPuntosRecompensaCarrito(carritoId);
    let descuentoRecompensas = Math.min(
      puntosAUsar * VALOR_PUNTO_EN_MONEDA,
      subtotal * 0.2,
    );

    const descuentoTotal = descuentoCupon + descuentoRecompensas;

    const pesoTotal = items.reduce((acc, item) => {
      return acc + (item.producto?.weight_grams ?? 200) * item.quantity;
    }, 0);

    const costoEnvio = calcularEnvio(pesoTotal, codigoPais, subtotal - descuentoTotal);
    const baseImponible = subtotal - descuentoTotal + costoEnvio;
    const montoImpuesto = calcularImpuesto(baseImponible, configPais.tasa_impuesto);
    const total = calcularTotal(subtotal, descuentoTotal, costoEnvio, montoImpuesto);

    return {
      subtotal,
      descuento_cupon: descuentoCupon,
      descuento_recompensas: descuentoRecompensas,
      costo_envio: costoEnvio,
      impuesto: montoImpuesto,
      tasa_impuesto: configPais.tasa_impuesto,
      total,
      moneda: configPais.moneda,
      simbolo_moneda: configPais.simbolo_moneda,
    };
  },
};
