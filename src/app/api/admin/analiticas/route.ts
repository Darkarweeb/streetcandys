/**
 * GET /api/admin/analiticas — Comprehensive analytics KPIs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: perfil } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!perfil || !['admin', 'staff'].includes(perfil.role)) return null;
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ exito: false, error: 'Acceso denegado' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo') || '30d';
    const dias = periodo === '7d' ? 7 : periodo === '90d' ? 90 : 30;
    const desde = new Date();
    desde.setDate(desde.getDate() - dias);
    const desdeIso = desde.toISOString();

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const semana = new Date();
    semana.setDate(semana.getDate() - 7);
    semana.setHours(0, 0, 0, 0);
    const mes = new Date();
    mes.setDate(1);
    mes.setHours(0, 0, 0, 0);

    // Orders in period
    const [
      resOrdenes,
      resOrdenesHoy,
      resOrdenesSemana,
      resOrdenesMes,
      resClientes,
      resClientesNuevos,
      resProductos,
      resInventario,
      resRecompensas,
      resBlog,
      resTopProductos,
    ] = await Promise.all([
      supabase.from('orders').select('id, total, currency_code, status, payment_status, created_at, country_code, profile_id').gte('created_at', desdeIso),
      supabase.from('orders').select('id, total, payment_status').gte('created_at', hoy.toISOString()),
      supabase.from('orders').select('id, total, payment_status').gte('created_at', semana.toISOString()),
      supabase.from('orders').select('id, total, payment_status').gte('created_at', mes.toISOString()),
      supabase.from('profiles').select('id, country_code, created_at').eq('role', 'customer'),
      supabase.from('profiles').select('id').eq('role', 'customer').gte('created_at', desdeIso),
      supabase.from('products').select('id, name, is_active'),
      supabase.from('inventory').select('product_id, quantity, low_stock_threshold'),
      supabase.from('reward_transactions').select('points, transaction_type').gte('created_at', desdeIso),
      supabase.from('blog_posts').select('id, status, view_count'),
      supabase.from('order_items').select('product_name, quantity, total_price').gte('created_at', desdeIso),
    ]);

    const ordenes = resOrdenes.data;
    const ordenesHoy = resOrdenesHoy.data;
    const ordenesSemana = resOrdenesSemana.data;
    const ordenesMes = resOrdenesMes.data;
    const clientes = resClientes.data;
    const clientesNuevos = resClientesNuevos.data;
    const productos = resProductos.data;
    const inventario = resInventario.data;
    const recompensas = resRecompensas.data;
    const blog = resBlog.data;
    const topProductos = resTopProductos.data;

    // Sales KPIs
    const ventasHoy = (ordenesHoy || []).filter(o => o.payment_status === 'paid').reduce((s, o) => s + (o.total || 0), 0);
    const ventasSemana = (ordenesSemana || []).filter(o => o.payment_status === 'paid').reduce((s, o) => s + (o.total || 0), 0);
    const ventasMes = (ordenesMes || []).filter(o => o.payment_status === 'paid').reduce((s, o) => s + (o.total || 0), 0);

    // Revenue by country
    const ventasPorPais: Record<string, number> = {};
    (ordenes || []).filter(o => o.payment_status === 'paid').forEach(o => {
      ventasPorPais[o.country_code] = (ventasPorPais[o.country_code] || 0) + (o.total || 0);
    });

    // Orders by status
    const pedidosPorEstado: Record<string, number> = {};
    (ordenes || []).forEach(o => {
      pedidosPorEstado[o.status] = (pedidosPorEstado[o.status] || 0) + 1;
    });

    // Customers
    const totalClientes = clientes?.length || 0;
    const clientesNuevosCount = clientesNuevos?.length || 0;
    const clientesRecurrentes = (ordenes || []).reduce((acc: Set<string>, o) => {
      if (o.profile_id) acc.add(o.profile_id);
      return acc;
    }, new Set()).size;

    // Top customers by spending
    const gastoCliente: Record<string, number> = {};
    (ordenes || []).filter(o => o.payment_status === 'paid' && o.profile_id).forEach(o => {
      gastoCliente[o.profile_id!] = (gastoCliente[o.profile_id!] || 0) + (o.total || 0);
    });
    const topClientes = Object.entries(gastoCliente)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, total]) => ({ profile_id: id, total }));

    // Products
    const totalProductos = productos?.length || 0;
    const productosActivos = (productos || []).filter(p => p.is_active).length;
    const stockBajo = (inventario || []).filter(i => i.quantity > 0 && i.quantity <= i.low_stock_threshold).length;
    const sinStock = (inventario || []).filter(i => i.quantity === 0).length;

    // Best selling products
    const ventasProducto: Record<string, { quantity: number; total: number }> = {};
    (topProductos || []).forEach(item => {
      if (!ventasProducto[item.product_name]) ventasProducto[item.product_name] = { quantity: 0, total: 0 };
      ventasProducto[item.product_name].quantity += item.quantity;
      ventasProducto[item.product_name].total += item.total_price;
    });
    const masVendidos = Object.entries(ventasProducto)
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 8)
      .map(([name, stats]) => ({ name, ...stats }));

    // Rewards
    const puntosEmitidos = (recompensas || []).filter(r => r.points > 0).reduce((s, r) => s + r.points, 0);
    const puntosCanjeados = (recompensas || []).filter(r => r.transaction_type === 'redeemed').reduce((s, r) => s + Math.abs(r.points), 0);

    // Blog
    const articulosPublicados = (blog || []).filter(b => b.status === 'published').length;
    const totalVistas = (blog || []).reduce((s, b) => s + (b.view_count || 0), 0);

    // Sales by day
    const ventasPorDia: Record<string, { ventas: number; pedidos: number }> = {};
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      ventasPorDia[key] = { ventas: 0, pedidos: 0 };
    }
    (ordenes || []).forEach(o => {
      const key = o.created_at.split('T')[0];
      if (ventasPorDia[key]) {
        ventasPorDia[key].pedidos += 1;
        if (o.payment_status === 'paid') ventasPorDia[key].ventas += o.total || 0;
      }
    });

    return NextResponse.json({
      exito: true,
      datos: {
        ventas: { hoy: ventasHoy, semana: ventasSemana, mes: ventasMes, por_pais: ventasPorPais },
        pedidos: {
          total: ordenes?.length || 0,
          por_estado: pedidosPorEstado,
          pendiente: pedidosPorEstado['pending'] || 0,
          procesando: pedidosPorEstado['processing'] || 0,
          enviado: pedidosPorEstado['shipped'] || 0,
          entregado: pedidosPorEstado['delivered'] || 0,
          cancelado: pedidosPorEstado['cancelled'] || 0,
        },
        clientes: {
          total: totalClientes,
          nuevos: clientesNuevosCount,
          recurrentes: clientesRecurrentes,
          top: topClientes,
        },
        productos: {
          total: totalProductos,
          activos: productosActivos,
          stock_bajo: stockBajo,
          sin_stock: sinStock,
          mas_vendidos: masVendidos,
        },
        recompensas: { puntos_emitidos: puntosEmitidos, puntos_canjeados: puntosCanjeados },
        blog: { publicados: articulosPublicados, total_vistas: totalVistas },
        ventas_por_dia: Object.entries(ventasPorDia).map(([fecha, v]) => ({ fecha, ...v })),
      },
    });
  } catch (err) {
    return NextResponse.json({ exito: false, error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
