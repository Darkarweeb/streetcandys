/**
 * POST /api/carrito/whatsapp-checkout
 * Creates an order in Supabase before the CartDrawer WhatsApp redirect.
 * Supports both authenticated users and guests.
 * Returns the generated order number to include in the WhatsApp message.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generarNumeroOrden, obtenerConfigPais } from '@/lib/payment/utils';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body: {
      pais?: string;
      session_id?: string;
      email_contacto?: string;
    } = await request.json().catch(() => ({}));

    const codigoPais = (body.pais ?? 'CO').toUpperCase();
    const sessionId = request.headers.get('x-session-id') ?? body.session_id ?? null;

    // ── Resolve cart ──────────────────────────────────────────────────────────
    const adminClient = createAdminClient();

    let carritoId: string | null = null;
    let profileId: string;
    let emailContacto: string = body.email_contacto ?? '';
    let nombreCompleto: string = 'Cliente WhatsApp';

    if (user) {
      profileId = user.id;
      emailContacto = user.email ?? emailContacto;

      // Get authenticated user's cart
      const { data: carrito } = await adminClient
        .from('cart')
        .select('id')
        .eq('profile_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      carritoId = carrito?.id ?? null;

      // Get profile name
      const { data: perfil } = await adminClient
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (perfil?.full_name) nombreCompleto = perfil.full_name;
    } else if (sessionId) {
      profileId = `guest-${sessionId}`;

      // Get guest cart by session_id
      const { data: carrito } = await adminClient
        .from('cart')
        .select('id')
        .eq('session_id', sessionId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      carritoId = carrito?.id ?? null;
    } else {
      return NextResponse.json(
        { exito: false, error: 'Se requiere sesión de usuario o session_id de invitado' },
        { status: 400 },
      );
    }

    if (!carritoId) {
      return NextResponse.json(
        { exito: false, error: 'Carrito no encontrado' },
        { status: 404 },
      );
    }

    // ── Fetch cart items ──────────────────────────────────────────────────────
    const { data: items, error: itemsError } = await adminClient
      .from('cart_items')
      .select(`
        *,
        producto:products(id, name, slug, sku, weight_grams, is_active),
        variante:product_variants(id, name, value, sku, price_modifier)
      `)
      .eq('cart_id', carritoId);

    if (itemsError || !items || items.length === 0) {
      return NextResponse.json(
        { exito: false, error: 'El carrito está vacío' },
        { status: 400 },
      );
    }

    // ── Fetch applied coupon ──────────────────────────────────────────────────
    const { data: cartRow } = await adminClient
      .from('cart')
      .select('coupon_id')
      .eq('id', carritoId)
      .single();

    let cuponId: string | null = cartRow?.coupon_id ?? null;
    let cuponCodigoSnapshot: string | null = null;
    let descuentoCupon = 0;

    if (cuponId) {
      const { data: cupon } = await adminClient
        .from('coupons')
        .select('id, code, discount_type, discount_value, maximum_discount, is_active, expires_at')
        .eq('id', cuponId)
        .single();

      if (cupon && cupon.is_active && (!cupon.expires_at || new Date(cupon.expires_at) > new Date())) {
        cuponCodigoSnapshot = cupon.code;

        // Calculate subtotal first for percentage coupons
        const subtotalTemp = items.reduce((acc: number, item: any) => {
          const precioVariante = item.variante?.price_modifier ?? 0;
          return acc + (item.unit_price + precioVariante) * item.quantity;
        }, 0);

        if (cupon.discount_type === 'percentage') {
          descuentoCupon = subtotalTemp * (cupon.discount_value / 100);
          if (cupon.maximum_discount) {
            descuentoCupon = Math.min(descuentoCupon, cupon.maximum_discount);
          }
        } else if (cupon.discount_type === 'fixed') {
          descuentoCupon = cupon.discount_value;
        }
        // shipping type: no monetary discount on order total
      } else {
        // Coupon expired or inactive — ignore it
        cuponId = null;
      }
    }

    // ── Calculate totals ──────────────────────────────────────────────────────
    const configPais = obtenerConfigPais(codigoPais);

    const subtotal = items.reduce((acc: number, item: any) => {
      const precioVariante = item.variante?.price_modifier ?? 0;
      return acc + (item.unit_price + precioVariante) * item.quantity;
    }, 0);

    const descuentoTotal = descuentoCupon;
    const finalTotal = Math.max(0, subtotal - descuentoTotal);

    // ── Generate order number ─────────────────────────────────────────────────
    const numeroOrden = generarNumeroOrden(codigoPais);

    // ── Create order ──────────────────────────────────────────────────────────
    const { data: orden, error: ordenError } = await adminClient
      .from('orders')
      .insert({
        order_number: numeroOrden,
        profile_id: profileId,
        country_code: codigoPais,
        shipping_address_id: null,
        billing_address_id: null,
        status: 'pending',
        payment_status: 'pending',
        payment_method: null,
        payment_reference: null,
        subtotal,
        discount_amount: descuentoTotal,
        shipping_cost: 0,
        tax_amount: 0,
        tax_rate_snapshot: configPais.tasa_impuesto,
        total: finalTotal,
        currency_code: configPais.moneda,
        coupon_id: cuponId,
        coupon_code_snapshot: cuponCodigoSnapshot,
        notes: 'Pedido realizado por WhatsApp desde el carrito',
        tracking_number: null,
        shipped_at: null,
        delivered_at: null,
        cancelled_at: null,
        metadata: {
          canal: 'whatsapp_cart',
          carrito_id: carritoId,
          email_contacto: emailContacto,
          nombre_cliente: nombreCompleto,
          descuento_cupon: descuentoCupon,
        },
      })
      .select('id, order_number')
      .single();

    if (ordenError || !orden) {
      console.error('[whatsapp-checkout] Error creando orden:', ordenError?.message);
      return NextResponse.json(
        { exito: false, error: 'Error al crear la orden' },
        { status: 500 },
      );
    }

    // ── Create order items ────────────────────────────────────────────────────
    const orderItems = items.map((item: any) => ({
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
      total_price: (item.unit_price + (item.variante?.price_modifier ?? 0)) * item.quantity,
    }));

    const { error: itemsInsertError } = await adminClient
      .from('order_items')
      .insert(orderItems);

    if (itemsInsertError) {
      console.error('[whatsapp-checkout] Error creando ítems de orden:', itemsInsertError.message);
      // Order was created — don't fail the whole flow, just log
    }

    return NextResponse.json({
      exito: true,
      datos: {
        orden_id: orden.id,
        numero_orden: orden.order_number,
      },
    });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error procesando checkout por WhatsApp';
    console.error('[POST /api/carrito/whatsapp-checkout]', mensaje);
    return NextResponse.json({ exito: false, error: mensaje }, { status: 500 });
  }
}
