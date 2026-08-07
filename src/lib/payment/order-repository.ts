/**
 * Street Candy — Repositorio de Órdenes
 * Acceso a datos para órdenes y sus ítems.
 */

import { createClient } from '../supabase/server';
import type {
  DbOrden,
  DbItemOrden,
  DbDireccion,
  OrdenCompleta,
  EstadoOrden,
  InputDireccion,
  StatusHistoryItem,
} from '../payment/types';
import { loggerPagos } from '../payment/logger';

// ============================================================
// REPOSITORIO DE ÓRDENES
// ============================================================

export const repositorioOrdenes = {
  /**
   * Crea una nueva orden en la base de datos
   */
  async crear(datos: Omit<DbOrden, 'id' | 'created_at' | 'updated_at'>): Promise<DbOrden> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('orders')
      .insert(datos)
      .select()
      .single();

    if (error) {
      loggerPagos.error('Error creando orden', { datos: { error: error.message } });
      throw new Error(`Error creando orden: ${error.message}`);
    }

    return data as DbOrden;
  },

  /**
   * Crea los ítems de una orden
   */
  async crearItems(
    items: Omit<DbItemOrden, 'id' | 'created_at'>[],
  ): Promise<DbItemOrden[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('order_items')
      .insert(items)
      .select();

    if (error) {
      loggerPagos.error('Error creando ítems de orden', { datos: { error: error.message } });
      throw new Error(`Error creando ítems de orden: ${error.message}`);
    }

    return data as DbItemOrden[];
  },

  /**
   * Obtiene una orden por ID con todos sus detalles
   */
  async obtenerPorId(ordenId: string): Promise<OrdenCompleta | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          *,
          producto:products(id, name, slug, thumbnail_url)
        ),
        direccion_envio:addresses!orders_shipping_address_id_fkey(*),
        direccion_facturacion:addresses!orders_billing_address_id_fkey(*)
      `)
      .eq('id', ordenId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Error obteniendo orden: ${error.message}`);
    }

    return data as unknown as OrdenCompleta;
  },

  /**
   * Obtiene una orden por número de orden
   */
  async obtenerPorNumero(numeroOrden: string): Promise<DbOrden | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', numeroOrden)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Error obteniendo orden por número: ${error.message}`);
    }

    return data as DbOrden;
  },

  /**
   * Lista órdenes de un usuario con paginación
   */
  async listarPorUsuario(
    profileId: string,
    pagina = 1,
    porPagina = 10,
  ): Promise<{ ordenes: DbOrden[]; total: number }> {
    const supabase = await createClient();
    const offset = (pagina - 1) * porPagina;

    const { data, error, count } = await supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .range(offset, offset + porPagina - 1);

    if (error) throw new Error(`Error listando órdenes: ${error.message}`);

    return { ordenes: (data as DbOrden[]) ?? [], total: count ?? 0 };
  },

  /**
   * Actualiza el estado de una orden
   */
  async actualizarEstado(
    ordenId: string,
    estado: EstadoOrden,
    nota?: string,
    estimatedDelivery?: string,
  ): Promise<void> {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // Fetch current status_history
    const { data: current } = await supabase
      .from('orders')
      .select('status_history')
      .eq('id', ordenId)
      .single();

    const existingHistory: StatusHistoryItem[] = Array.isArray(current?.status_history)
      ? (current.status_history as StatusHistoryItem[])
      : [];

    const newHistoryItem: StatusHistoryItem = {
      status: estado,
      timestamp: now,
      ...(nota ? { note: nota } : {}),
    };

    const actualizacion: Record<string, unknown> = {
      status: estado,
      status_updated_at: now,
      status_history: [...existingHistory, newHistoryItem],
      updated_at: now,
    };

    if (estimatedDelivery) {
      actualizacion.estimated_delivery_time = estimatedDelivery;
    }

    if (estado === 'cancelled') {
      actualizacion.cancelled_at = now;
    } else if (estado === 'shipped' || estado === 'out_for_delivery') {
      actualizacion.shipped_at = now;
    } else if (estado === 'delivered') {
      actualizacion.delivered_at = now;
    }

    const { error } = await supabase
      .from('orders')
      .update(actualizacion)
      .eq('id', ordenId);

    if (error) throw new Error(`Error actualizando estado de orden: ${error.message}`);
  },

  /**
   * Crea una dirección y retorna su ID
   * Para pedidos de invitados (profileId comienza con "guest-"), no se inserta en la tabla
   * addresses (que requiere un UUID real de profiles). Retorna null en ese caso.
   */
  async crearDireccion(
    profileId: string,
    dir: InputDireccion,
    esDefault = false,
  ): Promise<string | null> {
    // Guest checkouts do not have a real profile UUID — skip the DB insert
    // to avoid "invalid input syntax for type uuid" errors.
    // Address data is preserved in the order metadata instead.
    if (profileId.startsWith('guest-')) {
      return null;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('addresses')
      .insert({
        profile_id: profileId,
        label: 'Envío',
        full_name: dir.nombre_completo,
        phone: dir.telefono ?? null,
        address_line1: dir.linea1,
        address_line2: dir.linea2 ?? null,
        city: dir.ciudad,
        state_province: dir.departamento_provincia,
        postal_code: dir.codigo_postal ?? null,
        country_code: dir.codigo_pais,
        is_default: esDefault,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Error creando dirección: ${error.message}`);
    return (data as { id: string }).id;
  },

  /**
   * Obtiene la dirección por defecto de un usuario para un país
   */
  async obtenerDireccionDefault(
    profileId: string,
    codigoPais: string,
  ): Promise<DbDireccion | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('profile_id', profileId)
      .eq('country_code', codigoPais)
      .eq('is_default', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Error obteniendo dirección default: ${error.message}`);
    }

    return data as DbDireccion;
  },

  /**
   * Lista todas las órdenes (admin) con filtros opcionales
   */
  async listarTodas(
    pagina = 1,
    porPagina = 15,
    filtros?: { estado?: string; pago?: string; busqueda?: string },
  ): Promise<{ ordenes: DbOrden[]; total: number }> {
    const supabase = await createClient();
    const offset = (pagina - 1) * porPagina;

    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filtros?.estado) {
      query = query.eq('status', filtros.estado);
    }
    if (filtros?.pago) {
      query = query.eq('payment_status', filtros.pago);
    }
    if (filtros?.busqueda) {
      query = query.ilike('order_number', `%${filtros.busqueda}%`);
    }

    const { data, error, count } = await query.range(offset, offset + porPagina - 1);

    if (error) throw new Error(`Error listando órdenes: ${error.message}`);
    return { ordenes: (data as DbOrden[]) ?? [], total: count ?? 0 };
  },
};
