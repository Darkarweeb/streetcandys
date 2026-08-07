/**
 * Street Candy — Servicio de Carrito
 * Lógica de negocio completa: invitados, usuarios, sincronización,
 * validación de inventario, cupones, recompensas, envío, impuestos
 */

import {
  carritoRepositorio,
  itemsCarritoRepositorio,
  cuponRepositorio,
  recompensasCarritoRepositorio,
  inventarioCarritoRepositorio,
  type ItemCarritoConProducto,
} from './cart-repository';
import {
  construirResumenCarrito,
  calcularDescuentoCupon,
  calcularDescuentoRecompensas,
  estimarEnvio,
  calcularImpuesto,
  validarCupon,
  generarSessionId,
  normalizarCantidad,
  mensajeErrorCarrito,
  validarPais,
} from './utils';
import type {
  CarritoCompleto,
  ItemCarrito,
  CuponAplicado,
  InfoRecompensas,
  AgregarItemInput,
  ActualizarItemInput,
  AplicarCuponInput,
  AplicarRecompensasInput,
  SincronizarCarritoInput,
  EstimacionEnvio,
  EstimacionImpuesto,
  ValidacionInventario,
  ItemInvalido,
  RespuestaApi,
} from './types';
import { CARRITO_CONSTANTES } from './types';

// ============================================================
// SERVICIO DE CARRITO
// ============================================================

export const carritoServicio = {
  // ----------------------------------------------------------
  // OBTENER O CREAR CARRITO
  // ----------------------------------------------------------

  /**
   * Obtiene o crea el carrito de un usuario autenticado
   */
  async obtenerOCrearParaUsuario(
    profileId: string,
    codigoPais: string,
  ): Promise<RespuestaApi<CarritoCompleto>> {
    try {
      if (!validarPais(codigoPais)) {
        return { exito: false, error: 'País no soportado. Solo Colombia (CO) y Costa Rica (CR).' };
      }

      let carrito = await carritoRepositorio.obtenerPorProfileId(profileId);
      if (!carrito) {
        carrito = await carritoRepositorio.crearParaUsuario(profileId, codigoPais);
      } else if (carrito.country_code !== codigoPais) {
        await carritoRepositorio.actualizarPais(carrito.id, codigoPais);
        carrito.country_code = codigoPais;
      }

      const completo = await ensamblarCarritoCompleto(carrito.id, profileId, codigoPais);
      return { exito: true, datos: completo };
    } catch (error) {
      return { exito: false, error: mensajeErrorCarrito(error) };
    }
  },

  /**
   * Obtiene o crea el carrito de un invitado por session_id
   */
  async obtenerOCrearParaInvitado(
    sessionId: string,
    codigoPais: string,
  ): Promise<RespuestaApi<CarritoCompleto>> {
    try {
      if (!validarPais(codigoPais)) {
        return { exito: false, error: 'País no soportado. Solo Colombia (CO) y Costa Rica (CR).' };
      }

      let carrito = await carritoRepositorio.obtenerPorSessionId(sessionId);
      if (!carrito) {
        carrito = await carritoRepositorio.crearParaInvitado(sessionId, codigoPais);
      } else if (carrito.country_code !== codigoPais) {
        await carritoRepositorio.actualizarPais(carrito.id, codigoPais);
        carrito.country_code = codigoPais;
      }

      const completo = await ensamblarCarritoCompleto(carrito.id, null, codigoPais);
      return { exito: true, datos: completo };
    } catch (error) {
      return { exito: false, error: mensajeErrorCarrito(error) };
    }
  },

  // ----------------------------------------------------------
  // AGREGAR / ACTUALIZAR / ELIMINAR ÍTEMS
  // ----------------------------------------------------------

  /**
   * Agrega un ítem al carrito (usuario o invitado)
   */
  async agregarItem(
    carritoId: string,
    input: AgregarItemInput,
    codigoPais: string,
    profileId?: string,
  ): Promise<RespuestaApi<CarritoCompleto>> {
    try {
      const cantidad = normalizarCantidad(input.cantidad);

      // Verificar límite de ítems únicos
      const totalItems = await itemsCarritoRepositorio.contarItems(carritoId);
      if (totalItems >= CARRITO_CONSTANTES.MAX_ITEMS) {
        return {
          exito: false,
          error: `El carrito no puede tener más de ${CARRITO_CONSTANTES.MAX_ITEMS} productos diferentes.`,
        };
      }

      // Obtener precio actual del producto
      const precioActual = await inventarioCarritoRepositorio.obtenerPrecioProducto(
        input.producto_id,
        input.variante_id ?? null,
      );
      if (precioActual === null) {
        return { exito: false, error: 'Producto no encontrado o no disponible.' };
      }

      // Validar inventario
      const inventario = await inventarioCarritoRepositorio.obtenerDisponibilidad(
        input.producto_id,
        input.variante_id ?? null,
      );
      const disponible = inventario
        ? Math.max(0, inventario.quantity - inventario.reserved_quantity)
        : 0;
      const permiteBackorder = inventario?.allow_backorder ?? false;

      if (!permiteBackorder && disponible < cantidad) {
        return {
          exito: false,
          error: `Solo hay ${disponible} unidades disponibles de este producto.`,
          codigo: 'STOCK_INSUFICIENTE',
        };
      }

      // Verificar si ya existe el ítem
      const itemExistente = await itemsCarritoRepositorio.buscarItemExistente(
        carritoId,
        input.producto_id,
        input.variante_id ?? null,
      );

      if (itemExistente) {
        const nuevaCantidad = normalizarCantidad(itemExistente.quantity + cantidad);
        if (!permiteBackorder && disponible < nuevaCantidad) {
          return {
            exito: false,
            error: `Solo hay ${disponible} unidades disponibles. Ya tienes ${itemExistente.quantity} en el carrito.`,
            codigo: 'STOCK_INSUFICIENTE',
          };
        }
        await itemsCarritoRepositorio.actualizarCantidad(itemExistente.id, nuevaCantidad);
      } else {
        await itemsCarritoRepositorio.agregar(
          carritoId,
          input.producto_id,
          input.variante_id ?? null,
          cantidad,
          precioActual,
        );
      }

      const completo = await ensamblarCarritoCompleto(carritoId, profileId ?? null, codigoPais);
      return { exito: true, datos: completo };
    } catch (error) {
      return { exito: false, error: mensajeErrorCarrito(error) };
    }
  },

  /**
   * Actualiza la cantidad de un ítem del carrito
   */
  async actualizarItem(
    carritoId: string,
    input: ActualizarItemInput,
    codigoPais: string,
    profileId?: string,
  ): Promise<RespuestaApi<CarritoCompleto>> {
    try {
      const item = await itemsCarritoRepositorio.obtenerPorId(input.item_id);
      if (!item || item.cart_id !== carritoId) {
        return { exito: false, error: 'Ítem no encontrado en el carrito.' };
      }

      if (input.cantidad <= 0) {
        await itemsCarritoRepositorio.eliminar(input.item_id);
      } else {
        const cantidad = normalizarCantidad(input.cantidad);

        // Validar inventario
        const inventario = await inventarioCarritoRepositorio.obtenerDisponibilidad(
          item.product_id,
          item.variant_id,
        );
        const disponible = inventario
          ? Math.max(0, inventario.quantity - inventario.reserved_quantity)
          : 0;
        const permiteBackorder = inventario?.allow_backorder ?? false;

        if (!permiteBackorder && disponible < cantidad) {
          return {
            exito: false,
            error: `Solo hay ${disponible} unidades disponibles.`,
            codigo: 'STOCK_INSUFICIENTE',
          };
        }

        await itemsCarritoRepositorio.actualizarCantidad(input.item_id, cantidad);
      }

      const completo = await ensamblarCarritoCompleto(carritoId, profileId ?? null, codigoPais);
      return { exito: true, datos: completo };
    } catch (error) {
      return { exito: false, error: mensajeErrorCarrito(error) };
    }
  },

  /**
   * Elimina un ítem del carrito
   */
  async eliminarItem(
    carritoId: string,
    itemId: string,
    codigoPais: string,
    profileId?: string,
  ): Promise<RespuestaApi<CarritoCompleto>> {
    try {
      const item = await itemsCarritoRepositorio.obtenerPorId(itemId);
      if (!item || item.cart_id !== carritoId) {
        return { exito: false, error: 'Ítem no encontrado en el carrito.' };
      }

      await itemsCarritoRepositorio.eliminar(itemId);
      const completo = await ensamblarCarritoCompleto(carritoId, profileId ?? null, codigoPais);
      return { exito: true, datos: completo };
    } catch (error) {
      return { exito: false, error: mensajeErrorCarrito(error) };
    }
  },

  /**
   * Vacía el carrito completamente
   */
  async vaciar(
    carritoId: string,
    codigoPais: string,
    profileId?: string,
  ): Promise<RespuestaApi<CarritoCompleto>> {
    try {
      await itemsCarritoRepositorio.vaciar(carritoId);
      // También elimina el cupón al vaciar
      await carritoRepositorio.eliminarCupon(carritoId);
      const completo = await ensamblarCarritoCompleto(carritoId, profileId ?? null, codigoPais);
      return { exito: true, datos: completo };
    } catch (error) {
      return { exito: false, error: mensajeErrorCarrito(error) };
    }
  },

  // ----------------------------------------------------------
  // CUPONES
  // ----------------------------------------------------------

  /**
   * Aplica un cupón al carrito
   */
  async aplicarCupon(
    carritoId: string,
    input: AplicarCuponInput,
    codigoPais: string,
    profileId?: string,
  ): Promise<RespuestaApi<CarritoCompleto>> {
    try {
      const cupon = await cuponRepositorio.obtenerPorCodigo(input.codigo);
      if (!cupon) {
        return { exito: false, error: 'Cupón no encontrado.' };
      }

      // Obtener ítems para calcular subtotal
      const itemsDb = await itemsCarritoRepositorio.obtenerPorCarritoId(carritoId);
      const subtotal = itemsDb.reduce(
        (acc, item) => acc + Number(item.unit_price) * item.quantity,
        0,
      );

      // Validar cupón
      const validacion = validarCupon(cupon, subtotal, codigoPais);
      if (!validacion.valido) {
        return { exito: false, error: validacion.motivo };
      }

      // Verificar uso por usuario si está autenticado
      if (profileId) {
        const usos = await cuponRepositorio.contarUsosPorUsuario(cupon.id, profileId);
        if (usos >= cupon.per_user_limit) {
          return {
            exito: false,
            error: `Ya has usado este cupón el máximo de veces permitido (${cupon.per_user_limit}).`,
          };
        }
      }

      await carritoRepositorio.aplicarCupon(carritoId, cupon.id);
      const completo = await ensamblarCarritoCompleto(carritoId, profileId ?? null, codigoPais);
      return { exito: true, datos: completo };
    } catch (error) {
      return { exito: false, error: mensajeErrorCarrito(error) };
    }
  },

  /**
   * Elimina el cupón del carrito
   */
  async eliminarCupon(
    carritoId: string,
    codigoPais: string,
    profileId?: string,
  ): Promise<RespuestaApi<CarritoCompleto>> {
    try {
      await carritoRepositorio.eliminarCupon(carritoId);
      const completo = await ensamblarCarritoCompleto(carritoId, profileId ?? null, codigoPais);
      return { exito: true, datos: completo };
    } catch (error) {
      return { exito: false, error: mensajeErrorCarrito(error) };
    }
  },

  // ----------------------------------------------------------
  // RECOMPENSAS
  // ----------------------------------------------------------

  /**
   * Aplica puntos de recompensa al carrito (guardado en metadata)
   */
  async aplicarRecompensas(
    carritoId: string,
    input: AplicarRecompensasInput,
    codigoPais: string,
    profileId: string,
  ): Promise<RespuestaApi<CarritoCompleto>> {
    try {
      const recompensas = await recompensasCarritoRepositorio.obtenerPorProfileId(profileId);
      if (!recompensas) {
        return { exito: false, error: 'No tienes recompensas disponibles.' };
      }

      if (input.puntos_a_usar > recompensas.points_balance) {
        return {
          exito: false,
          error: `Solo tienes ${recompensas.points_balance} puntos disponibles.`,
        };
      }

      // Guardar puntos a usar en metadata del carrito
      const supabase = (await import('@/lib/supabase/client')).createClient();
      const { error } = await supabase
        .from('cart')
        .update({
          metadata: { puntos_a_usar: input.puntos_a_usar },
          updated_at: new Date().toISOString(),
        })
        .eq('id', carritoId);

      if (error) throw new Error(error.message);

      const completo = await ensamblarCarritoCompleto(carritoId, profileId, codigoPais);
      return { exito: true, datos: completo };
    } catch (error) {
      return { exito: false, error: mensajeErrorCarrito(error) };
    }
  },

  /**
   * Elimina los puntos de recompensa del carrito
   */
  async eliminarRecompensas(
    carritoId: string,
    codigoPais: string,
    profileId: string,
  ): Promise<RespuestaApi<CarritoCompleto>> {
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient();
      const { error } = await supabase
        .from('cart')
        .update({
          metadata: { puntos_a_usar: 0 },
          updated_at: new Date().toISOString(),
        })
        .eq('id', carritoId);

      if (error) throw new Error(error.message);

      const completo = await ensamblarCarritoCompleto(carritoId, profileId, codigoPais);
      return { exito: true, datos: completo };
    } catch (error) {
      return { exito: false, error: mensajeErrorCarrito(error) };
    }
  },

  // ----------------------------------------------------------
  // ESTIMACIONES
  // ----------------------------------------------------------

  /**
   * Estima el costo de envío
   */
  async estimarEnvio(
    carritoId: string,
    codigoPais: string,
  ): Promise<RespuestaApi<EstimacionEnvio>> {
    try {
      if (!validarPais(codigoPais)) {
        return { exito: false, error: 'País no soportado.' };
      }

      const itemsDb = await itemsCarritoRepositorio.obtenerPorCarritoId(carritoId);
      const subtotal = itemsDb.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
      const pesoTotal = itemsDb.reduce((acc, i) => {
        const peso = (i.products as { weight_grams?: number | null } | null)?.weight_grams ?? 0;
        return acc + peso * i.quantity;
      }, 0);

      const estimacion = estimarEnvio(codigoPais, subtotal, pesoTotal);
      return { exito: true, datos: estimacion };
    } catch (error) {
      return { exito: false, error: mensajeErrorCarrito(error) };
    }
  },

  /**
   * Estima el impuesto del carrito
   */
  async estimarImpuesto(
    carritoId: string,
    codigoPais: string,
  ): Promise<RespuestaApi<EstimacionImpuesto>> {
    try {
      if (!validarPais(codigoPais)) {
        return { exito: false, error: 'País no soportado.' };
      }

      const itemsDb = await itemsCarritoRepositorio.obtenerPorCarritoId(carritoId);
      const subtotal = itemsDb.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
      const estimacion = calcularImpuesto(subtotal, codigoPais);
      return { exito: true, datos: estimacion };
    } catch (error) {
      return { exito: false, error: mensajeErrorCarrito(error) };
    }
  },

  // ----------------------------------------------------------
  // VALIDACIÓN DE INVENTARIO
  // ----------------------------------------------------------

  /**
   * Valida que todos los ítems del carrito tengan stock suficiente
   */
  async validarInventario(carritoId: string): Promise<RespuestaApi<ValidacionInventario>> {
    try {
      const itemsDb = await itemsCarritoRepositorio.obtenerPorCarritoId(carritoId);
      const itemsInvalidos: ItemInvalido[] = [];

      // Validate all items in parallel for performance
      const resultados = await Promise.all(
        itemsDb.map(async (item) => {
          const inventario = await inventarioCarritoRepositorio.obtenerDisponibilidad(
            item.product_id,
            item.variant_id,
          );

          const disponible = inventario
            ? Math.max(0, inventario.quantity - inventario.reserved_quantity)
            : 0;
          const permiteBackorder = inventario?.allow_backorder ?? false;
          const productoActivo = (item.products as { is_active?: boolean } | null)?.is_active ?? false;

          return { item, disponible, permiteBackorder, productoActivo };
        }),
      );

      for (const { item, disponible, permiteBackorder, productoActivo } of resultados) {
        if (!productoActivo) {
          itemsInvalidos.push({
            item_id: item.id,
            producto_id: item.product_id,
            variante_id: item.variant_id,
            cantidad_solicitada: item.quantity,
            cantidad_disponible: 0,
            motivo: 'El producto ya no está disponible.',
          });
        } else if (!permiteBackorder && disponible < item.quantity) {
          itemsInvalidos.push({
            item_id: item.id,
            producto_id: item.product_id,
            variante_id: item.variant_id,
            cantidad_solicitada: item.quantity,
            cantidad_disponible: disponible,
            motivo: disponible === 0
              ? 'Producto sin stock.'
              : `Solo hay ${disponible} unidades disponibles.`,
          });
        }
      }

      return {
        exito: true,
        datos: {
          valido: itemsInvalidos.length === 0,
          items_invalidos: itemsInvalidos,
        },
      };
    } catch (error) {
      return { exito: false, error: mensajeErrorCarrito(error) };
    }
  },

  // ----------------------------------------------------------
  // SINCRONIZACIÓN
  // ----------------------------------------------------------

  /**
   * Sincroniza el carrito de localStorage con el carrito del usuario autenticado.
   * Fusiona los ítems del invitado en el carrito del usuario.
   */
  async sincronizarAlIniciarSesion(
    profileId: string,
    codigoPais: string,
    input: SincronizarCarritoInput,
  ): Promise<RespuestaApi<CarritoCompleto>> {
    try {
      if (!validarPais(codigoPais)) {
        return { exito: false, error: 'País no soportado.' };
      }

      // Obtain or create user cart
      let carritoUsuario = await carritoRepositorio.obtenerPorProfileId(profileId);
      if (!carritoUsuario) {
        carritoUsuario = await carritoRepositorio.crearParaUsuario(profileId, codigoPais);
      }

      // Filter valid items first
      const itemsValidos = input.items_locales.filter(
        (i) => i.producto_id && i.cantidad > 0,
      );

      // Fetch prices and inventory for all items in parallel
      const datosItems = await Promise.all(
        itemsValidos.map(async (itemLocal) => {
          const [precioActual, inventario] = await Promise.all([
            inventarioCarritoRepositorio.obtenerPrecioProducto(
              itemLocal.producto_id,
              itemLocal.variante_id ?? null,
            ),
            inventarioCarritoRepositorio.obtenerDisponibilidad(
              itemLocal.producto_id,
              itemLocal.variante_id ?? null,
            ),
          ]);
          return { itemLocal, precioActual, inventario };
        }),
      );

      for (const { itemLocal, precioActual, inventario } of datosItems) {
        if (precioActual === null) continue;

        const disponible = inventario
          ? Math.max(0, inventario.quantity - inventario.reserved_quantity)
          : 0;
        const permiteBackorder = inventario?.allow_backorder ?? false;
        const cantidad = normalizarCantidad(itemLocal.cantidad);

        if (!permiteBackorder && disponible < cantidad) continue;

        const existente = await itemsCarritoRepositorio.buscarItemExistente(
          carritoUsuario!.id,
          itemLocal.producto_id,
          itemLocal.variante_id ?? null,
        );

        if (existente) {
          const nuevaCantidad = normalizarCantidad(existente.quantity + cantidad);
          await itemsCarritoRepositorio.actualizarCantidad(existente.id, nuevaCantidad);
        } else {
          const totalItems = await itemsCarritoRepositorio.contarItems(carritoUsuario!.id);
          if (totalItems < CARRITO_CONSTANTES.MAX_ITEMS) {
            await itemsCarritoRepositorio.agregar(
              carritoUsuario!.id,
              itemLocal.producto_id,
              itemLocal.variante_id ?? null,
              cantidad,
              precioActual,
            );
          }
        }
      }

      const completo = await ensamblarCarritoCompleto(carritoUsuario!.id, profileId, codigoPais);
      return { exito: true, datos: completo };
    } catch (error) {
      return { exito: false, error: mensajeErrorCarrito(error) };
    }
  },

  /**
   * Sincroniza el carrito de un invitado (session_id) al carrito del usuario
   * cuando inicia sesión desde la misma sesión de navegador.
   */
  async sincronizarCarritoInvitado(
    sessionId: string,
    profileId: string,
    codigoPais: string,
  ): Promise<RespuestaApi<CarritoCompleto>> {
    try {
      const carritoInvitado = await carritoRepositorio.obtenerPorSessionId(sessionId);
      if (!carritoInvitado) {
        // No hay carrito de invitado, solo obtener/crear el del usuario
        return carritoServicio.obtenerOCrearParaUsuario(profileId, codigoPais);
      }

      let carritoUsuario = await carritoRepositorio.obtenerPorProfileId(profileId);

      if (!carritoUsuario) {
        // Migrar directamente el carrito del invitado al usuario
        await carritoRepositorio.migrarInvitadoAUsuario(sessionId, profileId);
        carritoUsuario = await carritoRepositorio.obtenerPorProfileId(profileId);
        if (!carritoUsuario) {
          carritoUsuario = await carritoRepositorio.crearParaUsuario(profileId, codigoPais);
        }
      } else {
        // Copiar ítems del invitado al carrito del usuario y eliminar el de invitado
        await itemsCarritoRepositorio.copiarItems(carritoInvitado.id, carritoUsuario.id);
        await carritoRepositorio.eliminar(carritoInvitado.id);
      }

      const completo = await ensamblarCarritoCompleto(carritoUsuario.id, profileId, codigoPais);
      return { exito: true, datos: completo };
    } catch (error) {
      return { exito: false, error: mensajeErrorCarrito(error) };
    }
  },

  /**
   * Genera un nuevo session_id para carrito de invitado
   */
  generarSessionId(): string {
    return generarSessionId();
  },
};

// ============================================================
// FUNCIÓN INTERNA: ENSAMBLAR CARRITO COMPLETO
// ============================================================

async function ensamblarCarritoCompleto(
  carritoId: string,
  profileId: string | null,
  codigoPais: string,
): Promise<CarritoCompleto> {
  const [carritoDb, itemsDb] = await Promise.all([
    carritoRepositorio.obtenerPorId(carritoId),
    itemsCarritoRepositorio.obtenerPorCarritoId(carritoId),
  ]);

  if (!carritoDb) {
    throw new Error('Carrito no encontrado.');
  }

  // Mapear ítems a dominio
  const items: ItemCarrito[] = itemsDb.map((item: ItemCarritoConProducto) => {
    const producto = item.products;
    const variante = item.product_variants;
    return {
      id: item.id,
      carrito_id: item.cart_id,
      producto_id: item.product_id,
      variante_id: item.variant_id,
      cantidad: item.quantity,
      precio_unitario: item.unit_price,
      subtotal: Math.round(item.unit_price * item.quantity * 100) / 100,
      disponible: producto?.is_active ?? false,
      stock_disponible: 0, // se enriquece abajo si es necesario
      producto: producto
        ? {
            id: producto.id,
            nombre: producto.name,
            slug: producto.slug,
            thumbnail_url: producto.thumbnail_url,
            is_active: producto.is_active,
            requires_age_verification: producto.requires_age_verification,
            peso_gramos: producto.weight_grams,
          }
        : undefined,
      variante: variante
        ? {
            id: variante.id,
            nombre: variante.name,
            valor: variante.value,
            tipo: variante.variant_type,
          }
        : undefined,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  });

  // Cupón aplicado
  let cuponAplicado: CuponAplicado | null = null;
  if (carritoDb.coupon_id) {
    const cuponDb = await cuponRepositorio.obtenerPorId(carritoDb.coupon_id);
    if (cuponDb) {
      const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);
      const descuento = calcularDescuentoCupon(subtotal, cuponDb);
      cuponAplicado = {
        id: cuponDb.id,
        codigo: cuponDb.code,
        descripcion: cuponDb.description,
        tipo_descuento: cuponDb.discount_type,
        valor_descuento: cuponDb.discount_value,
        descuento_calculado: descuento,
      };
    }
  }

  // Recompensas aplicadas (desde metadata del carrito)
  let infoRecompensas: InfoRecompensas | null = null;
  if (profileId) {
    const metadata = carritoDb.metadata as Record<string, unknown>;
    const puntosAUsar = typeof metadata?.puntos_a_usar === 'number' ? metadata.puntos_a_usar : 0;

    if (puntosAUsar > 0) {
      const recompensasDb = await recompensasCarritoRepositorio.obtenerPorProfileId(profileId);
      if (recompensasDb && recompensasDb.points_balance > 0) {
        const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);
        const { descuento, puntosUsados } = calcularDescuentoRecompensas(
          subtotal,
          puntosAUsar,
          recompensasDb.points_balance,
          codigoPais,
        );
        infoRecompensas = {
          puntos_disponibles: recompensasDb.points_balance,
          puntos_a_usar: puntosUsados,
          descuento_recompensas: descuento,
          tier: recompensasDb.tier,
        };
      }
    }
  }

  // Resumen del carrito
  const resumen = construirResumenCarrito(items, codigoPais, cuponAplicado, infoRecompensas);

  return {
    id: carritoDb.id,
    profile_id: carritoDb.profile_id,
    session_id: carritoDb.session_id,
    codigo_pais: codigoPais,
    items,
    cupon: cuponAplicado,
    resumen,
    recompensas: infoRecompensas,
    created_at: carritoDb.created_at,
    updated_at: carritoDb.updated_at,
  };
}
