/**
 * Street Candy — Repositorio de Categorías
 * Acceso directo a la tabla `categories` en Supabase
 */

import { createClient } from '@/lib/supabase/server';
import type {
  DbCategory,
  CategoryWithChildren,
  CreateCategoryInput,
  UpdateCategoryInput,
} from './types';

// ============================================================
// REPOSITORIO DE CATEGORÍAS
// ============================================================

export const categoriaRepositorio = {
  /**
   * Obtiene todas las categorías activas
   */
  async obtenerTodas(): Promise<DbCategory[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw new Error(`Error al obtener categorías: ${error.message}`);
    return data ?? [];
  },

  /**
   * Obtiene categorías raíz (sin padre)
   */
  async obtenerRaices(): Promise<DbCategory[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .is('parent_id', null)
      .order('sort_order', { ascending: true });

    if (error) throw new Error(`Error al obtener categorías raíz: ${error.message}`);
    return data ?? [];
  },

  /**
   * Obtiene categorías hijas de un padre
   */
  async obtenerHijas(parentId: string): Promise<DbCategory[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('parent_id', parentId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw new Error(`Error al obtener subcategorías: ${error.message}`);
    return data ?? [];
  },

  /**
   * Obtiene una categoría por slug
   */
  async obtenerPorSlug(slug: string): Promise<DbCategory | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error al obtener categoría por slug: ${error.message}`);
    }
    return data ?? null;
  },

  /**
   * Obtiene una categoría por ID
   */
  async obtenerPorId(id: string): Promise<DbCategory | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error al obtener categoría: ${error.message}`);
    }
    return data ?? null;
  },

  /**
   * Obtiene el árbol completo de categorías con hijos anidados
   */
  async obtenerArbol(): Promise<CategoryWithChildren[]> {
    const todas = await this.obtenerTodas();
    return construirArbol(todas);
  },

  /**
   * Obtiene conteo de productos por categoría
   */
  async obtenerConteoPorCategoria(): Promise<Record<string, number>> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .select('category_id')
      .eq('is_active', true)
      .not('category_id', 'is', null);

    if (error) throw new Error(`Error al contar productos: ${error.message}`);

    const conteo: Record<string, number> = {};
    for (const row of data ?? []) {
      if (row.category_id) {
        conteo[row.category_id] = (conteo[row.category_id] ?? 0) + 1;
      }
    }
    return conteo;
  },

  /**
   * Crea una nueva categoría
   */
  async crear(input: CreateCategoryInput): Promise<DbCategory> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('categories')
      .insert({
        parent_id: input.parent_id ?? null,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        image_url: input.image_url ?? null,
        icon_name: input.icon_name ?? null,
        meta_title: input.meta_title ?? null,
        meta_description: input.meta_description ?? null,
        is_active: input.is_active ?? true,
        sort_order: input.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) throw new Error(`Error al crear categoría: ${error.message}`);
    return data;
  },

  /**
   * Actualiza una categoría existente
   */
  async actualizar(id: string, input: UpdateCategoryInput): Promise<DbCategory> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('categories')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar categoría: ${error.message}`);
    return data;
  },

  /**
   * Desactiva una categoría (soft delete)
   */
  async desactivar(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('categories')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(`Error al desactivar categoría: ${error.message}`);
  },
};

// ============================================================
// HELPER: Construir árbol de categorías
// ============================================================

function construirArbol(
  categorias: DbCategory[],
  parentId: string | null = null,
): CategoryWithChildren[] {
  return categorias
    .filter((c) => c.parent_id === parentId)
    .map((c) => ({
      ...c,
      children: construirArbol(categorias, c.id),
    }));
}
