/**
 * Street Candy — Repositorio de Carrito
 * Acceso a datos para carrito de invitados y usuarios autenticados
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { DbCart, DbCartItem, DbCoupon } from './types';
import { CARRITO_CONSTANTES } from './types';

// ============================================================
// REPOSITORIO DEL CARRITO
// ============================================================

export const carritoRepositorio = {
  /**
   * Obtiene el carrito de un usuario autenticado por profile_id
   */
  async obtenerPorProfileId(profileId: string): Promise<DbCart | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('cart')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error) throw new Error(`Error al obtener carrito: ${error.message}`);
    return data;
  },

  /**
   * Obtiene el carrito de un invitado por session_id
   */
  async obtenerPorSessionId(sessionId: string): Promise<DbCart | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('cart')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error) throw new Error(`Error al obtener carrito de invitado: ${error.message}`);
    return data;
  },

  /**
   * Obtiene el carrito por su ID
   */
  async obtenerPorId(carritoId: string): Promise<DbCart | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('cart')
      .select('*')
      .eq('id', carritoId)
      .maybeSingle();

    if (error) throw new Error(`Error al obtener carrito por ID: ${error.message}`);
    return data;
  },

  /**
   * Crea un nuevo carrito para usuario autenticado
   */
  async crearParaUsuario(profileId: string, codigoPais: string): Promise<DbCart> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('cart')
      .insert({
        profile_id: profileId,
        session_id: null,
        country_code: codigoPais,
        metadata: {},
      })
      .select()
      .single();

    if (error) throw new Error(`Error al crear carrito de usuario: ${error.message}`);
    return data;
  },

  /**
   * Crea un nuevo carrito para invitado
   */
  async crearParaInvitado(sessionId: string, codigoPais: string): Promise<DbCart> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('cart')
      .insert({
        profile_id: null,
        session_id: sessionId,
        country_code: codigoPais,
        metadata: {},
      })
      .select()
      .single();

    if (error) throw new Error(`Error al crear carrito de invitado: ${error.message}`);
    return data;
  },

  /**
   * Actualiza el país del carrito
   */
  async actualizarPais(carritoId: string, codigoPais: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('cart')
      .update({ country_code: codigoPais, updated_at: new Date().toISOString() })
      .eq('id', carritoId);

    if (error) throw new Error(`Error al actualizar país del carrito: ${error.message}`);
  },

  /**
   * Aplica un cupón al carrito
   */
  async aplicarCupon(carritoId: string, cuponId: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('cart')
      .update({ coupon_id: cuponId, updated_at: new Date().toISOString() })
      .eq('id', carritoId);

    if (error) throw new Error(`Error al aplicar cupón: ${error.message}`);
  },

  /**
   * Elimina el cupón del carrito
   */
  async eliminarCupon(carritoId: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('cart')
      .update({ coupon_id: null, updated_at: new Date().toISOString() })
      .eq('id', carritoId);

    if (error) throw new Error(`Error al eliminar cupón: ${error.message}`);
  },

  /**
   * Migra un carrito de invitado a usuario autenticado (sincronización)
   */
  async migrarInvitadoAUsuario(
    sessionId: string,
    profileId: string,
  ): Promise<void> {
    const supabase = createAdminClient();
    // Actualiza el carrito del invitado asignándolo al usuario
    const { error } = await supabase
      .from('cart')
      .update({
        profile_id: profileId,
        session_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
      .is('profile_id', null);

    if (error) throw new Error(`Error al migrar carrito: ${error.message}`);
  },

  /**
   * Elimina un carrito por ID
   */
  async eliminar(carritoId: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('cart')
      .delete()
      .eq('id', carritoId);

    if (error) throw new Error(`Error al eliminar carrito: ${error.message}`);
  },

  /**
   * Elimina carritos de invitado antiguos (más de 30 días)
   */
  async limpiarCarritosInvitadoAntiguos(): Promise<void> {
    const supabase = createAdminClient();
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const { error } = await supabase
      .from('cart')
      .delete()
      .is('profile_id', null)
      .lt('updated_at', hace30Dias.toISOString());

    if (error) throw new Error(`Error al limpiar carritos antiguos: ${error.message}`);
  },
};

// ============================================================
// REPOSITORIO DE ÍTEMS DEL CARRITO
// ============================================================

export const itemsCarritoRepositorio = {
  /**
   * Obtiene todos los ítems de un carrito con datos del producto
   */
  async obtenerPorCarritoId(carritoId: string): Promise<ItemCarritoConProducto[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        products:product_id (
          id,
          name,
          slug,
          thumbnail_url,
          is_active,
          requires_age_verification,
          weight_grams
        ),
        product_variants:variant_id (
          id,
          name,
          value,
          variant_type
        )
      `)
      .eq('cart_id', carritoId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Error al obtener ítems del carrito: ${error.message}`);
    return (data ?? []) as ItemCarritoConProducto[];
  },

  /**
   * Obtiene un ítem específico del carrito
   */
  async obtenerPorId(itemId: string): Promise<DbCartItem | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('cart_items')
      .select('*')
      .eq('id', itemId)
      .maybeSingle();

    if (error) throw new Error(`Error al obtener ítem: ${error.message}`);
    return data;
  },

  /**
   * Busca un ítem existente en el carrito por producto y variante
   */
  async buscarItemExistente(
    carritoId: string,
    productoId: string,
    varianteId: string | null,
  ): Promise<DbCartItem | null> {
    const supabase = createAdminClient();
    let query = supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', carritoId)
      .eq('product_id', productoId);

    if (varianteId) {
      query = query.eq('variant_id', varianteId);
    } else {
      query = query.is('variant_id', null);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(`Error al buscar ítem existente: ${error.message}`);
    return data;
  },

  /**
   * Agrega un ítem al carrito
   */
  async agregar(
    carritoId: string,
    productoId: string,
    varianteId: string | null,
    cantidad: number,
    precioUnitario: number,
  ): Promise<DbCartItem> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('cart_items')
      .insert({
        cart_id: carritoId,
        product_id: productoId,
        variant_id: varianteId,
        quantity: cantidad,
        unit_price: precioUnitario,
      })
      .select()
      .single();

    if (error) throw new Error(`Error al agregar ítem al carrito: ${error.message}`);
    return data;
  },

  /**
   * Actualiza la cantidad de un ítem
   */
  async actualizarCantidad(itemId: string, cantidad: number): Promise<DbCartItem> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity: cantidad, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar cantidad: ${error.message}`);
    return data;
  },

  /**
   * Actualiza el precio unitario de un ítem (para sincronización de precios)
   */
  async actualizarPrecio(itemId: string, precioUnitario: number): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('cart_items')
      .update({ unit_price: precioUnitario, updated_at: new Date().toISOString() })
      .eq('id', itemId);

    if (error) throw new Error(`Error al actualizar precio: ${error.message}`);
  },

  /**
   * Elimina un ítem del carrito
   */
  async eliminar(itemId: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);

    if (error) throw new Error(`Error al eliminar ítem: ${error.message}`);
  },

  /**
   * Elimina todos los ítems de un carrito
   */
  async vaciar(carritoId: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', carritoId);

    if (error) throw new Error(`Error al vaciar carrito: ${error.message}`);
  },

  /**
   * Cuenta los ítems de un carrito
   */
  async contarItems(carritoId: string): Promise<number> {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from('cart_items')
      .select('*', { count: 'exact', head: true })
      .eq('cart_id', carritoId);

    if (error) throw new Error(`Error al contar ítems: ${error.message}`);
    return count ?? 0;
  },

  /**
   * Copia ítems de un carrito a otro (para sincronización)
   */
  async copiarItems(
    carritoOrigenId: string,
    carritoDestinoId: string,
  ): Promise<void> {
    const supabase = createAdminClient();
    const itemsOrigen = await this.obtenerPorCarritoId(carritoOrigenId);

    for (const item of itemsOrigen) {
      const existente = await this.buscarItemExistente(
        carritoDestinoId,
        item.product_id,
        item.variant_id,
      );

      if (existente) {
        // Suma las cantidades, respetando el límite máximo por ítem
        await this.actualizarCantidad(
          existente.id,
          Math.min(existente.quantity + item.quantity, CARRITO_CONSTANTES.MAX_CANTIDAD_POR_ITEM),
        );
      } else {
        await supabase.from('cart_items').insert({
          cart_id: carritoDestinoId,
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        });
      }
    }
  },
};

// ============================================================
// REPOSITORIO DE CUPONES (lectura)
// ============================================================

export const cuponRepositorio = {
  /**
   * Busca un cupón por código
   */
  async obtenerPorCodigo(codigo: string): Promise<DbCoupon | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', codigo.toUpperCase().trim())
      .maybeSingle();

    if (error) throw new Error(`Error al buscar cupón: ${error.message}`);
    return data;
  },

  /**
   * Obtiene un cupón por ID
   */
  async obtenerPorId(cuponId: string): Promise<DbCoupon | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', cuponId)
      .maybeSingle();

    if (error) throw new Error(`Error al obtener cupón: ${error.message}`);
    return data;
  },

  /**
   * Verifica cuántas veces un usuario ha usado un cupón
   */
  async contarUsosPorUsuario(cuponId: string, profileId: string): Promise<number> {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from('coupon_redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('coupon_id', cuponId)
      .eq('profile_id', profileId);

    if (error) throw new Error(`Error al contar usos de cupón: ${error.message}`);
    return count ?? 0;
  },
};

// ============================================================
// REPOSITORIO DE RECOMPENSAS (lectura)
// ============================================================

export const recompensasCarritoRepositorio = {
  /**
   * Obtiene el saldo de recompensas de un usuario
   */
  async obtenerPorProfileId(profileId: string): Promise<{
    points_balance: number;
    tier: string;
  } | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('rewards')
      .select('points_balance, tier')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error) throw new Error(`Error al obtener recompensas: ${error.message}`);
    return data;
  },
};

// ============================================================
// REPOSITORIO DE INVENTARIO (lectura para validación)
// ============================================================

export const inventarioCarritoRepositorio = {
  /**
   * Obtiene el inventario de un producto/variante
   */
  async obtenerDisponibilidad(
    productoId: string,
    varianteId: string | null,
  ): Promise<{ quantity: number; reserved_quantity: number; allow_backorder: boolean } | null> {
    const supabase = createAdminClient();
    let query = supabase
      .from('inventory')
      .select('quantity, reserved_quantity, allow_backorder')
      .eq('product_id', productoId);

    if (varianteId) {
      query = query.eq('variant_id', varianteId);
    } else {
      query = query.is('variant_id', null);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(`Error al obtener inventario: ${error.message}`);
    return data;
  },

  /**
   * Obtiene el precio actual de un producto/variante
   * Colombia → price_cop, Costa Rica → price_crc
   */
  async obtenerPrecioProducto(
    productoId: string,
    varianteId: string | null,
    codigoPais: string = 'CO',
  ): Promise<number | null> {
    const supabase = createAdminClient();
    const camposPrecio = codigoPais === 'CR' ? 'price_crc' : 'price_cop';

    if (varianteId) {
      const { data, error } = await supabase
        .from('product_variants')
        .select(`price_modifier, products:product_id(${camposPrecio})`)
        .eq('id', varianteId)
        .maybeSingle();

      if (error || !data) return null;
      const producto = data.products as Record<string, number | null> | null;
      if (!producto) return null;
      const basePrice = producto[camposPrecio];
      if (basePrice == null) return null;
      return basePrice + (data.price_modifier ?? 0);
    } else {
      const { data, error } = await supabase
        .from('products')
        .select(camposPrecio)
        .eq('id', productoId)
        .maybeSingle();

      if (error || !data) return null;
      const price = (data as Record<string, number | null>)[camposPrecio];
      return price ?? null;
    }
  },
};

// ============================================================
// TIPOS INTERNOS DEL REPOSITORIO
// ============================================================

export interface ItemCarritoConProducto extends DbCartItem {
  products: {
    id: string;
    name: string;
    slug: string;
    thumbnail_url: string | null;
    is_active: boolean;
    requires_age_verification: boolean;
    weight_grams: number | null;
  } | null;
  product_variants: {
    id: string;
    name: string;
    value: string;
    variant_type: string;
  } | null;
}
