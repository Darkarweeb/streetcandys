/**
 * Street Candy — Repositorio de Reseñas
 * Acceso a la tabla `reviews` en Supabase
 */

import { createClient } from '@/lib/supabase/server';
import type { DbReview, CreateReviewInput } from './types';

// ============================================================
// REPOSITORIO DE RESEÑAS
// ============================================================

export const resenasRepositorio = {
  /**
   * Obtiene reseñas aprobadas de un producto (paginadas)
   */
  async obtenerPaginadas(
    productoId: string,
    pagina = 1,
    porPagina = 10,
    sort = 'reciente',
  ): Promise<{ resenas: DbReview[]; total: number }> {
    const supabase = await createClient();
    const offset = (pagina - 1) * porPagina;

    let query = supabase
      .from('reviews')
      .select('*, profiles(full_name, avatar_url)', { count: 'exact' })
      .eq('product_id', productoId)
      .eq('status', 'approved');

    if (sort === 'mejor') query = query.order('rating', { ascending: false });
    else if (sort === 'peor') query = query.order('rating', { ascending: true });
    else if (sort === 'util') query = query.order('helpful_count', { ascending: false });
    else query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query.range(offset, offset + porPagina - 1);

    if (error) throw new Error(`Error al obtener reseñas: ${error.message}`);
    return { resenas: (data as DbReview[]) ?? [], total: count ?? 0 };
  },

  /**
   * Obtiene reseñas destacadas de un producto
   */
  async obtenerDestacadas(productoId: string, limite = 3): Promise<DbReview[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('reviews')
      .select('*, profiles(full_name, avatar_url)')
      .eq('product_id', productoId)
      .eq('status', 'approved')
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(limite);

    if (error) throw new Error(`Error al obtener reseñas destacadas: ${error.message}`);
    return (data as DbReview[]) ?? [];
  },

  /**
   * Obtiene el resumen de calificaciones (solo aprobadas)
   */
  async obtenerResumen(productoId: string): Promise<{
    total_reviews: number;
    average_rating: number;
    rating_distribution: Record<string, number>;
  }> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .rpc('get_product_rating_summary', { p_product_id: productoId });

    if (error) {
      // Fallback manual
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('product_id', productoId)
        .eq('status', 'approved');

      const list = reviews ?? [];
      const total = list.length;
      const avg = total > 0 ? list.reduce((s, r) => s + r.rating, 0) / total : 0;
      const dist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
      list.forEach(r => { dist[String(r.rating)] = (dist[String(r.rating)] ?? 0) + 1; });
      return { total_reviews: total, average_rating: Math.round(avg * 10) / 10, rating_distribution: dist };
    }

    return data ?? { total_reviews: 0, average_rating: 0, rating_distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } };
  },

  /**
   * Verifica si un usuario ya reseñó un producto
   */
  async existeResena(productoId: string, perfilId: string): Promise<boolean> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('reviews')
      .select('id')
      .eq('product_id', productoId)
      .eq('profile_id', perfilId)
      .single();

    return !!data;
  },

  /**
   * Verifica si el usuario ha comprado el producto
   */
  async haComprado(perfilId: string, productoId: string): Promise<{ comprado: boolean; orderId: string | null }> {
    const supabase = await createClient();
    const { data } = await supabase
      .rpc('has_purchased_product', { p_profile_id: perfilId, p_product_id: productoId });

    if (data) {
      // Get the order_id for linking
      const { data: order } = await supabase
        .from('orders')
        .select('id')
        .eq('profile_id', perfilId)
        .in('status', ['delivered', 'shipped', 'processing', 'confirmed'])
        .limit(1)
        .single();
      return { comprado: true, orderId: order?.id ?? null };
    }
    return { comprado: false, orderId: null };
  },

  /**
   * Crea una nueva reseña (siempre empieza en pending)
   */
  async crear(perfilId: string, input: CreateReviewInput & { photos?: { url: string; alt: string }[] }): Promise<DbReview> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        product_id: input.product_id,
        profile_id: perfilId,
        order_id: input.order_id ?? null,
        rating: input.rating,
        title: input.title ?? null,
        body: input.body ?? null,
        photos: input.photos ?? [],
        is_verified: !!input.order_id,
        is_approved: false,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new Error(`Error al crear reseña: ${error.message}`);
    return data;
  },

  /**
   * Actualiza una reseña pendiente del usuario
   */
  async actualizar(resenaId: string, perfilId: string, input: Partial<CreateReviewInput> & { photos?: { url: string; alt: string }[] }): Promise<DbReview> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('reviews')
      .update({
        rating: input.rating,
        title: input.title,
        body: input.body,
        photos: input.photos,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resenaId)
      .eq('profile_id', perfilId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar reseña: ${error.message}`);
    return data;
  },

  /**
   * Elimina una reseña pendiente del usuario
   */
  async eliminar(resenaId: string, perfilId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', resenaId)
      .eq('profile_id', perfilId)
      .eq('status', 'pending');

    if (error) throw new Error(`Error al eliminar reseña: ${error.message}`);
  },

  /**
   * Obtiene las reseñas de un cliente (todas sus reseñas)
   */
  async obtenerPorPerfil(perfilId: string): Promise<(DbReview & { product_name?: string; product_slug?: string; product_thumbnail?: string })[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('reviews')
      .select('*, products(name, slug, thumbnail_url)')
      .eq('profile_id', perfilId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Error al obtener reseñas del perfil: ${error.message}`);
    return (data ?? []).map((r: DbReview & { products?: { name: string; slug: string; thumbnail_url: string | null } }) => ({
      ...r,
      product_name: r.products?.name,
      product_slug: r.products?.slug,
      product_thumbnail: r.products?.thumbnail_url ?? undefined,
    }));
  },

  /**
   * Marca una reseña como útil
   */
  async marcarUtil(resenaId: string): Promise<void> {
    const supabase = await createClient();
    const { data: resena } = await supabase
      .from('reviews')
      .select('helpful_count')
      .eq('id', resenaId)
      .single();

    if (resena) {
      await supabase
        .from('reviews')
        .update({ helpful_count: resena.helpful_count + 1 })
        .eq('id', resenaId);
    }
  },

  // ============================================================
  // ADMIN OPERATIONS
  // ============================================================

  /**
   * Admin: obtiene todas las reseñas con filtros
   */
  async obtenerTodasAdmin(filtros: {
    busqueda?: string;
    status?: string;
    rating?: number;
    producto_id?: string;
    pais?: string;
    pagina?: number;
    por_pagina?: number;
  }): Promise<{ resenas: (DbReview & { product_name?: string; reviewer_name?: string; reviewer_email?: string; country_code?: string })[]; total: number }> {
    const supabase = await createClient();
    const pagina = filtros.pagina ?? 1;
    const porPagina = filtros.por_pagina ?? 20;
    const offset = (pagina - 1) * porPagina;

    let query = supabase
      .from('reviews')
      .select(`
        *,
        products(name, slug, thumbnail_url),
        profiles(full_name, email, country_code)
      `, { count: 'exact' });

    if (filtros.status && filtros.status !== 'all') {
      query = query.eq('status', filtros.status);
    }
    if (filtros.rating) {
      query = query.eq('rating', filtros.rating);
    }
    if (filtros.producto_id) {
      query = query.eq('product_id', filtros.producto_id);
    }
    if (filtros.busqueda) {
      query = query.or(`title.ilike.%${filtros.busqueda}%,body.ilike.%${filtros.busqueda}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + porPagina - 1);

    if (error) throw new Error(`Error al obtener reseñas admin: ${error.message}`);

    const resenas = (data ?? []).map((r: DbReview & {
      products?: { name: string; slug: string; thumbnail_url: string | null };
      profiles?: { full_name: string; email: string; country_code: string | null };
    }) => ({
      ...r,
      product_name: r.products?.name,
      reviewer_name: r.profiles?.full_name,
      reviewer_email: r.profiles?.email,
      country_code: r.profiles?.country_code ?? undefined,
    }));

    return { resenas, total: count ?? 0 };
  },

  /**
   * Admin: cambia el estado de una reseña
   */
  async moderarResena(resenaId: string, adminId: string, nuevoStatus: 'approved' | 'rejected' | 'hidden' | 'pending'): Promise<DbReview> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('reviews')
      .update({
        status: nuevoStatus,
        is_approved: nuevoStatus === 'approved',
        moderated_at: new Date().toISOString(),
        moderated_by: adminId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resenaId)
      .select()
      .single();

    if (error) throw new Error(`Error al moderar reseña: ${error.message}`);
    return data;
  },

  /**
   * Admin: destaca / quita destacado de una reseña
   */
  async toggleDestacada(resenaId: string, isFeatured: boolean): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('reviews')
      .update({ is_featured: isFeatured, updated_at: new Date().toISOString() })
      .eq('id', resenaId);

    if (error) throw new Error(`Error al destacar reseña: ${error.message}`);
  },

  /**
   * Admin: responde a una reseña
   */
  async responder(resenaId: string, respuesta: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('reviews')
      .update({
        admin_reply: respuesta,
        admin_reply_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', resenaId);

    if (error) throw new Error(`Error al responder reseña: ${error.message}`);
  },

  /**
   * Admin: elimina una reseña
   */
  async eliminarAdmin(resenaId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', resenaId);

    if (error) throw new Error(`Error al eliminar reseña: ${error.message}`);
  },

  /**
   * Admin: cuenta de reseñas pendientes (para realtime)
   */
  async contarPendientes(): Promise<number> {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) return 0;
    return count ?? 0;
  },
};
