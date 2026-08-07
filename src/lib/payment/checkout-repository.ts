/**
 * Street Candy — Repositorio de Checkout
 * Acceso a datos para el proceso de checkout: carrito, inventario, cupones, recompensas.
 */

import { createAdminClient } from '../supabase/admin';
import type { DbCart, DbCartItem } from '../cart/types';
import { loggerPagos } from '../payment/logger';

// ============================================================
// REPOSITORIO DE CHECKOUT
// ============================================================

export const repositorioCheckout = {
  /**
   * Obtiene el carrito completo con ítems y datos de producto
   */
  async obtenerCarritoCompleto(carritoId: string): Promise<{
    carrito: DbCart;
    items: Array<DbCartItem & {
      producto: {
        id: string;
        name: string;
        slug: string;
        thumbnail_url: string | null;
        weight_grams: number | null;
        is_active: boolean;
        sku: string | null;
      };
      variante: {
        id: string;
        name: string;
        value: string;
        variant_type: string;
        sku: string | null;
        price_modifier: number;
      } | null;
      inventario: {
        quantity: number;
        reserved_quantity: number;
        allow_backorder: boolean;
      } | null;
    }>;
  } | null> {
    const supabase = await createAdminClient();

    const { data: carrito, error: errorCarrito } = await supabase
      .from('cart')
      .select('*')
      .eq('id', carritoId)
      .single();

    if (errorCarrito || !carrito) return null;

    const { data: items, error: errorItems } = await supabase
      .from('cart_items')
      .select(`
        *,
        producto:products(id, name, slug, thumbnail_url, weight_grams, is_active, sku),
        variante:product_variants(id, name, value, variant_type, sku, price_modifier)
      `)
      .eq('cart_id', carritoId);

    if (errorItems) {
      loggerPagos.error('Error obteniendo ítems del carrito', {
        datos: { error: errorItems.message, carrito_id: carritoId },
      });
      throw new Error(`Error obteniendo ítems del carrito: ${errorItems.message}`);
    }

    // Fetch inventory separately for each item (no direct FK between cart_items and inventory)
    const itemsConInventario = await Promise.all(
      (items ?? []).map(async (item) => {
        let invQuery = supabase
          .from('inventory')
          .select('quantity, reserved_quantity, allow_backorder')
          .eq('product_id', item.product_id);

        if (item.variant_id) {
          invQuery = invQuery.eq('variant_id', item.variant_id);
        } else {
          invQuery = invQuery.is('variant_id', null);
        }

        const { data: inv } = await invQuery.maybeSingle();
        return { ...item, inventario: inv ?? null };
      }),
    );

    return {
      carrito: carrito as DbCart,
      items: itemsConInventario as unknown as typeof itemsConInventario,
    };
  },

  /**
   * Obtiene datos del cupón aplicado al carrito
   */
  async obtenerCuponCarrito(carritoId: string): Promise<{
    id: string;
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    maximum_discount: number | null;
    description: string | null;
  } | null> {
    const supabase = await createAdminClient();

    const { data } = await supabase
      .from('cart')
      .select('coupon_id, coupons(id, code, discount_type, discount_value, maximum_discount, description)')
      .eq('id', carritoId)
      .single();

    if (!data?.coupon_id) return null;

    const cupon = (data as unknown as { coupons: unknown }).coupons;
    return cupon as {
      id: string;
      code: string;
      discount_type: 'percentage' | 'fixed';
      discount_value: number;
      maximum_discount: number | null;
      description: string | null;
    } | null;
  },

  /**
   * Obtiene los puntos de recompensa a usar desde metadata del carrito
   */
  async obtenerPuntosRecompensaCarrito(carritoId: string): Promise<number> {
    const supabase = await createAdminClient();
    const { data } = await supabase
      .from('cart')
      .select('metadata')
      .eq('id', carritoId)
      .single();

    const metadata = (data?.metadata as Record<string, unknown>) ?? {};
    return (metadata.puntos_recompensa as number) ?? 0;
  },

  /**
   * Deduce inventario reservado al confirmar una orden
   */
  async deducirInventario(
    items: { producto_id: string; variante_id: string | null; cantidad: number }[],
  ): Promise<void> {
    const supabase = await createAdminClient();

    for (const item of items) {
      let query = supabase
        .from('inventory')
        .select('id, quantity, reserved_quantity')
        .eq('product_id', item.producto_id);

      if (item.variante_id) {
        query = query.eq('variant_id', item.variante_id);
      } else {
        query = query.is('variant_id', null);
      }

      const { data: inv } = await query.single();

      if (inv) {
        const nuevoStock = Math.max(0, inv.quantity - item.cantidad);
        await supabase
          .from('inventory')
          .update({ quantity: nuevoStock, updated_at: new Date().toISOString() })
          .eq('id', inv.id);
      }
    }
  },

  /**
   * Registra el uso de un cupón
   */
  async registrarUsoCupon(
    cuponId: string,
    profileId: string,
    ordenId: string,
    descuentoAplicado: number,
  ): Promise<void> {
    const supabase = await createAdminClient();

    // Insertar redención
    await supabase.from('coupon_redemptions').insert({
      coupon_id: cuponId,
      profile_id: profileId,
      order_id: ordenId,
      discount_applied: descuentoAplicado,
    });

    // Incrementar contador de uso
    await supabase.rpc('increment_coupon_usage', { coupon_id_param: cuponId });
  },

  /**
   * Registra transacción de recompensas al completar una orden
   */
  async registrarTransaccionRecompensas(
    profileId: string,
    ordenId: string,
    puntos: number,
    tipo: 'earned_purchase' | 'redeemed',
    descripcion: string,
  ): Promise<void> {
    const supabase = await createAdminClient();

    // Obtener balance actual
    const { data: rewards } = await supabase
      .from('rewards')
      .select('points_balance, points_lifetime')
      .eq('profile_id', profileId)
      .single();

    if (!rewards) return;

    const nuevoBalance =
      tipo === 'earned_purchase'
        ? rewards.points_balance + puntos
        : Math.max(0, rewards.points_balance - puntos);

    const nuevoPuntosVida =
      tipo === 'earned_purchase'
        ? rewards.points_lifetime + puntos
        : rewards.points_lifetime;

    // Actualizar balance
    await supabase
      .from('rewards')
      .update({
        points_balance: nuevoBalance,
        points_lifetime: nuevoPuntosVida,
        updated_at: new Date().toISOString(),
      })
      .eq('profile_id', profileId);

    // Registrar transacción
    await supabase.from('reward_transactions').insert({
      profile_id: profileId,
      order_id: ordenId,
      transaction_type: tipo,
      points: tipo === 'redeemed' ? -puntos : puntos,
      balance_after: nuevoBalance,
      description: descripcion,
    });
  },

  /**
   * Vacía el carrito después de crear la orden
   */
  async vaciarCarrito(carritoId: string): Promise<void> {
    const supabase = await createAdminClient();
    await supabase.from('cart_items').delete().eq('cart_id', carritoId);
    await supabase
      .from('cart')
      .update({
        coupon_id: null,
        metadata: {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', carritoId);
  },

  /**
   * Crea una notificación para el usuario
   */
  async crearNotificacion(
    profileId: string,
    tipo: string,
    titulo: string,
    cuerpo: string,
    datos: Record<string, unknown> = {},
  ): Promise<void> {
    const supabase = await createAdminClient();
    await supabase.from('notifications').insert({
      profile_id: profileId,
      notification_type: tipo,
      title: titulo,
      body: cuerpo,
      data: datos,
    });
  },

  /**
   * Verifica que un cupón sigue activo y no ha expirado al momento del checkout.
   * Returns true if the coupon is still valid.
   */
  async validarCuponActivo(cuponId: string): Promise<boolean> {
    const supabase = await createAdminClient();
    const { data } = await supabase
      .from('coupons')
      .select('is_active, expires_at, usage_limit, usage_count')
      .eq('id', cuponId)
      .single();

    if (!data) return false;
    if (!data.is_active) return false;
    if (data.expires_at && new Date(data.expires_at) < new Date()) return false;
    if (data.usage_limit !== null && data.usage_count >= data.usage_limit) return false;
    return true;
  },
};
